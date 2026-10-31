import { inflateRawSync } from "node:zlib";

export function parseXlsxSheet(bytes: Buffer) {
  const files = unzip(bytes);
  const sheet = files.get("xl/worksheets/sheet1.xml");
  if (!sheet) throw new Error("The workbook has no first sheet");
  const shared = parseShared(files.get("xl/sharedStrings.xml") ?? "");
  const rows: string[][] = [];
  const rowMatches = sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g);
  for (const rowMatch of rowMatches) {
    const cells: string[] = [];
    const cellMatches = rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g);
    for (const cell of cellMatches) {
      const ref = /r="([A-Z]+)/.exec(cell[1])?.[1] ?? "";
      const index = columnIndex(ref);
      while (cells.length < index) cells.push("");
      const type = /t="([^"]+)"/.exec(cell[1])?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(cell[2])?.[1] ?? "";
      cells[index] = type === "s" ? shared[Number(value)] ?? "" : value;
    }
    rows.push(cells);
  }
  return rows;
}

function parseShared(xml: string) {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((item) =>
    [...item[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((text) => text[1]).join(""),
  );
}

function columnIndex(letters: string) {
  let index = 0;
  for (const char of letters) index = index * 26 + (char.charCodeAt(0) - 64);
  return Math.max(0, index - 1);
}

function unzip(bytes: Buffer) {
  const files = new Map<string, string>();
  let offset = 0;
  while (offset + 30 < bytes.length && bytes.readUInt32LE(offset) === 0x04034b50) {
    const method = bytes.readUInt16LE(offset + 8);
    const compressedSize = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = bytes.subarray(nameStart, nameStart + nameLength).toString("utf8");
    const dataStart = nameStart + nameLength + extraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const raw = method === 0 ? compressed : inflateRawSync(compressed);
    files.set(name, raw.toString("utf8"));
    offset = dataStart + compressedSize;
  }
  return files;
}
