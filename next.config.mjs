/** @type {import('next').NextConfig} */
// ─────────────────────────────────────────────────────────────
// ONE PROJECT, TWO WAYS TO SERVE IT
//
//   Docker / Kimi / Render (default):  npm run build && npm start
//     The full Next.js server. Nothing else to configure.
//
//   GitHub Pages (static):  STATIC_EXPORT=1 BASE_PATH=/awoolfolk/game npm run build
//     Exports plain HTML/JS/CSS into out/. No server needed — Pages just
//     hosts files. BASE_PATH is where the game lives on the site (the
//     portfolio holds the repo root /awoolfolk, the game sits under it at
//     /awoolfolk/game) so asset links like /assets/andre-title.png become
//     /awoolfolk/game/assets/... and keep working.
//
// WHY images.unoptimized? Next's image optimizer needs a running server.
// On static hosting the browser loads the image files as-is (they're
// already small), so we turn the optimizer off for the export.
// ─────────────────────────────────────────────────────────────
const isStatic = process.env.STATIC_EXPORT === "1";

const nextConfig = {
  reactStrictMode: false, // Strict mode mounts twice in dev, which would boot Phaser twice.
  ...(isStatic
    ? {
        output: "export",
        basePath: process.env.BASE_PATH || "",
        images: { unoptimized: true },
        // trailingSlash makes Pages serve /game/index.html when a visitor
        // opens /game directly (Pages has no server rewrites).
        trailingSlash: true,
      }
    : {}),
};
export default nextConfig;
