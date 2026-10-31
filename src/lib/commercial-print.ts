import type { VatTreatment } from "@/db/schema";

import { filsToAmount } from "@/lib/accounting/money";
import { priceSalesLine } from "@/lib/accounting/phase3-rules";

export const zoomLetterhead = {
  legalName: "Zoom Group of Companies",
  vatNumber: "220012125900002",
  bankTitle: "Al Salam Bank Details",
  accountNumber: "0100507417001",
  bankName: "KHALEEJI BANK B.S.C.",
  iban: "BH37KHCB00100507417001",
  swift: "KHCBBHBM",
};

export const quotationTerms = [
  "Upon approval of this quotation, Zoom Group of Companies will issue the corresponding Tax Invoice for payment processing.",
  "Applicable VAT will be added upon issuance of the Tax Invoice.",
  "Full payment of the Tax Invoice and approval of the final artwork / mock-up are required to confirm the order and commence production.",
  "Delivery will be made to the client's confirmed address in Bahrain within 10 to 15 working days following payment and artwork approval.",
  "Changes requested after artwork approval or commencement of production may result in additional charges and revised delivery timelines.",
  "Custom-branded goods cannot be cancelled, returned or refunded once production has commenced.",
  "Minor variations in colour, print positioning and material finish may occur within normal manufacturing and printing tolerances.",
  "Approval of this quotation confirms acceptance of the quoted scope, pricing and above terms and conditions.",
];

export type CommercialPrintLine = {
  description: string;
  quantity: string;
  unitAmount: string;
  discount: string;
  vatRate: string | null;
  vatTreatment: VatTreatment | null;
};

export type CommercialPrintModel = {
  kind: "quotation" | "invoice" | "proposal" | "procurement";
  number: string;
  date: string;
  validUntil: string;
  accountId: string;
  sellerName: string;
  sellerVat: string;
  clientName: string;
  clientAddress: string;
  contactName: string;
  reference: string;
  customerVat: string;
  scope: string;
  lines: CommercialPrintLine[];
};

