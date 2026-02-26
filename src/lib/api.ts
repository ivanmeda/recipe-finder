const BASE = "https://www.themealdb.com/api/json/v1/1";

export interface Category {
  idCategory: string;
  strCategory: string;
  strCategoryThumb: string;
  strCategoryDescription: string;
}

export interface MealSummary {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
}

export interface MealDetail {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strYoutube: string | null;
  strSource: string | null;
  [key: string]: string | null;
}

export interface Ingredient {
  name: string;
  measure: string;
  image: string;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE}/categories.php`, {
    next: { revalidate: 86400 },
  });
  const data = await res.json();
  return (data.categories as Category[]) || [];
}

export async function fetchMealsByCategory(
  category: string
): Promise<MealSummary[]> {
  const res = await fetch(
    `${BASE}/filter.php?c=${encodeURIComponent(category)}`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();
  return ((data.meals as MealSummary[]) || []).slice(0, 10);
}

export async function searchMealsByName(
  query: string
): Promise<MealSummary[]> {
  const res = await fetch(
    `${BASE}/search.php?s=${encodeURIComponent(query)}`,
    { cache: "no-store" }
  );
  const data = await res.json();
  if (!data.meals) return [];
  return (data.meals as MealDetail[]).slice(0, 10).map((m) => ({
    idMeal: m.idMeal,
    strMeal: m.strMeal,
    strMealThumb: m.strMealThumb,
  }));
}

export async function fetchMealById(
  id: string
): Promise<MealDetail | null> {
  const res = await fetch(`${BASE}/lookup.php?i=${id}`, {
    next: { revalidate: 3600 },
  });
  const data = await res.json();
  return data.meals?.[0] ?? null;
}

export function extractIngredients(meal: MealDetail): Ingredient[] {
  const ingredients: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({
        name: name.trim(),
        measure: (measure || "").trim(),
        image: `https://www.themealdb.com/images/ingredients/${encodeURIComponent(name.trim())}-Small.png`,
      });
    }
  }
  return ingredients;
}

export function extractSteps(instructions: string): string[] {
  let steps = instructions.split(/\r?\n/).filter((s) => s.trim().length > 2);
  if (steps.length <= 1) {
    steps = instructions
      .split(/\.\s+(?=[A-Z])/)
      .filter((s) => s.trim().length > 2)
      .map((s) => s.trim().replace(/\.$/, "") + ".");
  }
  return steps;
}

export function getYoutubeId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}
