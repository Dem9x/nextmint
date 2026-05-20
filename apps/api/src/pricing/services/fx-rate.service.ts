export function convertUsd(amountUsd: number, rate: number | null | undefined) {
  return typeof rate === "number" && Number.isFinite(rate) ? amountUsd * rate : null;
}
