import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCommercialDocument } from "@/lib/create-operation-document";
import { commercialPdf } from "@/lib/commercial-pdf";
import { commercialFileName } from "@/lib/commercial-print";
import {
  brandedCommercialDocx,
  commercialLogoPng,
  defaultCommercialArt,
  stampChoicePng,
  uploadedStampPng,
} from "@/lib/commercial-template";
import { loadCommercialPrint } from "@/lib/commercial-print-data";
import { getDivisionById } from "@/lib/divisions";
import { canAccessOperations, canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

const generateDocumentSchema = z.object({
  replace: z.boolean().optional(),
});

function documentError(error: unknown) {
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const message = error instanceof Error ? error.message : "Failed to generate document";

  if (
    message.includes("Connect Google Drive") ||
    message.includes("Reconnect it in Settings") ||
    message.includes("Choose a supplier") ||
    message.includes("quantity") ||
    message.includes("amount") ||
    message.includes("Total must") ||
    message.includes("Add at least") ||
    message.includes("was sent") ||
    message.includes("not a commercial") ||
    message.includes("Stamp") ||
    message.includes("Unknown logo")
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (message === "Entry not found" || message === "Operation not found") {
    return NextResponse.json({ error: message }, { status: 404 });
  }

  console.error(error);
  return NextResponse.json({ error: "Failed to generate document" }, { status: 500 });
}

async function wordFile(id: string, entryId: string, branding?: { logoId?: string; stampPng?: Buffer }) {
  const model = await loadCommercialPrint(id, entryId);
  const file = await brandedCommercialDocx(model, branding);
  const filename = commercialFileName(model);
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function pdfFile(id: string, entryId: string, branding?: { logoId?: string; stampPng?: Buffer }) {
  const model = await loadCommercialPrint(id, entryId);
  const designed = model.kind === "invoice" || model.kind === "quotation" || model.kind === "proposal";
  const art = designed
    ? defaultCommercialArt(model.kind === "invoice" ? "invoice" : "quotation")
    : { logo: null, stamp: null, signature: null };
  const selectedLogo = branding?.logoId ? await commercialLogoPng(branding.logoId) : null;
  const file = await commercialPdf(model, {
    logo: selectedLogo ?? art.logo,
    stamp: branding?.stampPng ?? art.stamp,
    signature: art.signature,
  });
  const filename = commercialFileName(model, "pdf");
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function brandingFromForm(form: FormData) {
  const logo = String(form.get("logo") ?? "");
  const stamp = String(form.get("stamp") ?? "");
  const upload = form.get("stampFile");
  let logoId: string | undefined;
  if (logo) {
    if (!getDivisionById(logo)?.logo) throw new Error("Unknown logo");
    logoId = logo;
  }
  let stampPng: Buffer | undefined;
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > 4_000_000) throw new Error("Stamp image must be under 4 MB");
    if (!["image/png", "image/jpeg", "image/webp"].includes(upload.type)) {
      throw new Error("Stamp must be a PNG or JPEG");
    }
    stampPng = await uploadedStampPng(Buffer.from(await upload.arrayBuffer()));
  } else if (stamp) {
    const chosen = await stampChoicePng(stamp);
    if (!chosen) throw new Error("Unknown stamp");
    stampPng = chosen;
  }
  return { logoId, stampPng };
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, entryId } = await context.params;
  try {
    return await wordFile(id, entryId);
  } catch (error) {
    return documentError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, entryId } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    if (!canAccessOperations(session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const form = await request.formData();
      const branding = await brandingFromForm(form);
      if (String(form.get("format") ?? "") === "pdf") return await pdfFile(id, entryId, branding);
      return await wordFile(id, entryId, branding);
    } catch (error) {
      return documentError(error);
    }
  }

  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const input = generateDocumentSchema.parse(body);
    const result = await generateCommercialDocument({
      operationId: id,
      entryId,
      createdById: session.userId,
      replace: input.replace,
    });

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    return documentError(error);
  }
}
