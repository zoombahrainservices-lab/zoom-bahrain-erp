import clsx from "clsx";
import type { ComponentType, SVGProps } from "react";

import { MaterialIcon } from "@/components/material-icon";

type DescriptionCardProps = {
  title: string;
  description?: string;
  variant?: "default" | "accent";
  layout?: "rows" | "content";
  contentClassName?: string;
  children?: React.ReactNode;
};

export function DescriptionCard({
  title,
  description,
  variant = "default",
  layout = "rows",
  contentClassName,
  children,
}: DescriptionCardProps) {
  const isAccent = variant === "accent";

  return (
    <div className="overflow-hidden bg-white shadow-sm ring-1 ring-zinc-950/5 sm:rounded-lg">
      <div
        className={clsx(
          "px-4 py-3.5 sm:px-6",
          isAccent ? "bg-zoom-dark" : "bg-white",
        )}
      >
        <h3
          className={clsx(
            "text-sm font-semibold uppercase tracking-wide",
            isAccent ? "text-white" : "text-zoom-navy",
          )}
        >
          {title}
        </h3>
        {description ? (
          <p
            className={clsx(
              "mt-0.5 max-w-2xl text-xs/5",
              isAccent ? "text-zoom-pale" : "text-zoom-gray",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {children != null ? (
        layout === "content" ? (
          <div
            className={clsx(
              "border-t border-zinc-950/5",
              contentClassName ?? "px-4 py-6 sm:px-6",
            )}
          >
            {children}
          </div>
        ) : (
          <div className="border-t border-zinc-950/5">
            <dl className="divide-y divide-zinc-950/5">{children}</dl>
          </div>
        )
      ) : null}
    </div>
  );
}

type DescriptionCardRowProps = {
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  materialIcon?: string;
  children: React.ReactNode;
};

export function DescriptionCardRow({
  label,
  icon: Icon,
  materialIcon,
  children,
}: DescriptionCardRowProps) {
  return (
    <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
      <dt className="text-sm font-medium text-zoom-charcoal">
        {materialIcon ? (
          <span className="flex items-center gap-2.5">
            <MaterialIcon name={materialIcon} className="text-[22px] text-zoom-light" />
            {label}
          </span>
        ) : Icon ? (
          <span className="flex items-center gap-2">
            <Icon aria-hidden="true" className="size-5 shrink-0 text-zoom-gray" />
            {label}
          </span>
        ) : (
          label
        )}
      </dt>
      <dd className="mt-1 text-sm/6 text-zoom-charcoal sm:col-span-2 sm:mt-0">
        {children}
      </dd>
    </div>
  );
}
