import { formatBhd } from "@/lib/utils";
import type { OperationMoney } from "@/lib/operation-money";

export function OperationMoneyStrip({ money }: { money: OperationMoney }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
      {money.quoted > 0 ? (
        <span>
          Quoted{" "}
          <strong className="font-medium tabular-nums text-zoom-dark">
            {formatBhd(money.quoted)}
          </strong>
        </span>
      ) : null}
      {money.incoming > 0 ? (
        <span>
          Invoiced{" "}
          <strong className="font-medium tabular-nums text-emerald-800">
            {formatBhd(money.incoming)}
          </strong>
        </span>
      ) : null}
      {money.outgoing > 0 ? (
        <span>
          Cost{" "}
          <strong className="font-medium tabular-nums text-rose-800">
            {formatBhd(money.outgoing)}
          </strong>
        </span>
      ) : null}
    </div>
  );
}
