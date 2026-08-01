# AI Studio — Frontend

React (Vite) single-page app for AI Studio.

## Stack

- React + Vite (JavaScript)
- React Router
- Tailwind CSS
- Axios (with automatic JWT refresh on 401)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template:

   ```bash
   cp .env.example .env.local
   ```

   `VITE_API_URL` should point at the backend's `/api` base
   (`http://localhost:4000/api` by default).

3. Start the dev server:

   ```bash
   npm run dev
   ```

   Opens on `http://localhost:5173`. The backend must be running (see
   `../backend/README.md`) for anything beyond the landing page to work.

## Project structure

```
src/
  api/         axios client + per-resource API modules
  components/  shared UI (Layout, ProtectedRoute)
  context/     AuthContext (user/session state)
  pages/       route-level pages (Login, Dashboard, GenerateImage, ...)
```

## Routes

| Path | Page | Auth required |
|---|---|---|
| `/` | Landing page | No |
| `/login`, `/register` | Auth | No |
| `/dashboard` | Credit balance + quick actions | Yes |
| `/generate/image` | Image generation | Yes |
| `/generate/video` | Video generation (polling) | Yes |
| `/billing`, `/billing/success`, `/billing/cancel` | Stripe checkout | Yes (billing only) |
| `/history` | Past generations | Yes |
