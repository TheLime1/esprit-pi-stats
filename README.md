# ESPRIT PI Stats

A searchable index of ESPRIT integrated-project repositories on GitHub. The dashboard reads a public snapshot. Visitors can search projects, owners and contributors, sort the directory, explore class and contributor rankings, or present five summary slides.

[Open the dashboard](https://thelime1.github.io/esprit-pi-stats/)

## Run the dashboard

Use Node.js 24 (or 22.12+) and npm.

```sh
npm ci
npm run dev
```

Run `npm run build` to produce the static site in `dist/`. Run `npm run preview` to serve the production build locally.

The UI uses React and Vite, with locally adapted [Aceternity UI Bento Grid](https://ui.aceternity.com/components/bento-grid) and [grid background](https://ui.aceternity.com/components/grid-and-dot-backgrounds) components. Fonts and assets ship with the build. Search uses an in-memory index, the directory renders twelve rows per page, and the analytics and presentation modules load when opened.

## Data collection

The collector searches public GitHub repositories created since 2025, filters by the ESPRIT project naming convention, and groups common frontend/backend variants under a single project entry. The snapshot records the representative repository's owner, creation date, stars and contributor logins. Class rankings use identifiable class codes in repository names.

```sh
python -m pip install -e .
esprit-tracker all-repos
esprit-tracker class-repos 3A14
esprit-tracker pi-repos PIDEV
esprit-tracker all-repos --json public/data.json
```

Set `GITHUB_TOKEN` when collecting a full snapshot to use GitHub's authenticated API quota. The dashboard itself needs no token.

## Updates and deployment

The **Refresh repository snapshot** workflow collects data every other Monday at 06:00 UTC, anchored on 16 November 2026. GitHub starts a small weekly schedule check and only runs the collector when due. The workflow also supports a manual refresh on `main`.

Select **GitHub Actions** in **Settings → Pages → Build and deployment → Source** when migrating from branch-based Pages. Pull requests build the site for validation. Changes to `main` and successful snapshot refreshes build and publish `dist/` to Pages.
