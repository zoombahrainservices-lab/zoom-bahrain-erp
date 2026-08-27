import clsx from "clsx";

import { Badge } from "@/components/catalyst/badge";
import { Text } from "@/components/catalyst/text";
import { MaterialIcon } from "@/components/material-icon";
import type { EditableText } from "@/lib/division-profiles";

export function IncompleteMark({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm/6 font-normal text-zoom-orange/80">
      {children}
    </span>
  );
}

export function ProfileField({
  needsInput,
  children,
}: {
  needsInput?: boolean;
  children: React.ReactNode;
}) {
  if (needsInput) {
    return <IncompleteMark>{children}</IncompleteMark>;
  }
  return <>{children}</>;
}

export function PlaceholderText({ children }: { children: React.ReactNode }) {
  return <span className="text-sm/6 text-zoom-gray">{children}</span>;
}

export function EditableValue({ field }: { field: EditableText }) {
  if (!field.value.trim()) {
    return (
      <PlaceholderText>
        {field.placeholder ?? "No information added yet."}
      </PlaceholderText>
    );
  }
  return <>{field.value}</>;
}

export function InternalBadge() {
  return (
    <Badge color="zinc" className="uppercase tracking-wide">
      Internal only
    </Badge>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-zoom-light" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function zebraRowClass(index: number) {
  return clsx(
    "px-4 py-5 sm:px-6",
    index % 2 === 0 ? "bg-white" : "bg-zoom-palest",
  );
}

export function IconDetailRow({
  icon,
  children,
}: {
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex gap-3">
      <MaterialIcon name={icon} className="mt-0.5 text-[22px] text-zoom-light" />
      <div className="min-w-0 text-sm/6 text-zoom-charcoal">{children}</div>
    </div>
  );
}

export function PhoneLinks({ phones }: { phones: string[] }) {
  return (
    <span className="flex flex-col gap-1">
      {phones.map((phone) => (
        <a
          key={phone}
          href={`tel:${phone.replace(/\s/g, "")}`}
          className="text-zoom-charcoal hover:text-zoom-light"
        >
          {phone}
        </a>
      ))}
    </span>
  );
}

export function SectionIntro({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm leading-relaxed text-zoom-charcoal sm:text-base">{children}</Text>;
}
