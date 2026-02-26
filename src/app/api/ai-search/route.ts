import { NextRequest, NextResponse } from "next/server";

const MEAL_API = "https://www.themealdb.com/api/json/v1/1";

interface MealResult {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strMealTranslated?: string;
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

/* ── Prompt: extract search terms from natural language ── */
function buildSearchPrompt(lang: string): string {
  const langInstruction =
    lang === "sr"
      ? `\nThe user is speaking Serbian. Respond with a JSON object where:
- "terms" is an array of 2-4 English food search keywords
- "message" is a friendly Serbian message like "Tražim recepte za [dish]... 🔍"`
      : `\nRespond with a JSON object where:
- "terms" is an array of 2-4 English food search keywords
- "message" is a friendly English message about searching for the dish`;

  return `You are a recipe search assistant. The user will describe what they want to eat in natural language (possibly in Serbian or English).

Your job: extract 2-4 simple English food search keywords that would find matching recipes in a recipe database.

Rules:
- Keywords should be common English food terms (the database is in English)
- If the user mentions a specific dish name (e.g. "burek", "pad thai", "tiramisu"), include that EXACT name as a keyword too
- If the user mentions a cuisine (Italian, Mexican, etc.), include a typical dish name from that cuisine
- If vague ("something quick"), pick popular categories like "chicken", "salad", "soup"
- Maximum 4 terms. Each term should be 1-2 words.
- Return ONLY valid JSON, no markdown, no explanation.
${langInstruction}

Return format: {"terms": ["term1", "term2"], "message": "friendly message"}`;
}

/* ── Prompt: generate a full recipe when TheMealDB has nothing ── */
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

/* ── Prompt: batch translate meal names to Serbian ── */
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
      return NextResponse.json(
        { error: "AI not configured" },
        { status: 500 },
      );
    }

    /* ── Step 1: Ask AI to extract search terms ── */
    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
      },
    );

    if (!openaiRes.ok) {
      console.error("OpenAI error:", await openaiRes.text());
      return NextResponse.json(
        { error: "AI request failed" },
        { status: 502 },
      );
    }

    const openaiData = await openaiRes.json();
    const content =
      openaiData.choices?.[0]?.message?.content?.trim() || "{}";

    let searchTerms: string[];
    let aiMessage = "";
    try {
      const parsed = JSON.parse(content);
      searchTerms = Array.isArray(parsed.terms) ? parsed.terms : [query];
      aiMessage = parsed.message || "";
    } catch {
      searchTerms = [query];
    }

    /* ── Step 2: Always search with the ORIGINAL query first ── */
    const allMeals = new Map<string, MealResult>();

    // Deduplicate: original query + AI terms
    const allTerms = [
      query,
      ...searchTerms.filter(
        (t) => t.toLowerCase() !== query.toLowerCase(),
      ),
    ];

    // Name search (search.php?s=) for all terms
    await Promise.all(
      allTerms.map(async (term) => {
        try {
          const res = await fetch(
            `${MEAL_API}/search.php?s=${encodeURIComponent(term)}`,
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
        } catch {
          /* skip failed search */
        }
      }),
    );

    // Ingredient filter (filter.php?i=) for first 2 AI terms
    await Promise.all(
      searchTerms.slice(0, 2).map(async (term) => {
        try {
          const res = await fetch(
            `${MEAL_API}/filter.php?i=${encodeURIComponent(term)}`,
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
        } catch {
          /* skip */
        }
      }),
    );

    // Area/cuisine filter — if AI terms suggest a cuisine word, try it
    const AREA_KEYWORDS: Record<string, string> = {
      italian: "Italian",
      mexican: "Mexican",
      chinese: "Chinese",
      indian: "Indian",
      japanese: "Japanese",
      thai: "Thai",
      french: "French",
      greek: "Greek",
      turkish: "Turkish",
      british: "British",
      american: "American",
      vietnamese: "Vietnamese",
      moroccan: "Moroccan",
      spanish: "Spanish",
      croatian: "Croatian",
      polish: "Polish",
      russian: "Russian",
      malaysian: "Malaysian",
      filipino: "Filipino",
      jamaican: "Jamaican",
      egyptian: "Egyptian",
      irish: "Irish",
      dutch: "Dutch",
      canadian: "Canadian",
      portuguese: "Portuguese",
      kenyan: "Kenyan",
      ukrainian: "Ukrainian",
      norwegian: "Norwegian",
    };

    for (const term of allTerms) {
      const areaKey = term.toLowerCase().replace(/\s+/g, "");
      const area = AREA_KEYWORDS[areaKey];
      if (area && allMeals.size < 8) {
        try {
          const res = await fetch(
            `${MEAL_API}/filter.php?a=${encodeURIComponent(area)}`,
          );
          const data = await res.json();
          if (data.meals) {
            const shuffled = data.meals.sort(
              () => Math.random() - 0.5,
            );
            for (const m of shuffled.slice(0, 4)) {
              if (!allMeals.has(m.idMeal)) {
                allMeals.set(m.idMeal, {
                  idMeal: m.idMeal,
                  strMeal: m.strMeal,
                  strMealThumb: m.strMealThumb,
                });
              }
            }
          }
        } catch {
          /* skip */
        }
      }
    }

    const meals = Array.from(allMeals.values()).slice(0, 10);

    /* ── Step 3: If enough TheMealDB results → translate names if SR ── */
    if (meals.length >= 3) {
      let translations: Record<string, string> = {};

      if (lang === "sr") {
        try {
          const transRes = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "gpt-4.1-nano",
                messages: [
                  {
                    role: "system",
                    content: buildTranslationPrompt(
                      meals.map((m) => m.strMeal),
                    ),
                  },
                  { role: "user", content: "Translate." },
                ],
                temperature: 0.1,
                max_tokens: 500,
              }),
            },
          );

          if (transRes.ok) {
            const transData = await transRes.json();
            const transContent =
              transData.choices?.[0]?.message?.content?.trim() || "{}";
            try {
              translations = JSON.parse(transContent);
            } catch {
              /* graceful degradation — show English names */
            }
          }
        } catch {
          /* translation failed — continue with English names */
        }
      }

      // Embed strMealTranslated directly on each meal for clean client access
      if (lang === "sr" && Object.keys(translations).length > 0) {
        for (const meal of meals) {
          meal.strMealTranslated = translations[meal.strMeal] || meal.strMeal;
        }
      }

      if (!aiMessage) {
        aiMessage =
          lang === "sr"
            ? `Pronašao sam ${meals.length} recepata za "${query}". Evo šta preporučujem! 👨‍🍳`
            : `Found ${meals.length} recipes for "${query}". Here's what I recommend! 👨‍🍳`;
      }

      return NextResponse.json({
        meals,
        translations,
        message: aiMessage,
        searchTerms: allTerms,
        aiGenerated: null,
      });
    }

    /* ── Step 4: < 3 TheMealDB results → generate AI recipe as fallback ── */
    const genRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-nano",
          messages: [
            { role: "system", content: buildRecipeGenPrompt(lang) },
            {
              role: "user",
              content: `Generate a recipe for: ${query}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      },
    );

    let aiGenerated: AiGeneratedRecipe | null = null;

    if (genRes.ok) {
      const genData = await genRes.json();
      const genContent =
        genData.choices?.[0]?.message?.content?.trim() || "";
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
        /* AI generation parse failed */
      }
    }

    // Also translate the few TheMealDB results we DO have (if any, and lang=sr)
    let translations: Record<string, string> = {};
    if (meals.length > 0 && lang === "sr") {
      try {
        const transRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4.1-nano",
              messages: [
                {
                  role: "system",
                  content: buildTranslationPrompt(
                    meals.map((m) => m.strMeal),
                  ),
                },
                { role: "user", content: "Translate." },
              ],
              temperature: 0.1,
              max_tokens: 300,
            }),
          },
        );
        if (transRes.ok) {
          const transData = await transRes.json();
          const transContent =
            transData.choices?.[0]?.message?.content?.trim() || "{}";
          try {
            translations = JSON.parse(transContent);
          } catch {
            /* graceful degradation */
          }
        }
      } catch {
        /* skip */
      }
    }

    // Embed strMealTranslated on sparse results too
    if (lang === "sr" && Object.keys(translations).length > 0) {
      for (const meal of meals) {
        meal.strMealTranslated = translations[meal.strMeal] || meal.strMeal;
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
      meals,
      translations,
      message: aiMessage,
      searchTerms: allTerms,
      aiGenerated,
    });
  } catch (error) {
    console.error("AI search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
