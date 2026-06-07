export const LINOS_CHAT_ID_KEY_PREFIX = "linos-chat-id-v1";

/** Per-user localStorage key so chat sessions never bleed across accounts. */
export function linosChatStorageKey(userId: string): string {
  return `${LINOS_CHAT_ID_KEY_PREFIX}:${userId}`;
}
