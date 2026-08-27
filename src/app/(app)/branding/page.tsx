import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Divider } from "@/components/catalyst/divider";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import {
  brandColors,
  coreBrandColors,
  extendedPalette,
  semanticColors,
} from "@/lib/brand";

export default function BrandingPage() {
  return (
    <>
      <Heading>Branding</Heading>
      <Text className="mt-2">
        Official Zoom color system for ERP, proposals, and client-facing
        materials.
      </Text>

      <section className="mt-10 overflow-hidden rounded-lg bg-white shadow-xs ring-1 ring-zinc-950/5">
        <div
          className="px-6 py-8 text-white"
          style={{ backgroundColor: brandColors.darkBlue }}
        >
          <Text className="text-sm uppercase tracking-[0.2em] text-white/70">
            Locked brand colors
          </Text>
          <Subheading className="mt-2 text-white">
            #065274 + #019CDF
          </Subheading>
          <Text className="mt-2 max-w-2xl text-white/80">
            These two colors define the Zoom identity. Supporting blues and
            grays build the base UI; semantic colors handle status and feedback.
          </Text>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-4">
          {coreBrandColors.map((color) => (
            <article
              key={color.hex}
              className="overflow-hidden rounded-lg ring-1 ring-zinc-950/5"
            >
              <div className="h-28" style={{ backgroundColor: color.hex }} />
              <div className="p-4">
                <Text>{color.name}</Text>
                <Text className="text-zinc-500">{color.role}</Text>
                <Text className="mt-3 font-mono">{color.hex}</Text>
                <Text className="font-mono text-zinc-500">RGB {color.rgb}</Text>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5">
        <Subheading>Semantic colors</Subheading>
        <Text className="mt-2">
          Functional colors for actions, status, and feedback.
        </Text>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {semanticColors.map((color) => (
            <article
              key={color.hex}
              className="overflow-hidden rounded-lg ring-1 ring-zinc-950/5"
            >
              <div className="h-24" style={{ backgroundColor: color.hex }} />
              <div className="p-4">
                <Text>{color.name}</Text>
                <Text className="text-zinc-500">{color.role}</Text>
                <Text className="mt-3 font-mono">{color.hex}</Text>
                <Text className="font-mono text-zinc-500">RGB {color.rgb}</Text>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5">
        <Subheading>Extended palette</Subheading>
        <Text className="mt-2">
          Standardized tones for UI, documents, and presentations.
        </Text>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {extendedPalette.map((item) => (
            <div
              key={item.usage}
              className="flex items-center gap-3 rounded-lg p-3 ring-1 ring-zinc-950/5"
            >
              <div
                className="h-10 w-10 shrink-0 rounded-md ring-1 ring-zinc-950/10"
                style={{ backgroundColor: item.hex }}
              />
              <div>
                <Text>{item.usage}</Text>
                <Text className="font-mono text-zinc-500">{item.hex}</Text>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 lg:grid-cols-2">
        <div
          className="rounded-lg p-6 ring-1 ring-zinc-950/5"
          style={{ backgroundColor: brandColors.palestBlue }}
        >
          <Subheading>Brand hierarchy</Subheading>
          <ul className="mt-4 space-y-2">
            <li>
              <Text>
                <strong>Main brand:</strong> #065274 + #019CDF
              </Text>
            </li>
            <li>
              <Text>
                <strong>Text:</strong> #3B3B3B
              </Text>
            </li>
            <li>
              <Text>
                <strong>Backgrounds:</strong> #FFFFFF / #F7F8F9
              </Text>
            </li>
            <li>
              <Text>
                <strong>Light sections:</strong> #D9F2FC / #F1FAFE
              </Text>
            </li>
            <li>
              <Text>
                <strong>Primary CTA:</strong> #019CDF
              </Text>
            </li>
            <li>
              <Text>
                <strong>Highlights / attention:</strong> #F58220
              </Text>
            </li>
            <li>
              <Text>
                <strong>Success / approved:</strong> #22A06B
              </Text>
            </li>
            <li>
              <Text>
                <strong>Warning / urgent:</strong> #D64545
              </Text>
            </li>
            <li>
              <Text>
                <strong>Corporate sections:</strong> #065274
              </Text>
            </li>
          </ul>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5">
          <Subheading>Catalyst component preview</Subheading>
          <Text className="mt-2">
            Standard Catalyst buttons and badges - no custom UI overrides.
          </Text>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button color="orange">Highlight</Button>
            <Button color="dark/zinc">Corporate</Button>
            <Button outline>Secondary</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge color="green">Approved</Badge>
            <Badge color="red">Urgent</Badge>
            <Badge color="blue">In progress</Badge>
          </div>
          <Divider className="my-6" soft />
          <div className="space-y-2">
            <Text className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-green-700">
              Approved - payment received
            </Text>
            <Text className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-700">
              Urgent - invoice overdue
            </Text>
          </div>
        </div>
      </section>
    </>
  );
}
