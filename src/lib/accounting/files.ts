export function textPdf(lines: string[]) {
  const commands = ["BT", "/F1 10 Tf", "40 800 Td"];
  lines.slice(0, 52).forEach((line, index) => {
    if (index === 0) commands.push("/F1 14 Tf");
    if (index === 1) commands.push("/F1 10 Tf");
    commands.push(`(${escapePdf(line)}) Tj`, "0 -14 Td");
  });
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(body);
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body);
}

function escapePdf(value: string) {
  return value.replace(/[\\()]/g, (char) => `\\${char}`).replace(/[^\x20-\x7E]/g, " ");
}

export function spreadsheetXml(title: string, headers: string[], rows: string[][]) {
  const cell = (value: string) =>
    `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
  const table = [headers, ...rows]
    .map((row) => `<Row>${row.map((value) => cell(value ?? "")).join("")}</Row>`)
    .join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${escapeXml(title.slice(0, 31) || "Report")}"><Table>${table}</Table></Worksheet>
</Workbook>`;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
