import { nanoid } from "nanoid";
import { Referral } from "../../models/Referral.js";
import { User } from "../../models/User.js";
import { AppError } from "../../middleware/error.js";

export function makeReferralCode() {
  return nanoid(8).toUpperCase();
}

export async function ensureReferralCode(userId: string) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, "User not found");
  if ((user as any).referralCode) return (user as any).referralCode as string;
  const code = makeReferralCode();
  user.set("referralCode", code);
  await user.save();
  return code;
}

export async function applyReferralCode(referredUserId: string, code?: string) {
  if (!code) return undefined;
  const referrer = await User.findOne({ referralCode: code.toUpperCase() });
  if (!referrer) return undefined;
  if (String(referrer._id) === referredUserId) throw new AppError(400, "Self-referral is not allowed");
  const existing = await Referral.findOne({ referredUserId });
  if (existing) return existing;
  return Referral.create({ referrerId: referrer._id, referredUserId, referralCode: code.toUpperCase(), status: "active" });
}
