# 🍳 FlavorMap — Discover Recipes, Powered by AI

> Your smart kitchen companion. Browse thousands of recipes by category, search by name, or describe what you're craving — AI finds the perfect match.

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-Visit_FlavorMap-FF6B35?style=for-the-badge&logo=vercel&logoColor=white)](https://recipe-finder-dun-nine.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Source_Code-181717?style=for-the-badge&logo=github)](https://github.com/ivanmeda/recipe-finder)

---

## 🚀 Live Demo

**👉 [https://recipe-finder-dun-nine.vercel.app](https://recipe-finder-dun-nine.vercel.app)**

---

## 📸 Screenshots

> _Screenshots coming soon — stay tuned!_

<!-- Add screenshots here:
![Home Page](./docs/screenshots/home.png)
![Recipe Detail](./docs/screenshots/detail.png)
![AI Search](./docs/screenshots/ai-search.png)
-->

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🥩 **Browse by Category** | Explore recipes across categories — Beef, Chicken, Pasta, Seafood, Dessert, Vegan, and more |
| 🔍 **Search by Name** | Instantly find recipes by typing a dish name |
| 🤖 **AI Smart Search** | Describe what you're craving in natural language and AI finds matching recipes |
| 📖 **Full Recipe Detail** | Ingredients with images, step-by-step instructions, YouTube video embed, and original source link |
| 🇷🇸🇬🇧 **Serbian / English Toggle** | Full UI translation — switch languages with one click |
| 📱 **Mobile-First Design** | Responsive, kitchen-friendly layout that works on any device |

---

## 🛠 Tech Stack

| Technology | Purpose |
|-----------|---------|
| [Next.js 16](https://nextjs.org/) (App Router) | React framework with server components & API routes |
| [TypeScript](https://www.typescriptlang.org/) | Type-safe development |
| [Tailwind CSS 4](https://tailwindcss.com/) | Utility-first styling |
| [TheMealDB API](https://www.themealdb.com/api.php) | Recipe data source (categories, meals, ingredients) |
| [OpenAI GPT-4.1-nano](https://openai.com/) | AI-powered natural language recipe search |
| [Vercel](https://vercel.com/) | Deployment & hosting |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── ai-search/
│   │       └── route.ts          # AI search API endpoint (OpenAI)
│   ├── recipe/
│   │   └── [id]/
│   │       ├── page.tsx          # Recipe detail page (server)
│   │       └── RecipePageClient.tsx  # Recipe detail client component
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page (server)
│   ├── HomeClient.tsx            # Home page client component
│   └── favicon.ico
├── components/
│   ├── AiSearch.tsx              # AI-powered search component
│   ├── CategoryGrid.tsx          # Category browsing grid
│   ├── Hero.tsx                  # Hero section
│   ├── LangProvider.tsx          # i18n context provider
│   ├── LangToggle.tsx            # Language switch button
│   ├── Loader.tsx                # Loading spinner
│   ├── RecipeDetail.tsx          # Full recipe view
│   ├── RecipeList.tsx            # Recipe card grid
│   └── SearchBar.tsx             # Search input component
└── lib/
    ├── api.ts                    # TheMealDB API client & helpers
    └── i18n.ts                   # Translation strings (SR/EN)
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+ installed
- [OpenAI API Key](https://platform.openai.com/api-keys) (for AI search feature)

### Installation

```bash
# Clone the repository
git clone https://github.com/ivanmeda/recipe-finder.git
cd recipe-finder

# Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## 🌐 API

FlavorMap uses [TheMealDB](https://www.themealdb.com/api.php) — a free, open recipe database.

| Endpoint | Usage |
|----------|-------|
| `/categories.php` | Fetch all recipe categories |
| `/filter.php?c={category}` | List meals by category |
| `/search.php?s={query}` | Search meals by name |
| `/lookup.php?i={id}` | Get full meal details by ID |

AI search is powered by a custom `/api/ai-search` route that uses **OpenAI GPT-4.1-nano** to interpret natural language queries and match them to TheMealDB results.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with ❤️ by [Ivan Meda](https://github.com/ivanmeda)**

</div>
