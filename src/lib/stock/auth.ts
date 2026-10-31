import { canManageOperations, canPostJournals } from "@/lib/permissions";
import type { SessionPayload } from "@/lib/session";

import { StockError } from "./errors";

export type StockActor = {
  userId: string;
  canOperate: boolean;
  canPostFinancial: boolean;
};

export function stockActorFromSession(session: SessionPayload | null): StockActor {
  if (!session) {
    return { userId: "", canOperate: false, canPostFinancial: false };
  }
  return {
    userId: session.userId,
    canOperate: canManageOperations(session),
    canPostFinancial: canPostJournals(session),
  };
}

export function assertStockOperator(actor: StockActor) {
  if (!actor.userId || !actor.canOperate) {
    throw new StockError("You do not have permission to record warehouse stock.");
  }
}

export function assertFinancialStockAuthority(actor: StockActor) {
  if (!actor.userId || !actor.canPostFinancial) {
    throw new StockError("This stock action needs accounting authorization.");
  }
}
