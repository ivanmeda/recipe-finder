export type Lang = "en" | "sr";

export const CATEGORY_EMOJI: Record<string, string> = {
  Beef: "🥩",
  Chicken: "🍗",
  Dessert: "🍰",
  Lamb: "🐑",
  Miscellaneous: "🍲",
  Pasta: "🍝",
  Pork: "🥓",
  Seafood: "🦐",
  Side: "🥗",
  Starter: "🥟",
  Vegan: "🌱",
  Vegetarian: "🥬",
  Breakfast: "🍳",
  Goat: "🐐",
};

export const CATEGORY_SR: Record<string, string> = {
  Beef: "Govedina",
  Chicken: "Piletina",
  Dessert: "Dezert",
  Lamb: "Jagnjetina",
  Miscellaneous: "Razno",
  Pasta: "Tjestenina",
  Pork: "Svinjetina",
  Seafood: "Morski plodovi",
  Side: "Prilozi",
  Starter: "Predjela",
  Vegan: "Vegansko",
  Vegetarian: "Vegetarijansko",
  Breakfast: "Doručak",
  Goat: "Kozje meso",
};

const translations = {
  en: {
    heroSub: "Discover recipes by category, search by name, or ask AI for ideas.",
    browseCategories: "Browse by Category",
    browseSub: "Pick a type of dish to explore",
    backCategories: "All Categories",
    backRecipes: "Back to recipes",
    ingredients: "Ingredients",
    instructions: "Instructions",
    video: "Video",
    sourceBtn: "Original Recipe",
    noRecipes: "No recipes found.",
    errorLoad: "Could not load. Try again later.",
    showingUp: "Showing up to 10 dishes",
    recipes: "Recipes",
    loading: "Loading...",
    searchPlaceholder: "Search recipes by name...",
    searchResults: "Search Results",
    aiPlaceholder: "Ask AI: \"something with chicken and rice\" or \"quick Italian dinner\"...",
    aiTitle: "✨ AI Recipe Finder",
    aiSub: "Describe what you're in the mood for and AI will find recipes",
    aiSearching: "AI is thinking...",
    aiError: "AI couldn't process that. Try again.",
    aiSuggestion: "AI Suggestions",
    aiGeneratedBadge: "AI Generated Recipe",
    aiGeneratedMessage: "Not in our database, but I generated a recipe for you!",
    recommendedTitle: "Recommended for You",
    recommendedSub: "Based on your location",
  },
  sr: {
    heroSub: "Pronađi recepte po kategoriji, pretraži po imenu, ili pitaj AI za ideje.",
    browseCategories: "Pretraži po Kategoriji",
    browseSub: "Izaberi vrstu jela za istraživanje",
    backCategories: "Sve Kategorije",
    backRecipes: "Nazad na recepte",
    ingredients: "Sastojci",
    instructions: "Priprema",
    video: "Video",
    sourceBtn: "Originalni Recept",
    noRecipes: "Nema recepata.",
    errorLoad: "Greška pri učitavanju. Pokušaj ponovo.",
    showingUp: "Do 10 jela",
    recipes: "Recepti",
    loading: "Učitavanje...",
    searchPlaceholder: "Pretraži recepte po imenu...",
    searchResults: "Rezultati Pretrage",
    aiPlaceholder: "Pitaj AI: \"nešto sa piletinom i rižom\" ili \"brza večera\"...",
    aiTitle: "✨ AI Pretraga Recepata",
    aiSub: "Opiši šta želiš i AI će pronaći recepte",
    aiSearching: "AI razmišlja...",
    aiError: "AI nije mogao obraditi. Pokušaj ponovo.",
    aiSuggestion: "AI Preporuke",
    aiGeneratedBadge: "AI Generisan Recept",
    aiGeneratedMessage: "Nije u našoj bazi, ali sam ti pripremio recept!",
    recommendedTitle: "Preporučeno za Tebe",
    recommendedSub: "Na osnovu tvoje lokacije",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(lang: Lang, key: TranslationKey): string {
  return translations[lang][key];
}

export function categoryName(lang: Lang, cat: string): string {
  if (lang === "sr") return CATEGORY_SR[cat] || cat;
  return cat;
}
