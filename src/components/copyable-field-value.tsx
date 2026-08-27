"use client";

import { getWhatsAppUrl } from "@/lib/phone";

function WhatsAppLink({ phone }: { phone: string }) {
  const url = getWhatsAppUrl(phone);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in WhatsApp"
      className="inline-flex shrink-0 items-center rounded-md bg-[#25D366]/10 px-2 py-0.5 text-xs font-normal text-[#128C7E] hover:bg-[#25D366]/20"
    >
      WhatsApp
    </a>
  );
}

type CopyableFieldValueProps = {
  value: string;
  displayValue?: string;
  variant?: "text" | "phone";
  className?: string;
};

export function CopyableFieldValue({
  value,
  displayValue,
  variant = "text",
  className = "",
}: CopyableFieldValueProps) {
  const text = displayValue ?? value;

  if (variant === "phone") {
    return (
      <div className="flex items-center gap-2">
        <span className={`min-w-0 ${className}`.trim()}>{text}</span>
        <WhatsAppLink phone={value} />
      </div>
    );
  }

  return <span className={`min-w-0 ${className}`.trim()}>{text}</span>;
}
