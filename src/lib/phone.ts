export function normalizePhoneDigits(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 8) digits = `973${digits}`;
  return digits;
}

export function getWhatsAppUrl(phone: string, text?: string) {
  const digits = normalizePhoneDigits(phone);
  if (!digits) return null;

  const url = new URL(`https://wa.me/${digits}`);
  if (text?.trim()) {
    url.searchParams.set("text", text.trim());
  }
  return url.toString();
}

export function getTelUrl(phone: string) {
  const digits = normalizePhoneDigits(phone);
  return digits ? `tel:+${digits}` : null;
}

export function getMailtoUrl(email: string, subject?: string) {
  const address = email.trim();
  if (!address.includes("@")) return null;

  const params = subject?.trim()
    ? `?subject=${encodeURIComponent(subject.trim())}`
    : "";
  return `mailto:${address}${params}`;
}

function firstFromJsonList(json: string | null | undefined) {
  if (!json?.trim()) return null;

  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return null;

    for (const item of parsed) {
      if (typeof item === "string" && item.trim()) return item.trim();
      if (
        item &&
        typeof item === "object" &&
        "email" in item &&
        typeof item.email === "string" &&
        item.email.trim()
      ) {
        return item.email.trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function collectReach(input: {
  mobilesJson?: string | null;
  emailsJson?: string | null;
  phones?: Array<string | null | undefined>;
  emails?: Array<string | null | undefined>;
}) {
  const phone =
    firstFromJsonList(input.mobilesJson) ??
    input.phones?.map((value) => value?.trim()).find(Boolean) ??
    null;
  const email =
    firstFromJsonList(input.emailsJson) ??
    input.emails?.map((value) => value?.trim()).find(Boolean) ??
    null;

  return { phone, email };
}
