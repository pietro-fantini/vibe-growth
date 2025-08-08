## Vibe Growth

Live site: [https://vibe-growth.lovable.app/](https://vibe-growth.lovable.app/)

A simple, delightful way to track goals and subgoals with monthly progress. Sign in with email/password or Google, add goals, and monitor progress with charts.

### Quick start

- **Prerequisites**: Node.js 18+ and npm
- **Install dependencies**:
```sh
npm install
```
- **Environment variables**: create a `.env.local` file in the project root (override the defaults used in development/demo):
```sh
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
- **Start the dev server**:
```sh
npm run dev
```
- **Build for production**:
```sh
npm run build
```
- **Preview the production build**:
```sh
npm run preview
```
- **Lint**:
```sh
npm run lint
```

### Tech stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (Auth + Postgres)
- TanStack Query
- Recharts

### Useful scripts

- `dev`: start Vite in development mode
- `build`: create a production build
- `preview`: preview the production build locally
- `lint`: run ESLint

### Optional: Supabase for local development

If you want to run the database and auth locally, set up Supabase for your environment and then point the app to your local project by setting `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. Migrations and edge functions live under `supabase/`.
