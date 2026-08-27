import { TextLink } from "@/components/catalyst/text";
import {
  DescriptionCard,
  DescriptionCardRow,
} from "@/components/description-card";
import { PhoneLinks } from "@/components/company-profile-ui";
import type { Division } from "@/lib/divisions";
import { getIdentityPhones, type DivisionProfile } from "@/lib/division-profiles";

type CompanyIdentityProfileProps = {
  company: Division;
  profile: DivisionProfile;
};

export function CompanyIdentityProfile({
  company,
  profile,
}: CompanyIdentityProfileProps) {
  const { identity } = profile;

  return (
    <DescriptionCard variant="accent" title="Company identity">
      <DescriptionCardRow label="Name" materialIcon="apartment">
        {company.name}
      </DescriptionCardRow>
      <DescriptionCardRow label="Code" materialIcon="tag">
        {company.acronym}
      </DescriptionCardRow>
      <DescriptionCardRow label="Short descriptor" materialIcon="short_text">
        {identity.shortDescriptor}
      </DescriptionCardRow>
      {identity.tagline ? (
        <DescriptionCardRow label="Tagline" materialIcon="format_quote">
          {identity.tagline}
        </DescriptionCardRow>
      ) : null}
      {identity.primaryPlatform ? (
        <DescriptionCardRow label="Primary platform" materialIcon="storefront">
          {identity.primaryPlatform}
        </DescriptionCardRow>
      ) : null}
      <DescriptionCardRow label="Website" materialIcon="language">
        <TextLink
          href={company.website}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zoom-light hover:text-zoom-medium"
        >
          {company.website.replace(/^https?:\/\//, "")}
        </TextLink>
      </DescriptionCardRow>
      <DescriptionCardRow label="Email" materialIcon="mail">
        <TextLink
          href={`mailto:${identity.email}`}
          className="font-medium text-zoom-light hover:text-zoom-medium"
        >
          {identity.email}
        </TextLink>
      </DescriptionCardRow>
      <DescriptionCardRow label="Phone" materialIcon="call">
        <PhoneLinks phones={getIdentityPhones(identity)} />
      </DescriptionCardRow>
    </DescriptionCard>
  );
}
