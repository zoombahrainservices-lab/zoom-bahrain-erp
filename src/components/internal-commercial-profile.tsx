import { Text } from "@/components/catalyst/text";
import { DescriptionCard, DescriptionCardRow } from "@/components/description-card";
import {
  BulletList,
  EditableValue,
  IconDetailRow,
  InternalBadge,
  zebraRowClass,
} from "@/components/company-profile-ui";
import type { DivisionProfile } from "@/lib/division-profiles";

export function InternalCommercialProfile({ profile }: { profile: DivisionProfile }) {
  const { internal, public: pub } = profile;

  return (
    <div className="space-y-10">
      <DescriptionCard
        variant="accent"
        title="Internal commercial information"
        description="Kept out of the public profile and future PDF by default."
      >
        <DescriptionCardRow label="Visibility" materialIcon="visibility_off">
          <InternalBadge />
        </DescriptionCardRow>
      </DescriptionCard>

      {internal.deliveryClassification && internal.deliveryClassification.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Delivery classification"
          contentClassName="p-0"
        >
          {internal.deliveryClassification
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

      {internal.groupOperatingModel && internal.groupOperatingModel.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Group operating model"
          contentClassName="p-0"
        >
          {internal.groupOperatingModel.map((group, index) => (
            <article key={group.title} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {index + 1}. {group.title.toUpperCase()}
              </h4>
              <div className="mt-3">
                <BulletList items={group.items} />
              </div>
            </article>
          ))}
        </DescriptionCard>
      ) : null}

      {internal.leadCompanyRule && internal.leadCompanyRule.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Lead company rule"
          contentClassName="p-0"
        >
          {internal.leadCompanyRule
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
      ) : null}

      {internal.leadRouting && internal.leadRouting.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Lead routing"
          contentClassName="p-0"
        >
          {internal.leadRouting
            .slice()
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item, index) => (
              <article key={item.requirement} className={zebraRowClass(index)}>
                <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                  {item.displayOrder}. {item.requirement.toUpperCase()}
                </h4>
                <IconDetailRow icon="account_tree">{item.leadCompany}</IconDetailRow>
              </article>
            ))}
        </DescriptionCard>
      ) : null}

      {internal.customerProblemGroups && internal.customerProblemGroups.length > 0 ? (
        <DescriptionCard variant="accent" layout="content" title="Detailed customer problems" contentClassName="p-0">
          {internal.customerProblemGroups.map((group, index) => (
            <article key={group.title} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {index + 1}. {group.title.toUpperCase()}
              </h4>
              <div className="mt-3">
                <BulletList items={group.items} />
              </div>
            </article>
          ))}
        </DescriptionCard>
      ) : (
        <DescriptionCard variant="accent" layout="content" title="Detailed customer problems">
          <BulletList items={internal.customerProblems} />
        </DescriptionCard>
      )}

      {internal.buyingTriggerGroups && internal.buyingTriggerGroups.length > 0 ? (
        <DescriptionCard variant="accent" layout="content" title="Buying triggers" contentClassName="p-0">
          {internal.buyingTriggerGroups.map((group, index) => (
            <article key={group.title} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {index + 1}. {group.title.toUpperCase()}
              </h4>
              <div className="mt-3">
                <BulletList items={group.items} />
              </div>
            </article>
          ))}
        </DescriptionCard>
      ) : (
        <DescriptionCard variant="accent" layout="content" title="Buying triggers">
          <BulletList items={internal.buyingTriggers} />
        </DescriptionCard>
      )}

      <DescriptionCard variant="accent" layout="content" title="Main alternatives">
        <BulletList items={internal.alternatives} />
      </DescriptionCard>

      <DescriptionCard variant="accent" title="Competitor information">
        <DescriptionCardRow label="Notes" materialIcon="warning">
          <EditableValue field={internal.competitors} />
        </DescriptionCardRow>
      </DescriptionCard>

      <DescriptionCard
        variant="accent"
        layout="content"
        title={internal.pricingMethodsTitle ?? "Detailed pricing methods"}
      >
        <BulletList items={internal.pricingMethods} />
      </DescriptionCard>

      {internal.pricingVariables && internal.pricingVariables.length > 0 ? (
        <DescriptionCard variant="accent" layout="content" title="Main pricing variables">
          <BulletList items={internal.pricingVariables} />
        </DescriptionCard>
      ) : null}

      {internal.pricingRules && internal.pricingRules.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.pricingRulesTitle ?? "Group pricing rules"}
        >
          <BulletList items={internal.pricingRules} />
        </DescriptionCard>
      ) : null}

      {pub.serviceGroups.some((group) => group.services.length > 0) ? (
      <DescriptionCard
        variant="accent"
        layout="content"
        title="Service pricing by offer"
        description="Full pricing methods stay here. The public profile uses one commercial-model summary."
        contentClassName="p-0"
      >
        {pub.serviceGroups.flatMap((group) =>
          group.services.map((service) => ({ group: group.name, service })),
        ).map((row, index) => (
          <article key={`${row.group}-${row.service.name}`} className={zebraRowClass(index)}>
            <p className="text-xs font-semibold uppercase tracking-wide text-zoom-gray">
              {row.group}
            </p>
            <h4 className="mt-2 text-sm font-semibold tracking-wide text-zoom-dark">
              {row.service.name.toUpperCase()}
            </h4>
            <IconDetailRow icon="payments">{row.service.pricingMethod}</IconDetailRow>
          </article>
        ))}
      </DescriptionCard>
      ) : null}

      {internal.revenueModels.length > 0 ? (
      <DescriptionCard
        variant="accent"
        layout="content"
        title="Revenue models"
        description={internal.revenueNote}
      >
        <BulletList items={internal.revenueModels} />
      </DescriptionCard>
      ) : null}

      {internal.revenueAttribution && internal.revenueAttribution.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Revenue attribution"
          contentClassName="p-0"
        >
          {internal.revenueAttribution
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

      {internal.crossCompanyOpportunities && internal.crossCompanyOpportunities.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.crossCompanyOpportunitiesTitle ?? "Cross-company opportunity paths"}
          contentClassName="p-0"
        >
          {internal.crossCompanyOpportunities.map((group, index) => (
            <article key={group.title} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {index + 1}. {group.title.toUpperCase()}
              </h4>
              <div className="mt-3">
                <BulletList items={group.items} />
              </div>
            </article>
          ))}
        </DescriptionCard>
      ) : null}

      {internal.internalCostCategories && internal.internalCostCategories.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.internalCostCategoriesTitle ?? "Main internal cost categories"}
        >
          <BulletList items={internal.internalCostCategories} />
        </DescriptionCard>
      ) : null}

      {internal.merchantCommercialModels && internal.merchantCommercialModels.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Merchant commercial models"
          description="Use one approved model for each merchant."
        >
          <BulletList items={internal.merchantCommercialModels} />
        </DescriptionCard>
      ) : null}

      {internal.productEvaluation ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Product evaluation"
          description={internal.productEvaluation.intro}
        >
          <BulletList items={internal.productEvaluation.criteria} />
        </DescriptionCard>
      ) : null}

      {internal.thirdPartyCosts ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Third-party costs"
          description={internal.thirdPartyCosts.intro}
        >
          <BulletList items={internal.thirdPartyCosts.items} />
          {internal.thirdPartyCosts.note ? (
            <Text className="mt-4 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
              {internal.thirdPartyCosts.note}
            </Text>
          ) : null}
        </DescriptionCard>
      ) : null}

      {internal.clientInputs ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title="Client inputs & dependencies"
          description={internal.clientInputs.intro}
        >
          <BulletList items={internal.clientInputs.items} />
          {internal.clientInputs.note ? (
            <Text className="mt-4 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
              {internal.clientInputs.note}
            </Text>
          ) : null}
        </DescriptionCard>
      ) : null}

      {internal.scopeControl && internal.scopeControl.length > 0 ? (
        <DescriptionCard variant="accent" layout="content" title="Scope & change control">
          <BulletList items={internal.scopeControl} />
        </DescriptionCard>
      ) : null}

      {internal.projectQualification ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.projectQualification.title ?? "Project qualification"}
          description={internal.projectQualification.intro}
          contentClassName="p-0"
        >
          {internal.projectQualification.criteria.map((item, index) => (
            <article key={item.name} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {index + 1}. {item.name.toUpperCase()}
              </h4>
              <Text className="mt-2 text-sm leading-relaxed text-zoom-charcoal sm:text-base">
                {item.question}
              </Text>
            </article>
          ))}
          <article className={zebraRowClass(internal.projectQualification.criteria.length)}>
            <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
              {internal.projectQualification.decisionsTitle.toUpperCase()}
            </h4>
            <div className="mt-3">
              <BulletList items={internal.projectQualification.decisions} />
            </div>
          </article>
        </DescriptionCard>
      ) : null}

      {internal.projectStatuses && internal.projectStatuses.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.projectStatusesTitle ?? "Project status"}
        >
          <BulletList items={internal.projectStatuses} />
        </DescriptionCard>
      ) : null}

      {internal.supplierCategories.length > 0 ? (
      <DescriptionCard
        variant="accent"
        layout="content"
        title={internal.supplierCategoriesTitle ?? "Supplier categories"}
      >
        <BulletList items={internal.supplierCategories} />
      </DescriptionCard>
      ) : null}

      {internal.programRecords ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.programRecords.title ?? "Program delivery records"}
          description={internal.programRecords.intro}
        >
          <BulletList items={internal.programRecords.items} />
        </DescriptionCard>
      ) : null}

      {internal.participantInformation ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.participantInformation.title ?? "Participant information"}
          description={internal.participantInformation.intro}
        >
          <BulletList items={internal.participantInformation.items} />
        </DescriptionCard>
      ) : null}

      {internal.programControls ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.programControls.title ?? "Program controls"}
          description={internal.programControls.intro}
        >
          <BulletList items={internal.programControls.items} />
        </DescriptionCard>
      ) : null}

      {internal.supplierCategories.length > 0 || internal.supplierArrangements.value.trim() ? (
      <DescriptionCard variant="accent" title="Supplier arrangements">
        <DescriptionCardRow label="Notes" materialIcon="warning">
          <EditableValue field={internal.supplierArrangements} />
        </DescriptionCardRow>
      </DescriptionCard>
      ) : null}

      {internal.supplierCategories.length > 0 || internal.supplierMarkups.value.trim() ? (
      <DescriptionCard variant="accent" title="Supplier markups">
        <DescriptionCardRow label="Notes" materialIcon="warning">
          <EditableValue field={internal.supplierMarkups} />
        </DescriptionCardRow>
      </DescriptionCard>
      ) : null}

      <DescriptionCard variant="accent" title="Internal notes">
        <DescriptionCardRow label="Notes" materialIcon="warning">
          <EditableValue field={internal.internalNotes} />
        </DescriptionCardRow>
      </DescriptionCard>

      <DescriptionCard variant="accent" title="Capability gaps">
        <DescriptionCardRow label="Notes" materialIcon="warning">
          <EditableValue field={internal.capabilityGaps} />
        </DescriptionCardRow>
      </DescriptionCard>

      {internal.serviceOwnership ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.serviceOwnershipTitle ?? "Service ownership boundaries"}
          description={internal.serviceOwnership.note}
          contentClassName="p-0"
        >
          {internal.serviceOwnership.groups.map((group, index) => (
            <article key={group.title} className={zebraRowClass(index)}>
              <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
                {index + 1}. {group.title.toUpperCase()}
              </h4>
              <div className="mt-3">
                <BulletList items={group.items} />
              </div>
            </article>
          ))}
        </DescriptionCard>
      ) : null}

      {internal.supportedBy.length > 0 ? (
      <DescriptionCard
        variant="accent"
        layout="content"
        title="Supported by"
        description="Other Zoom companies that support this offer. Not mixed with outbound leads."
        contentClassName="p-0"
      >
        {internal.supportedBy.map((item, index) => (
          <article key={item.company} className={zebraRowClass(index)}>
            <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
              {index + 1}. {item.company.toUpperCase()}
            </h4>
            <IconDetailRow icon="south">{item.description}</IconDetailRow>
          </article>
        ))}
      </DescriptionCard>
      ) : null}

      {internal.supports.length > 0 ? (
      <DescriptionCard
        variant="accent"
        layout="content"
        title="Supports"
        description="Where this offer can send or support work for other Zoom companies."
        contentClassName="p-0"
      >
        {internal.supports.map((item, index) => (
          <article key={item.company} className={zebraRowClass(index)}>
            <h4 className="text-sm font-semibold tracking-wide text-zoom-dark">
              {index + 1}. {item.company.toUpperCase()}
            </h4>
            <IconDetailRow icon="north">{item.description}</IconDetailRow>
          </article>
        ))}
      </DescriptionCard>
      ) : null}

      {internal.unpromotedServiceItems && internal.unpromotedServiceItems.length > 0 ? (
        <DescriptionCard
          variant="accent"
          layout="content"
          title={internal.unpromotedTitle ?? "Services not currently promoted"}
          description={
            internal.unpromotedServices.value.trim() ||
            internal.unpromotedServices.placeholder
          }
        >
          <BulletList items={internal.unpromotedServiceItems} />
        </DescriptionCard>
      ) : (
        <DescriptionCard variant="accent" title={internal.unpromotedTitle ?? "Services not currently promoted"}>
          <DescriptionCardRow label="Notes" materialIcon="warning">
            <EditableValue field={internal.unpromotedServices} />
          </DescriptionCardRow>
        </DescriptionCard>
      )}

      <DescriptionCard variant="accent" title={internal.serviceRatingsTitle ?? "Internal service ratings"}>
        <DescriptionCardRow label="Notes" materialIcon="warning">
          <EditableValue field={internal.serviceRatings} />
        </DescriptionCardRow>
      </DescriptionCard>
    </div>
  );
}
