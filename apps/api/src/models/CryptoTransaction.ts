import { Schema, model, Types } from "mongoose";

const cryptoTransactionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: "User", required: true, index: true },
    paymentId: { type: String, required: true, unique: true },
    walletAddress: { type: String, lowercase: true, required: true, index: true },
    chainId: { type: Number, required: true, index: true },
    chainSlug: { type: String, index: true },
    explorerUrl: String,
    nativeCurrency: String,
    token: { type: String, required: true, index: true },
    tokenAddress: { type: String, lowercase: true },
    txHash: { type: String, lowercase: true, index: true, sparse: true },
    from: { type: String, lowercase: true },
    to: { type: String, lowercase: true },
    confirmations: { type: Number, default: 0 },
    amount: { type: String, required: true },
    amountToken: String,
    usdValue: { type: Number, required: true },
    priceUsdAtPayment: Number,
    usdValueAtPayment: Number,
    pricingProvider: String,
    priceTimestamp: Date,
    quoteExpiresAt: Date,
    status: { type: String, enum: ["created", "submitted", "confirming", "confirmed", "failed", "expired"], default: "created", index: true },
    purpose: { type: String, enum: ["credits", "subscription", "mint", "deploy", "publish"], required: true, index: true },
    credits: Number,
    subscriptionPlan: String,
    isTestnet: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, index: true },
    metadata: Schema.Types.Mixed
  },
  { timestamps: true }
);

cryptoTransactionSchema.index({ user: 1, createdAt: -1 });
cryptoTransactionSchema.index(
  { chainId: 1, txHash: 1 },
  {
    unique: true,
    partialFilterExpression: { txHash: { $type: "string" } }
  }
);

export const CryptoTransaction = model("CryptoTransaction", cryptoTransactionSchema);

export async function ensureCryptoTransactionIndexes() {
  const indexes = await CryptoTransaction.collection.indexes();
  const txHashIndex = indexes.find((index) => index.name === "chainId_1_txHash_1");
  if (txHashIndex?.unique && !txHashIndex.partialFilterExpression) {
    await CryptoTransaction.collection.dropIndex("chainId_1_txHash_1");
  }
  await CryptoTransaction.collection.createIndex(
    { chainId: 1, txHash: 1 },
    {
      name: "chainId_1_txHash_1",
      unique: true,
      partialFilterExpression: { txHash: { $type: "string" } }
    }
  );
}
