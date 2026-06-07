import { compressKitchenImageFile } from "@/src/lib/compressKitchenImage";
import { SHELF_PRESETS } from "@/src/components/home-kitchen/data";

export type KitchenScanPhoto = {
  file: File;
  previewUrl: string;
};

export type KitchenDetectedItem = {
  id: string;
  name: string;
  category: string;
  quantity: string;
  percentRemaining: number;
  daysToExpiry: number;
  storage: string;
  shelf: string;
  kept?: boolean;
};

export function ingredientsTextToItems(
  ingredients: string,
  storage: string,
): KitchenDetectedItem[] {
  const shelf = SHELF_PRESETS[storage as keyof typeof SHELF_PRESETS]?.[0] ?? "Unsorted";
  return ingredients
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => ({
      id: crypto.randomUUID(),
      name,
      category: "Pantry",
      quantity: "1",
      percentRemaining: 100,
      daysToExpiry: 7,
      storage,
      shelf,
      kept: true,
    }));
}

export async function analyzeKitchenPhoto(file: File): Promise<string> {
  const { base64, mimeType } = await compressKitchenImageFile(file);
  const res = await fetch("/api/homenode/kitchen-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "vision_ingredients",
      imageBase64: base64,
      mimeType,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data?.error === "string"
        ? data.error
        : `Kitchen scan failed (${res.status})`;
    throw new Error(msg);
  }
  return typeof data?.ingredients === "string" ? data.ingredients : "";
}

export async function detectItemsFromScanPhotos(
  photos: { outside?: File | null; inside?: File | null },
  storage: string,
): Promise<KitchenDetectedItem[]> {
  const primary = photos.inside ?? photos.outside;
  if (!primary) return [];

  const ingredients = await analyzeKitchenPhoto(primary);
  if (!ingredients.trim()) return [];
  return ingredientsTextToItems(ingredients, storage);
}
