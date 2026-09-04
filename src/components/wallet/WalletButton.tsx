import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { User, Wallet } from "lucide-react";
import { robinhoodChain } from "@/lib/chains";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useWalletProfile } from "@/hooks/useWalletProfile";

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { authenticate } = useWalletProfile();
  const profile = useProfileStore((s) => s.profile);
  const loading = useProfileStore((s) => s.loading);
  const setPanelOpen = useProfileStore((s) => s.setPanelOpen);

  const wrongNetwork = isConnected && chainId !== robinhoodChain.id;
  const connector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  const pill =
    "pointer-events-auto rounded-full border border-white/25 bg-slate-900/55 px-4 py-2 text-sm font-medium text-slate-50 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900/75 disabled:opacity-60";

  if (!isConnected) {
    return (
      <button
        className={`${pill} flex items-center gap-2`}
        disabled={isPending || !connector}
        onClick={() => connector && connect({ connector, chainId: robinhoodChain.id })}
      >
        <Wallet className="h-4 w-4" aria-hidden />
        {isPending ? "Connecting…" : "Connect Wallet"}
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        className={`${pill} bg-amber-500/80 hover:bg-amber-500`}
        disabled={switching}
        onClick={() => switchChain({ chainId: robinhoodChain.id })}
      >
        {switching ? "Switching…" : "Switch to Robinhood Chain"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className={`${pill} flex items-center gap-2`}
        disabled={loading}
        onClick={async () => {
          if (!profile) {
            const ok = await authenticate();
            if (!ok) return;
          }
          setPanelOpen(true);
        }}
      >
        <User className="h-4 w-4" aria-hidden />
        {loading ? "Loading…" : (profile?.display_name || profile?.username) ?? "Set up profile"}
      </button>
      <button className={pill} onClick={() => disconnect()} title={address}>
        {address ? shorten(address) : "Disconnect"}
      </button>
    </div>
  );
}
