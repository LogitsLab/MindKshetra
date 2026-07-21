/** Pure continue-target resolution (safe for server + client tests). */

export function resolveContinueFromOrderedIds(
  orderedIds: number[],
  cursorSlokaId: number | null,
  completedIds: number[]
): number | null {
  if (!cursorSlokaId) return null;
  const completed = new Set(completedIds);
  const startIdx = orderedIds.indexOf(cursorSlokaId);
  if (startIdx < 0) return cursorSlokaId;

  if (!completed.has(cursorSlokaId)) return cursorSlokaId;

  for (let i = startIdx + 1; i < orderedIds.length; i++) {
    if (!completed.has(orderedIds[i])) return orderedIds[i];
  }
  for (let i = 0; i < startIdx; i++) {
    if (!completed.has(orderedIds[i])) return orderedIds[i];
  }
  return cursorSlokaId;
}
