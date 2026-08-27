import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { divisionByAcronym, type Division } from "@/lib/divisions";

const allowedScales = [1, 4, 8] as const;

export type LogoScale = (typeof allowedScales)[number];

export function getDivisionByAcronym(acronym: string): Division | undefined {
  return divisionByAcronym[acronym.toUpperCase()];
}

export function parseLogoScale(value: string | null): LogoScale | null {
  const scale = Number(value);
  if (allowedScales.includes(scale as LogoScale)) {
    return scale as LogoScale;
  }
  return null;
}

export function parseSvgDimensions(svgText: string) {
  const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/i);
  if (viewBoxMatch) {
    const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { width: parts[2], height: parts[3] };
    }
  }

  const widthMatch = svgText.match(/\bwidth=["']([\d.]+)/i);
  const heightMatch = svgText.match(/\bheight=["']([\d.]+)/i);
  if (widthMatch && heightMatch) {
    return {
      width: Number.parseFloat(widthMatch[1]),
      height: Number.parseFloat(heightMatch[1]),
    };
  }

  return { width: 1676, height: 231 };
}

function publicLogoPath(logoSrc: string) {
  return path.join(process.cwd(), "public", logoSrc.replace(/^\//, ""));
}

export function logoDownloadFilename(
  acronym: string,
  format: "svg" | "png",
  scale: LogoScale = 1,
) {
  const base = `zoom-${acronym.toLowerCase()}-logo`;
  if (format === "svg") {
    return `${base}.svg`;
  }
  if (scale === 4) {
    return `${base}-hd.png`;
  }
  if (scale === 8) {
    return `${base}-ultra.png`;
  }
  return `${base}.png`;
}

export async function readDivisionLogoSvg(division: Division) {
  if (!division.logo) {
    throw new Error("Division has no logo");
  }

  const filePath = publicLogoPath(division.logo);
  return readFile(filePath);
}

export async function convertDivisionLogoToPng(
  division: Division,
  scale: LogoScale,
) {
  const svgBuffer = await readDivisionLogoSvg(division);
  const { width } = parseSvgDimensions(svgBuffer.toString("utf-8"));
  const outputWidth = Math.max(1, Math.round(width * scale));

  return sharp(svgBuffer, { density: 72 * scale })
    .resize(outputWidth)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}
