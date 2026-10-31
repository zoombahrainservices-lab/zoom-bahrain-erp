export type TreatmentMovement = {
  treatment: string;
  salesNet: bigint;
  outputVat: bigint;
  purchaseNet: bigint;
  inputVat: bigint;
};

export type NbrVatReturn = {
  standardSales: bigint;
  standardSalesVat: bigint;
  zeroRatedSales: bigint;
  exemptSales: bigint;
  standardPurchases: bigint;
  standardPurchasesVat: bigint;
  imports: bigint;
  importVat: bigint;
  reverseChargePurchases: bigint;
  reverseChargeVat: bigint;
  outputVat: bigint;
  inputVat: bigint;
  netVat: bigint;
};

function movement(rows: TreatmentMovement[], treatment: string): TreatmentMovement {
  return (
    rows.find((row) => row.treatment === treatment) ?? {
      treatment,
      salesNet: 0n,
      outputVat: 0n,
      purchaseNet: 0n,
      inputVat: 0n,
    }
  );
}

export function nbrVatReturn(rows: TreatmentMovement[]): NbrVatReturn {
  const standard = movement(rows, "standard");
  const zero = movement(rows, "zero");
  const exempt = movement(rows, "exempt");
  const imported = movement(rows, "import");
  const reverse = movement(rows, "reverse_charge");
  const outputVat = rows.reduce((sum, row) => sum + row.outputVat, 0n);
  const inputVat = rows.reduce((sum, row) => sum + row.inputVat, 0n);
  return {
    standardSales: standard.salesNet,
    standardSalesVat: standard.outputVat,
    zeroRatedSales: zero.salesNet,
    exemptSales: exempt.salesNet,
    standardPurchases: standard.purchaseNet,
    standardPurchasesVat: standard.inputVat,
    imports: imported.purchaseNet,
    importVat: imported.outputVat > 0n ? imported.outputVat : imported.inputVat,
    reverseChargePurchases: reverse.purchaseNet,
    reverseChargeVat: reverse.outputVat,
    outputVat,
    inputVat,
    netVat: outputVat - inputVat,
  };
}
