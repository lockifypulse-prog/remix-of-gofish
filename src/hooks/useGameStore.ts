import { create } from "zustand";

export type Phase = "idle" | "cast" | "waiting" | "bite" | "reel" | "caught";

export interface FishCatch {
  name: string;
  weight: number;
  color: string;
  isMonster?: boolean;
}

const SPECIES: Array<{ name: string; color: string; min: number; max: number }> = [
  { name: "Ikan Kembung", color: "#8fd0e8", min: 0.3, max: 1.2 },
  { name: "Kakap Merah", color: "#e8734a", min: 1.0, max: 4.5 },
  { name: "Ikan Badut", color: "#f5a623", min: 0.2, max: 0.6 },
  { name: "Tuna Kecil", color: "#5b7fa6", min: 2.0, max: 7.0 },
  { name: "Ikan Layang", color: "#a7e0b0", min: 0.4, max: 1.5 },
];

/** Peluang mendapat monster. 0.5 = mode uji coba; turunkan ke 0.02 untuk versi langka. */
export const MONSTER_CHANCE = 0.5;

const MONSTER: { name: string; color: string; min: number; max: number } = {
  name: "Monster Purba",
  color: "#1e46b4",
  min: 300,
  max: 900,
};

export function rollFish(): FishCatch {
  if (Math.random() < MONSTER_CHANCE) {
    return {
      name: MONSTER.name,
      color: MONSTER.color,
      weight: Number((MONSTER.min + Math.random() * (MONSTER.max - MONSTER.min)).toFixed(1)),
      isMonster: true,
    };
  }
  const s = SPECIES[Math.floor(Math.random() * SPECIES.length)]!;
  return {
    name: s.name,
    color: s.color,
    weight: Number((s.min + Math.random() * (s.max - s.min)).toFixed(2)),
  };
}

interface GameStore {
  phase: Phase;
  message: string;
  score: number;
  totalWeight: number;
  last: FishCatch | null;
  /** true = joran dilepas dan tersampir di punggung */
  rodStowed: boolean;
  setPhase: (p: Phase) => void;
  setMessage: (m: string) => void;
  setRodStowed: (v: boolean) => void;
  toggleRodStowed: () => void;
  landFish: (f: FishCatch) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  phase: "idle",
  message: "Tekan SPASI untuk melempar kail",
  score: 0,
  totalWeight: 0,
  last: null,
  rodStowed: false,
  setPhase: (phase) => set({ phase }),
  setMessage: (message) => set({ message }),
  setRodStowed: (rodStowed) => set({ rodStowed }),
  toggleRodStowed: () => set((s) => ({ rodStowed: !s.rodStowed })),
  landFish: (f) =>
    set((s) => ({
      score: s.score + 1,
      totalWeight: Number((s.totalWeight + f.weight).toFixed(2)),
      last: f,
    })),
}));
