import { Button } from "@/components/catalyst/button";
import {
  pulseToneClass,
  type OperationPulse,
  type PulseAction,
} from "@/lib/operation-pulse";

type OperationPulseBarProps = {
  pulse: OperationPulse;
  onAction: (action: PulseAction) => void;
};

export function OperationPulseBar({ pulse, onAction }: OperationPulseBarProps) {
  return (
    <div
      className={`mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ring-1 ${pulseToneClass(pulse.tone)}`}
    >
      <p className="min-w-0">
        <strong className="font-semibold">{pulse.label}</strong>
        <span className="ml-2 text-xs opacity-80">{pulse.detail}</span>
      </p>
      {pulse.action ? (
        <Button
          type="button"
          outline
          className="!px-2 !py-1 !text-xs"
          onClick={() => onAction(pulse.action!)}
        >
          {pulse.action.label}
        </Button>
      ) : null}
    </div>
  );
}
