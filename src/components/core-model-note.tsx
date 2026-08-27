import { erpNouns } from "@/lib/erp-model";

export function CoreModelNote({ extra }: { extra?: string }) {
  return (
    <div className="rounded-lg bg-zoom-palest/60 px-3 py-2 text-sm text-zoom-dark">
      <p>
        {erpNouns.map((noun, index) => (
          <span key={noun.id}>
            {index > 0 ? " · " : null}
            <strong>{noun.label}</strong>
            {noun.id === "contact"
              ? " = person"
              : noun.id === "organization"
                ? " = company"
                : " = the work file"}
          </span>
        ))}
        .
      </p>
      {extra ? <p className="mt-1 text-xs text-zinc-600">{extra}</p> : null}
    </div>
  );
}
