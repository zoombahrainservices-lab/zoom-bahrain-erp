import {
  DescriptionCard,
  DescriptionCardRow,
} from "@/components/description-card";
import { TextLink } from "@/components/catalyst/text";
import { PhoneLinks } from "@/components/company-profile-ui";
import type { Division } from "@/lib/divisions";
import { getIdentityPhones, type DivisionProfile } from "@/lib/division-profiles";

type ContactMarketSectionProps = {
  division: Division;
  profile: DivisionProfile;
};

export function ContactMarketSection({
  division,
  profile,
}: ContactMarketSectionProps) {
  return (
    <DescriptionCard
      variant="accent"
      title="Contact & market"
      description="Contact details and market focus."
    >
      <DescriptionCardRow label="Website" materialIcon="language">
        <TextLink
          href={division.website}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-zoom-light hover:text-zoom-medium"
        >
          {division.website.replace(/^https?:\/\//, "")}
        </TextLink>
      </DescriptionCardRow>

      <DescriptionCardRow label="Email" materialIcon="mail">
        <TextLink
          href={`mailto:${profile.identity.email}`}
          className="font-medium text-zoom-light hover:text-zoom-medium"
        >
          {profile.identity.email}
        </TextLink>
      </DescriptionCardRow>

      <DescriptionCardRow label="Phone" materialIcon="call">
        <PhoneLinks phones={getIdentityPhones(profile.identity)} />
      </DescriptionCardRow>

      <DescriptionCardRow label="Main market" materialIcon="location_on">
        {profile.identity.mainMarket}
      </DescriptionCardRow>

      <DescriptionCardRow label="Customer type" materialIcon="groups">
        {profile.identity.customerType}
      </DescriptionCardRow>
    </DescriptionCard>
  );
}
