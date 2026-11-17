# Calrentar frontend

Next.js catalog UI. Run the backend and seed its demo catalog first, then:

```sh
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL` defaults to `http://localhost:3001/api`. The home page loads countries and branches from the API, then lists real branch offers. Offer links show the stored vehicle features, branch timezone, and branch-specific rates. No quote or availability is calculated in this phase.

```sh
npx tsc --noEmit
npm run lint
npm run build
```
