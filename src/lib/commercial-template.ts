import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

import sharp from "sharp";

import { filsToAmount } from "@/lib/accounting/money";
import {
  buildCommercialDocx,
  pricePrintLine,
  printTotals,
  type CommercialPrintModel,
} from "@/lib/commercial-print";
import { getDivisionById } from "@/lib/divisions";
import { parseSvgDimensions } from "@/lib/logo-export";

type ZipEntry = { name: string; data: Buffer };

function templateFile(name: string) {
  const candidates = [
    path.join(process.cwd(), "src", "lib", "commercial-templates", name),
    path.join(path.dirname(fileURLToPath(import.meta.url)), "commercial-templates", name),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) throw new Error(`The ${name} template is not in the project`);
  return found;
}

function readZip(bytes: Buffer): ZipEntry[] {
  let end = bytes.length - 22;
  while (end >= 0 && bytes.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error("The template is not a Word file");
  const count = bytes.readUInt16LE(end + 10);
  let cursor = bytes.readUInt32LE(end + 16);
  const entries: ZipEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    if (bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error("The template archive is damaged");
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8");
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    entries.push({
      name,
      data: method === 0 ? Buffer.from(compressed) : inflateRawSync(compressed),
    });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function crc32(data: Buffer) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeZip(entries: ZipEntry[]) {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name);
    const local = Buffer.alloc(30);
    const crc = crc32(entry.data);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18);
    local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const header = Buffer.concat([local, name, entry.data]);
    locals.push(header);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(entry.data.length, 20);
    record.writeUInt32LE(entry.data.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([record, name]));
    offset += header.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

function escapeXml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function replaceToken(xml: string, sample: string, value: string) {
  const encoded = sample.replaceAll("&", "&amp;");
  if (!xml.includes(encoded)) throw new Error(`The template is missing "${sample}"`);
  return xml.replaceAll(encoded, escapeXml(value));
}

function plainAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return value;
  return amount.toFixed(3).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function fixedAmount(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(3) : value;
}

function tables(xml: string) {
  return [...xml.matchAll(/<w:tbl[\s>][\s\S]*?<\/w:tbl>/g)].map((match) => match[0]);
}

function rows(table: string) {
  return [...table.matchAll(/<w:tr[\s>][\s\S]*?<\/w:tr>/g)].map((match) => match[0]);
}

function setCellText(cell: string, text: string) {
  const open = /^<w:tc\b[^>]*>/.exec(cell)?.[0] ?? "<w:tc>";
  const properties = cell.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/)?.[0] ?? "";
  const paragraphProperties = cell.match(/<w:pPr>[\s\S]*?<\/w:pPr>/)?.[0] ?? "";
  const runProperties = cell.match(/<w:rPr>[\s\S]*?<\/w:rPr>/)?.[0] ?? "";
  return `${open}${properties}<w:p>${paragraphProperties}<w:r>${runProperties}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p></w:tc>`;
}

function fillRow(row: string, values: string[]) {
  let index = 0;
  return row.replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/g, (cell) => {
    const value = values[index];
    index += 1;
    return value === undefined ? cell : setCellText(cell, value);
  });
}

function replaceRows(table: string, nextRows: string[]) {
  let index = 0;
  const replaced = table.replace(/<w:tr[\s>][\s\S]*?<\/w:tr>/g, () => nextRows[index++] ?? "");
  const extra = nextRows.slice(index).join("");
  return extra ? replaced.replace("</w:tbl>", `${extra}</w:tbl>`) : replaced;
}

function replaceTable(xml: string, current: string, next: string) {
  const start = xml.indexOf(current);
  if (start < 0) throw new Error("A template table could not be updated");
  return xml.slice(0, start) + next + xml.slice(start + current.length);
}

function removeParagraph(xml: string, marker: string) {
  const at = xml.indexOf(marker);
  if (at < 0) return xml;
  const spaced = xml.lastIndexOf("<w:p ", at);
  const plain = xml.lastIndexOf("<w:p>", at);
  const start = Math.max(spaced, plain);
  const end = xml.indexOf("</w:p>", at);
  if (start < 0 || end < 0) return xml;
  return xml.slice(0, start) + xml.slice(end + "</w:p>".length);
}

