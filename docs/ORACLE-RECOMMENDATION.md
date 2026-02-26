# 📜 Oracle Recommendation — FlavorMap Recipe Finder

**Date:** 2026-02-26
**Requested by:** Zeus
**Implements:** @vulcan
**Scope:** 3 items — AI search fallback, Serbian localization, geolocation recommendations

---

## Table of Contents

1. [BUG 1: AI Search Fails for Dishes Not in TheMealDB](#bug-1-ai-search-fails-for-dishes-not-in-themealdb)
2. [BUG 2: Serbian Language Not Applied to AI Results](#bug-2-serbian-language-not-applied-to-ai-results)
3. [NEW FEATURE: Geolocation-Based Recommendations](#new-feature-geolocation-based-recommendations)

---

## BUG 1: AI Search Fails for Dishes Not in TheMealDB

### Root Cause Analysis

The current flow in `src/app/api/ai-search/route.ts`:
1. User types "burek" → AI extracts English terms: `["phyllo pastry", "meat pie"]`
2. TheMealDB `search.php?s=phyllo+pastry` → **null** (no match)
3. TheMealDB `filter.php?i=phyllo+pastry` → **null**
4. Result: 0 meals, user sees "No recipes found"

**Key discovery:** `search.php?s=burek` actually RETURNS the Burek recipe from TheMealDB! The AI is over-translating — converting the original dish name into generic English terms, losing the exact match.

**Additionally:** Many traditional dishes (sarma, ćevapi, pljeskavica, gibanica, etc.) truly DON'T exist in TheMealDB's ~300 recipes. For these, a fallback is essential.

### Fix Strategy (Two-Pronged)

#### Prong 1: Always include the original query as a search term

Before the AI call, search TheMealDB with the user's **raw query** first. This catches exact matches like "burek" that the AI would otherwise abstract away.

#### Prong 2: AI-generated recipe fallback when TheMealDB returns zero

When no TheMealDB results exist, make a second OpenAI call to generate a full recipe. This is cost-efficient because it ONLY fires when the primary search returns nothing.

### JSON Structure for AI-Generated Recipes

AI-generated recipes need a distinct structure that's compatible with existing `MealSummary` and `MealDetail` types but clearly marked as AI-generated:

```typescript
// New interface in src/lib/types.ts (or add to api.ts)
export interface AiGeneratedRecipe {
  id: string;              // "ai-" prefix, e.g. "ai-burek-1234"
  name: string;            // In user's language
  description: string;     // 1-2 sentence summary
  category: string;        // e.g. "Side", "Main Course"
  area: string;            // e.g. "Balkan", "Turkish"
  ingredients: {
    name: string;
    measure: string;
  }[];
  instructions: string[];  // Step-by-step array
  prepTime: string;        // e.g. "45 min"
  servings: string;        // e.g. "4-6"
  isAiGenerated: true;     // Discriminator flag
}
```

### Updated API Route: `src/app/api/ai-search/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

const MEAL_API = "https://www.themealdb.com/api/json/v1/1";

interface MealResult {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface AiGeneratedRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  area: string;
  ingredients: { name: string; measure: string }[];
  instructions: string[];
  prepTime: string;
  servings: string;
  isAiGenerated: true;
}

// ── Prompt for extracting search terms ──
function buildSearchPrompt(lang: string): string {
  const langInstruction = lang === "sr"
    ? `\nThe user is speaking Serbian. Respond with a JSON object where:
- "terms" is an array of 2-4 English food search keywords
- "message" is a friendly Serbian message like "Tražim recepte za [dish]... 🔍"
- "translations" is an object mapping English meal names to Serbian translations (populated later)`
    : `\nRespond with a JSON object where:
- "terms" is an array of 2-4 English food search keywords
- "message" is a friendly English message (populated later)
- "translations" is an object mapping English meal names to Serbian translations (empty for English)`;

  return `You are a recipe search assistant. The user will describe what they want to eat in natural language (possibly in Serbian or English).

Your job: extract 2-4 simple English food search keywords that would find matching recipes in a recipe database.

Rules:
- Keywords should be common English food terms (the database is in English)
- If the user mentions a specific dish name (e.g. "burek", "pad thai"), include that EXACT name as a keyword too
- If the user mentions a cuisine (Italian, Mexican, etc.), include a typical dish name from that cuisine
- If vague ("something quick"), pick popular categories like "chicken", "salad", "soup"
- Maximum 4 terms. Each term should be 1-2 words.
- Return ONLY valid JSON, no markdown, no explanation.
${langInstruction}

Return format: {"terms": ["term1", "term2"], "message": "", "translations": {}}`;
}

// ── Prompt for generating a full recipe (fallback) ──
function buildRecipeGenPrompt(lang: string): string {
  const language = lang === "sr" ? "Serbian" : "English";
  return `You are a professional chef and recipe writer. The user searched for a dish that isn't in our database. Generate a complete, authentic recipe.

RESPOND ENTIRELY IN ${language.toUpperCase()}.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "name": "Recipe name in ${language}",
  "description": "1-2 sentence description in ${language}",
  "category": "Main Course|Side|Dessert|Starter|Soup",
  "area": "Region/cuisine origin in ${language}",
  "ingredients": [
    {"name": "ingredient in ${language}", "measure": "amount"}
  ],
  "instructions": [
    "Step 1 in ${language}",
    "Step 2 in ${language}"
  ],
  "prepTime": "45 min",
  "servings": "4"
}

Be authentic. Use traditional ingredients and methods. 8-15 ingredients, 5-10 steps.`;
}

// ── Second prompt: translate TheMealDB names when lang=sr ──
function buildTranslationPrompt(mealNames: string[]): string {
  return `Translate these English recipe names to Serbian. Return ONLY a JSON object mapping English→Serbian.
No explanation, no markdown. Example: {"Chicken Alfredo": "Piletina Alfredo"}

Names to translate:
${JSON.stringify(mealNames)}`;
}

export async function POST(req: NextRequest) {
  try {
    const { query, lang } = await req.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 500 });
    }

    // ── Step 1: Ask AI to extract search terms ──
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: buildSearchPrompt(lang) },
          { role: "user", content: query },
        ],
        temperature: 0.3,
        max_tokens: 150,
      }),
    });

    if (!openaiRes.ok) {
      console.error("OpenAI error:", await openaiRes.text());
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content?.trim() || "{}";

    let searchTerms: string[];
    let aiMessage = "";
    try {
      const parsed = JSON.parse(content);
      searchTerms = Array.isArray(parsed.terms) ? parsed.terms : [query];
      aiMessage = parsed.message || "";
    } catch {
      searchTerms = [query];
    }

    // ── Step 2: Always search with the ORIGINAL query first ──
    const allMeals = new Map<string, MealResult>();

    // Search original query (catches exact matches like "burek")
    const allTerms = [query, ...searchTerms.filter(
      (t) => t.toLowerCase() !== query.toLowerCase()
    )];

    await Promise.all(
      allTerms.map(async (term) => {
        try {
          const res = await fetch(
            `${MEAL_API}/search.php?s=${encodeURIComponent(term)}`
          );
          const data = await res.json();
          if (data.meals) {
            for (const m of data.meals) {
              if (!allMeals.has(m.idMeal)) {
                allMeals.set(m.idMeal, {
                  idMeal: m.idMeal,
                  strMeal: m.strMeal,
                  strMealThumb: m.strMealThumb,
                });
              }
            }
          }
        } catch { /* skip */ }
      })
    );

    // Also try ingredient filter for first 2 AI terms
    await Promise.all(
      searchTerms.slice(0, 2).map(async (term) => {
        try {
          const res = await fetch(
            `${MEAL_API}/filter.php?i=${encodeURIComponent(term)}`
          );
          const data = await res.json();
          if (data.meals) {
            for (const m of data.meals.slice(0, 5)) {
              if (!allMeals.has(m.idMeal)) {
                allMeals.set(m.idMeal, {
                  idMeal: m.idMeal,
                  strMeal: m.strMeal,
                  strMealThumb: m.strMealThumb,
                });
              }
            }
          }
        } catch { /* skip */ }
      })
    );

    const meals = Array.from(allMeals.values()).slice(0, 10);

    // ── Step 3: If TheMealDB returned results → translate names if SR ──
    if (meals.length > 0) {
      let translations: Record<string, string> = {};

      if (lang === "sr") {
        // One cheap API call to translate all meal names
        try {
          const transRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4.1-nano",
              messages: [
                { role: "system", content: buildTranslationPrompt(meals.map((m) => m.strMeal)) },
                { role: "user", content: "Translate." },
              ],
              temperature: 0.1,
              max_tokens: 300,
            }),
          });

          if (transRes.ok) {
            const transData = await transRes.json();
            const transContent = transData.choices?.[0]?.message?.content?.trim() || "{}";
            translations = JSON.parse(transContent);
          }
        } catch {
          // Translation failed — show English names (graceful degradation)
        }
      }

      // Build message
      if (!aiMessage) {
        aiMessage = lang === "sr"
          ? `Pronašao sam ${meals.length} recepata za "${query}". Evo šta preporučujem! 👨‍🍳`
          : `Found ${meals.length} recipes for "${query}". Here's what I recommend! 👨‍🍳`;
      }

      return NextResponse.json({
        meals,
        translations,  // { "English Name": "Srpski Naziv" }
        message: aiMessage,
        searchTerms,
        aiGenerated: null,
      });
    }

    // ── Step 4: No TheMealDB results → Generate recipe with AI ──
    const genRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-nano",
        messages: [
          { role: "system", content: buildRecipeGenPrompt(lang) },
          { role: "user", content: `Generate a recipe for: ${query}` },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    let aiGenerated: AiGeneratedRecipe | null = null;

    if (genRes.ok) {
      const genData = await genRes.json();
      const genContent = genData.choices?.[0]?.message?.content?.trim() || "";
      try {
        const recipe = JSON.parse(genContent);
        aiGenerated = {
          id: `ai-${Date.now()}`,
          name: recipe.name,
          description: recipe.description,
          category: recipe.category,
          area: recipe.area,
          ingredients: recipe.ingredients || [],
          instructions: recipe.instructions || [],
          prepTime: recipe.prepTime || "",
          servings: recipe.servings || "",
          isAiGenerated: true,
        };
      } catch {
        // AI generation failed — will show no-results state
      }
    }

    aiMessage = aiGenerated
      ? lang === "sr"
        ? `Nisam pronašao "${query}" u bazi, ali sam ti pripremio recept! 🤖👨‍🍳`
        : `"${query}" isn't in our database, but I generated a recipe for you! 🤖👨‍🍳`
      : lang === "sr"
        ? `Nisam pronašao recepte za "${query}". Pokušaj nešto drugo!`
        : `No recipes found for "${query}". Try something else!`;

    return NextResponse.json({
      meals: [],
      translations: {},
      message: aiMessage,
      searchTerms,
      aiGenerated,
    });
  } catch (error) {
    console.error("AI search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Updated AiSearch Component: `src/components/AiSearch.tsx`

The component needs to handle both TheMealDB results (with translated names) AND AI-generated recipes:

```tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "./LangProvider";
import { t } from "@/lib/i18n";

interface AiMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

interface AiGeneratedRecipe {
  id: string;
  name: string;
  description: string;
  category: string;
  area: string;
  ingredients: { name: string; measure: string }[];
  instructions: string[];
  prepTime: string;
  servings: string;
  isAiGenerated: true;
}

export default function AiSearch() {
  const { lang } = useLang();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AiMeal[] | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [aiRecipe, setAiRecipe] = useState<AiGeneratedRecipe | null>(null);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setLoading(true);
    setResults(null);
    setTranslations({});
    setMessage("");
    setTerms([]);
    setAiRecipe(null);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed, lang }),
      });

      if (!res.ok) throw new Error("fail");

      const data = await res.json();
      setResults(data.meals || []);
      setTranslations(data.translations || {});
      setMessage(data.message || "");
      setTerms(data.searchTerms || []);
      setAiRecipe(data.aiGenerated || null);
    } catch {
      setMessage(t(lang, "aiError"));
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper: get display name (translated if SR, original otherwise)
  const displayName = (meal: AiMeal) => {
    if (lang === "sr" && translations[meal.strMeal]) {
      return translations[meal.strMeal];
    }
    return meal.strMeal;
  };

  return (
    <section className="max-w-4xl mx-auto px-4 pb-8">
      <div className="bg-gradient-to-br from-terracotta/5 via-gold/5 to-sage/5 rounded-3xl p-6 border border-terracotta/10">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal mb-1">
          {t(lang, "aiTitle")}
        </h3>
        <p className="text-warm-gray text-xs mb-4 font-light">
          {t(lang, "aiSub")}
        </p>

        <form onSubmit={handleAiSearch} className="flex gap-2">
          {/* ... same form as current, unchanged ... */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">🤖</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(lang, "aiPlaceholder")}
              disabled={loading}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/80 border-2 border-transparent
                text-charcoal placeholder-warm-gray/50 focus:border-terracotta focus:outline-none
                transition-all text-sm font-light disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 py-3 bg-terracotta text-white rounded-xl font-semibold text-sm
              hover:bg-terracotta-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "✨"
            )}
            {loading
              ? lang === "sr" ? "Tražim..." : "Searching..."
              : lang === "sr" ? "Traži" : "Search"}
          </button>
        </form>

        {/* AI thinking */}
        {loading && (
          <div className="mt-4 flex items-center gap-2 text-warm-gray text-sm">
            <span className="animate-pulse">🧠</span>
            {t(lang, "aiSearching")}
          </div>
        )}

        {/* AI message + search terms */}
        {message && !loading && (
          <div className="mt-4">
            <p className="text-charcoal text-sm font-medium mb-2">{message}</p>
            {terms.length > 0 && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {terms.map((term) => (
                  <span
                    key={term}
                    className="text-[0.68rem] font-semibold uppercase tracking-wider text-terracotta
                      bg-terracotta/10 px-2.5 py-0.5 rounded-full"
                  >
                    {term}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TheMealDB Results (with translated names) */}
        {results && results.length > 0 && !loading && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map((meal) => (
              <Link
                key={meal.idMeal}
                href={`/recipe/${meal.idMeal}`}
                className="group bg-white rounded-xl overflow-hidden shadow-[0_2px_12px_rgba(45,42,38,.08)]
                  hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(45,42,38,.15)] transition-all duration-300"
              >
                <div className="relative w-full h-28 overflow-hidden">
                  <Image
                    src={meal.strMealThumb}
                    alt={displayName(meal)}
                    fill
                    sizes="(max-width: 640px) 50vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2.5">
                  <h4 className="font-[family-name:var(--font-display)] font-semibold text-xs text-charcoal leading-snug line-clamp-2">
                    {displayName(meal)}
                  </h4>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* AI-Generated Recipe Card (fallback — only when no TheMealDB results) */}
        {aiRecipe && !loading && (
          <div className="mt-4 bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(45,42,38,.10)] border border-gold/20">
            {/* AI Badge */}
            <div className="bg-gradient-to-r from-terracotta/10 to-gold/10 px-4 py-2 flex items-center gap-2">
              <span className="text-sm">🤖</span>
              <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-terracotta">
                {lang === "sr" ? "AI Generisan Recept" : "AI Generated Recipe"}
              </span>
            </div>

            <div className="p-5">
              <h4 className="font-[family-name:var(--font-display)] font-bold text-xl text-charcoal mb-1">
                {aiRecipe.name}
              </h4>
              <p className="text-warm-gray text-sm mb-3 font-light">
                {aiRecipe.description}
              </p>

              {/* Meta pills */}
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="text-xs bg-sage/10 text-sage-dark px-2.5 py-1 rounded-full">
                  🌍 {aiRecipe.area}
                </span>
                <span className="text-xs bg-sage/10 text-sage-dark px-2.5 py-1 rounded-full">
                  ⏱️ {aiRecipe.prepTime}
                </span>
                <span className="text-xs bg-sage/10 text-sage-dark px-2.5 py-1 rounded-full">
                  🍽️ {aiRecipe.servings} {lang === "sr" ? "porcija" : "servings"}
                </span>
              </div>

              {/* Ingredients */}
              <h5 className="font-[family-name:var(--font-display)] font-semibold text-sm text-charcoal mb-2">
                {lang === "sr" ? "Sastojci" : "Ingredients"}
              </h5>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 mb-4">
                {aiRecipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm text-warm-gray flex gap-2">
                    <span className="text-terracotta">•</span>
                    <span>
                      <strong className="text-charcoal">{ing.measure}</strong> {ing.name}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Instructions */}
              <h5 className="font-[family-name:var(--font-display)] font-semibold text-sm text-charcoal mb-2">
                {lang === "sr" ? "Priprema" : "Instructions"}
              </h5>
              <ol className="space-y-2">
                {aiRecipe.instructions.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-terracotta/10 text-terracotta
                      font-bold text-xs flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-warm-gray leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {/* No results at all */}
        {results && results.length === 0 && !aiRecipe && !loading && (
          <div className="mt-4 text-center text-warm-gray text-sm py-4">
            <span className="text-3xl block mb-1">🍳</span>
            {t(lang, "noRecipes")}
          </div>
        )}
      </div>
    </section>
  );
}
```

### Placeholder Image Decision

**Recommendation: No image generation.** Reasons:
- DALL-E/image gen costs ~$0.02-0.04 per image — expensive for a fallback
- Adds latency (~5-10s)
- AI-generated food images can look uncanny

**Instead:** Use a styled placeholder within the AI recipe card (no `<Image>` for AI recipes). The card design above uses a gradient header with an AI badge — visually distinct and honest. If a photo is wanted later, consider a static SVG illustration (e.g., a chef hat or plate icon) embedded directly.

### Token Cost Analysis

| Call | Model | Max Tokens | Est. Cost |
|------|-------|------------|-----------|
| Search term extraction | gpt-4.1-nano | 150 | ~$0.0001 |
| Name translation (SR only) | gpt-4.1-nano | 300 | ~$0.0002 |
| Recipe generation (fallback only) | gpt-4.1-nano | 800 | ~$0.0005 |

**Worst case** (SR + fallback): ~$0.0008 per search. Extremely cheap.

---

## BUG 2: Serbian Language Not Applied to AI Results

### Root Cause Analysis

Two separate issues:

1. **AI message is hardcoded English in some paths**: The `aiMessage` in the current route only has basic SR/EN branching for the final message, but the AI system prompt ignores `lang` entirely.

2. **TheMealDB meal names are always English**: TheMealDB only has English names. No API parameter exists for localization. Translation must happen via AI.

### Fix Strategy

Already addressed in the BUG 1 code above, but here's the specific breakdown:

#### Fix 2a: AI System Prompt Respects Language

The `buildSearchPrompt(lang)` function (shown in BUG 1 code) already includes language-aware instructions. Key change:

```typescript
// OLD (broken): Static English-only prompt
const systemPrompt = `You are a recipe search assistant...`;

// NEW: Language-aware prompt builder
function buildSearchPrompt(lang: string): string {
  const langInstruction = lang === "sr"
    ? `Respond in Serbian for the "message" field.`
    : `Respond in English for the "message" field.`;
  // ... rest of prompt
}
```

#### Fix 2b: Meal Name Translation

A separate, cheap API call translates TheMealDB meal names when `lang=sr`. This is the `buildTranslationPrompt()` call shown in the BUG 1 code.

**Why a separate call instead of combining with search term extraction:**
- Search term extraction returns BEFORE we know which meals TheMealDB found
- We can't translate names we don't have yet
- Two small nano calls are still < $0.0003 total

**The response now includes a `translations` field:**

```json
{
  "meals": [...],
  "translations": {
    "Chicken Alfredo Primavera": "Piletina Alfredo Primavera",
    "Burek": "Burek",
    "Croatian Bean Stew": "Hrvatski Grah"
  },
  "message": "Pronašao sam 3 recepta za \"burek\". Evo šta preporučujem! 👨‍🍳",
  "searchTerms": ["burek", "phyllo pastry"],
  "aiGenerated": null
}
```

#### Fix 2c: Component Uses Translations

The `displayName()` helper in the updated `AiSearch.tsx` (shown above) handles this:

```tsx
const displayName = (meal: AiMeal) => {
  if (lang === "sr" && translations[meal.strMeal]) {
    return translations[meal.strMeal];
  }
  return meal.strMeal;
};
```

#### Fix 2d: i18n Additions

Add these keys to `src/lib/i18n.ts`:

```typescript
// Add to "en" translations:
aiGeneratedBadge: "AI Generated Recipe",
aiGeneratedMessage: "Not in our database, but I generated a recipe for you!",

// Add to "sr" translations:
aiGeneratedBadge: "AI Generisan Recept",
aiGeneratedMessage: "Nije u našoj bazi, ali sam ti pripremio recept!",
```

### Full Localization Checklist

| Element | Current (SR) | After Fix |
|---------|-------------|-----------|
| AI search message | ✅ Hardcoded SR | ✅ AI generates SR message |
| TheMealDB meal names | ❌ English | ✅ Translated via AI |
| AI-generated recipe | N/A (new) | ✅ Fully in SR |
| Search terms pills | English (correct — these are API terms) | English (keep — these are technical terms) |
| UI labels | ✅ Already translated | ✅ No change needed |
| AI badge text | N/A (new) | ✅ SR via i18n |

---

## NEW FEATURE: Geolocation-Based Recommendations

### Research: IP Geolocation API Comparison

| Criteria | ip-api.com | ipapi.co | ipinfo.io |
|----------|-----------|----------|-----------|
| **Free tier** | 45 req/min, unlimited/day | 1,000 req/day | 50,000 req/month |
| **API key required** | ❌ No | ❌ No (rate limited) | ✅ Yes (for higher limits) |
| **HTTPS on free** | ❌ No (HTTP only) | ✅ Yes | ✅ Yes |
| **Country code** | ✅ `countryCode` | ✅ `country_code` | ✅ `country` |
| **CORS** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Accuracy** | Good (2nd best) | Good | Best |
| **Reliability** | Very stable | Good | Very stable |

### Recommendation: `ip-api.com` (with caveat)

**Primary: `ip-api.com`** — No API key, no daily limit, no registration, generous rate limit (45/min is plenty for our use case since we cache results).

**Caveat:** Free tier is HTTP only (no HTTPS). Two solutions:
1. **Server-side fetch** (recommended) — call from API route, no CORS/HTTPS issues
2. **Fallback to `ipapi.co`** — supports HTTPS on free tier, but 1,000 req/day limit

**Decision: Server-side API route using `ip-api.com`** via HTTP (fine server-side) with `ipapi.co` as fallback.

### Architecture: Server-Side API Route

**Why server-side, not client-side:**
- `ip-api.com` free tier doesn't support HTTPS — can't call from browser on HTTPS site
- Server gets the real client IP from request headers (Vercel provides `x-forwarded-for`)
- Can cache results server-side by IP (but unnecessary given the rate limits)
- Cleaner architecture — single API route returns recommended meals

### New API Route: `src/app/api/recommendations/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";

const MEAL_API = "https://www.themealdb.com/api/json/v1/1";

// ── Country Code → TheMealDB Area mapping ──
// TheMealDB areas: Algerian, American, Argentinian, Australian, British,
// Canadian, Chinese, Croatian, Dutch, Egyptian, Filipino, French, Greek,
// Indian, Irish, Italian, Jamaican, Japanese, Kenyan, Malaysian, Mexican,
// Moroccan, Norwegian, Polish, Portuguese, Russian, Saudi Arabian,
// Slovakian, Spanish, Syrian, Thai, Tunisian, Turkish, Ukrainian,
// Uruguayan, Venezulan, Vietnamese

const COUNTRY_TO_AREA: Record<string, string[]> = {
  // Exact matches
  DZ: ["Algerian"],
  US: ["American"],
  AR: ["Argentinian"],
  AU: ["Australian"],
  GB: ["British"],
  CA: ["Canadian"],
  CN: ["Chinese"],
  HR: ["Croatian"],
  NL: ["Dutch"],
  EG: ["Egyptian"],
  PH: ["Filipino"],
  FR: ["French"],
  GR: ["Greek"],
  IN: ["Indian"],
  IE: ["Irish"],
  IT: ["Italian"],
  JM: ["Jamaican"],
  JP: ["Japanese"],
  KE: ["Kenyan"],
  MY: ["Malaysian"],
  MX: ["Mexican"],
  MA: ["Moroccan"],
  NO: ["Norwegian"],
  PL: ["Polish"],
  PT: ["Portuguese"],
  RU: ["Russian"],
  SA: ["Saudi Arabian"],
  SK: ["Slovakian"],
  ES: ["Spanish"],
  SY: ["Syrian"],
  TH: ["Thai"],
  TN: ["Tunisian"],
  TR: ["Turkish"],
  UA: ["Ukrainian"],
  UY: ["Uruguayan"],
  VE: ["Venezulan"],  // TheMealDB typo, keep as-is
  VN: ["Vietnamese"],

  // Regional mappings (countries → closest TheMealDB area)
  // Balkans → Croatian (closest match — has burek, ćevapi, etc.)
  RS: ["Croatian", "Turkish", "Greek"],     // Serbia
  BA: ["Croatian", "Turkish"],               // Bosnia
  ME: ["Croatian", "Greek"],                 // Montenegro
  MK: ["Croatian", "Turkish", "Greek"],      // North Macedonia
  SI: ["Croatian"],                          // Slovenia
  AL: ["Croatian", "Greek", "Turkish"],      // Albania
  XK: ["Croatian", "Turkish"],               // Kosovo

  // DACH region
  DE: ["Dutch", "French", "Polish"],         // Germany
  AT: ["Dutch", "Croatian", "Polish"],       // Austria
  CH: ["French", "Italian", "Dutch"],        // Switzerland

  // Nordics
  SE: ["Norwegian", "British"],              // Sweden
  DK: ["Norwegian", "Dutch"],                // Denmark
  FI: ["Norwegian", "Russian"],              // Finland
  IS: ["Norwegian", "British"],              // Iceland

  // Other European
  BE: ["Dutch", "French"],                   // Belgium
  LU: ["French", "Dutch"],                   // Luxembourg
  CZ: ["Slovakian", "Polish"],               // Czechia
  HU: ["Croatian", "Polish"],                // Hungary
  RO: ["Croatian", "Turkish", "Greek"],      // Romania
  BG: ["Turkish", "Greek", "Croatian"],      // Bulgaria
  LT: ["Polish", "Russian"],                 // Lithuania
  LV: ["Polish", "Russian"],                 // Latvia
  EE: ["Russian", "Norwegian"],              // Estonia

  // Middle East
  LB: ["Syrian", "Turkish"],                 // Lebanon
  JO: ["Syrian", "Egyptian"],                // Jordan
  IQ: ["Turkish", "Syrian"],                 // Iraq
  IR: ["Turkish", "Indian"],                 // Iran
  AE: ["Saudi Arabian", "Indian"],           // UAE
  QA: ["Saudi Arabian", "Indian"],           // Qatar
  KW: ["Saudi Arabian", "Syrian"],           // Kuwait
  BH: ["Saudi Arabian"],                     // Bahrain
  OM: ["Saudi Arabian", "Indian"],           // Oman
  YE: ["Saudi Arabian", "Egyptian"],         // Yemen
  PS: ["Syrian", "Egyptian"],                // Palestine

  // Africa
  NG: ["Kenyan", "Moroccan"],                // Nigeria
  GH: ["Kenyan"],                            // Ghana
  ZA: ["Kenyan", "Indian", "British"],       // South Africa
  ET: ["Kenyan"],                            // Ethiopia
  TZ: ["Kenyan", "Indian"],                  // Tanzania
  LY: ["Tunisian", "Egyptian"],              // Libya

  // Americas
  BR: ["Argentinian", "Portuguese"],         // Brazil
  CO: ["Mexican", "Venezulan"],              // Colombia
  CL: ["Argentinian", "Mexican"],            // Chile
  PE: ["Mexican", "Argentinian"],            // Peru
  PR: ["Jamaican", "Mexican"],               // Puerto Rico
  CU: ["Jamaican", "Mexican"],               // Cuba

  // Asia
  KR: ["Japanese", "Chinese"],               // South Korea
  TW: ["Chinese", "Japanese"],               // Taiwan
  HK: ["Chinese"],                           // Hong Kong
  SG: ["Malaysian", "Chinese", "Indian"],    // Singapore
  ID: ["Malaysian", "Indian"],               // Indonesia
  PK: ["Indian"],                            // Pakistan
  BD: ["Indian"],                            // Bangladesh
  LK: ["Indian"],                            // Sri Lanka
  NP: ["Indian"],                            // Nepal
  MM: ["Thai", "Indian"],                    // Myanmar
  KH: ["Thai", "Vietnamese"],                // Cambodia
  LA: ["Thai", "Vietnamese"],                // Laos

  // Oceania
  NZ: ["Australian", "British"],             // New Zealand
};

// Default areas for unmapped countries (popular/diverse cuisines)
const DEFAULT_AREAS = ["Italian", "Mexican", "Indian", "Chinese"];

interface GeoResponse {
  countryCode?: string;
  country_code?: string;
  country?: string;
  status?: string;
}

async function getCountryCode(ip: string): Promise<string | null> {
  // Try ip-api.com first (HTTP — fine for server-side)
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,countryCode`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data: GeoResponse = await res.json();
      if (data.status === "success" && data.countryCode) {
        return data.countryCode;
      }
    }
  } catch { /* fallback */ }

  // Fallback: ipapi.co (HTTPS, 1k/day)
  try {
    const res = await fetch(
      `https://ipapi.co/${ip}/json/`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data: GeoResponse = await res.json();
      if (data.country_code) return data.country_code;
    }
  } catch { /* give up */ }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Get client IP from Vercel/proxy headers
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";

    // Skip private/local IPs
    const isPrivate = !ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.");

    let countryCode: string | null = null;
    if (!isPrivate) {
      countryCode = await getCountryCode(ip);
    }

    // Map country to TheMealDB areas
    const areas = countryCode
      ? COUNTRY_TO_AREA[countryCode] || DEFAULT_AREAS
      : DEFAULT_AREAS;

    // Fetch meals from the first matching area (up to 6)
    let meals: { idMeal: string; strMeal: string; strMealThumb: string }[] = [];

    for (const area of areas) {
      if (meals.length >= 6) break;
      try {
        const res = await fetch(`${MEAL_API}/filter.php?a=${encodeURIComponent(area)}`, {
          next: { revalidate: 86400 },  // Cache 24h
        });
        const data = await res.json();
        if (data.meals) {
          // Shuffle and pick up to (6 - current) meals
          const shuffled = data.meals.sort(() => Math.random() - 0.5);
          const needed = 6 - meals.length;
          meals.push(...shuffled.slice(0, needed));
        }
      } catch { /* skip this area */ }
    }

    return NextResponse.json({
      meals: meals.slice(0, 6),
      countryCode,
      areas: areas.slice(0, 2),  // For display ("Croatian cuisine")
    });
  } catch (error) {
    console.error("Recommendations error:", error);
    // Graceful fallback: return popular meals
    try {
      const res = await fetch(`${MEAL_API}/filter.php?a=Italian`, {
        next: { revalidate: 86400 },
      });
      const data = await res.json();
      const shuffled = (data.meals || []).sort(() => Math.random() - 0.5);
      return NextResponse.json({
        meals: shuffled.slice(0, 6),
        countryCode: null,
        areas: ["Italian"],
      });
    } catch {
      return NextResponse.json({ meals: [], countryCode: null, areas: [] });
    }
  }
}
```

### New Component: `src/components/Recommendations.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLang } from "./LangProvider";

