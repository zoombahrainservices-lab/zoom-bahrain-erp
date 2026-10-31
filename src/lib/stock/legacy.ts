/** Inventory stock documents are the only quantity write path. LEGACY_DIRECT_STOCK_EDITS cannot reopen the old Control form. */
export function legacyDirectStockEditsEnabled() {
  return false;
}

export const LEGACY_STOCK_RETIREMENT =
  "Quantity changes, including adjustments, are stock documents on Inventory. Choose Adjustment there. This list is the older accounting-item balance. The two quantities are not added together. Nothing here creates an opening adjustment to force them to agree. Inventory journals stay off until procurement and stock capitalization are verified.";