function fillInvoice(xml: string, model: CommercialPrintModel) {
  const totals = printTotals(model);
  const figures = model.lines.map((line, index) => {
    const priced = pricePrintLine(line, true);
    return [
      String(index + 1),
      line.description,
      plainAmount(line.quantity),
      plainAmount(line.unitAmount),
      plainAmount(filsToAmount(priced.vat)),
      plainAmount(filsToAmount(priced.total)),
    ];
  });
  const itemTable = tables(xml).find((table) => table.includes("Item Name / Description"));
  const totalTable = tables(xml).find((table) => table.includes("Subtotal:"));
  if (!itemTable || !totalTable) throw new Error("The tax invoice template tables are missing");
  const itemRows = rows(itemTable);
  const filledItems = [
    itemRows[0],
    ...figures.map((values) => fillRow(itemRows[1], values)),
  ];
  const totalRows = rows(totalTable);
  const filledTotals = [
    fillRow(totalRows[0], ["Subtotal:", plainAmount(totals.net.replaceAll(",", ""))]),
    fillRow(totalRows[1], ["VAT:", plainAmount(totals.vat.replaceAll(",", ""))]),
    fillRow(totalRows[2], ["Total:", fixedAmount(totals.total.replaceAll(",", ""))]),
  ];
  let next = replaceTable(xml, itemTable, replaceRows(itemTable, filledItems));
  next = replaceTable(next, totalTable, replaceRows(totalTable, filledTotals));
  next = replaceToken(next, "ZGC-WH-INV-260826000001", model.number);
  next = replaceToken(next, "14 September 2026", model.date);
  next = replaceToken(next, "ZGC-ORG-000002", model.accountId);
  next = replaceToken(next, "Impact Advertising & Publicity L.L.C)", model.clientName);
  next = replaceToken(next, "Sharjah, United Arab Emirates", model.clientAddress || "—");
  next = replaceToken(next, "Mr. Harsha Harindran", model.contactName || "—");
  next = replaceToken(next, "Short-Term Storage and Handling Services", model.reference);
  next = replaceToken(
    next,
    "Three hundred thirteen Bahraini dinars and five hundred fils only.",
    totals.words.replace(/\.$/, ""),
  );
  next = replaceToken(next, "Short term storage - 2026", model.scope || model.reference);
  next = replaceToken(next, "Zoom Group of Companies VAT No: 220012125900002", `${model.sellerName} VAT No: ${model.sellerVat}`);
  next = fillLabeledValue(next, "Customer VAT No", model.customerVat);
  return next;
}

function drawingBlock(xml: string, imageName: string) {
  const at = xml.indexOf(`name="${imageName}"`);
  if (at < 0) return null;
  const start = xml.lastIndexOf("<w:drawing>", at);
  const end = xml.indexOf("</w:drawing>", at);
  if (start < 0 || end < 0) return null;
  return { start, end: end + "</w:drawing>".length };
}

function retargetDrawing(drawing: string, fromId: string, toId: string, x: string, y: string) {
  return drawing
    .replace(`r:embed="${fromId}"`, `r:embed="${toId}"`)
    .replace(
      /<wp:positionH relativeFrom="[^"]*">\s*<wp:posOffset>-?\d+<\/wp:posOffset>\s*<\/wp:positionH>/,
      `<wp:positionH relativeFrom="column"><wp:posOffset>${x}</wp:posOffset></wp:positionH>`,
    )
    .replace(
      /<wp:positionV relativeFrom="[^"]*">\s*<wp:posOffset>-?\d+<\/wp:posOffset>\s*<\/wp:positionV>/,
      `<wp:positionV relativeFrom="paragraph"><wp:posOffset>${y}</wp:posOffset></wp:positionV>`,
    )
    .replace(/<wp:wrapSquare[^/]*\/>/, "<wp:wrapNone/>")
    .replace('layoutInCell="1"', 'layoutInCell="0"')
    .replace('relativeHeight="0"', 'relativeHeight="251658240"');
}

