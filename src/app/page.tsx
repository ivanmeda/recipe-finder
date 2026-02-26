import {
  fetchCategories,
  fetchMealsByCategory,
  searchMealsByName,
} from "@/lib/api";
import HomeClient from "./HomeClient";

interface Props {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function Home({ searchParams }: Props) {
  const { category, search } = await searchParams;
  const categories = await fetchCategories();

  let meals = null;
  let mode: "categories" | "category" | "search" = "categories";
  let label = "";

  if (search) {
    meals = await searchMealsByName(search);
    mode = "search";
    label = search;
  } else if (
    category &&
    categories.some((c) => c.strCategory === category)
  ) {
    meals = await fetchMealsByCategory(category);
    mode = "category";
    label = category;
  }

  return (
    <HomeClient
      categories={categories}
      meals={meals}
      mode={mode}
      label={label}
    />
  );
}
