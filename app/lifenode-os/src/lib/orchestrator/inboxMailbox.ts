/** True when an inbox item is a sent mailbox message (Gmail Sent / own Slack). */
export function isSentMailboxItem(
  providerPayload: Record<string, unknown> | null | undefined,
): boolean {
  if (!providerPayload || typeof providerPayload !== "object") return false;
  if (providerPayload.mailbox === "sent") return true;
  if (providerPayload.isOwn === true) return true;

  const labelIds = providerPayload.labelIds;
  if (Array.isArray(labelIds) && labelIds.some((id) => String(id) === "SENT")) {
    return true;
  }

  const labelNames = providerPayload.labelNames;
  if (
    Array.isArray(labelNames) &&
    labelNames.some((name) => String(name).toUpperCase() === "SENT")
  ) {
    return true;
  }

  return false;
}
