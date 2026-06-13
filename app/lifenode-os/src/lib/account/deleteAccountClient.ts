export type DeleteAccountClientResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

/**
 * Permanently delete the signed-in account via POST /api/account/delete.
 * Uses res.text() first so non-JSON error pages still surface a useful message.
 */
export async function deleteAccountClient(
  confirmPhrase: string,
): Promise<DeleteAccountClientResult> {
  const phrase = confirmPhrase.trim();
  if (!phrase) {
    return { ok: false, error: "Confirmation phrase is required.", status: 400 };
  }

  let res: Response;
  try {
    res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      cache: "no-store",
      body: JSON.stringify({ confirmPhrase: phrase }),
    });
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Network error. Check your connection and try again.",
      status: 0,
    };
  }

  const raw = await res.text();
  let payload: { ok?: boolean; error?: string } = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as { ok?: boolean; error?: string };
    } catch {
      return {
        ok: false,
        error: res.ok
          ? "Invalid server response while deleting your account."
          : `Account deletion failed (HTTP ${res.status}).`,
        status: res.status,
      };
    }
  }

  if (!res.ok) {
    const message =
      payload.error === "CONFIRMATION_REQUIRED"
        ? "Type DELETE MY ACCOUNT to confirm."
        : payload.error?.trim() ||
          `Account deletion failed (HTTP ${res.status}).`;
    return { ok: false, error: message, status: res.status };
  }

  return { ok: true };
}