function placeInvoiceStamp(entries: ZipEntry[]) {
  const header = entries.find((entry) => entry.name === "word/header1.xml");
  const document = entries.find((entry) => entry.name === "word/document.xml");
  const rels = entries.find((entry) => entry.name === "word/_rels/document.xml.rels");
  if (!header || !document || !rels) return;
  let headerXml = header.data.toString("utf8");
  const stamp = drawingBlock(headerXml, "image6.png");
  const sign = drawingBlock(headerXml, "image5.png");
  if (!stamp || !sign) return;
  const stampXml = retargetDrawing(headerXml.slice(stamp.start, stamp.end), "rId4", "rId20", "4300000", "-1550000");
  const signXml = retargetDrawing(headerXml.slice(sign.start, sign.end), "rId5", "rId21", "4550000", "-520000");
  const ordered = [stamp, sign].sort((left, right) => right.start - left.start);
  for (const block of ordered) {
    headerXml = headerXml.slice(0, block.start) + headerXml.slice(block.end);
  }
  header.data = Buffer.from(headerXml);

  let doc = document.data.toString("utf8");
  const thanks = doc.indexOf("Thank you for using our services.");
  const paragraphEnd = thanks < 0 ? doc.lastIndexOf("</w:p>") : doc.indexOf("</w:p>", thanks);
  if (paragraphEnd < 0) return;
  doc =
    doc.slice(0, paragraphEnd) +
    `<w:r><w:rPr><w:rtl w:val="0"/></w:rPr>${stampXml}${signXml}</w:r>` +
    doc.slice(paragraphEnd);
  document.data = Buffer.from(doc);

  rels.data = Buffer.from(
    rels.data.toString("utf8").replace(
      "</Relationships>",
      `<Relationship Id="rId20" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image6.png"/><Relationship Id="rId21" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image5.png"/></Relationships>`,
    ),
  );
}

const stampFiles = {
  "real-estate-advertising": "real-estate-advertising.jpg",
  solutions: "solutions.jpg",
} as const;

export const commercialStampChoices = [
  { id: "real-estate-advertising", label: "Zoom Real Estate & Advertising stamp and signature" },
  { id: "solutions", label: "Zoom Solutions stamp and signature" },
] as const;

function imageType(bytes: Buffer) {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return "image/jpeg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return "application/octet-stream";
}

export async function commercialArtwork(piece: string) {
  if (piece === "signature" || piece === "template-stamp") {
    const art = defaultCommercialArt("invoice");
    const bytes = piece === "signature" ? art.signature : art.stamp;
    if (!bytes) return null;
    return { bytes, type: imageType(bytes) };
  }
  const fileName = stampFiles[piece as keyof typeof stampFiles];
  if (!fileName) return null;
  const filePath = path.join(path.dirname(templateFile("tax-invoice.docx")), "stamps", fileName);
  if (!fs.existsSync(filePath)) return null;
  const bytes = fs.readFileSync(filePath);
  return { bytes, type: imageType(bytes) };
}

const logoPngCache = new Map<string, Promise<Buffer | null>>();

function divisionLogoPng(divisionId: string) {
  const cached = logoPngCache.get(divisionId);
  if (cached) return cached;
  const pending = renderDivisionLogo(divisionId);
  logoPngCache.set(divisionId, pending);
  return pending;
}

