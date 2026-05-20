import { Schema, model, Types } from "mongoose";

const mintRecordSchema = new Schema(
  {
    collectionId: { type: Types.ObjectId, ref: "NFTCollection", required: true, index: true },
    userId: { type: Types.ObjectId, ref: "User", index: true },
    minterWallet: { type: String, lowercase: true, required: true, index: true },
    chainId: { type: Number, required: true, index: true },
    contractAddress: { type: String, lowercase: true, required: true, index: true },
    txHash: { type: String, lowercase: true, required: true },
    tokenIds: { type: [String], default: [] },
    quantity: { type: Number, required: true, min: 1 },
    grossAmountToken: String,
    grossAmountUsd: Number,
    platformFeeToken: String,
    platformFeeUsd: Number,
    creatorAmountToken: String,
    creatorAmountUsd: Number,
    token: { type: String, default: "ETH", index: true },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending", index: true },
    blockNumber: String
  },
  { timestamps: true }
);

mintRecordSchema.index({ chainId: 1, txHash: 1 }, { unique: true });
mintRecordSchema.index({ collectionId: 1, createdAt: -1 });
mintRecordSchema.index({ minterWallet: 1, collectionId: 1 });
mintRecordSchema.index({ contractAddress: 1, chainId: 1 });

export const MintRecord = model("MintRecord", mintRecordSchema);
