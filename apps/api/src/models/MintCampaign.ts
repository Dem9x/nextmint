import { Schema, model, Types } from "mongoose";

const mintCampaignSchema = new Schema(
  {
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", required: true, index: true },
    chainId: { type: Number, required: true, index: true },
    contractAddress: { type: String, lowercase: true, required: true, index: true },
    status: { type: String, enum: ["draft", "scheduled", "live", "ended", "sold_out", "paused"], default: "draft", index: true },
    startAt: { type: Date, index: true },
    endAt: Date,
    mintPrice: { type: String, required: true },
    maxSupply: { type: Number, required: true },
    totalMinted: { type: Number, default: 0 },
    maxMintPerWallet: { type: Number, default: 1 },
    allowlistEnabled: { type: Boolean, default: false },
    publicMintEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

mintCampaignSchema.index({ collectionId: 1, status: 1 });
mintCampaignSchema.index({ chainId: 1, status: 1 });

export const MintCampaign = model("MintCampaign", mintCampaignSchema);
