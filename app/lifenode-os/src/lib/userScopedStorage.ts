/**
 * Namespace browser storage keys per signed-in user so accounts on the same
 * device do not inherit another user's node data.
 */
export function userScopedStorageKey(
  baseKey: string,
  userId: string | null | undefined,
): string {
  const id = userId?.trim();
  if (!id) return baseKey;
  return `${baseKey}::${id}`;
}
