import { Schema, model, Types } from "mongoose";

const uploadedFileSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    collection: { type: Types.ObjectId, ref: "NFTCollection", index: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    storage: { type: String, enum: ["local", "ipfs", "s3"], default: "local" },
    localPath: String,
    ipfsCid: { type: String, index: true },
    url: String,
    checksum: { type: String, index: true },
    purpose: { type: String, enum: ["reference", "generated_image", "metadata", "collection_zip"], index: true }
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

uploadedFileSchema.index({ user: 1, createdAt: -1 });

export const UploadedFile = model("UploadedFile", uploadedFileSchema);