const ones = [
  "",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function underThousand(value: number): string {
  if (value < 20) return ones[value];
  if (value < 100) {
    const rest = value % 10;
    return rest ? `${tens[Math.floor(value / 10)]}-${ones[rest]}` : tens[Math.floor(value / 10)];
  }
  const rest = value % 100;
  const head = `${ones[Math.floor(value / 100)]} hundred`;
  return rest ? `${head} and ${underThousand(rest)}` : head;
}

function wholeWords(value: number): string {
  if (value === 0) return "zero";
  const parts: string[] = [];
  const million = Math.floor(value / 1_000_000);
  const thousand = Math.floor((value % 1_000_000) / 1000);
  const rest = value % 1000;
  if (million) parts.push(`${underThousand(million)} million`);
  if (thousand) parts.push(`${underThousand(thousand)} thousand`);
  if (rest) parts.push(underThousand(rest));
  return parts.join(" ");
}

export function bhdInWords(amount: string) {
  const negative = amount.trim().startsWith("-");
  const [wholeRaw, fractionRaw = ""] = amount.replace("-", "").split(".");
  const dinars = Number(wholeRaw || "0");
  const fils = Number(`${fractionRaw}000`.slice(0, 3));
  const dinarLabel = dinars === 1 ? "Bahraini dinar" : "Bahraini dinars";
  const sentence =
    fils === 0
      ? `${wholeWords(dinars)} ${dinarLabel} only.`
      : `${wholeWords(dinars)} ${dinarLabel} and ${wholeWords(fils)} ${fils === 1 ? "fil" : "fils"} only.`;
  const text = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  return negative ? `Minus ${text}` : text;
}

export function moneyPlain(amount: string) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "0.000";
  return value.toLocaleString("en-US", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export function pricePrintLine(line: CommercialPrintLine, chargeVat: boolean) {
  const priced = priceSalesLine({
    description: line.description,
    quantity: line.quantity,
    unitAmount: line.unitAmount,
    discount: line.discount || "0",
    vat:
      chargeVat && line.vatTreatment
        ? { id: "line", rate: line.vatRate ?? "0", treatment: line.vatTreatment }
        : null,
  });
  return priced;
}

export function printTotals(model: CommercialPrintModel) {
  const chargeVat = model.kind === "invoice";
  let net = 0n;
  let vat = 0n;
  let total = 0n;
  const rows = model.lines.map((line, index) => {
    const priced = pricePrintLine(line, chargeVat);
    net += priced.net;
    vat += priced.vat;
    total += priced.total;
    return {
      no: String(index + 1),
      description: line.description,
      quantity: moneyPlain(line.quantity),
      rate: moneyPlain(line.unitAmount),
      vat: moneyPlain(filsToAmount(priced.vat)),
      amount: moneyPlain(filsToAmount(priced.total)),
    };
  });
  return {
    rows,
    net: moneyPlain(filsToAmount(net)),
    vat: moneyPlain(filsToAmount(vat)),
    total: moneyPlain(filsToAmount(total)),
    words: bhdInWords(filsToAmount(total)),
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function commercialTitle(kind: CommercialPrintModel["kind"]) {
  if (kind === "invoice") return "TAX INVOICE";
  if (kind === "proposal") return "PROPOSAL";
  if (kind === "procurement") return "PROCUREMENT";
  return "QUOTATION";
}

export function buildCommercialHtml(model: CommercialPrintModel) {
  const totals = printTotals(model);
  const title = commercialTitle(model.kind);
  const invoice = model.kind === "invoice";
  const head = invoice
    ? `<tr><th>No.</th><th>Item Name / Description</th><th>Qty</th><th>Price / Unit (BHD)</th><th>VAT</th><th>Amount (BHD)</th></tr>`
    : `<tr><th>No.</th><th>Description</th><th>Qty</th><th>Rate (BHD)</th><th>Amount (BHD)</th></tr>`;
  const body = totals.rows
    .map((row) =>
      invoice
        ? `<tr><td>${row.no}</td><td>${escapeHtml(row.description)}</td><td>${row.quantity}</td><td>${row.rate}</td><td>${row.vat}</td><td>${row.amount}</td></tr>`
        : `<tr><td>${row.no}</td><td>${escapeHtml(row.description)}</td><td>${row.quantity}</td><td>${row.rate}</td><td>${row.amount}</td></tr>`,
    )
    .join("");
  const terms = invoice
    ? `<p><strong>Invoice description:</strong> ${escapeHtml(model.scope || model.reference)}</p>
       <p><strong>Bank Details</strong><br/>${escapeHtml(zoomLetterhead.bankTitle)}<br/>
       Account Number: ${escapeHtml(zoomLetterhead.accountNumber)}<br/>
       Bank Name: ${escapeHtml(zoomLetterhead.bankName)}<br/>
       IBAN: ${escapeHtml(zoomLetterhead.iban)}<br/>
       SWIFT Code: ${escapeHtml(zoomLetterhead.swift)}</p>
       <p>Thank you for using our services.</p>`
    : `<h2>1. Quotation scope</h2><p>${escapeHtml(model.scope || model.reference)}</p>
       <h2>3. Terms &amp; conditions</h2>
       <ul>${quotationTerms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ul>
       <h2>4. Quotation acceptance &amp; approval</h2>
       <p>By signing below, the client accepts this quotation and agrees to the terms and conditions outlined above.</p>
       <p>Approved by (client signature) &nbsp;&nbsp; Company stamp / seal</p>
       <p>Name: ________ &nbsp; Date: ________<br/>Title / designation: ________ &nbsp; Signature: ________</p>`;

  return `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; color: #1a365d;">
    <h1>${title}</h1>
    <p>No: ${escapeHtml(model.number)} &nbsp; Date: ${escapeHtml(model.date)}${invoice ? "" : ` &nbsp; Valid until: ${escapeHtml(model.validUntil)}`}<br/>
    Account ID: ${escapeHtml(model.accountId)}</p>
    ${invoice ? `<p>${escapeHtml(model.sellerName)} VAT No: ${escapeHtml(model.sellerVat)}</p>` : ""}
    <p><strong>Client / Company</strong><br/>${escapeHtml(model.clientName)}<br/>
    <strong>Address</strong><br/>${escapeHtml(model.clientAddress || "—")}<br/>
    <strong>Contact</strong><br/>${escapeHtml(model.contactName || "—")}<br/>
    <strong>Reference</strong><br/>${escapeHtml(model.reference)}
    ${invoice ? `<br/><strong>Customer VAT No:</strong> ${escapeHtml(model.customerVat || "")}` : ""}</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%;">${head}${body}</table>
    ${
      invoice
        ? `<p>Subtotal: ${totals.net}<br/>VAT: ${totals.vat}<br/><strong>Total: ${totals.total}</strong></p>`
        : `<p><strong>Total amount quoted: ${totals.total}</strong></p>`
    }
    <p>In words: ${escapeHtml(totals.words)}</p>
    ${terms}
  </body></html>`;
}

function xml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function paragraph(text: string, bold = false) {
  const run = bold ? "<w:rPr><w:b/></w:rPr>" : "";
  return `<w:p><w:r>${run}<w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

function cell(text: string, bold = false) {
  return `<w:tc><w:p><w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p></w:tc>`;
}

function table(rows: string[][], header = true) {
  const body = rows
    .map(
      (row, index) =>
        `<w:tr>${row.map((value) => cell(value, header && index === 0)).join("")}</w:tr>`,
    )
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="B0B0B0"/>
  </w:tblBorders></w:tblPr>${body}</w:tbl>`;
}

export function buildCommercialDocumentXml(model: CommercialPrintModel) {
  const totals = printTotals(model);
  const title = commercialTitle(model.kind);
  const invoice = model.kind === "invoice";
  const header = invoice
    ? ["No.", "Item Name / Description", "Qty", "Price / Unit (BHD)", "VAT", "Amount (BHD)"]
    : ["No.", "Description", "Qty", "Rate (BHD)", "Amount (BHD)"];
  const lines = totals.rows.map((row) =>
    invoice
      ? [row.no, row.description, row.quantity, row.rate, row.vat, row.amount]
      : [row.no, row.description, row.quantity, row.rate, row.amount],
  );
  const blocks = [
    paragraph(title, true),
    paragraph(`No: ${model.number}    Date: ${model.date}`),
    invoice ? "" : paragraph(`Valid until: ${model.validUntil}`),
    paragraph(`Account ID: ${model.accountId}`),
    invoice ? paragraph(`${model.sellerName} VAT No: ${model.sellerVat}`) : "",
    paragraph("Client / Company", true),
    paragraph(model.clientName),
    paragraph("Address", true),
    paragraph(model.clientAddress || "—"),
    paragraph("Contact", true),
    paragraph(model.contactName || "—"),
    paragraph("Reference", true),
    paragraph(model.reference),
    invoice ? paragraph(`Customer VAT No: ${model.customerVat}`) : "",
    invoice ? "" : paragraph("1. Quotation scope", true),
    invoice ? "" : paragraph(model.scope || model.reference),
    invoice ? "" : paragraph("2. Commercial items", true),
    table([header, ...lines]),
    invoice
      ? paragraph(`Subtotal: ${totals.net}    VAT: ${totals.vat}    Total: ${totals.total}`, true)
      : paragraph(`Total amount quoted: ${totals.total}`, true),
    paragraph(`In words: ${totals.words}`),
  ];
  if (invoice) {
    blocks.push(
      paragraph(`Invoice description: ${model.scope || model.reference}`),
      paragraph("Bank Details", true),
      paragraph(zoomLetterhead.bankTitle),
      paragraph(`Account Number: ${zoomLetterhead.accountNumber}`),
      paragraph(`Bank Name: ${zoomLetterhead.bankName}`),
      paragraph(`IBAN: ${zoomLetterhead.iban}`),
      paragraph(`SWIFT Code: ${zoomLetterhead.swift}`),
      paragraph("Thank you for using our services."),
    );
  } else {
    blocks.push(paragraph("3. Terms & Conditions", true));
    for (const term of quotationTerms) blocks.push(paragraph(term));
    blocks.push(
      paragraph("4. Quotation acceptance & approval", true),
      paragraph("By signing below, the client accepts this quotation and agrees to the terms and conditions outlined above."),
      paragraph("Approved by (client signature)          Company stamp / seal"),
      paragraph("Name:                    Date:"),
      paragraph("Title / designation:     Signature:"),
    );
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${blocks.filter(Boolean).join("")}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720"/>
    </w:sectPr>
  </w:body>
</w:document>`;
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

function zipStore(files: { name: string; data: Buffer }[]) {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name);
    const local = Buffer.alloc(30);
    const crc = crc32(file.data);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const header = Buffer.concat([local, name, file.data]);
    locals.push(header);
    const record = Buffer.alloc(46);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(20, 4);
    record.writeUInt16LE(20, 6);
    record.writeUInt32LE(crc, 16);
    record.writeUInt32LE(file.data.length, 20);
    record.writeUInt32LE(file.data.length, 24);
    record.writeUInt16LE(name.length, 28);
    record.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([record, name]));
    offset += header.length;
  }
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

export function buildCommercialDocx(model: CommercialPrintModel) {
  const documentXml = Buffer.from(buildCommercialDocumentXml(model));
  return zipStore([
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    },
    { name: "word/document.xml", data: documentXml },
    {
      name: "word/_rels/document.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`),
    },
  ]);
}

export function commercialFileName(model: CommercialPrintModel, extension: "docx" | "pdf" = "docx") {
  const title = commercialTitle(model.kind).toLowerCase().replaceAll(" ", "-");
  return `${title}-${model.number}.${extension}`;
}
