import { Schema, model, Types } from "mongoose";

const walletConnectionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    address: { type: String, lowercase: true, required: true, index: true },
    chainId: { type: Number, index: true },
    connector: { type: String, enum: ["metamask", "rabby", "coinbase", "walletconnect", "phantom", "unknown"], default: "unknown" },
    verifiedAt: Date,
    lastUsedAt: Date,
    nonce: { type: String, index: true },
    nonceMessage: String,
    nonceExpiresAt: { type: Date, index: true },
    nonceConsumedAt: Date,
    isPrimary: { type: Boolean, default: false }
  },
  { timestamps: true }
);

walletConnectionSchema.index({ user: 1, address: 1 }, { unique: true });

export const WalletConnection = model("WalletConnection", walletConnectionSchema);
