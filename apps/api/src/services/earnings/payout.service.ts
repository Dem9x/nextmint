import { isAddress } from "viem";
import { CreatorEarning } from "../../models/CreatorEarning.js";
import { CreatorPayout } from "../../models/CreatorPayout.js";
import { User } from "../../models/User.js";
import { AppError } from "../../middleware/error.js";
import { getPlatformSettings } from "../platform-settings.service.js";

export async function getAvailableEarningsUsd(creatorId: string) {
  const result = await CreatorEarning.aggregate([
    { $match: { creatorId: creatorId as any, status: "available" } },
    { $group: { _id: null, usd: { $sum: "$netAmountUsd" } } }
  ]);
  return result[0]?.usd ?? 0;
}

export async function requestPayout(input: { creatorId: string; chainId: number; token: string; walletAddress: string }) {
  if (!isAddress(input.walletAddress)) throw new AppError(400, "Invalid payout wallet");
  const user = await User.findById(input.creatorId).lean();
  if (!user) throw new AppError(404, "User not found");
  if (user.primaryWalletAddress && user.primaryWalletAddress !== input.walletAddress.toLowerCase()) throw new AppError(400, "Payout wallet must match connected wallet");
  const settings = await getPlatformSettings();
  const amountUsd = await getAvailableEarningsUsd(input.creatorId);
  if (amountUsd < settings.minimumPayoutUsd) throw new AppError(400, `Minimum payout is $${settings.minimumPayoutUsd}`);
  return CreatorPayout.create({
    creatorId: input.creatorId,
    chainId: input.chainId,
    payoutWallet: input.walletAddress.toLowerCase(),
    token: input.token,
    amountUsd,
    status: settings.payoutReviewRequired ? "requested" : "approved"
  });
}

export async function updatePayoutStatus(id: string, status: "approved" | "rejected" | "paid", adminId: string, data: { txHash?: string; rejectionReason?: string } = {}) {
  const update: Record<string, unknown> = { status, reviewedByAdminId: adminId };
  if (status === "paid") update.paidAt = new Date();
  if (data.txHash) update.txHash = data.txHash.toLowerCase();
  if (data.rejectionReason) update.rejectionReason = data.rejectionReason;
  const payout = await CreatorPayout.findByIdAndUpdate(id, update, { new: true });
  if (!payout) throw new AppError(404, "Payout not found");
  return payout;
}
