# Andre-legends

## Run locally

Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Deploy to GitHub Pages

This repository builds as a static Next.js site; the Dockerfile is for a separate
Node.js server deployment and is not used by GitHub Pages.

1. In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to the `main` branch. The workflow builds and publishes the contents of
   `out/` to `https://awoolfolk-alt.github.io/Andre-legends/`.
3. The game route is `https://awoolfolk-alt.github.io/Andre-legends/game/`.

To make a static export locally, run `bash build-pages.sh`. It writes the export
to `out/`; the `BASE_PATH` must stay `/Andre-legends` for the repository Pages URL.