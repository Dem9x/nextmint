import { Types } from "mongoose";
import { NFTCollection } from "../../models/NFTCollection.js";
import { NFTItem } from "../../models/NFTItem.js";
import { CollectionGenerationJob } from "../../models/CollectionGenerationJob.js";
import { aiRouterService } from "../../ai/services/ai-router.service.js";
import { uploadImageFromUrl, uploadJsonDirectory } from "../ipfs/ipfs.service.js";
import { defaultNegativePrompt, buildTokenPrompt, rollUniqueTraits } from "./trait-engine.service.js";
import { assertCollectionMetadataReady, normalizeMetadataBaseUri } from "./collection-readiness.service.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isQuotaOrRateLimitError(error: unknown) {
  const message = messageOf(error).toLowerCase();

  return (
    message.includes("daily free ai generation limit") ||
    message.includes("quota") ||
    message.includes("limit reached") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("429")
  );
}

function imageDelayMs() {
  const raw = process.env.COLLECTION_IMAGE_DELAY_MS;
  const parsed = raw ? Number(raw) : 8000;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 8000;
}

function collectionImageDimensions(collection?: { generationImageWidth?: number | null; generationImageHeight?: number | null }) {
  const imageWidth = Number(collection?.generationImageWidth ?? process.env.COLLECTION_IMAGE_WIDTH ?? 768);
  const imageHeight = Number(collection?.generationImageHeight ?? process.env.COLLECTION_IMAGE_HEIGHT ?? 768);
  const safeImageWidth = Number.isFinite(imageWidth) && imageWidth > 0 ? imageWidth : 768;
  const safeImageHeight = Number.isFinite(imageHeight) && imageHeight > 0 ? imageHeight : 768;
  return { width: safeImageWidth, height: safeImageHeight };
}

function metadataFor(input: {
  collection: any;
  tokenNumber: number;
  imageIpfsUri: string;
  traits: Array<{ trait_type: string; value: string | number }>;
  rarityScore: number;
}) {
  return {
    name: `${input.collection.name} #${input.tokenNumber}`,
    description: input.collection.description,
    image: input.imageIpfsUri,
    external_url: `${process.env.APP_ORIGIN ?? "http://localhost:3000"}/launchpad/${input.collection.slug}/${input.tokenNumber}`,
    attributes: [
      ...input.traits,
      { trait_type: "Rarity Score", value: input.rarityScore }
    ]
  };
}

async function updateJob(jobId: string, update: Record<string, unknown>) {
  await CollectionGenerationJob.findByIdAndUpdate(jobId, update);
}

