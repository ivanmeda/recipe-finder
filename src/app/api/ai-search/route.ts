import { NextRequest, NextResponse } from "next/server";

const MEAL_API = "https://www.themealdb.com/api/json/v1/1";

interface MealResult {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
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
        { status: 500 }
      );
    }

    // Step 1: Ask OpenAI to extract search terms from natural language
    const systemPrompt = `You are a recipe search assistant. The user will describe what they want to eat in natural language (possibly in Serbian or English).

Your job: extract 2-4 simple English food search keywords that would find matching recipes in a recipe database.

Rules:
- Return ONLY a JSON array of strings, e.g. ["chicken", "pasta", "cream"]
- Use common English food terms (the database is in English)
- If the user mentions a cuisine (Italian, Mexican, etc.), include a typical dish name from that cuisine
- If vague ("something quick"), pick popular categories like "chicken", "salad", "soup"
- Maximum 4 terms. Each term should be 1-2 words.
- No explanation, no markdown, ONLY the JSON array.`;

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
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
          temperature: 0.7,
          max_tokens: 100,
        }),
      }
    );

    if (!openaiRes.ok) {
      console.error("OpenAI error:", await openaiRes.text());
      return NextResponse.json({ error: "AI request failed" }, { status: 502 });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content?.trim() || "[]";

    let searchTerms: string[];
    try {
      searchTerms = JSON.parse(content);
      if (!Array.isArray(searchTerms)) searchTerms = [content];
    } catch {
      searchTerms = [content.replace(/[[\]"]/g, "")];
    }

    // Step 2: Search TheMealDB for each term and collect unique results
    const allMeals = new Map<string, MealResult>();

    await Promise.all(
      searchTerms.map(async (term) => {
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
        } catch {
          // skip failed individual search
        }
      })
    );

    // Step 3: Also try filtering by ingredient for better results
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
        } catch {
          // skip
        }
      })
    );

    const meals = Array.from(allMeals.values()).slice(0, 10);

    // Step 4: Generate a friendly AI message
    const aiMessage =
      lang === "sr"
        ? meals.length > 0
          ? `Pronašao sam ${meals.length} recepata za "${query}". Evo šta preporučujem! 👨‍🍳`
          : `Nisam pronašao recepte za "${query}". Pokušaj nešto drugo!`
        : meals.length > 0
          ? `Found ${meals.length} recipes for "${query}". Here's what I recommend! 👨‍🍳`
          : `No recipes found for "${query}". Try something else!`;

    return NextResponse.json({
      meals,
      message: aiMessage,
      searchTerms,
    });
  } catch (error) {
    console.error("AI search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
