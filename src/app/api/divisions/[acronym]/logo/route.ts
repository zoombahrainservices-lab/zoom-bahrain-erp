import { NextResponse } from "next/server";

import {
  convertDivisionLogoToPng,
  getDivisionByAcronym,
  logoDownloadFilename,
  parseLogoScale,
  readDivisionLogoSvg,
} from "@/lib/logo-export";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ acronym: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { acronym } = await context.params;
  const division = getDivisionByAcronym(acronym);

  if (!division?.logo) {
    return NextResponse.json({ error: "Logo not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "png";

  if (format === "svg") {
    const svgBuffer = await readDivisionLogoSvg(division);
    const filename = logoDownloadFilename(division.acronym, "svg");

    return new NextResponse(new Uint8Array(svgBuffer), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  if (format !== "png") {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const scale = parseLogoScale(searchParams.get("scale"));
  if (!scale) {
    return NextResponse.json({ error: "Invalid scale" }, { status: 400 });
  }

  const pngBuffer = await convertDivisionLogoToPng(division, scale);
  const filename = logoDownloadFilename(division.acronym, "png", scale);

  return new NextResponse(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
