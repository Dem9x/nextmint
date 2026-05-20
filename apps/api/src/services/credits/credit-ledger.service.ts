import { CreditLedger } from "../../models/CreditLedger.js";
import { UserCreditBalance } from "../../models/UserCreditBalance.js";

export async function addCredits(input: {
  userId: string;
  amount: number;
  type: "purchase" | "bonus" | "referral_bonus" | "admin_adjustment" | "refund";
  sourceId?: unknown;
  paid?: boolean;
  metadata?: Record<string, unknown>;
}) {
  const balance = await UserCreditBalance.findOneAndUpdate(
    { userId: input.userId },
    {
      $inc: {
        paidCredits: input.paid ? input.amount : 0,
        bonusCredits: input.paid ? 0 : input.amount,
        lifetimeEarnedCredits: input.amount
      }
    },
    { upsert: true, new: true }
  );
  const total = balance.paidCredits + balance.bonusCredits - balance.lockedCredits;
  await CreditLedger.create({
    userId: input.userId,
    type: input.type,
    amount: input.amount,
    balanceAfter: total,
    sourceId: input.sourceId,
    metadata: input.metadata
  });
  return balance;
}
