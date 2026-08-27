import { Navbar, NavbarItem, NavbarSection } from "@/components/catalyst/navbar";
import { AssetsProfile } from "@/components/assets-profile";
import { CompanyIdentityProfile } from "@/components/company-identity-profile";
import { InternalCommercialProfile } from "@/components/internal-commercial-profile";
import { ProofProfile } from "@/components/proof-profile";
import { PublicCompanyProfile } from "@/components/public-company-profile";
import type { Division } from "@/lib/divisions";
import type { DivisionProfile } from "@/lib/division-profiles";

export type ProfileArea = "identity" | "public" | "internal" | "proof" | "assets";

export function parseProfileArea(value: string | string[] | undefined): ProfileArea {
  const area = Array.isArray(value) ? value[0] : value;
  if (
    area === "public" ||
    area === "internal" ||
    area === "proof" ||
    area === "assets"
  ) {
    return area;
  }
  return "identity";
}

type DivisionProfileViewProps = {
  company: Division;
  profile: DivisionProfile;
  area: ProfileArea;
};

export function DivisionProfileView({
  company,
  profile,
  area,
}: DivisionProfileViewProps) {
  const base = `/divisions/${company.id}`;

  return (
    <div>
      <nav aria-label="Profile areas" className="border-b border-zinc-950/5">
        <Navbar className="min-w-0">
          <NavbarSection className="flex-wrap">
            <NavbarItem href={base} current={area === "identity"}>
              Company identity
            </NavbarItem>
            <NavbarItem href={`${base}?area=public`} current={area === "public"}>
              Public profile
            </NavbarItem>
            <NavbarItem href={`${base}?area=internal`} current={area === "internal"}>
              Internal commercial
            </NavbarItem>
            <NavbarItem href={`${base}?area=proof`} current={area === "proof"}>
              Proof ({profile.proof.length})
            </NavbarItem>
            <NavbarItem href={`${base}?area=assets`} current={area === "assets"}>
              Assets ({profile.assets.length})
            </NavbarItem>
          </NavbarSection>
        </Navbar>
      </nav>

      <div className="mt-8">
        {area === "identity" ? (
          <CompanyIdentityProfile company={company} profile={profile} />
        ) : null}
        {area === "public" ? (
          <PublicCompanyProfile company={company} profile={profile} />
        ) : null}
        {area === "internal" ? (
          <InternalCommercialProfile profile={profile} />
        ) : null}
        {area === "proof" ? <ProofProfile profile={profile} /> : null}
        {area === "assets" ? <AssetsProfile profile={profile} /> : null}
      </div>
    </div>
  );
}
