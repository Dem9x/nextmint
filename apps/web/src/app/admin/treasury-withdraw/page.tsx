"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, Wallet } from "lucide-react";
import { formatEther, isAddress, parseAbi, parseEther, parseUnits, zeroAddress, type Address } from "viem";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChainBadge } from "@/components/web3/ChainBadge";
import { SUPPORTED_TESTNET_CHAINS, getExplorerTxUrl } from "@/config/chains";
import { useNetworkMode } from "@/hooks/useNetworkMode";
import { api } from "@/lib/api";
import { withMinimumDelay } from "@/lib/loading";

const treasuryAbi = parseAbi([
  "function withdrawNative(uint256 amount)",
  "function withdrawToken(address token,uint256 amount)",
  "function owner() view returns (address)",
  "function treasury() view returns (address)"
]);

type WithdrawAccess = {
  allowed: boolean;
  reason: string | null;
  chainId: number;
  chainName: string;
  contractAddress: `0x${string}`;
  treasuryAddress: string;
  contractOwner: string;
  userWallet: string;
  allowedAddresses: string[];
};

export default function TreasuryWithdrawPage() {
  const { address, chainId, isConnected } = useAccount();
  const { selectedChainId, setSelectedChainId, isWrongNetwork, switchToSelectedChain } = useNetworkMode();
  const { writeContractAsync, isPending } = useWriteContract();
  const [access, setAccess] = useState<WithdrawAccess>();
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [assetMode, setAssetMode] = useState<"native" | "erc20">("native");
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("0");
  const [tokenDecimals, setTokenDecimals] = useState(18);
  const [txHash, setTxHash] = useState<`0x${string}`>();

  const contractAddress = access?.contractAddress;
  const { data: nativeBalance } = useBalance({
    address: contractAddress,
    chainId: selectedChainId,
    query: { enabled: Boolean(contractAddress) }
  });

  const canWithdraw = useMemo(() => {
    if (!access?.allowed || !address || !contractAddress) return false;
    if (chainId !== selectedChainId || isWrongNetwork) return false;
    if (assetMode === "erc20" && !isAddress(tokenAddress)) return false;
    return true;
  }, [access, address, assetMode, chainId, contractAddress, isWrongNetwork, selectedChainId, tokenAddress]);

  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      setAccess(undefined);
      return;
    }
    setIsLoading(true);
    setError(undefined);
    withMinimumDelay(api<WithdrawAccess>(`/api/admin/treasury/withdraw-access?chainId=${selectedChainId}&walletAddress=${address}`))
      .then(setAccess)
      .catch((err) => {
        setAccess(undefined);
        setError(err instanceof Error ? err.message : "Treasury withdraw access denied");
      })
      .finally(() => setIsLoading(false));
  }, [address, selectedChainId]);

  async function withdraw() {
    try {
      if (!address) throw new Error("Connect admin wallet first");
      if (!access?.allowed || !contractAddress) throw new Error("Treasury withdraw access denied");
      if (chainId !== selectedChainId || isWrongNetwork) {
        setStatus("Switching network...");
        await switchToSelectedChain();
        setStatus("Network switched. Review details, then withdraw again.");
        return;
      }

      setIsLoading(true);
      setError(undefined);
      setStatus("Waiting for admin wallet signature...");
      const value = amount.trim() === "" || amount.trim() === "0"
        ? 0n
        : assetMode === "native"
          ? parseEther(amount)
          : parseUnits(amount, tokenDecimals);

      const hash = assetMode === "native"
        ? await writeContractAsync({ address: contractAddress, abi: treasuryAbi, functionName: "withdrawNative", args: [value] })
        : await writeContractAsync({ address: contractAddress, abi: treasuryAbi, functionName: "withdrawToken", args: [tokenAddress as Address, value] });
      setTxHash(hash);
      await withMinimumDelay(Promise.resolve(hash));
      setStatus("Withdraw transaction submitted. Track it in the explorer.");
    } catch (err) {
      setStatus(undefined);
      setError(err instanceof Error ? err.message : "Withdraw failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <SiteHeader />
      <AuthGuard adminOnly>
        <section className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase text-rose">Hidden admin control</p>
              <h1 className="mt-2 text-4xl font-black">Treasury Contract Withdraw</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted">
                This page is hidden from normal navigation and requires both admin role and the connected deployer/owner wallet.
              </p>
            </div>
            <ChainBadge chainId={selectedChainId} />
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[340px_1fr]">
            <div className="rounded-lg border border-white/10 bg-panel p-5">
              <h2 className="flex items-center gap-2 text-lg font-bold"><Wallet size={18} /> Network</h2>
              <select
                className="mt-4 w-full rounded-md border border-white/10 bg-black/40 p-3"
                value={selectedChainId}
                onChange={(event) => setSelectedChainId(Number(event.target.value))}
              >
                {SUPPORTED_TESTNET_CHAINS.map((chain) => <option key={chain.id} value={chain.id}>{chain.name}</option>)}
              </select>
              <div className="mt-4 space-y-2 text-sm text-muted">
                <p>Connected wallet: <span className="break-all text-white">{address ?? "Not connected"}</span></p>
                <p>Wallet chain: <span className="text-white">{chainId ?? "Not connected"}</span></p>
                <p>Native contract balance: <span className="text-white">{nativeBalance ? `${formatEther(nativeBalance.value)} ${nativeBalance.symbol}` : "Unavailable"}</span></p>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-panel p-5 shadow-glow">
              <h2 className="flex items-center gap-2 text-lg font-bold"><ShieldAlert size={18} /> Access Guard</h2>
              {isLoading && <p className="mt-4 rounded-md border border-cyan/20 bg-cyan/10 p-3 text-sm text-cyan">Checking admin wallet for 5 seconds...</p>}
              {error && <p className="mt-4 rounded-md border border-rose/30 bg-rose/10 p-3 text-sm text-rose">{error}</p>}
              {!isConnected && <p className="mt-4 rounded-md border border-yellow-300/20 bg-yellow-400/10 p-3 text-sm text-yellow-100">Connect the admin/deployer wallet first.</p>}
              {access && (
                <div className="mt-4 grid gap-3 text-sm">
                  <p className="break-all rounded-md bg-white/5 p-3">Payment contract: <span className="text-cyan">{access.contractAddress}</span></p>
                  <p className="break-all rounded-md bg-white/5 p-3">Treasury receiver: <span className="text-cyan">{access.treasuryAddress}</span></p>
                  <p className="break-all rounded-md bg-white/5 p-3">Contract owner: <span className="text-cyan">{access.contractOwner}</span></p>
                  <p className="rounded-md border border-lime/30 bg-lime/10 p-3 text-lime">Access approved for this admin wallet.</p>
                </div>
              )}

              <div className="mt-6 grid gap-4">
                <label className="text-sm text-muted">
                  Asset
                  <select className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={assetMode} onChange={(event) => setAssetMode(event.target.value as "native" | "erc20")}>
                    <option value="native">Native gas token</option>
                    <option value="erc20">ERC20 token</option>
                  </select>
                </label>
                {assetMode === "erc20" && (
                  <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
                    <label className="text-sm text-muted">
                      Token contract address
                      <input className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={tokenAddress} onChange={(event) => setTokenAddress(event.target.value)} placeholder={zeroAddress} />
                    </label>
                    <label className="text-sm text-muted">
                      Decimals
                      <input className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" type="number" min={0} max={36} value={tokenDecimals} onChange={(event) => setTokenDecimals(Number(event.target.value))} />
                    </label>
                  </div>
                )}
                <label className="text-sm text-muted">
                  Amount
                  <input className="mt-2 w-full rounded-md border border-white/10 bg-black/40 p-3 text-white" value={amount} onChange={(event) => setAmount(event.target.value)} />
                  <span className="mt-2 block text-xs">Use 0 to withdraw the full contract balance for the selected asset.</span>
                </label>
                <Button className="w-full bg-rose text-white hover:brightness-110" disabled={!canWithdraw || isLoading || isPending} onClick={withdraw}>
                  {isLoading || isPending ? "Processing Withdraw..." : "Withdraw From Contract"}
                </Button>
                {status && <p className="rounded-md border border-cyan/20 bg-cyan/10 p-3 text-sm text-cyan">{status}</p>}
                {txHash && (
                  <a className="rounded-md border border-cyan/40 px-4 py-3 text-center text-sm font-semibold text-cyan hover:bg-cyan/10" href={getExplorerTxUrl(selectedChainId, txHash)} target="_blank" rel="noreferrer">
                    View Withdraw Transaction
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </AuthGuard>
    </main>
  );
}
