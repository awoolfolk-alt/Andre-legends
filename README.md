# Andre-legends

## Run locally

Install dependencies and start the development server on port `3001` so it
doesn't conflict with other projects running on your computer:

```bash
npm ci
npm run dev
```

Open `http://localhost:3001/game` to play. The game runs locally on your
computer; this does not publish it to the internet.

Curriculum seed data is stored as editable JSON under
`src/game/data/content/seeds/`. The schemas and runtime validation are in
`src/game/data/content/`; invalid records or duplicate IDs stop loading with a
specific validation error.

## Cybersecurity study terminal

Enter the Security+ training building in the game and use **Study Menu** to
open the Typing Dojo, Quiz & spaced review, or Terminal Ops. The quiz deck has
original practice questions for formats F1–F20; review progress and missed-card
counts are saved in this browser. Terminal Ops runs against a fictional
in-memory filesystem and never invokes the computer's shell or touches real
files.

Run the automated checks with:

```bash
npm test
npm run typecheck
```

## Deploy to GitHub Pages

This repository builds as a static Next.js site; the Dockerfile is for a separate
Node.js server deployment and is not used by GitHub Pages.

1. In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Push to the `main` branch. The workflow builds and publishes the contents of
   `out/` to `https://awoolfolk-alt.github.io/Andre-legends/`.
3. The game route is `https://awoolfolk-alt.github.io/Andre-legends/game/`.

To make a static export locally, run `bash build-pages.sh`. It writes the export
to `out/`; the `BASE_PATH` must stay `/Andre-legends` for the repository Pages URL.