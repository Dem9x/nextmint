import { Schema, model, Types } from "mongoose";

const userCreditBalanceSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    paidCredits: { type: Number, default: 0 },
    bonusCredits: { type: Number, default: 0 },
    lockedCredits: { type: Number, default: 0 },
    lifetimeEarnedCredits: { type: Number, default: 0 },
    lifetimeSpentCredits: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const UserCreditBalance = model("UserCreditBalance", userCreditBalanceSchema);
