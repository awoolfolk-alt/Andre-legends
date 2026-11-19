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
open the Typing Dojo, Quiz & spaced review, Terminal Ops, PowerShell Ops,
Phish Hunt, SQL Detective, Packet Lab, Found Device, SOC Shift, or Cohort
Commons. The quiz deck has original practice questions for formats F1–F20;
review progress and missed-card counts are saved in this browser. Terminal and
PowerShell Ops use fictional in-memory systems and never invoke the computer's
shell or touch real files. Phish Hunt uses 40 original, fictional messages and teaches safe
verification without requiring players to open links. SQL Detective uses
sql.js with generated fictional records, a read-only database, and a
parameterized login-injection lesson. Packet Lab provides a three-pane fake
capture viewer with separate Wireshark-style display and BPF capture filters.
The Cohort Commons migration is
`supabase/migrations/20261119000000_cyberprep_cohort.sql`; apply it in the
Supabase SQL editor before using shared features. Sharing is opt-in and exposes
only a chosen display name and aggregate study stats, never an email, password,
or game save. Found Device contains ten original workplace scenarios with best,
acceptable, and risky responses, plain-language coaching, and links to the
simulated command labs. SOC Shift includes an alert queue, SPL/UDM-style search
over fictional events, triage/playbook practice, a local Field Journal, and a
fixed hint assistant that never makes incident decisions. Incident Commander
walks through The Recipe Redirect, The Phished Intern, The Charging Phone, The
Locked Files, and The Leaky Share. Each case covers detection, a linked
simulated investigation lab, response choices, written prompts for five NIST
CSF functions, a report checklist/model comparison, and lessons learned.
Reports and lessons are saved in the browser's local storage or exported as
Markdown; they are not uploaded. The quiz also includes a 90-question untimed
practice exam with a score report by district and objective. Study-terminal
accessibility settings provide larger text, high contrast, and a practice-timer
toggle; preferences stay in this browser and do not affect the rest of the game.

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