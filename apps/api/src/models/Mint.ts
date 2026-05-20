import { Schema, model, Types } from "mongoose";

const mintSchema = new Schema(
  {
    collection: { type: Types.ObjectId, ref: "NFTCollection", required: true, index: true },
    minter: { type: String, lowercase: true, required: true, index: true },
    user: { type: Types.ObjectId, ref: "User", index: true },
    tokenIds: [{ type: Number }],
    quantity: { type: Number, required: true, min: 1 },
    txHash: { type: String, required: true, index: true },
    chainId: { type: Number, required: true, index: true },
    paymentToken: String,
    paymentAmount: String,
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending", index: true }
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

mintSchema.index({ collection: 1, txHash: 1 }, { unique: true });

export const Mint = model("Mint", mintSchema);
