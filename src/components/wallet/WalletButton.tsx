import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Wallet } from "lucide-react";
import { robinhoodChain } from "@/lib/chains";
import { useProfileStore } from "@/hooks/useProfileStore";
import { useWalletProfile } from "@/hooks/useWalletProfile";
import { supabase } from "@/integrations/supabase/client";

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Round profile avatar: uploaded photo when available, initials otherwise, with a level badge. */
function ProfileAvatarButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  const profile = useProfileStore((s) => s.profile);
  const loading = useProfileStore((s) => s.loading);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const path = profile?.avatar_url;
    if (!path) {
      setAvatarUrl(null);
      return;
    }
    void supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 24 * 7)
      .then(({ data }) => {
        if (!cancelled) setAvatarUrl(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.avatar_url]);

  const initials = (profile?.display_name || profile?.username || "A").slice(0, 2).toUpperCase();
  const level = profile?.level ?? 1;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={profile?.display_name || profile?.username || "Set up profile"}
      className="pointer-events-auto relative h-11 w-11 shrink-0 rounded-full border border-white/25 bg-slate-900/55 text-sm font-semibold text-slate-50 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900/75 disabled:opacity-60"
    >
      <span className="block h-full w-full overflow-hidden rounded-full">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile picture" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">
            {loading ? "…" : initials}
          </span>
        )}
      </span>
      <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/30 bg-emerald-600 px-1 text-[10px] font-bold leading-none text-white shadow">
        {level}
      </span>
    </button>
  );
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
