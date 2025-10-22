<!-- .github/copilot-instructions.md - guidance for AI coding agents working on this repository -->

# Quick agent guide — claude-auth-hub

This project is a Vite + React + TypeScript single-page app with a Supabase integration and serverless Deno functions under `supabase/functions/`.

Keep suggestions concrete and code-focused. Prefer small, safe edits and automatic tests or manual verification steps when changing runtime behavior.

```instructions
<!-- .github/copilot-instructions.md - guidance for AI coding agents working on this repository -->

# Quick agent guide — claude-auth-hub (updated Oct 2025)

This is a Vite + React + TypeScript SPA that integrates Supabase for auth/storage and includes serverless Deno functions under `supabase/functions/` used for AI/chat workflows.

Keep edits small and verifiable. Prefer changes that are self-contained and include a quick verification plan (how to run locally and example requests/responses).

Key architecture & entry points
- Frontend entry: `src/main.tsx` -> `src/App.tsx` (React Router; protected routes use the `useAuth` hook in `src/hooks/useAuth.tsx`).
- Pages: `src/pages/` (notably `Index.tsx` contains the genogram/canvas logic; `Auth.tsx` handles login flows).
- Supabase client: `src/integrations/supabase/client.ts` (uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, stores session in localStorage).
- UI primitives: `src/components/ui/*` — shadcn-ui + Radix patterns (forward refs, explicit props, TypeScript types). Use existing components for consistency.
- Serverless functions: `supabase/functions/*` are Deno handlers. `chat/index.ts` implements chat streaming and external AI gateway calls (expects env var `LOVABLE_API_KEY`). Functions return JSON or text/event-stream; preserve CORS headers.

Important developer workflows
- Start dev server: `npm run dev` (Vite server on port 8080 as configured in `vite.config.ts`).
- Build: `npm run build` or `npm run build:dev` (the latter uses Vite's development mode build).
- Lint: `npm run lint` (ESLint). There are no unit tests in the repo by default — add targeted tests only when changing public behavior.

Project-specific conventions & patterns
- TypeScript-first: prefer explicit prop interfaces/types and default-export React components (most components follow this pattern).
- Routes: add new routes in `src/App.tsx` above the catch-all `*` route so they are reachable.
- Supabase usage: always import the shared client from `src/integrations/supabase/client.ts`; the client is considered generated/authoritative.
- UI: use components under `src/components/ui/*` for consistent styling and behavior (they wrap Radix + shadcn primitives).
- Genogram logic: the interactive canvas and family-template data live in `src/pages/Index.tsx` and `src/data/genogramTemplates.ts` — be cautious when changing coordinate/layout logic.

Integration points & secrets
- Frontend env: Vite env vars must be prefixed with `VITE_` (see `src/integrations/supabase/client.ts`).
- Serverless env: Deno functions expect env vars such as `LOVABLE_API_KEY`. Do not commit secrets — reference the env var names in PRs and include a test plan describing how to inject them locally.

When touching AI/chat serverless code
- Small prompt edits are fine. For larger prompt/tool changes run the function locally in a Deno environment and validate streaming outputs.
- The chat function includes parsing of tool-calls and streaming responses; add small log statements and unit-style parsing tests when modifying extraction logic.

Concrete examples
- Add a route: edit `src/App.tsx` and add a `<Route path="/my" element={<MyPage />} />` above the `*` route; add `src/pages/MyPage.tsx` with a default export component.
- Use Supabase: import `supabase` from `src/integrations/supabase/client.ts` and call `supabase.auth.getSession()` or `supabase.auth.signInWithOAuth()` as shown in `src/pages/Auth.tsx`.
- Edit the chat function: update prompts in `supabase/functions/chat/index.ts` and test by invoking the function locally (preserve CORS headers defined in the file).

Quality gates & acceptance
- Keep runtime changes minimal. Include a short verification section in PRs: how to run (`npm run dev`), which pages or endpoints to exercise, and expected outputs.
- If you modify serverless functions, include example request bodies and an example response (or a curl command) in the PR description.

If you need more info
- Inspect `README.md`, `package.json`, and `vite.config.ts` for scripts and environment config.
- Ask maintainers for missing env var names, generator scripts used for the Supabase client, or preferred local Deno testing steps.

Feedback
- After applying these instructions, tell me which area (auth, functions, front-end UI) you'd like more detail on and I'll expand the guide.

```