async function renderDivisionLogo(divisionId: string) {
  const division = getDivisionById(divisionId);
  if (!division?.logo) return null;
  const svgPath = path.join(process.cwd(), "public", division.logo.replace(/^\//, ""));
  if (!fs.existsSync(svgPath)) return null;
  const svg = fs.readFileSync(svgPath);
  return sharp(svg, { density: 216 }).resize({ width: 1800 }).png().toBuffer();
}

export async function stampChoicePng(stampId: string) {
  const fileName = stampFiles[stampId as keyof typeof stampFiles];
  if (!fileName) return null;
  const filePath = path.join(path.dirname(templateFile("tax-invoice.docx")), "stamps", fileName);
  if (!fs.existsSync(filePath)) return null;
  return sharp(fs.readFileSync(filePath)).png().toBuffer();
}

export async function uploadedStampPng(bytes: Buffer) {
  return sharp(bytes).rotate().png().toBuffer();
}

function headerWordmark(xml: string) {
  const drawings = [...xml.matchAll(/<wp:anchor[\s\S]*?<\/wp:anchor>/g)];
  let best: { index: number; drawing: string; cx: number; cy: number; x: number; embed: string } | null = null;
  for (const match of drawings) {
    const drawing = match[0];
    const extent = drawing.match(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/);
    const horizontal = drawing.match(/<wp:positionH relativeFrom="[^"]*">\s*<wp:posOffset>(-?\d+)<\/wp:posOffset>/);
    const embed = drawing.match(/r:embed="(rId\d+)"/);
    if (!extent || !horizontal || !embed || match.index === undefined) continue;
    const cx = Number(extent[1]);
    const cy = Number(extent[2]);
    const x = Number(horizontal[1]);
    if (cx > 6000000 || cy > 600000 || x < 0) continue;
    if (!best || x > best.x) best = { index: match.index, drawing, cx, cy, x, embed: embed[1] };
  }
  return best;
}

async function applyHeaderLogo(entries: ZipEntry[], divisionId: string | undefined) {
  if (!divisionId) return;
  const division = getDivisionById(divisionId);
  if (!division?.logo) return;
  const header = entries.find((entry) => entry.name === "word/header1.xml");
  const rels = entries.find((entry) => entry.name === "word/_rels/header1.xml.rels");
  if (!header || !rels) return;
  const headerXml = header.data.toString("utf8");
  const logo = headerWordmark(headerXml);
  if (!logo) return;
  const target = rels.data.toString("utf8").match(new RegExp(`Id="${logo.embed}"[^>]*Target="([^"]+)"`));
  if (!target) return;
  const media = entries.find((entry) => entry.name === `word/${target[1]}`);
  const png = await divisionLogoPng(divisionId);
  if (!media || !png) return;
  media.data = png;

  const svg = fs.readFileSync(path.join(process.cwd(), "public", division.logo.replace(/^\//, "")), "utf8");
  const { width, height } = parseSvgDimensions(svg);
  const aspect = width / height;
  const boxAspect = logo.cx / logo.cy;
  const nextCx = aspect > boxAspect ? logo.cx : Math.round(logo.cy * aspect);
  const nextCy = aspect > boxAspect ? Math.round(logo.cx / aspect) : logo.cy;
  const nextX = logo.x + logo.cx - nextCx;
  const resized = logo.drawing
    .replace(/<wp:extent cx="\d+" cy="\d+"\/>/, `<wp:extent cx="${nextCx}" cy="${nextCy}"/>`)
    .replace(/<a:ext cx="\d+" cy="\d+"\/>/, `<a:ext cx="${nextCx}" cy="${nextCy}"/>`)
    .replace(
      /(<wp:positionH relativeFrom="[^"]*">\s*<wp:posOffset>)-?\d+(<\/wp:posOffset>)/,
      `$1${nextX}$2`,
    );
  header.data = Buffer.from(headerXml.slice(0, logo.index) + resized + headerXml.slice(logo.index + logo.drawing.length));
}

function nudgeHeaderLogo(entries: ZipEntry[]) {
  const header = entries.find((entry) => entry.name === "word/header1.xml");
  if (!header) return;
  const headerXml = header.data.toString("utf8");
  const logo = headerWordmark(headerXml);
  if (!logo) return;
  const nudged = logo.drawing.replace(
    /(<wp:positionV relativeFrom="[^"]*">\s*<wp:posOffset>)(-?\d+)(<\/wp:posOffset>)/,
    (_match, start: string, value: string, end: string) => `${start}${Number(value) + 10 * 9525}${end}`,
  );
  header.data = Buffer.from(
    headerXml.slice(0, logo.index) + nudged + headerXml.slice(logo.index + logo.drawing.length),
  );
}

function fillLabeledValue(xml: string, label: string, value: string) {
  const table = tables(xml).find((item) => item.includes(label));
  if (!table || !value) return xml;
  const nextRows = rows(table).map((row) => {
    if (!row.includes(label)) return row;
    let index = 0;
    return row.replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/g, (cell) => {
      const current = index;
      index += 1;
      return current === 1 ? setCellText(cell, value) : cell;
    });
  });
  return replaceTable(xml, table, replaceRows(table, nextRows));
}

function fillQuotation(xml: string, model: CommercialPrintModel) {
  const totals = printTotals({ ...model, kind: "quotation" });
  const figures = model.lines.map((line, index) => [
    String(index + 1),
    line.description,
    plainAmount(line.quantity),
    fixedAmount(line.unitAmount),
    fixedAmount(filsToAmount(pricePrintLine(line, false).total)),
  ]);
  const itemTable = tables(xml).find((table) => table.includes("Rate"));
  const totalTable = tables(xml).find((table) => table.includes("Total Amount Quoted:"));
  if (!itemTable || !totalTable) throw new Error("The quotation template tables are missing");
  const itemRows = rows(itemTable);
  const totalRows = rows(totalTable);
  const filledItems = [itemRows[0], ...figures.map((values) => fillRow(itemRows[1], values))];
  const filledTotals = [
    fillRow(totalRows[0], ["Total Amount Quoted:", fixedAmount(totals.total.replaceAll(",", ""))]),
    totalRows[1],
  ];
  let next = replaceTable(xml, itemTable, replaceRows(itemTable, filledItems));
  next = replaceTable(next, totalTable, replaceRows(totalTable, filledTotals));
  next = replaceToken(next, "ZGC-EVN-QTN-260826000001", model.number);
  next = replaceToken(next, "26 August 2026", model.date);
  next = replaceToken(next, "01 September 2026", model.validUntil);
  next = replaceToken(next, "ZGC-ORG-000001", model.accountId);
  next = replaceToken(next, "MI TECHNICAL TRADING CO. W.L.L. (MIT Group)", model.clientName);
  next = replaceToken(
    next,
    "Flat/Shop 11, Building 1225, Road 2325, Block 623, Al Akr Al Sharqi, Kingdom of Bahrain ",
    model.clientAddress || "—",
  );
  next = replaceToken(next, "Mr. Muhammed, CEO", model.contactName || "—");
  next = replaceToken(next, "AWC Branded Notebook & Pen Sets ", model.reference);
  next = replaceToken(
    next,
    "This quotation covers the supply and custom branding of notebook and pen sets with the AWC logo, based on the selected model and approved artwork. Two branding options are available: Option 1 featuring a single blue color print as per the MIT brand guide, and Option 2 featuring a black print.",
    model.scope || model.reference,
  );
  next = replaceToken(next, "THREE HUNDRED AND SIXTY / BHD ONLY", totals.words.replace(/\.$/, "").toUpperCase());
  next = removeParagraph(next, "Option 1 - Blue Branding");
  next = removeParagraph(next, "<w:drawing");
  if (model.kind === "proposal") next = replaceToken(next, "QUOTATION", "PROPOSAL");
  return next;
}

export function commercialLogoPng(divisionId: string) {
  return divisionLogoPng(divisionId);
}

export type CommercialArt = {
  logo: Buffer | null;
  stamp: Buffer | null;
  signature: Buffer | null;
};

const artCache = new Map<string, CommercialArt>();

function mediaEntry(entries: ZipEntry[], target: string) {
  const cleaned = target.replace(/^\//, "").replace(/^\.\.\//, "");
  const base = path.posix.basename(cleaned);
  return (
    entries.find((entry) => entry.name === `word/${cleaned}` || entry.name === cleaned || entry.name === `word/media/${base}`) ??
    null
  );
}

export function defaultCommercialArt(kind: "invoice" | "quotation"): CommercialArt {
  const cached = artCache.get(kind);
  if (cached) return cached;
  const entries = readZip(fs.readFileSync(templateFile(kind === "invoice" ? "tax-invoice.docx" : "quotation.docx")));
  const header = entries.find((entry) => entry.name === "word/header1.xml");
  const rels = entries.find((entry) => entry.name === "word/_rels/header1.xml.rels");
  let logo: Buffer | null = null;
  if (header && rels) {
    const mark = headerWordmark(header.data.toString("utf8"));
    const target = mark
      ? rels.data.toString("utf8").match(new RegExp(`Id="${mark.embed}"[^>]*Target="([^"]+)"`))
      : null;
    logo = target ? (mediaEntry(entries, target[1])?.data ?? null) : null;
  }
  const art = {
    logo,
    stamp: kind === "invoice" ? (entries.find((entry) => entry.name === "word/media/image6.png")?.data ?? null) : null,
    signature: kind === "invoice" ? (entries.find((entry) => entry.name === "word/media/image5.png")?.data ?? null) : null,
  };
  artCache.set(kind, art);
  return art;
}

export async function brandedCommercialDocx(
  model: CommercialPrintModel,
  branding?: { logoId?: string; stampPng?: Buffer },
) {
  if (model.kind !== "invoice" && model.kind !== "quotation" && model.kind !== "proposal") {
    return buildCommercialDocx(model);
  }
  const file = templateFile(model.kind === "invoice" ? "tax-invoice.docx" : "quotation.docx");
  const entries = readZip(fs.readFileSync(file));
  const document = entries.find((entry) => entry.name === "word/document.xml");
  if (!document) throw new Error("The template has no document");
  const xml = document.data.toString("utf8");
  document.data = Buffer.from(model.kind === "invoice" ? fillInvoice(xml, model) : fillQuotation(xml, model));
  await applyHeaderLogo(entries, branding?.logoId);
  nudgeHeaderLogo(entries);
  if (model.kind === "invoice") {
    const media = entries.find((entry) => entry.name === "word/media/image6.png");
    if (branding?.stampPng && media) media.data = branding.stampPng;
    placeInvoiceStamp(entries);
  }
  return writeZip(entries);
}
