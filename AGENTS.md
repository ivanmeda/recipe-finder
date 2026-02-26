# AGENTS.md — FlavorMap Recipe Finder

> Read this before working on the project. Keep it concise — context window is precious.

## 📋 Overview

| Field | Value |
|-------|-------|
| **What** | Recipe finder app with AI-powered search and i18n support |
| **Tech Stack** | Next.js 16, TypeScript, Tailwind CSS |
| **APIs** | TheMealDB (recipes), OpenAI GPT-4.1-nano (AI search) |
| **Architecture** | App Router, Server Components for data fetch, Client Islands for interactivity |
| **Repo** | [github.com/ivanmeda/recipe-finder](https://github.com/ivanmeda/recipe-finder) |
| **Live URL** | [recipe-finder-dun-nine.vercel.app](https://recipe-finder-dun-nine.vercel.app) |
| **Status** | See [PROJECT-STATUS.md](./PROJECT-STATUS.md) |

---

## 📁 File Structure

```
src/
├── app/
│   ├── page.tsx                    # Home — Server Component, fetches categories
│   ├── HomeClient.tsx              # Client-side home interactions
│   ├── layout.tsx                  # Root layout (fonts, metadata, LangProvider)
│   ├── globals.css                 # Tailwind + custom styles
│   ├── api/ai-search/route.ts     # AI search endpoint (OpenAI GPT-4.1-nano)
│   └── recipe/[id]/
│       ├── page.tsx                # Recipe detail — Server Component
│       └── RecipePageClient.tsx    # Client-side recipe interactions
├── components/
│   ├── Hero.tsx                    # Landing hero section
│   ├── SearchBar.tsx               # Recipe text search
│   ├── AiSearch.tsx                # AI-powered natural language search
│   ├── CategoryGrid.tsx            # Category browsing grid
│   ├── RecipeList.tsx              # Recipe results list
│   ├── RecipeDetail.tsx            # Full recipe view
│   ├── LangProvider.tsx            # i18n context provider
│   ├── LangToggle.tsx              # Language switcher (EN/DE/SR)
│   └── Loader.tsx                  # Loading spinner
├── lib/
│   ├── api.ts                      # TheMealDB API client
│   └── i18n.ts                     # Translation strings
```

---

## 🔧 Development

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # Lint check
```

---

## 🚀 Deployment

- **Platform:** Vercel
- **Deploy:** `vercel --prod --yes --token $VERCEL_TOKEN`
- **URL:** [recipe-finder-dun-nine.vercel.app](https://recipe-finder-dun-nine.vercel.app)

---

## 🔑 Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `OPENAI_API_KEY` | AI search via GPT-4.1-nano | ✅ |

> `.env.local` for dev. Vercel dashboard for prod.

---

## 📐 Conventions

- **Data fetching:** Server Components fetch TheMealDB data, pass as props
- **i18n:** `LangProvider` context + `i18n.ts` translation map (EN/DE/SR)
- **AI search:** Client → `/api/ai-search` route → OpenAI → TheMealDB
- **Components:** PascalCase, one component per file
- **Styling:** Tailwind CSS utility classes
- **Git:** Feature branches, conventional commits, no direct push to main

---

## ⚠️ Gotchas

- TheMealDB free API — no auth needed but limited data set
- AI search route uses OpenAI streaming; needs `OPENAI_API_KEY` or endpoint fails silently
- `LangProvider` must wrap all components that use translations (set in `layout.tsx`)

---

## 🔗 Links

- [PROJECT-STATUS.md](./PROJECT-STATUS.md) — Current status, TODO, changelog
- [README.md](./README.md) — User-facing docs
- [ORACLE-RECOMMENDATION.md](./ORACLE-RECOMMENDATION.md) — Original architecture research
