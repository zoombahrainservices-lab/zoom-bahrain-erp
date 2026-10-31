import sharp from "sharp";

import {
  commercialTitle,
  printTotals,
  quotationTerms,
  zoomLetterhead,
  type CommercialPrintModel,
} from "@/lib/commercial-print";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const NAVY: Rgb = [0.102, 0.212, 0.365];
const MUTED: Rgb = [0.33, 0.38, 0.44];
const LINE: Rgb = [0.78, 0.81, 0.85];
const BLACK: Rgb = [0.1, 0.12, 0.16];

type Rgb = [number, number, number];

type JpegImage = { name: string; jpeg: Buffer; width: number; height: number };

const HELVETICA = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556,
  556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278,
  500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469,
  556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500,
  278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

function n(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

function rgb(color: Rgb) {
  return color.map((channel) => n(channel)).join(" ");
}

function textWidth(value: string, size: number, bold: boolean) {
  let width = 0;
  for (const char of value) {
    const code = char.charCodeAt(0);
    const unit = code >= 32 && code <= 126 ? HELVETICA[code - 32] : 500;
    width += (unit * size) / 1000;
  }
  return width * (bold ? 1.06 : 1);
}

function plain(value: string) {
  return value.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function pdfLiteral(value: string) {
  return plain(value).replace(/[\\()]/g, (char) => `\\${char}`);
}

function wrap(value: string, maxWidth: number, size: number, bold: boolean) {
  const clean = plain(value);
  if (!clean) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of clean.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next, size, bold) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (textWidth(word, size, bold) <= maxWidth) {
      current = word;
      continue;
    }
    let chunk = "";
    for (const char of word) {
      const trial = chunk + char;
      if (chunk && textWidth(trial, size, bold) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk = trial;
      }
    }
    current = chunk;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

class PageWriter {
  pages: string[] = [];
  private commands: string[] = [];
  y = PAGE_H - MARGIN;

  constructor(private readonly continued: string) {}

  private pushPage() {
    this.pages.push(this.commands.join("\n"));
    this.commands = [];
    this.y = PAGE_H - MARGIN;
  }

  break() {
    this.pushPage();
    this.text(MARGIN, this.y - 11, 9, this.continued, true, NAVY);
    this.y -= 22;
  }

  ensure(height: number) {
    if (this.y - height < 48 && this.y < PAGE_H - MARGIN - 36) this.break();
  }

  finish() {
    if (this.commands.length || this.pages.length === 0) this.pushPage();
  }

  fill(color: Rgb) {
    this.commands.push(`${rgb(color)} rg`);
  }

  stroke(color: Rgb) {
    this.commands.push(`${rgb(color)} RG`);
  }

  rect(x: number, y: number, width: number, height: number) {
    this.commands.push(`${n(x)} ${n(y)} ${n(width)} ${n(height)} re f`);
  }

  rule(x: number, y: number, width: number) {
    this.stroke(LINE);
    this.commands.push(`0.6 w ${n(x)} ${n(y)} m ${n(x + width)} ${n(y)} l S`);
  }

  text(x: number, y: number, size: number, value: string, bold = false, color: Rgb = BLACK) {
    const literal = pdfLiteral(value);
    if (!literal) return;
    this.fill(color);
    this.commands.push(
      `BT /${bold ? "F2" : "F1"} ${n(size)} Tf 1 0 0 1 ${n(x)} ${n(y)} Tm (${literal}) Tj ET`,
    );
  }

  image(name: string, x: number, y: number, width: number, height: number) {
    this.commands.push(`q ${n(width)} 0 0 ${n(height)} ${n(x)} ${n(y)} cm /${name} Do Q`);
  }

  paragraph(value: string, size: number, bold = false, color: Rgb = BLACK, gap = 3) {
    const lines = wrap(value, CONTENT_W, size, bold);
    this.ensure(lines.length * (size + 3) + gap);
    for (const line of lines) {
      this.y -= size;
      this.text(MARGIN, this.y, size, line, bold, color);
      this.y -= 3;
    }
    this.y -= gap;
  }

  labelValue(label: string, value: string) {
    const body = wrap(value || "—", CONTENT_W - 92, 9, false);
    this.ensure(Math.max(body.length, 1) * 12 + 2);
    this.text(MARGIN, this.y - 9, 8, label, true, MUTED);
    body.forEach((line, index) => {
      this.text(MARGIN + 92, this.y - 9 - index * 12, 9, line);
    });
    this.y -= Math.max(body.length, 1) * 12 + 2;
  }
}

function fit(image: JpegImage, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * scale, height: image.height * scale };
}

async function toJpeg(bytes: Buffer, maxWidth: number): Promise<Omit<JpegImage, "name"> | null> {
  try {
    const jpeg = await sharp(bytes).rotate().resize({ width: maxWidth, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    const meta = await sharp(jpeg).metadata();
    if (!meta.width || !meta.height) return null;
    return { jpeg, width: meta.width, height: meta.height };
  } catch {
    return null;
  }
}

function buildPdf(pages: string[], images: JpegImage[]) {
  const objects: Buffer[] = [];
  const imageStart = 5;
  const pageStart = imageStart + images.length;
  const kids = pages.map((_, index) => `${pageStart + index * 2} 0 R`).join(" ");
  objects.push(Buffer.from("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.push(Buffer.from(`<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`));
  objects.push(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objects.push(Buffer.from("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));
  for (const image of images) {
    const dict = `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`;
    objects.push(Buffer.concat([Buffer.from(dict), image.jpeg, Buffer.from("\nendstream")]));
  }
  pages.forEach((content, index) => {
    const pageId = pageStart + index * 2;
    const xobjects = images.map((image, imageIndex) => `/${image.name} ${imageStart + imageIndex} 0 R`).join(" ");
    objects.push(
      Buffer.from(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(PAGE_W)} ${n(PAGE_H)}] /Contents ${pageId + 1} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xobjects} >> >> >>`,
      ),
    );
    objects.push(Buffer.from(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`));
  });

  let body = Buffer.from("%PDF-1.4\n");
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body = Buffer.concat([body, Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from("\nendobj\n")]);
  });
  const xrefAt = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return Buffer.concat([body, Buffer.from(xref)]);
}

type Column = { label: string; width: number; align: "left" | "right"; values: string[] };

function drawTable(page: PageWriter, columns: Column[]) {
  const rowCount = columns[0]?.values.length ?? 0;
  const paintHeader = () => {
    const headerH = 18;
    page.ensure(headerH + 8);
    page.y -= headerH;
    page.fill(NAVY);
    page.rect(MARGIN, page.y, CONTENT_W, headerH);
    let x = MARGIN;
    for (const column of columns) {
      const labelWidth = textWidth(column.label, 8, true);
      const labelX = column.align === "right" ? x + column.width - 4 - labelWidth : x + 4;
      page.text(labelX, page.y + 5, 8, column.label, true, [1, 1, 1]);
      x += column.width;
    }
  };

  paintHeader();
  for (let row = 0; row < rowCount; row += 1) {
    const wrapped = columns.map((column) => wrap(column.values[row] ?? "", column.width - 8, 8, false));
    const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
    const rowH = lineCount * 11 + 6;
    if (page.y - rowH < 48 && page.y < PAGE_H - MARGIN - 36) {
      page.break();
      paintHeader();
    }
    page.y -= rowH;
    let x = MARGIN;
    columns.forEach((column, index) => {
      wrapped[index].forEach((line, lineIndex) => {
        const width = textWidth(line, 8, false);
        const textX = column.align === "right" ? x + column.width - 4 - width : x + 4;
        page.text(textX, page.y + rowH - 13 - lineIndex * 11, 8, line);
      });
      x += column.width;
    });
    page.rule(MARGIN, page.y, CONTENT_W);
  }
  page.y -= 10;
}

function amountColumns(invoice: boolean, rows: ReturnType<typeof printTotals>["rows"]): Column[] {
  if (invoice) {
    return [
      { label: "No.", width: 32, align: "left", values: rows.map((row) => row.no) },
      { label: "Item / Description", width: 203.28, align: "left", values: rows.map((row) => row.description) },
      { label: "Qty", width: 52, align: "right", values: rows.map((row) => row.quantity) },
      { label: "Unit (BHD)", width: 78, align: "right", values: rows.map((row) => row.rate) },
      { label: "VAT", width: 62, align: "right", values: rows.map((row) => row.vat) },
      { label: "Amount", width: 88, align: "right", values: rows.map((row) => row.amount) },
    ];
  }
  return [
    { label: "No.", width: 32, align: "left", values: rows.map((row) => row.no) },
    { label: "Description", width: 243.28, align: "left", values: rows.map((row) => row.description) },
    { label: "Qty", width: 60, align: "right", values: rows.map((row) => row.quantity) },
    { label: "Rate (BHD)", width: 80, align: "right", values: rows.map((row) => row.rate) },
    { label: "Amount", width: 100, align: "right", values: rows.map((row) => row.amount) },
  ];
}

export async function commercialPdf(
  model: CommercialPrintModel,
  art?: { logo?: Buffer | null; stamp?: Buffer | null; signature?: Buffer | null },
) {
  const images: JpegImage[] = [];
  const logo = await toJpeg(art?.logo ?? Buffer.alloc(0), 1000);
  const stamp = model.kind === "invoice" ? await toJpeg(art?.stamp ?? Buffer.alloc(0), 700) : null;
  const signature = model.kind === "invoice" ? await toJpeg(art?.signature ?? Buffer.alloc(0), 700) : null;
  if (logo) images.push({ name: "ImLogo", ...logo });
  if (stamp) images.push({ name: "ImStamp", ...stamp });
  if (signature) images.push({ name: "ImSign", ...signature });

  const totals = printTotals(model);
  const invoice = model.kind === "invoice";
  const title = commercialTitle(model.kind);
  const page = new PageWriter(`${title}  ${model.number}`);

  const logoBox = logo ? fit({ name: "ImLogo", ...logo }, 168, 46) : null;
  if (logoBox) page.image("ImLogo", MARGIN, page.y - logoBox.height, logoBox.width, logoBox.height);
  const titleWidth = textWidth(title, 16, true);
  page.text(PAGE_W - MARGIN - titleWidth, page.y - 16, 16, title, true, NAVY);
  const meta = [`No. ${model.number}`, `Date ${model.date}`];
  if (!invoice && model.validUntil && model.validUntil !== "—") meta.push(`Valid until ${model.validUntil}`);
  meta.forEach((line, index) => {
    const width = textWidth(line, 9, false);
    page.text(PAGE_W - MARGIN - width, page.y - 32 - index * 12, 9, line, false, MUTED);
  });
  page.y -= Math.max(logoBox?.height ?? 0, 32 + meta.length * 12) + 8;
  page.paragraph(invoice ? `${model.sellerName} | VAT ${model.sellerVat}` : model.sellerName, 9, true, NAVY, 2);
  page.rule(MARGIN, page.y, CONTENT_W);
  page.y -= 14;

  page.labelValue(invoice ? "Bill to" : "Client", model.clientName);
  page.labelValue("Address", model.clientAddress || "—");
  page.labelValue("Contact", model.contactName || "—");
  page.labelValue("Account", model.accountId);
  if (invoice) page.labelValue("Customer VAT", model.customerVat || "—");
  page.labelValue("Reference", model.reference);
  if (model.scope.trim()) page.labelValue(invoice ? "Description" : "Scope", model.scope);
  page.y -= 6;

  drawTable(page, amountColumns(invoice, totals.rows));

  const totalLines = invoice
    ? [
        ["Subtotal", totals.net],
        ["VAT", totals.vat],
        ["Total", totals.total],
      ]
    : [["Total", totals.total]];
  page.ensure(totalLines.length * 14 + 8);
  for (const [label, amount] of totalLines) {
    const bold = label === "Total";
    const amountWidth = textWidth(amount, bold ? 11 : 9, bold);
    page.text(PAGE_W - MARGIN - 120, page.y - 11, 9, label, bold, bold ? NAVY : MUTED);
    page.text(PAGE_W - MARGIN - amountWidth, page.y - (bold ? 12 : 11), bold ? 11 : 9, amount, bold, bold ? NAVY : BLACK);
    page.y -= bold ? 16 : 13;
  }
  page.y -= 4;
  page.paragraph(`In words: ${totals.words}`, 9, false, BLACK, 8);

  if (invoice) {
    page.paragraph("Bank details", 10, true, NAVY, 2);
    page.paragraph(zoomLetterhead.bankTitle, 9, false, BLACK, 1);
    page.paragraph(`Account number ${zoomLetterhead.accountNumber}`, 9, false, BLACK, 1);
    page.paragraph(`Bank ${zoomLetterhead.bankName}`, 9, false, BLACK, 1);
    page.paragraph(`IBAN ${zoomLetterhead.iban}`, 9, false, BLACK, 1);
    page.paragraph(`SWIFT ${zoomLetterhead.swift}`, 9, false, BLACK, 6);
    page.paragraph("Thank you for using our services.", 9, false, MUTED, 8);
    const markHeight = 72;
    const boxes = [
      signature ? fit({ name: "ImSign", ...signature }, 140, markHeight) : null,
      stamp ? fit({ name: "ImStamp", ...stamp }, 110, markHeight) : null,
    ].filter((box): box is { width: number; height: number } => Boolean(box));
    if (boxes.length) {
      const height = Math.max(...boxes.map((box) => box.height));
      page.ensure(height + 4);
      page.y -= height;
      let x = PAGE_W - MARGIN;
      if (stamp) {
        const box = fit({ name: "ImStamp", ...stamp }, 110, markHeight);
        x -= box.width;
        page.image("ImStamp", x, page.y, box.width, box.height);
        x -= 16;
      }
      if (signature) {
        const box = fit({ name: "ImSign", ...signature }, 140, markHeight);
        x -= box.width;
        page.image("ImSign", x, page.y, box.width, box.height);
      }
    }
  } else if (model.kind === "quotation" || model.kind === "proposal") {
    page.paragraph("Terms and conditions", 10, true, NAVY, 3);
    quotationTerms.forEach((term, index) => {
      page.paragraph(`${index + 1}. ${term}`, 8, false, BLACK, 2);
    });
    page.y -= 4;
    page.paragraph("Acceptance", 10, true, NAVY, 2);
    page.paragraph("Signing below accepts this quotation and the terms above.", 9, false, BLACK, 6);
    page.paragraph("Name ____________________    Date ____________________", 9);
    page.paragraph("Title ____________________    Signature ____________________", 9);
  }

  page.finish();
  return buildPdf(page.pages, images);
}
