# นัดโตะ (NATTO) — MVP Demo

AI-powered B2B Partner Intelligence & Visit Recommendation demo (Thai UI). **All data is synthetic (DEMO DATA).**

## Run

```bash
npm install
npm run dev          # app: http://localhost:5173/  · presentation: /presentation.html
npm run build        # static site in dist/ (index.html + presentation.html)
```

## Live (GitHub Pages)

- App: https://narongdechpas-coder.github.io/natto/
- Presentation: https://narongdechpas-coder.github.io/natto/presentation.html
- Redeploy after changes: `npm run deploy` (builds and force-pushes `dist/` to the `gh-pages` branch)

## Checks

```bash
npm test             # engine + dataset unit tests (vitest)
npx vite preview --port 4173   # in another shell, then:
npm run e2e          # Marketing + Manager/Executive browser walkthroughs (Playwright)
npm run check:deck   # renders every slide, checks overflow and reading mode
npm run report       # dataset / recommendation review table
```

## Structure

- `src/data/` — deterministic synthetic dataset (42 partners, 12 months, visits, feedback)
- `src/engine/` — rule-based scoring, opportunity formulas, Thai explanation templates, scenarios, 7P suggestion
- `src/state/` — localStorage overlay (demo actions), role scoping, management aggregations
- `src/screens/` — Marketing (M01–M06) and Manager/Executive (M07–M08) screens
- `src/presentation/` — HTML deck for Head of Marketing (uses the same dataset)
- `docs/phase1-review.md` — dataset, scoring rules and open decisions

Weights, thresholds and formulas in `src/engine/config.ts` are demo assumptions pending Business Owner approval.
