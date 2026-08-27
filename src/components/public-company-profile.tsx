import { Badge } from "@/components/catalyst/badge";
import { Text, TextLink } from "@/components/catalyst/text";
import {
  DescriptionCard,
  DescriptionCardRow,
} from "@/components/description-card";
import {
  BulletList,
  IconDetailRow,
  PhoneLinks,
  PlaceholderText,
  SectionIntro,
  zebraRowClass,
} from "@/components/company-profile-ui";
import type { Division } from "@/lib/divisions";
import {
  getIdentityPhones,
  getPublicProof,
  proofTypeLabels,
  serviceStatusLabels,
  type DivisionProfile,
} from "@/lib/division-profiles";

type PublicCompanyProfileProps = {
  company: Division;
  profile: DivisionProfile;
};

export function PublicCompanyProfile({ company, profile }: PublicCompanyProfileProps) {
  const { public: pub } = profile;
  const publicProof = getPublicProof(profile);

  return (
    <div className="space-y-10">
      <DescriptionCard variant="accent" title="Snapshot">
        <DescriptionCardRow label="Customer" materialIcon="groups">
          {pub.snapshot.customer}
        </DescriptionCardRow>
        <DescriptionCardRow label="Problem" materialIcon="report">
          {pub.snapshot.problem}
        </DescriptionCardRow>
        <DescriptionCardRow label="Offer" materialIcon="handshake">
          {pub.snapshot.offer}
        </DescriptionCardRow>
        <DescriptionCardRow label="Value" materialIcon="verified">
          {pub.snapshot.value}
        </DescriptionCardRow>
        <DescriptionCardRow label="Pricing" materialIcon="payments">
          {pub.snapshot.pricing}
        </DescriptionCardRow>
        <DescriptionCardRow label="Delivery" materialIcon="route">
          {pub.snapshot.delivery}
        </DescriptionCardRow>
        <DescriptionCardRow label="Key proof" materialIcon="workspace_premium">
          {pub.snapshot.keyProof.value.trim() ? (
            pub.snapshot.keyProof.value
          ) : (
            <PlaceholderText>
              {pub.snapshot.keyProof.placeholder ?? "No approved proof added yet."}
            </PlaceholderText>
          )}
        </DescriptionCardRow>
        <DescriptionCardRow label={pub.snapshot.zoomSupportLabel ?? "Zoom support"} materialIcon="hub">
          {pub.snapshot.zoomSupport}
        </DescriptionCardRow>
      </DescriptionCard>

      <DescriptionCard variant="accent" title="Overview, purpose & positioning">
        <DescriptionCardRow label="Overview" materialIcon="info">
          {pub.positioning.overview}
        </DescriptionCardRow>
        <DescriptionCardRow label="Purpose" materialIcon="flag">
          {pub.positioning.purpose}
        </DescriptionCardRow>
        <DescriptionCardRow label={pub.positioning.roleLabel ?? "Role within Zoom"} materialIcon="account_tree">
          {pub.positioning.roleWithinZoom}
        </DescriptionCardRow>
        <DescriptionCardRow label="Positioning" materialIcon="my_location">
          {pub.positioning.positioningStatement}
        </DescriptionCardRow>
        <DescriptionCardRow label="Customer promise" materialIcon="thumb_up">
          {pub.positioning.customerPromise}
        </DescriptionCardRow>
        {pub.mission ? (
          <DescriptionCardRow label="Mission" materialIcon="flag">
            {pub.mission}
          </DescriptionCardRow>
        ) : null}
        {pub.vision ? (
          <DescriptionCardRow label="Vision" materialIcon="visibility">
            {pub.vision}
          </DescriptionCardRow>
        ) : null}
      </DescriptionCard>

      {pub.principles && pub.principles.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Group principles"
          contentClassName="p-0"
        >
          {pub.principles
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item, index) => (
              <article key={item.name} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {item.displayOrder}. {item.name.toUpperCase()}
                </h4>
                <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                  {item.description}
                </Text>
              </article>
            ))}
        </DescriptionCard>
      ) : null}

      {pub.groupArchitecture && pub.groupArchitecture.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Group architecture"
          contentClassName="p-0"
        >
          {pub.groupArchitecture.map((cluster, index) => (
            <article key={cluster.title} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {index + 1}. {cluster.title.toUpperCase()}
              </h4>
              <div className="mt-3">
                <BulletList items={cluster.items} />
              </div>
            </article>
          ))}
        </DescriptionCard>
      ) : null}

      {pub.groupCompanies && pub.groupCompanies.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Our companies"
          contentClassName="p-0"
        >
          {pub.groupCompanies
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item, index) => (
              <article key={item.code} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {item.displayOrder}. {item.name.toUpperCase()}
                </h4>
                <IconDetailRow icon="tag">{item.code}</IconDetailRow>
                <IconDetailRow icon="short_text">{item.descriptor}</IconDetailRow>
                {item.primaryPlatform ? (
                  <IconDetailRow icon="storefront">{item.primaryPlatform}</IconDetailRow>
                ) : null}
                <IconDetailRow icon="language">
                  <TextLink
                    href={item.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zoom-light hover:text-zoom-medium"
                  >
                    {item.website.replace(/^https?:\/\//, "")}
                  </TextLink>
                </IconDetailRow>
                <Text className="mt-3 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                  {item.whatItDoes}
                </Text>
                <div className="mt-3">
                  <BulletList items={item.coreOffers} />
                </div>
              </article>
            ))}
        </DescriptionCard>
      ) : null}

      {pub.commercePortfolio ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Commerce portfolio"
          description={pub.commercePortfolio.intro}
          contentClassName="p-0"
        >
          {pub.commercePortfolio.structure
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item, index) => (
              <article key={item.name} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {item.displayOrder}. {item.name.toUpperCase()}
                </h4>
                <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                  {item.description}
                </Text>
              </article>
            ))}
        </DescriptionCard>
      ) : null}

      {pub.commercePortfolio?.platforms.map((platform) => (
        <DescriptionCard key={platform.name} variant="accent" title={platform.name}>
          <DescriptionCardRow label="Type" materialIcon="store">
            {platform.type}
          </DescriptionCardRow>
          <DescriptionCardRow label="Website" materialIcon="language">
            <TextLink
              href={platform.website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zoom-light hover:text-zoom-medium"
            >
              {platform.website.replace(/^https?:\/\//, "")}
            </TextLink>
          </DescriptionCardRow>
          <DescriptionCardRow label="Purpose" materialIcon="flag">
            {platform.purpose}
          </DescriptionCardRow>
          <DescriptionCardRow label="Customer" materialIcon="groups">
            {platform.customer}
          </DescriptionCardRow>
          <DescriptionCardRow label="Offer" materialIcon="handshake">
            {platform.offer}
          </DescriptionCardRow>
          <DescriptionCardRow label="Status" materialIcon="verified">
            {platform.status}
          </DescriptionCardRow>
          <DescriptionCardRow label="Proof" materialIcon="workspace_premium">
            {platform.proof.value.trim() ? (
              platform.proof.value
            ) : (
              <PlaceholderText>
                {platform.proof.placeholder ??
                  "Add approved platform statistics, merchants, products, orders, customer feedback and commercial results when available."}
              </PlaceholderText>
            )}
          </DescriptionCardRow>
        </DescriptionCard>
      ))}

      <DescriptionCard
        variant="accent"
        layout="content"
        title="Who we serve"
        contentClassName="p-0"
      >
        {pub.segments
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((segment, index) => (
            <article key={segment.name} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {segment.displayOrder}. {segment.name.toUpperCase()}
              </h4>
              <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                {segment.description}
              </Text>
              <IconDetailRow icon="priority_high">{segment.mainNeed}</IconDetailRow>
              <IconDetailRow icon="task_alt">{segment.desiredOutcome}</IconDetailRow>
            </article>
          ))}
      </DescriptionCard>

      <DescriptionCard
        variant="accent"
        layout="content"
        title="Customer needs & outcomes"
        contentClassName="p-0"
      >
        {pub.needs
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((item, index) => (
            <article key={item.need} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {item.displayOrder}. {item.need.toUpperCase()}
              </h4>
              <IconDetailRow icon="task_alt">{item.outcome}</IconDetailRow>
            </article>
          ))}
      </DescriptionCard>

      {pub.integratedSolutions && pub.integratedSolutions.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Integrated group solutions"
          contentClassName="p-0"
        >
          {pub.integratedSolutions
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item, index) => (
              <article key={item.name} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {item.displayOrder}. {item.name.toUpperCase()}
                </h4>
                {item.leadCompany ? (
                  <IconDetailRow icon="account_tree">Lead company: {item.leadCompany}</IconDetailRow>
                ) : null}
                {item.companies.length > 0 ? (
                  <div className="mt-3">
                    <BulletList items={item.companies} />
                  </div>
                ) : null}
                <IconDetailRow icon="task_alt">{item.outcome}</IconDetailRow>
              </article>
            ))}
        </DescriptionCard>
      ) : null}

      {pub.serviceGroups.some((group) => group.services.length > 0) ? (
      <DescriptionCard
        variant="accent"
        layout="content"
        title={pub.serviceSection?.title ?? "Services & core offers"}
        description={
          pub.serviceSection?.description ??
          "Grouped offers. Public pricing is the snapshot summary, not a repeated fee line on every service."
        }
        contentClassName="p-0"
      >
        {pub.serviceGroups
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .flatMap((group) => {
            const services = group.services
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((service) => ({
                kind: "service" as const,
                group: group.name,
                service,
              }));
            return group.note
              ? [...services, { kind: "note" as const, group: group.name, note: group.note }]
              : services;
          })
          .map((row, index) =>
            row.kind === "note" ? (
              <article key={`${row.group}-note`} className={zebraRowClass(index)}>
                {pub.serviceGroups.length > 1 ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-zoom-gray">
                    {row.group}
                  </p>
                ) : null}
                <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                  {row.note}
                </Text>
              </article>
            ) : (
            <article key={`${row.group}-${row.service.name}`} className={zebraRowClass(index)}>
              {pub.serviceGroups.length > 1 ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-zoom-gray">
                  {row.group}
                </p>
              ) : null}
              <div className={pub.serviceGroups.length > 1 ? "mt-2 flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2"}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {row.service.name.toUpperCase()}
                </h4>
                <Badge color={row.service.status === "active" ? "green" : "zinc"}>
                  {serviceStatusLabels[row.service.status]}
                </Badge>
              </div>
              <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                {row.service.description}
              </Text>
              <IconDetailRow icon="task_alt">{row.service.deliverable}</IconDetailRow>
              {row.service.possibleSupport ? (
                <IconDetailRow icon="hub">
                  <BulletList items={row.service.possibleSupport} />
                </IconDetailRow>
              ) : null}
            </article>
            ),
          )}
      </DescriptionCard>
      ) : null}

      {pub.projectPortfolio ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Project portfolio"
          description={pub.projectPortfolio.intro}
          contentClassName="p-0"
        >
          {pub.projectPortfolio.structure
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item, index) => (
              <article key={item.name} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {item.displayOrder}. {item.name.toUpperCase()}
                </h4>
                <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                  {item.description}
                </Text>
              </article>
            ))}
          <article className={zebraRowClass(pub.projectPortfolio.structure.length)}>
            <PlaceholderText>
              {pub.projectPortfolio.emptyPrompt.value.trim()
                ? pub.projectPortfolio.emptyPrompt.value
                : (pub.projectPortfolio.emptyPrompt.placeholder ??
                  "Do not publish a project until its information and evidence have been approved.")}
            </PlaceholderText>
          </article>
        </DescriptionCard>
      ) : null}

      {pub.projectCategories && pub.projectCategories.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Project categories"
          description="These categories organize projects without limiting what the company may undertake."
          contentClassName="p-0"
        >
          {pub.projectCategories
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item, index) => (
              <article key={item.name} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {item.displayOrder}. {item.name.toUpperCase()}
                </h4>
                <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                  {item.description}
                </Text>
              </article>
            ))}
        </DescriptionCard>
      ) : null}

      <DescriptionCard variant="accent" layout="content" title={pub.whyZoomTitle ?? "Why Zoom"}>
        <BulletList items={pub.whyZoom} />
      </DescriptionCard>

      <DescriptionCard
        variant="accent"
        layout="content"
        title={pub.workflowTitle ?? "How we work"}
        contentClassName="p-0"
      >
        {pub.workflow
          .slice()
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((step, index) => (
            <article key={step.name} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {step.displayOrder}. {step.name.toUpperCase()}
              </h4>
              <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                {step.explanation}
              </Text>
            </article>
          ))}
      </DescriptionCard>

      {pub.additionalWorkflows?.map((journey) => (
        <DescriptionCard
          key={journey.title}
          variant="accent"
          layout="content"
          title={journey.title}
          contentClassName="p-0"
        >
          {journey.steps
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((step, index) => (
              <article key={step.name} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {step.displayOrder}. {step.name.toUpperCase()}
                </h4>
                <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                  {step.explanation}
                </Text>
              </article>
            ))}
        </DescriptionCard>
      ))}

      {pub.connectedCapabilities.length > 0 || pub.capabilityRelationship ? (
      <DescriptionCard
        variant="accent"
        layout="content"
        title={pub.capabilityRelationship?.title ?? "Integrated Zoom capabilities"}
        description={
          pub.capabilityRelationship
            ? pub.capabilityRelationship.description
            : "Connected capability shown to clients. Lead directions stay in Internal."
        }
        contentClassName="p-0"
      >
        {pub.capabilityRelationship ? (
          <article className={zebraRowClass(0)}>
            <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
              {pub.capabilityRelationship.leadsTitle.toUpperCase()}
            </h4>
            <div className="mt-3">
              <BulletList items={pub.capabilityRelationship.leads} />
            </div>
          </article>
        ) : null}
        {pub.capabilityRelationship?.deliversTitle ? (
          <article className={zebraRowClass(1)}>
            <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
              {pub.capabilityRelationship.deliversTitle.toUpperCase()}
            </h4>
          </article>
        ) : null}
        {pub.connectedCapabilities.map((item, index) => (
          <article
            key={item.company}
            className={zebraRowClass(
              index + (pub.capabilityRelationship ? (pub.capabilityRelationship.deliversTitle ? 2 : 1) : 0),
            )}
          >
            <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
              {index + 1}. {item.company.toUpperCase()}
            </h4>
            <IconDetailRow icon="hub">{item.description}</IconDetailRow>
          </article>
        ))}
        {pub.capabilityRelationship?.note ? (
          <article
            className={zebraRowClass(
              pub.connectedCapabilities.length +
                (pub.capabilityRelationship.deliversTitle ? 2 : 1),
            )}
          >
            <Text className="text-sm leading-relaxed text-zoom-charcoal sm:text-base">
              {pub.capabilityRelationship.note}
            </Text>
          </article>
        ) : null}
      </DescriptionCard>
      ) : null}

      {publicProof.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Track record & proof"
          contentClassName="p-0"
        >
          {publicProof.map((item, index) => (
            <article key={item.id} className={zebraRowClass(index)}>
              <p className="text-xs font-semibold uppercase tracking-wide text-zoom-gray">
                {proofTypeLabels[item.type]}
              </p>
              <h4 className="mt-2 text-sm font-semibold tracking-wide text-zoom-dark">
                {item.title.toUpperCase()}
              </h4>
              <SectionIntro>{item.description}</SectionIntro>
            </article>
          ))}
        </DescriptionCard>
      ) : null}

      <DescriptionCard
        variant="accent"
        title="Contact & call to action"
        description={pub.cta.supportingSentence}
      >
        <DescriptionCardRow label="Headline" materialIcon="campaign">
          {pub.cta.headline}
        </DescriptionCardRow>
        <DescriptionCardRow label="Enquiry" materialIcon="forward_to_inbox">
          {pub.cta.enquiryAction}
        </DescriptionCardRow>
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
            href={`mailto:${profile.identity.email}`}
            className="font-medium text-zoom-light hover:text-zoom-medium"
          >
            {profile.identity.email}
          </TextLink>
        </DescriptionCardRow>
        <DescriptionCardRow label="Phone" materialIcon="call">
          <PhoneLinks phones={getIdentityPhones(profile.identity)} />
        </DescriptionCardRow>
      </DescriptionCard>
    </div>
  );
}
