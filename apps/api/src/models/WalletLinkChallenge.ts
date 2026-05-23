import { Schema, model, type InferSchemaType } from "mongoose";

const walletLinkChallengeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    address: { type: String, lowercase: true, required: true, index: true },
    chainId: Number,
    nonce: { type: String, required: true, index: true },
    message: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    usedAt: Date
  },
  { timestamps: true }
);

walletLinkChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
walletLinkChallengeSchema.index({ userId: 1, address: 1, nonce: 1 });

export type WalletLinkChallengeDocument = InferSchemaType<typeof walletLinkChallengeSchema>;

export const WalletLinkChallenge = model("WalletLinkChallenge", walletLinkChallengeSchema);
