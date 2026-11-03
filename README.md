# RPK

Pingisturneringsappen: turneringsträd, highscore med Elo, odds och vadslagning, förslag och
adminsida. React 18 + Vite + Tailwind, med LKAB:s färgteman.

## Kom igång

```bash
npm install
npm run dev
```

Appen körs på <http://localhost:5173>.

## Backend

Appen har ingen backend just nu. All data hämtas och sparas via `src/app/components/api.tsx`,
som anropar adressen i `VITE_API_URL`. Kopiera `.env.example` till `.env` och fyll i
adressen när det finns en backend. Utan den misslyckas alla anrop som läser eller sparar data.

## Skript

| Skript | Gör |
|---|---|
| `npm run dev` | Startar utvecklingsservern |
| `npm run build` | Bygger till `dist/` |
| `npm run preview` | Serverar det byggda resultatet |
| `npm run typecheck` | Kör TypeScript utan att bygga |
| `npm run lint` | Kör ESLint |
| `npm test` | Kör testerna med Vitest |
| `npm run check` | Typer, lint och tester i ett svep |

Testerna ligger i `src/test/` och täcker spellogiken: setvinster, Elo, pottfördelning och
inbördes möten.
