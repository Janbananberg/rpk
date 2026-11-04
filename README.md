# RPK

Pingisturneringsappen: turneringsträd, highscore med Elo och en adminsida med temaväljare.
React 18 + Vite + Tailwind, med LKAB:s färgteman.

## Kom igång

```bash
npm install
npm run dev
```

Appen körs på <http://localhost:5173>.

## Backend

Appen körs som en Cloudflare Worker (`wrangler.jsonc`). Den byggda appen i `dist/` serveras
som statiska filer, och allt under `/api/*` går till backenden i `worker/`, som sparar i
databasen D1. Tabellen skapas av sig själv vid första anropet.

- `src/app/components/api.tsx` anropar adressen i `VITE_API_URL`, som är `/api` i
  produktionsbygget (`.env.production`).
- Varje push till `main` byggs och publiceras av Cloudflare.
- Adminlösenordet är hemligheten `ADMIN_PASSWORD` i Cloudflare (Worker `rpk` → Settings →
  Variables and Secrets). Saknas den gäller `plingplong`. Lösenordet kontrolleras av servern och
  finns inte i det publicerade JavaScriptet.
- Klienterna frågar `/api/version` var 30:e sekund och hämtar bara data när något har ändrats.
- `GET /api/stats?month=total` (eller `YYYY-MM`) är ett öppet statistik-API.

`npm run dev` har ingen backend, så ingenting sparas där. Hela kedjan med en lokal databas körs
med `npm run dev:full` på <http://127.0.0.1:8787>.

## Skript

| Skript | Gör |
|---|---|
| `npm run dev` | Startar utvecklingsservern (utan backend) |
| `npm run dev:full` | Bygger och kör appen med backend och lokal databas |
| `npm run build` | Bygger till `dist/` |
| `npm run preview` | Serverar det byggda resultatet |
| `npm run typecheck` | Kör TypeScript utan att bygga |
| `npm run lint` | Kör ESLint |
| `npm test` | Kör testerna med Vitest |
| `npm run check` | Typer, lint och tester i ett svep |

Testerna ligger i `src/test/` och täcker spellogiken: setvinster, Elo, pottfördelning och
inbördes möten.
