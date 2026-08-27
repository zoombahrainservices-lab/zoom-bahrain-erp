const BAHRAIN = "Asia/Bahrain";

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

export function greetingForName(name: string, at = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: BAHRAIN,
      hour: "numeric",
      hour12: false,
    }).format(at),
  );

  const who = firstName(name);
  if (hour < 12) return `Good morning, ${who}`;
  if (hour < 17) return `Good afternoon, ${who}`;
  return `Good evening, ${who}`;
}

export function bahrainClock(at = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: BAHRAIN,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(at);
}
