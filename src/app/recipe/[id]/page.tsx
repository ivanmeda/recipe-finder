import { fetchMealById } from "@/lib/api";
import RecipePageClient from "./RecipePageClient";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: Props) {
  const { id } = await params;
  const meal = await fetchMealById(id);

  if (!meal) {
    notFound();
  }

  return <RecipePageClient meal={meal} />;
}