interface RecommendedMeal {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

// Area name translations for display
const AREA_SR: Record<string, string> = {
  Croatian: "hrvatska",
  Turkish: "turska",
  Greek: "grčka",
  Italian: "italijanska",
  French: "francuska",
  Indian: "indijska",
  Chinese: "kineska",
  Mexican: "meksička",
  American: "američka",
  British: "britanska",
  Japanese: "japanska",
  Thai: "tajlandska",
  Vietnamese: "vijetnamska",
  Polish: "poljska",
  Russian: "ruska",
  Dutch: "holandska",
  Norwegian: "norveška",
  Spanish: "španska",
  Portuguese: "portugalska",
  Moroccan: "marokanska",
  Malaysian: "malezijska",
  Kenyan: "kenijska",
  Egyptian: "egipatska",
  Algerian: "alžirska",
  Argentinian: "argentinska",
  Australian: "australska",
  Filipino: "filipinska",
  Irish: "irska",
  Jamaican: "jamajkanska",
  "Saudi Arabian": "saudijska",
  Slovakian: "slovačka",
  Syrian: "sirijska",
  Tunisian: "tuniška",
  Ukrainian: "ukrajinska",
  Uruguayan: "urugvajska",
  Venezulan: "venecuelanska",
};

export default function Recommendations() {
  const { lang } = useLang();
  const [meals, setMeals] = useState<RecommendedMeal[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch("/api/recommendations");
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        setMeals(data.meals || []);
        setAreas(data.areas || []);
      } catch {
        // Silent fail — section just won't show
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  // Don't render if no meals (or still loading with skeleton)
  if (!loading && meals.length === 0) return null;

  // Build subtitle
  const areaDisplay = areas.length > 0
    ? lang === "sr"
      ? `${AREA_SR[areas[0]] || areas[0]} kuhinja`
      : `${areas[0]} cuisine`
    : "";

  return (
    <section className="max-w-4xl mx-auto px-4 pb-6">
      <div className="mb-4">
        <h3 className="font-[family-name:var(--font-display)] font-bold text-lg text-charcoal flex items-center gap-2">
          <span>📍</span>
          {lang === "sr" ? "Preporučeno za Tebe" : "Recommended for You"}
        </h3>
        {areaDisplay && (
          <p className="text-warm-gray text-xs font-light mt-0.5">
            {lang === "sr"
              ? `Na osnovu tvoje lokacije — ${areaDisplay}`
              : `Based on your location — ${areaDisplay}`}
          </p>
        )}
      </div>

      {loading ? (
        // Skeleton loader
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
              <div className="w-full h-28 bg-warm-gray/10" />
              <div className="p-2.5">
                <div className="h-3 bg-warm-gray/10 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {meals.map((meal) => (
            <Link
              key={meal.idMeal}
              href={`/recipe/${meal.idMeal}`}
              className="group bg-white rounded-xl overflow-hidden
                shadow-[0_2px_12px_rgba(45,42,38,.08)]
                hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(45,42,38,.15)]
                transition-all duration-300"
            >
              <div className="relative w-full h-28 overflow-hidden">
                <Image
                  src={meal.strMealThumb}
                  alt={meal.strMeal}
                  fill
                  sizes="(max-width: 640px) 50vw, 16vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Location pin badge */}
                <div className="absolute top-1.5 right-1.5 bg-white/90 backdrop-blur-sm rounded-full
                  w-6 h-6 flex items-center justify-center shadow-sm">
                  <span className="text-xs">📍</span>
                </div>
              </div>
              <div className="p-2.5">
                <h4 className="font-[family-name:var(--font-display)] font-semibold text-xs text-charcoal leading-snug line-clamp-2">
                  {meal.strMeal}
                </h4>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
```

### Integration: Add to HomeClient

Update `src/app/HomeClient.tsx`:

```tsx
import Recommendations from "@/components/Recommendations";

// In the "categories" mode section:
{mode === "categories" && (
  <>
    <SearchBar />
    <AiSearch />
    <Recommendations />     {/* ← Add here, between AiSearch and CategoryGrid */}
    <CategoryGrid categories={categories} />
  </>
)}
```

### Graceful Fallback Chain

```
1. Try ip-api.com (HTTP, server-side) → get country code
   ↓ (fail)
2. Try ipapi.co (HTTPS, fallback) → get country code
   ↓ (fail)
3. Use DEFAULT_AREAS: Italian, Mexican, Indian, Chinese
   ↓ (always works — these areas have many meals in TheMealDB)
4. If even TheMealDB fails → component returns null (section hidden)
```

### i18n Additions for Recommendations

Add to `src/lib/i18n.ts`:

```typescript
// Add to "en":
recommendedTitle: "Recommended for You",
recommendedSub: "Based on your location",

// Add to "sr":
recommendedTitle: "Preporučeno za Tebe",
recommendedSub: "Na osnovu tvoje lokacije",
```

---

## Summary of All Changes

### Files to MODIFY:

| File | Changes |
|------|---------|
| `src/app/api/ai-search/route.ts` | Complete rewrite — add original query search, translation call, recipe generation fallback |
| `src/components/AiSearch.tsx` | Add translations state, AI recipe card, displayName helper |
| `src/lib/i18n.ts` | Add new translation keys (aiGeneratedBadge, recommendedTitle, etc.) |
| `src/app/HomeClient.tsx` | Import and render `<Recommendations />` |

### Files to CREATE:

| File | Purpose |
|------|---------|
| `src/app/api/recommendations/route.ts` | Geolocation → area → meals API |
| `src/components/Recommendations.tsx` | "Recommended for You" section |

### Files UNCHANGED:

| File | Why |
|------|-----|
| `src/lib/api.ts` | No changes needed — TheMealDB helpers are fine |
| `src/app/recipe/[id]/page.tsx` | Recipe detail pages work independently |
| `src/components/CategoryGrid.tsx` | Unaffected |
| All other components | Unaffected |

### API Cost Budget (Per User Interaction)

| Scenario | API Calls | Est. Cost |
|----------|-----------|-----------|
| EN search, TheMealDB has results | 1 nano call (search terms) | ~$0.0001 |
| SR search, TheMealDB has results | 2 nano calls (terms + translation) | ~$0.0003 |
| EN search, fallback to AI recipe | 2 nano calls (terms + recipe gen) | ~$0.0006 |
| SR search, fallback to AI recipe | 2 nano calls (terms + recipe gen in SR) | ~$0.0006 |
| Geolocation recommendations | 0 AI calls (just ip-api + TheMealDB) | $0.00 |

---

## Implementation Order (for @vulcan)

1. **First: BUG 2 + BUG 1 together** — They share the same route rewrite
   - Rewrite `src/app/api/ai-search/route.ts` (the complete code is above)
   - Update `src/components/AiSearch.tsx` (the complete code is above)
   - Add i18n keys to `src/lib/i18n.ts`
   - **Test:** Search "burek" in EN → should find TheMealDB result
   - **Test:** Search "burek" in SR → should find result with Serbian name
   - **Test:** Search "sarma" → should trigger AI recipe generation
   - **Test:** Search "sarma" in SR → AI recipe should be fully in Serbian

2. **Second: Geolocation feature**
   - Create `src/app/api/recommendations/route.ts`
   - Create `src/components/Recommendations.tsx`
   - Update `src/app/HomeClient.tsx`
   - **Test:** Load homepage → should see 6 recommended dishes
   - **Test:** Use VPN to different country → dishes should change
   - **Test:** Toggle SR → section title changes to Serbian

3. **Branch naming:** `feat/ai-search-fallback-i18n-geo`

---

*Prophecy delivered. The path is clear — @vulcan, forge it.* 🔮
