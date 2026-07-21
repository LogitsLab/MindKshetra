import "server-only";
import type { Mood } from "@/lib/types";

export async function getAllMoods(): Promise<Mood[]> {
  const mod = await import("@/lib/content/index");
  return mod.getAllMoods();
}

export async function getMoodById(id: string): Promise<Mood | undefined> {
  const mod = await import("@/lib/content/index");
  return mod.getMoodById(id);
}
