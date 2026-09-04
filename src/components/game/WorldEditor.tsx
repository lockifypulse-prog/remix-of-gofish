import { useEffect, useRef, useState } from "react";
import {
  deleteAsset,
  extOf,
  listAssets,
  putAsset,
  SUPPORTED_EXT,
} from "@/lib/assetLibrary";
import { useWorldStore, type EditorMode, type Vec3, type WorldLayout } from "@/hooks/useWorldStore";
import { canBakeToProject, uploadModelToProject } from "@/lib/projectAssets";

const MODES: EditorMode[] = ["translate", "rotate", "scale"];
const MODE_LABEL: Record<EditorMode, string> = {
  translate: "Geser",
  rotate: "Putar",
  scale: "Skala",
};

function NumRow({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: Vec3;
  step: number;
  onChange: (v: Vec3) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-12 shrink-0 text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </span>
      {(["X", "Y", "Z"] as const).map((axis, i) => (
        <label key={axis} className="flex min-w-0 flex-1 items-center gap-1">
          <span className="text-[10px] text-slate-500">{axis}</span>
          <input
            type="number"
            step={step}
            value={Number(value[i]?.toFixed(3) ?? 0)}
            onChange={(e) => {
              const next = [...value] as Vec3;
              next[i] = Number(e.target.value);
              onChange(next);
            }}
            className="w-full min-w-0 rounded-md border border-white/15 bg-slate-950/60 px-1.5 py-1 text-[11px] text-slate-100 outline-none focus:border-sky-400/70"
          />
        </label>
      ))}
    </div>
  );
}

