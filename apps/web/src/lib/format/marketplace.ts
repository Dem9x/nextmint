import { formatEther } from "viem";

export function formatWeiEth(value?: string | null) {
  if (!value) return "-";
  try {
    const formatted = formatEther(BigInt(value));
    const [whole, decimals = ""] = formatted.split(".");
    const trimmed = decimals.slice(0, 4).replace(/0+$/, "");
    return `${trimmed ? `${whole}.${trimmed}` : whole} ETH`;
  } catch {
    return "-";
  }
}

export function shortAddress(address?: string) {
  return address && address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address ?? "Unknown";
}

export function formatMarketplaceDate(date?: string) {
  if (!date) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function activityLabel(activity: { type: string; price?: string }) {
  if (activity.type === "listed") return `Listed for ${formatWeiEth(activity.price)}`;
  if (activity.type === "sold") return `Sold for ${formatWeiEth(activity.price)}`;
  if (activity.type === "cancelled") return "Listing cancelled";
  return activity.type;
}
