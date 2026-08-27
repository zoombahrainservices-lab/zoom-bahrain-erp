import { getMailtoUrl, getTelUrl, getWhatsAppUrl } from "@/lib/phone";

type ReachChipsProps = {
  phone?: string | null;
  email?: string | null;
  message?: string;
  subject?: string;
};

const chipClass =
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function ReachChips({ phone, email, message, subject }: ReachChipsProps) {
  const tel = phone ? getTelUrl(phone) : null;
  const whatsapp = phone ? getWhatsAppUrl(phone, message) : null;
  const mail = email ? getMailtoUrl(email, subject) : null;

  if (!tel && !whatsapp && !mail) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tel ? (
        <a href={tel} className={`${chipClass} bg-zoom-palest text-zoom-dark ring-zoom-pale`}>
          Call
        </a>
      ) : null}
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={`${chipClass} bg-[#25D366]/10 text-[#128C7E] ring-[#25D366]/30`}
        >
          WhatsApp
        </a>
      ) : null}
      {mail ? (
        <a href={mail} className={`${chipClass} bg-zinc-50 text-zinc-700 ring-zinc-200`}>
          Email
        </a>
      ) : null}
    </div>
  );
}
