# ShelfSight AI — Frontend

Next.js 14 (App Router) dashboard for **ShelfSight AI: Real-Time Planogram &
Inventory Intelligence**. TypeScript, Tailwind CSS, shadcn-style primitives,
Lucide icons, and a dependency-free type-safe client for the FastAPI backend.

Backend repo: [Shelfsight-AI-…-be](https://github.com/Yaseenyk/Shelfsight-AI-real-time-planogram-and-inventory-intelligence-be)

---

## Quickstart

```bash
npm install
copy .env.local.example .env.local     # cp on Linux/macOS
npm run dev                            # http://localhost:3000
```

Start the backend first (`uvicorn app.main:app --port 8000`). `next.config.mjs`
rewrites `/api/v1/*` to `NEXT_PUBLIC_API_BASE_URL`, so the browser talks to a
same-origin path in development and CORS never enters the picture.

| Script | Does |
| --- | --- |
| `npm run dev` | Dev server with fast refresh |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Overview — phantom-inventory tiles, shelf capture, scan results, live discrepancy alerts |
| `/planogram` | Compliance — layout picker, slot overlay grid, per-slot verdicts (IoU / centre distance) |
| `/freshness` | Fresh / Ripening / Spoiled classification with class-probability meters |
| `/expiry` | Packaging OCR results plus a parser sandbox for raw date strings |
| `/insights` | Local-LLM briefing, Ollama status, and the exact prompt context |

## Layout

```
fe/
├─ app/                  App Router pages + globals.css (design tokens)
│  ├─ layout.tsx         Root shell: sidebar + page slot
│  ├─ page.tsx           Overview dashboard
│  └─ planogram|freshness|expiry|insights/page.tsx
├─ components/
│  ├─ layout/            sidebar · topbar (backend health) · page-shell
│  ├─ dashboard/         metric-card · capture-panel · discrepancy-alerts · planogram-grid
│  └─ ui/                card · button · badge · skeleton · status badges
└─ lib/
   ├─ api/client.ts      fetch wrapper: timeouts, typed ApiError, FastAPI error decoding
   ├─ api/endpoints.ts   one typed function per backend endpoint
   ├─ types/api.ts       mirror of the Pydantic contracts
   ├─ hooks/use-api.ts   useApi (fetch + poll) · useAction (imperative, pending state)
   └─ utils.ts           cn() + number/date/latency formatters
```

## Conventions worth keeping

- **`lib/types/api.ts` is the contract mirror.** When a backend schema changes, edit
  that file first and let `tsc` point at every caller that breaks.
- **Components never call `client.ts` directly** — they import from `endpoints.ts`, so the
  URL surface lives in one place.
- **Status is never colour-alone.** Every status badge ships an icon *and* a text label,
  which keeps screenshots readable in greyscale print and under colour-vision deficiency.
- **Colours come from tokens in `globals.css`**, not hex values in components; the
  success/warning/destructive hues are reserved for state and never reused decoratively.
- **A 503 from the API is expected**, not a bug: it means a model isn't loaded yet.
  `ApiError.isServiceUnavailable` exists so the UI can say so plainly.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000` | FastAPI host (also the rewrite target) |
| `NEXT_PUBLIC_POLL_INTERVAL_MS` | `15000` | Alert-panel poll cadence |