export function WorldEditor() {
  const s = useWorldStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const selected = s.objects.find((o) => o.id === s.selectedId) ?? null;

  useEffect(() => {
    listAssets().then(s.setAssets);
    void useWorldStore.getState().syncFromProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localOnly = s.objects.filter((o) => o.assetId && !o.url).length;

  // Toggle the editor with "P" (avoids the gameplay keys).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.code === "KeyP") {
        e.preventDefault();
        useWorldStore.getState().toggleEditing();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy("Mengunggah…");
    let baked = 0;
    let local = 0;
    const errors: string[] = [];
    for (const f of Array.from(files)) {
      const ext = extOf(f.name);
      if (!SUPPORTED_EXT.includes(ext as (typeof SUPPORTED_EXT)[number])) {
        errors.push(`${f.name}: format tidak didukung`);
        continue;
      }
      // 1) simpan ke kode proyek (public/models/) agar ikut clone/remix
      const res = await uploadModelToProject(f);
      if (res.ok) {
        // If a large binary was rejected by the repository earlier, preserve
        // the recovered transform and reconnect it to the new CDN URL.
        const recovered = useWorldStore
          .getState()
          .objects.find((object) => object.url === res.value.legacyUrl);
        if (recovered) s.updateObject(recovered.id, { url: res.value.url });
        else s.addObject({ name: f.name, url: res.value.url, ext });
        baked += 1;
        continue;
      }
      // 2) fallback: simpan blob di perangkat ini saja — dan beri tahu dengan jelas
      errors.push(`${f.name}: ${res.error}`);
      await putAsset(f);
      local += 1;
    }
    s.setAssets(await listAssets());
    const parts: string[] = [];
    if (baked) parts.push(`${baked} model tersimpan permanen & ditempatkan.`);
    if (local) parts.push(`${local} model HANYA di perangkat ini (tidak ikut clone/remix).`);
    if (errors.length) parts.push(`Gagal bake: ${errors.join("; ")}`);
    setBusy(parts.join(" ") || null);
    if (!errors.length) setTimeout(() => setBusy(null), 4000);
  };

  const onSave = async () => {
    setBusy("Menyimpan ke proyek…");
    const ok = await s.save();
    setBusy(
      ok
        ? "Layout tersimpan ke src/data/worldLayout.json ✔"
        : canBakeToProject
          ? `Gagal menulis ke kode proyek: ${useWorldStore.getState().bakeError ?? "?"}`
          : "Tersimpan di perangkat ini (mode produksi).",
    );
    setTimeout(() => setBusy(null), 4000);
  };

  const onExport = () => {
    const payload: WorldLayout = { version: 1, objects: s.objects };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "world-layout.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onCopyJson = async () => {
    const payload: WorldLayout = { version: 1, objects: s.objects };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setBusy("JSON disalin — tempel ke src/data/worldLayout.json agar ikut saat clone/remix");
    } catch {
      setBusy("Gagal menyalin, gunakan Export JSON");
    }
    setTimeout(() => setBusy(null), 4000);
  };


  const onImport = async (file: File | null) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as WorldLayout;
      if (Array.isArray(parsed.objects)) s.importLayout(parsed.objects);
    } catch {
      setBusy("File layout tidak valid");
      setTimeout(() => setBusy(null), 2000);
    }
  };

  if (!s.editing) {
    return (
      <button
        onClick={() => s.setEditing(true)}
        className="pointer-events-auto fixed bottom-4 left-4 z-30 rounded-xl border border-white/25 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-100 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900/85"
      >
        🛠️ Editor Dunia <span className="ml-1 text-slate-400">(P)</span>
      </button>
    );
  }

  return (
    <div className="pointer-events-auto fixed left-4 top-4 z-30 flex max-h-[92vh] w-[330px] flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-950/85 text-slate-100 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <h2 className="text-sm font-semibold">Editor Dunia</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              s.bakeState === "error"
                ? "bg-rose-500 text-slate-950 hover:bg-rose-400"
                : s.dirty || s.bakeState === "saving"
                  ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                  : "bg-white/10"
            }`}
            title="Autosave aktif — tombol ini memaksa simpan sekarang"
          >
            {s.bakeState === "saving"
              ? "Menyimpan…"
              : s.bakeState === "pending"
                ? "Simpan •"
                : s.bakeState === "error"
                  ? "Coba lagi"
                  : s.dirty
                    ? "Simpan"
                    : "Tersimpan ✓"}
          </button>
          <button
            onClick={() => s.setEditing(false)}
            className="rounded-lg bg-white/10 px-2 py-1 text-[11px] hover:bg-white/20"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {/* ---- assets ------------------------------------------------ */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Aset Model
          </h3>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={SUPPORTED_EXT.map((e) => `.${e}`).join(",")}
            className="hidden"
            onChange={(e) => onUpload(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-lg border border-dashed border-white/25 px-3 py-2 text-[11px] text-slate-300 hover:border-sky-400/70 hover:text-slate-50"
          >
            + Impor file ({SUPPORTED_EXT.join(", ")})
          </button>

          <div className="flex gap-1">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="/models/pulau.glb atau URL"
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1.5 text-[11px] outline-none focus:border-sky-400/70"
            />
            <button
              onClick={() => {
                if (!urlInput.trim()) return;
                const url = urlInput.trim();
                s.addObject({
                  name: url.split("/").pop() ?? url,
                  url,
                  ext: extOf(url) || "glb",
                });
                setUrlInput("");
              }}
              className="rounded-lg bg-sky-500 px-2.5 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-sky-400"
            >
              Tambah
            </button>
          </div>

          <ul className="space-y-1">
            {s.assets.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-900/50 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1 truncate text-[11px]" title={a.name}>
                  {a.name}
                </span>
                <button
                  onClick={() =>
                    s.addObject({ name: a.name, assetId: a.id, ext: a.ext })
                  }
                  className="rounded-md bg-sky-500/90 px-2 py-0.5 text-[10px] font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Tempatkan
                </button>
                <button
                  onClick={async () => {
                    await deleteAsset(a.id);
                    s.setAssets(await listAssets());
                  }}
                  className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] hover:bg-rose-500/80"
                >
                  🗑
                </button>
              </li>
            ))}
            {s.assets.length === 0 && (
              <li className="text-[11px] text-slate-500">Belum ada aset diimpor.</li>
            )}
          </ul>
        </section>

        {/* ---- placed objects ---------------------------------------- */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Objek di Dunia ({s.objects.length})
          </h3>
          <ul className="space-y-1">
            {s.objects.map((o) => (
              <li key={o.id}>
                <button
                  onClick={() => s.select(o.id === s.selectedId ? null : o.id)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-[11px] transition-colors ${
                    o.id === s.selectedId
                      ? "border-sky-400/80 bg-sky-500/20"
                      : "border-white/10 bg-slate-900/50 hover:bg-slate-900/80"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">{o.name}</span>
                  <span className="text-[10px] text-slate-400">{o.ext}</span>
                </button>
              </li>
            ))}
            {s.objects.length === 0 && (
              <li className="text-[11px] text-slate-500">
                Dunia kosong — impor model lalu klik “Tempatkan”.
              </li>
            )}
          </ul>
        </section>

        {/* ---- inspector --------------------------------------------- */}
        {selected && (
          <section className="space-y-2 rounded-xl border border-white/10 bg-slate-900/60 p-2">
            <div className="flex items-center gap-1">
              <input
                value={selected.name}
                onChange={(e) => s.updateObject(selected.id, { name: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-white/15 bg-slate-950/60 px-2 py-1 text-[11px] outline-none focus:border-sky-400/70"
              />
              <button
                onClick={() => s.duplicateObject(selected.id)}
                className="rounded-md bg-white/10 px-2 py-1 text-[10px] hover:bg-white/20"
              >
                Duplikat
              </button>
              <button
                onClick={() => s.removeObject(selected.id)}
                className="rounded-md bg-rose-500/80 px-2 py-1 text-[10px] font-semibold hover:bg-rose-500"
              >
                Hapus
              </button>
            </div>

            <div className="flex gap-1">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => s.setMode(m)}
                  className={`flex-1 rounded-md px-2 py-1 text-[10px] font-semibold ${
                    s.mode === m ? "bg-sky-500 text-slate-950" : "bg-white/10 hover:bg-white/20"
                  }`}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>

            <NumRow
              label="Posisi"
              step={0.5}
              value={selected.position}
              onChange={(position) => s.updateObject(selected.id, { position })}
            />
            <NumRow
              label="Rotasi"
              step={0.05}
              value={selected.rotation}
              onChange={(rotation) => s.updateObject(selected.id, { rotation })}
            />
            <NumRow
              label="Skala"
              step={0.1}
              value={selected.scale}
              onChange={(scale) => s.updateObject(selected.id, { scale })}
            />
            <div className="flex items-center gap-1">
              <span className="w-12 shrink-0 text-[10px] uppercase tracking-wider text-slate-400">
                Skala =
              </span>
              <input
                type="number"
                step={0.1}
                value={Number(selected.scale[0].toFixed(3))}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  s.updateObject(selected.id, { scale: [v, v, v] });
                }}
                className="w-full rounded-md border border-white/15 bg-slate-950/60 px-1.5 py-1 text-[11px] outline-none focus:border-sky-400/70"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-1 text-[11px]">
              {(
                [
                  ["walkable", "Bisa dipijak"],
                  ["solid", "Menghalangi"],
                  ["visible", "Tampil"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selected[key]}
                    onChange={(e) => s.updateObject(selected.id, { [key]: e.target.checked })}
                    className="accent-sky-400"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
        )}

        {/* ---- layout io --------------------------------------------- */}
        <section className="flex flex-wrap gap-1 border-t border-white/10 pt-2">
          <button
            onClick={onExport}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] hover:bg-white/20"
          >
            Export JSON
          </button>
          <button
            onClick={onCopyJson}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] hover:bg-white/20"
          >
            Salin JSON
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => onImport(e.target.files?.[0] ?? null)}
          />

          <button
            onClick={() => importRef.current?.click()}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] hover:bg-white/20"
          >
            Import JSON
          </button>
          <button
            onClick={s.reload}
            className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] hover:bg-white/20"
          >
            Muat Tersimpan
          </button>
          <button
            onClick={s.clearAll}
            className="rounded-lg bg-rose-500/70 px-2.5 py-1 text-[11px] font-semibold hover:bg-rose-500"
          >
            Kosongkan
          </button>
        </section>

        {localOnly > 0 && (
          <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-amber-200">
            {localOnly} objek memakai aset lokal (IndexedDB) dan TIDAK akan ikut clone/remix.
            Impor ulang file-nya lewat “Impor file” agar tersimpan ke public/models/.
          </p>
        )}
        <p className={`text-[10px] leading-relaxed ${s.bakeState === "error" ? "text-rose-300" : "text-slate-400"}`}>
          {busy ??
            (s.bakeState === "error"
              ? `Autosave ke proyek GAGAL: ${s.bakeError}. Perubahan hanya ada di browser ini.`
              : canBakeToProject
                ? "Autosave aktif: setiap perubahan otomatis ditulis ke src/data/worldLayout.json dan model impor ke public/models/ — keduanya ikut saat clone/remix."
                : "Mode produksi: perubahan hanya tersimpan di perangkat ini. Gunakan editor di preview agar dibakar ke kode proyek.")}
        </p>
      </div>
    </div>
  );
}
