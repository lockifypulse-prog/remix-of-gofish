/**
 * Large model binaries live on the asset CDN; the repository only keeps a small
 * `public/models/<name>.asset.json` pointer. Layouts may still reference the
 * legacy `/models/<name>` path, so resolve those to the CDN URL at runtime.
 * This works in dev, in production builds, and after clone / remix.
 */
const pointers = import.meta.glob<{ url?: string }>("/public/models/*.asset.json", {
  eager: true,
  import: "default",
});

const byName = new Map<string, string>();
for (const [file, data] of Object.entries(pointers)) {
  const name = file.split("/").pop()?.replace(/\.asset\.json$/, "");
  if (name && data?.url) byName.set(name, data.url);
}

export function resolveModelUrl(url: string): string {
  if (!url.startsWith("/models/")) return url;
  const name = url.slice("/models/".length);
  return byName.get(name) ?? url;
}
