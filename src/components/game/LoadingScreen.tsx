import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import banner from "@/assets/loading-banner.jpg";

/**
 * Full-screen loading overlay shown while the ~27 MB of GLB models download
 * and the Draco decoder finishes. Fades out once assets are ready.
 */
export function LoadingScreen() {
  const { progress, active } = useProgress();
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active && progress >= 100) {
      const a = window.setTimeout(() => setDone(true), 350);
      const b = window.setTimeout(() => setHidden(true), 1100);
      return () => {
        window.clearTimeout(a);
        window.clearTimeout(b);
      };
    }
    return undefined;
  }, [active, progress]);

  if (hidden) return null;

  const pct = Math.min(100, Math.round(progress));

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950 transition-opacity duration-700 ${
        done ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-3xl px-6">
        <div className="overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
          <img
            src={banner}
            alt="Pemancing di dermaga pulau dengan ikan blok melompat dari laut"
            className="h-auto w-full object-cover"
          />
        </div>

        <div className="mt-6 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-50">Memuat pulau…</h2>
          <p className="mt-1 text-sm text-slate-300/80">
            Menyiapkan laut, dermaga, dan penghuni bawah air
          </p>
        </div>

        {/* Progress bar with a fish swimming along it */}
        <div className="relative mt-7">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-sky-400 transition-[width] duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          <div
            className="absolute -top-4 -translate-x-1/2 transition-[left] duration-300 ease-out"
            style={{ left: `${pct}%` }}
          >
            <span className="animate-fish-swim block text-2xl leading-none drop-shadow">🐟</span>
          </div>
        </div>

        <p className="mt-4 text-center text-sm font-medium tabular-nums text-sky-300">{pct}%</p>
      </div>
    </div>
  );
}
