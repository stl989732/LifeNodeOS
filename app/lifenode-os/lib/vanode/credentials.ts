import type { ClientCredential, ClientProfile } from "./types";

export function updateClientCredential(
  credentials: ClientCredential[] | undefined,
  credId: string,
  patch: Partial<Pick<ClientCredential, "label" | "secret">>,
): ClientCredential[] {
  return (credentials ?? []).map((cr) =>
    cr.id === credId ? { ...cr, ...patch } : cr,
  );
}

export function removeClientCredential(
  credentials: ClientCredential[] | undefined,
  credId: string,
): ClientCredential[] {
  return (credentials ?? []).filter((cr) => cr.id !== credId);
}

export function applyCredentialPatch(
  client: ClientProfile,
  credId: string,
  patch: Partial<Pick<ClientCredential, "label" | "secret">>,
): ClientCredential[] {
  return updateClientCredential(client.credentials, credId, patch);
}

export function applyCredentialRemoval(
  client: ClientProfile,
  credId: string,
): ClientCredential[] {
  return removeClientCredential(client.credentials, credId);
}