export async function processCollectionGeneration(collectionId: string, jobId: string) {
  const collection = await NFTCollection.findById(collectionId);
  const job = await CollectionGenerationJob.findById(jobId);
  if (!collection || !job) throw new Error("Collection generation job not found");
  if (job.status === "cancelled") return;

  job.status = "running";
  job.startedAt ??= new Date();
  await job.save();

  const existingHashes = await NFTItem.find({ collectionId: collection._id, traitHash: { $type: "string" } }).select("traitHash").lean();
  const usedHashes = new Set(existingHashes.map((item) => item.traitHash).filter(Boolean) as string[]);
  let failedCount = 0;
  const metadataFiles: Array<{ path: string; json: unknown }> = [];
  const imageDimensions = collectionImageDimensions(collection);

  await updateJob(jobId, { stage: "create_traits", progressCurrent: 0 });
  collection.status = "generating_traits";
  await collection.save();

  for (let tokenNumber = 1; tokenNumber <= job.supply; tokenNumber += 1) {
    const latestJob = await CollectionGenerationJob.findById(jobId).lean();
    if (latestJob?.status === "cancelled") {
      collection.status = "cancelled";
      await collection.save();
      return;
    }
    if (latestJob?.status === "paused") {
      throw new Error("Collection generation paused");
    }

    try {
      const existingItem = await NFTItem.findOne({ collectionId: collection._id, tokenNumber });
      if (existingItem?.generationStatus === "metadata_ready" && existingItem.metadata) {
        metadataFiles.push({ path: `${tokenNumber}.json`, json: existingItem.metadata });
        await updateJob(jobId, { progressCurrent: tokenNumber, failedCount });
        continue;
      }
      await updateJob(jobId, { stage: "generate_prompts", progressCurrent: tokenNumber - 1 });
      collection.status = "generating_prompts";
      await collection.save();

      const rolled = existingItem?.imageUrl && existingItem.traitHash
        ? {
          traits: (existingItem.traits as Array<{ trait_type: string; value: string | number }>).map((trait) => ({ trait_type: trait.trait_type, value: String(trait.value) })),
          traitHash: existingItem.traitHash,
          rarityTier: existingItem.rarityTier ?? "Common",
          rarityScore: existingItem.rarityScore ?? 0
        }
        : rollUniqueTraits(tokenNumber, usedHashes);
      const prompt = existingItem?.imageUrl && existingItem.generationPrompt
        ? existingItem.generationPrompt
        : buildTokenPrompt({
          basePrompt: collection.basePrompt ?? collection.name,
          style: collection.style ?? undefined,
          tokenNumber,
          rarityTier: rolled.rarityTier,
          traits: rolled.traits
        });

      const item = await NFTItem.findOneAndUpdate(
        { collectionId: collection._id, tokenNumber },
        {
          userId: collection.creatorId ?? collection.owner,
          owner: collection.creatorId ?? collection.owner,
          collectionId: collection._id,
          collection: collection._id,
          tokenNumber,
          name: `${collection.name} #${tokenNumber}`,
          description: collection.description,
          attributes: rolled.traits,
          traits: rolled.traits,
          traitHash: rolled.traitHash,
          rarityTier: rolled.rarityTier,
          rarityScore: rolled.rarityScore,
          generationPrompt: prompt,
          negativePrompt: defaultNegativePrompt,
          generationStatus: "prompt_ready",
          mintStatus: "draft"
        },
        { upsert: true, new: true }
      );

      await updateJob(jobId, { stage: "generate_images", progressCurrent: tokenNumber - 1 });
      collection.status = "generating_images";
      await collection.save();
      if (!item.imageUrl) {
        await sleep(imageDelayMs());
        const image = await aiRouterService.generateImage({
          prompt,
          negativePrompt: defaultNegativePrompt,
          width: imageDimensions.width,
          height: imageDimensions.height,
          collectionId: String(collection._id),
          userId: String(collection.creatorId ?? collection.owner)
        });
        if (!image.success || !image.data?.imageUrl) throw new Error(image.error?.message ?? "Image generation failed");
        item.imageUrl = image.data.imageUrl;
        item.metadata = {
          ...(typeof item.metadata === "object" && item.metadata ? item.metadata : {}),
          originalProviderImageUrl: image.data.imageUrl
        };
        item.generationProvider = image.provider;
        item.generationStatus = "image_generated";
        await item.save();
      }

      await updateJob(jobId, { stage: "upload_images_ipfs", progressCurrent: tokenNumber - 1 });
      collection.status = "uploading_images";
      await collection.save();
      const imageUpload = item.imageIpfsUri
        ? { ipfsUri: item.imageIpfsUri, ipfsHash: item.imageIpfsUri.replace("ipfs://", ""), gatewayUrl: item.imageUrl }
        : await uploadImageFromUrl(item.imageUrl, { key: `collections/${String(collection._id)}/images/${tokenNumber}` });
      item.imageIpfsUri = imageUpload.ipfsUri;
      item.imageUrl = imageUpload.gatewayUrl;
      item.generationStatus = "image_uploaded";
      await item.save();

      await updateJob(jobId, { stage: "create_metadata", progressCurrent: tokenNumber - 1 });
      collection.status = "generating_metadata";
      await collection.save();
      const metadata = metadataFor({ collection, tokenNumber, imageIpfsUri: imageUpload.ipfsUri, traits: rolled.traits, rarityScore: rolled.rarityScore });
      item.metadata = metadata;
      item.generationStatus = "metadata_ready";
      await item.save();
      metadataFiles.push({ path: `${tokenNumber}.json`, json: metadata });

      collection.totalGenerated = tokenNumber;
      collection.totalUploaded = tokenNumber;
      if (tokenNumber === 1) {
        collection.coverImageUrl = item.imageUrl;
        collection.coverImageIpfsUri = imageUpload.ipfsUri;
      }
      await collection.save();
      await updateJob(jobId, { progressCurrent: tokenNumber, failedCount });
    } catch (error) {
      const errorMessage = messageOf(error);
      failedCount += 1;
      await NFTItem.findOneAndUpdate(
        { collectionId: collection._id, tokenNumber },
        {
          userId: collection.creatorId ?? collection.owner,
          owner: collection.creatorId ?? collection.owner,
          collectionId: collection._id,
          collection: collection._id,
          tokenNumber,
          name: `${collection.name} #${tokenNumber}`,
          description: collection.description,
          generationStatus: "failed",
          errorMessage
        },
        { upsert: true }
      );
      await updateJob(jobId, { failedCount, progressCurrent: tokenNumber, errorMessage });

      if (isQuotaOrRateLimitError(error)) {
        collection.status = "paused";
        await collection.save();

        await updateJob(jobId, {
          status: "paused",
          errorMessage,
          failedCount,
          progressCurrent: tokenNumber
        });

        return;
      }
    }
  }

  if (failedCount > 0) {
    collection.status = "failed";
    await collection.save();
    await updateJob(jobId, { status: "failed", errorMessage: `${failedCount} item(s) failed`, failedCount });
    return;
  }

  await updateJob(jobId, { stage: "upload_metadata_ipfs", progressCurrent: job.supply });
  collection.status = "uploading_metadata";
  await collection.save();
  let metadataUpload: Awaited<ReturnType<typeof uploadJsonDirectory>>;
  try {
    metadataUpload = await uploadJsonDirectory(metadataFiles);
  } catch (error) {
    const errorMessage = messageOf(error);
    collection.status = "failed";
    await collection.save();
    await updateJob(jobId, {
      status: "failed",
      stage: "upload_metadata_ipfs",
      progressCurrent: job.supply,
      failedCount,
      errorMessage
    });
    return;
  }
  const metadataBaseUri = normalizeMetadataBaseUri(metadataUpload.ipfsUri);
  if (!metadataBaseUri?.startsWith("ipfs://")) {
    const errorMessage = "Metadata folder upload did not return a valid ipfs:// base URI";
    collection.status = "failed";
    await collection.save();
    await updateJob(jobId, { status: "failed", stage: "upload_metadata_ipfs", progressCurrent: job.supply, failedCount, errorMessage });
    return;
  }

  await NFTItem.updateMany(
    { collectionId: new Types.ObjectId(collectionId) },
    [{ $set: { metadataIpfsUri: { $concat: [metadataBaseUri, { $toString: "$tokenNumber" }, ".json"] }, metadataGatewayUrl: metadataUpload.gatewayUrl, mintStatus: "ready_to_mint" } }]
  );

  collection.metadataBaseUri = metadataBaseUri;
  collection.metadataBaseIpfsUri = metadataBaseUri;
  collection.baseMetadataUri = metadataBaseUri;
  await collection.save();
  const readiness = await assertCollectionMetadataReady(collection._id);
  if (!readiness.deployable) {
    collection.status = "failed";
    await collection.save();
    await updateJob(jobId, {
      status: "failed",
      stage: "complete",
      progressCurrent: job.supply,
      failedCount,
      errorMessage: `Metadata readiness validation failed: ${readiness.reason}`
    });
    return;
  }
  collection.status = "metadata_ready";
  await collection.save();
  await updateJob(jobId, { status: "completed", stage: "complete", progressCurrent: job.supply, failedCount: 0, completedAt: new Date() });
}
