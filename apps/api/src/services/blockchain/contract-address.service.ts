import { assertSupportedChain } from "../../config/chains.config.js";

export function getPaymentContractAddress(chainId: number) {
  const chain = assertSupportedChain(chainId);
  if (!chain.paymentContract) throw new Error(`Missing payment contract for ${chain.name}`);
  return chain.paymentContract;
}

export function getTreasuryAddress(chainId: number) {
  return assertSupportedChain(chainId).treasuryAddress;
}
