import bcrypt from "bcryptjs";
import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, lowercase: true, trim: true, unique: true, sparse: true },
    email: { type: String, lowercase: true, trim: true, unique: true, index: true, sparse: true },
    passwordHash: String,
    googleId: { type: String, index: true, sparse: true },
    displayName: { type: String, trim: true },
    avatarUrl: String,
    role: { type: String, enum: ["user", "creator", "admin"], default: "user", index: true },
    authProvider: { type: String, enum: ["email", "wallet", "google"], default: "email", index: true },
    primaryWallet: { type: String, lowercase: true, index: true, sparse: true },
    primaryWalletAddress: { type: String, lowercase: true, index: true, sparse: true },
    wallets: [{ type: String, lowercase: true }],
    referralCode: { type: String, uppercase: true, index: true, sparse: true },
    credits: { type: Number, default: 25, min: 0 },
    paidCredits: { type: Number, default: 0, min: 0 },
    bonusCredits: { type: Number, default: 25, min: 0 },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
    plan: { type: String, enum: ["free", "starter", "pro", "enterprise"], default: "free", index: true },
    currentPlan: { type: String, enum: ["free", "starter", "pro", "enterprise"], default: "free", index: true },
    planStartedAt: Date,
    planExpiresAt: Date,
    subscriptionStatus: { type: String, enum: ["active", "expired", "cancelled", "pending_payment", "grace_period"], default: "active", index: true },
    billingPeriod: { type: String, enum: ["free", "monthly", "yearly", "custom"], default: "free" },
    planLimits: Schema.Types.Mixed,
    isBanned: { type: Boolean, default: false, index: true },
    authNonce: { type: String, index: true },
    lastLoginAt: Date
  },
  { timestamps: true }
);

userSchema.index({ email: 1, primaryWalletAddress: 1 });
userSchema.index({ primaryWallet: 1 }, { unique: true, sparse: true });
userSchema.index({ createdAt: -1 });

userSchema.methods.setPassword = async function setPassword(password: string) {
  this.passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? 12));
};

userSchema.methods.verifyPassword = function verifyPassword(password: string) {
  return bcrypt.compare(password, this.passwordHash ?? "");
};

export type UserDocument = InferSchemaType<typeof userSchema> & {
  setPassword(password: string): Promise<void>;
  verifyPassword(password: string): Promise<boolean>;
};

export const User = model("User", userSchema);
