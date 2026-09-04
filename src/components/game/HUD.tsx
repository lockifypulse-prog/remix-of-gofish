import { useState } from "react";
import { useGameStore } from "@/hooks/useGameStore";
import { WEATHER, useWeather, type WeatherKind } from "@/hooks/useWeather";
import { isWeatherMuted, resumeWeatherAudio, setWeatherMuted } from "@/lib/weatherAudio";

export function HUD() {
  const { phase, message, score, totalWeight, last, rodStowed, setRodStowed, setMessage } =
    useGameStore();
  const bite = phase === "bite";
  const kind = useWeather((s) => s.kind);
  const setKind = useWeather((s) => s.setKind);
  const order: WeatherKind[] = ["cerah", "berawan", "berkabut", "hujan", "badai"];
  const [muted, setMuted] = useState(() => isWeatherMuted());

  const toggleSound = () => {
    resumeWeatherAudio();
    const next = !muted;
    setWeatherMuted(next);
    setMuted(next);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none">
      {phase === "caught" && last?.isMonster && (
        <div
          key={score}
          className="animate-monster-flash fixed inset-0 z-50"
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between p-4 sm:p-6">
        <div className="rounded-2xl border border-white/25 bg-slate-900/45 px-4 py-3 text-slate-50 shadow-lg backdrop-blur-md">
          <h1 className="text-base font-semibold tracking-tight sm:text-lg">Pulau Pancing</h1>
          <p className="mt-1 text-xs text-slate-200/80">
            Tangkapan <span className="font-semibold text-slate-50">{score}</span> · Total{" "}
            <span className="font-semibold text-slate-50">{totalWeight} kg</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {last && (
            <div className="rounded-2xl border border-white/25 bg-slate-900/45 px-4 py-3 text-right text-slate-50 shadow-lg backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-widest text-slate-300/80">Terakhir</p>
              <p className="text-sm font-semibold">{last.name}</p>
              <p className="text-xs text-slate-200/80">{last.weight} kg</p>
            </div>
          )}

          <div className="pointer-events-auto rounded-2xl border border-white/25 bg-slate-900/45 p-2 shadow-lg backdrop-blur-md">
            <div className="flex gap-1">
              <button
                onClick={toggleSound}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-white/20"
                aria-pressed={!muted}
                title={muted ? "Nyalakan suara cuaca" : "Matikan suara cuaca"}
              >
                {muted ? "Suara ✕" : "Suara ♪"}
              </button>
              <button
                onClick={() => {
                  if (phase !== "idle") return;
                  const next = !rodStowed;
                  setRodStowed(next);
                  setMessage(
                    next
                      ? "Joran dilepas dan disampirkan di punggung. R untuk memakai lagi."
                      : "Joran dipegang. ENTER / klik kiri untuk melempar.",
                  );
                }}
                disabled={phase !== "idle"}
                className="rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-100 transition-colors hover:bg-white/20 disabled:opacity-40"
                aria-pressed={rodStowed}
                title="Lepas / pakai joran (R)"
              >
                {rodStowed ? "Pakai Joran" : "Lepas Joran"}
              </button>
              {order.map((k) => {
                const active = k === kind;
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={[
                      "rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-colors",
                      active
                        ? "bg-sky-500 text-white shadow-md"
                        : "bg-white/10 text-slate-100 hover:bg-white/20",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {WEATHER[k].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex flex-col items-center gap-3 px-4">
        {bite && (
          <div className="animate-pulse rounded-full bg-red-500/90 px-6 py-2 text-lg font-bold tracking-wide text-white shadow-xl">
            ! SAMBARAN !
          </div>
        )}
        <div className="rounded-full border border-white/25 bg-slate-900/50 px-5 py-2 text-center text-sm text-slate-50 shadow-lg backdrop-blur-md">
          {message}
        </div>
        <p className="text-[11px] text-slate-900/60">
          WASD = jalan · SPASI = lompat · ENTER / klik kiri = lempar &amp; tarik kail · E = naik/turun perahu · R = lepas/pakai joran · klik kanan = putar
          kamera · scroll = zoom
        </p>
      </div>
    </div>
  );
}
