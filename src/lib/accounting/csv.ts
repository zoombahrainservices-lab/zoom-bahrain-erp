export function toCsv(headers: string[], rows: string[][]) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return `\uFEFF${[headers, ...rows]
    .map((row) => row.map((cell) => escape(cell ?? "")).join(","))
    .join("\r\n")}`;
}
