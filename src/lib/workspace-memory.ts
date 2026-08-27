export type RememberedOperation = {
  id: string;
  title: string;
  operationCode: string;
};

const LAST_KEY = "zoom-erp-last-operation";
const PINS_KEY = "zoom-erp-pinned-operations";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function rememberLastOperation(operation: RememberedOperation) {
  writeJson(LAST_KEY, operation);
}

export function getLastOperation() {
  const value = readJson<RememberedOperation | null>(LAST_KEY, null);
  return value?.id ? value : null;
}

export function listPinnedOperations() {
  return readJson<RememberedOperation[]>(PINS_KEY, []).filter((item) => item.id);
}

export function isOperationPinned(operationId: string) {
  return listPinnedOperations().some((item) => item.id === operationId);
}

export function togglePinnedOperation(operation: RememberedOperation) {
  const current = listPinnedOperations();
  const exists = current.some((item) => item.id === operation.id);
  const next = exists
    ? current.filter((item) => item.id !== operation.id)
    : [operation, ...current].slice(0, 12);

  writeJson(PINS_KEY, next);
  return !exists;
}

const SEEN_KEY = "zoom-erp-seen-operations";
const DRAFT_PREFIX = "zoom-erp-draft:";

export function getOperationSeenAt(operationId: string) {
  const seen = readJson<Record<string, string>>(SEEN_KEY, {});
  return seen[operationId] ?? null;
}

export function markOperationSeen(operationId: string) {
  const seen = readJson<Record<string, string>>(SEEN_KEY, {});
  seen[operationId] = new Date().toISOString();
  writeJson(SEEN_KEY, seen);
}

export type OperationDraft = {
  body: string;
  entryType: string;
  amount: string;
};

export function getOperationDraft(operationId: string) {
  return readJson<OperationDraft | null>(`${DRAFT_PREFIX}${operationId}`, null);
}

export function saveOperationDraft(operationId: string, draft: OperationDraft) {
  if (!draft.body.trim() && !draft.amount.trim()) {
    clearOperationDraft(operationId);
    return;
  }
  writeJson(`${DRAFT_PREFIX}${operationId}`, draft);
}

export function clearOperationDraft(operationId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${DRAFT_PREFIX}${operationId}`);
}
