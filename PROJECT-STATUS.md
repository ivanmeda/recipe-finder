# PROJECT-STATUS.md

## 📋 Project Overview

| Field | Value |
|-------|-------|
| **Name** | FlavorMap Recipe Finder |
| **Description** | Recipe search app with AI-powered search, Serbian localization, and category browsing via TheMealDB API |
| **Tech Stack** | Next.js 16 (App Router), TypeScript, Tailwind CSS 4, OpenAI API |
| **Repo** | https://github.com/ivanmeda/recipe-finder |
| **Live URL** | https://recipe-finder-ivanmeda.vercel.app |
| **Status** | 🟢 Active |

---

## ✅ Completed

- `2026-02-26` — Project scaffolding: Next.js 16 + TypeScript + Tailwind CSS 4
- `2026-02-26` — TheMealDB API integration (categories, meals by category, search, recipe detail)
- `2026-02-26` — Home page with category grid, search bar, recipe list
- `2026-02-26` — Recipe detail page (`/recipe/[id]`)
- `2026-02-26` — AI-powered search via OpenAI (`/api/ai-search`)
- `2026-02-26` — Serbian/English language toggle (i18n with LangProvider)
- `2026-02-26` — Component library: Hero, CategoryGrid, RecipeList, SearchBar, AiSearch, RecipeDetail, Loader, LangToggle
- `2026-02-26` — Initial deployment to Vercel
- `2026-02-26` — GitHub repo created at ivanmeda/recipe-finder
- `2026-02-26` — Oracle research: AI search fallback, Serbian localization fixes, geolocation recommendations

---

## 🔄 In Progress

- AI search fallback for dishes not in TheMealDB (burek, sarma, etc.) (@vulcan — Oracle recommendation delivered)
- Serbian language not applied to AI-generated results (@vulcan — Oracle recommendation delivered)

---

## 📝 TODO / Backlog

- 🔴 Fix AI search — include original query term before AI translation (loses exact matches like "burek")
- 🔴 AI-generated recipe fallback when TheMealDB returns zero results
- 🔴 Serbian localization for AI search results
- 🟡 Geolocation-based recipe recommendations (new feature)
- 🟡 Add shadcn/ui components (currently using plain Tailwind)
- 🟡 Add react-hook-form + zod for search validation
- 🟡 Add TanStack Query for client-side data fetching
- 🟢 Favorites / bookmarking feature
- 🟢 Meal planning / weekly menu
- 🟢 Share recipe functionality
- 🟢 PWA support

---

## 📊 Changelog

- `2026-02-26` — 🚀 **Deployed to production** (Vercel) — initial launch
- `2026-02-26` — `ae4bb0d` chore: redeploy with updated env
- `2026-02-26` — Oracle delivered architecture recommendation for 3 items (AI search fallback, Serbian i18n, geolocation)

---

## 🐛 Known Issues / Bugs

- [ ] AI search over-translates dish names, losing exact TheMealDB matches (e.g., "burek" → "phyllo pastry") — reported 2026-02-26
- [ ] Serbian language not applied to AI-generated search results — reported 2026-02-26
