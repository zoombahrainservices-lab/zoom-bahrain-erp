import { advertisingProfile } from "@/lib/company-profiles/advertising";
import { businessConsultancyProfile } from "@/lib/company-profiles/business-consultancy";
import { eCommerceProfile } from "@/lib/company-profiles/e-commerce";
import { educationTrainingProfile } from "@/lib/company-profiles/education-training";
import { eventsProfile } from "@/lib/company-profiles/events";
import { groupProfile } from "@/lib/company-profiles/group";
import { logisticsProfile } from "@/lib/company-profiles/logistics";
import { professionalServicesProfile } from "@/lib/company-profiles/professional-services";
import { softwareSolutionsProfile } from "@/lib/company-profiles/software-solutions";
import { sportsProfile } from "@/lib/company-profiles/sports";
import { technologySolutionsProfile } from "@/lib/company-profiles/technology-solutions";
import { warehousingProfile } from "@/lib/company-profiles/warehousing";

export type ContentStatus = "draft" | "under-review" | "approved" | "published";
export type ServiceStatus = "active" | "supporting" | "future" | "inactive";
export type ApprovalStatus = "draft" | "pending" | "approved";
export type ProofType =
  | "testimonial"
  | "closed-client"
  | "project"
  | "case-study"
  | "photograph"
  | "video"
  | "report"
  | "programme"
  | "scope"
  | "venue-record"
  | "artwork"
  | "advertisement"
  | "media-record"
  | "sample"
  | "brand-project"
  | "feasibility-study"
  | "project-plan"
  | "commercial-model"
  | "partner-record"
  | "supplier-comparison"
  | "final-deliverable"
  | "outcome-record"
  | "business-diagnostic"
  | "strategy-document"
  | "business-plan"
  | "org-structure"
  | "process-project"
  | "sop-collection"
  | "kpi-framework"
  | "reporting-system"
  | "transformation-roadmap"
  | "live-platform"
  | "store"
  | "merchant"
  | "product-range"
  | "customer-order"
  | "bulk-order"
  | "customer-review"
  | "product-campaign"
  | "fulfilment-record"
  | "screenshot"
  | "order-journey"
  | "website"
  | "ecommerce-platform"
  | "web-application"
  | "mobile-application"
  | "custom-software"
  | "integration"
  | "digital-product"
  | "digitalization-assessment"
  | "technology-roadmap"
  | "solution-architecture"
  | "backend-system"
  | "automation-project"
  | "ai-solution"
  | "data-environment"
  | "technology-deployment"
  | "managed-engagement"
  | "coach-profile"
  | "sports-program"
  | "school-program"
  | "corporate-program"
  | "sports-camp"
  | "skills-clinic"
  | "athlete-development"
  | "competition-prep"
  | "sports-partnership"
  | "training-program"
  | "workshop"
  | "digital-skills-program"
  | "career-program"
  | "trainer-profile"
  | "training-partner"
  | "learning-materials"
  | "participant-feedback"
  | "cargo-handling"
  | "bahrain-delivery"
  | "gcc-shipment"
  | "freight-assignment"
  | "distribution-project"
  | "warehouse-logistics"
  | "special-cargo"
  | "recurring-client"
  | "delivery-record"
  | "warehouse-facility"
  | "warehouse-capacity"
  | "ambient-storage"
  | "temperature-storage"
  | "managed-warehouse"
  | "inventory-report"
  | "group-portfolio"
  | "group-client"
  | "flagship-project"
  | "multi-company-project"
  | "operating-facility"
  | "digital-platform"
  | "event-project"
  | "supply-chain-project"
  | "people-development-program"
  | "strategic-partnership";
export type AssetType =
  | "catalog"
  | "brochure"
  | "promotion"
  | "poster"
  | "social"
  | "presentation"
  | "company-profile"
  | "proposal-template"
  | "quotation-template"
  | "concept-template"
  | "photography-portfolio"
  | "video-showreel"
  | "venue-profile"
  | "forms"
  | "media-plan-template"
  | "brand-portfolio"
  | "rate-card"
  | "case-study-collection"
  | "capability-statement"
  | "project-portfolio"
  | "discovery-template"
  | "feasibility-template"
  | "scope-template"
  | "plan-template"
  | "comparison-template"
  | "partnership-template"
  | "commercial-model-template"
  | "report-template"
  | "diagnostic-template"
  | "strategy-template"
  | "business-plan-template"
  | "operating-model-template"
  | "org-structure-template"
  | "roles-template"
  | "process-mapping-template"
  | "sop-template"
  | "kpi-template"
  | "reporting-template"
  | "transformation-template"
  | "workshop-template"
  | "platform-portfolio"
  | "platform-profile"
  | "onboarding-pack"
  | "supplier-pack"
  | "listing-template"
  | "commercial-terms"
  | "campaign-calendar"
  | "photography-guide"
  | "screenshot"
  | "website-portfolio"
  | "application-portfolio"
  | "pricing-guide"
  | "maintenance-plan"
  | "architecture-template"
  | "integration-register"
  | "ai-brief"
  | "coach-profile-pack"
  | "program-schedule"
  | "participant-pack"
  | "trainer-profile-pack"
  | "program-outline"
  | "learning-materials-template"
  | "feedback-form"
  | "rate-request"
  | "job-sheet"
  | "proof-of-delivery"
  | "tracking-update"
  | "distribution-plan"
  | "capacity-sheet"
  | "agreement-template"
  | "goods-receipt"
  | "stock-report"
  | "release-order"
  | "group-overview"
  | "company-directory"
  | "brand-architecture"
  | "capability-matrix"
  | "website-content"
  | "media-kit"
  | "management-profile"
  | "factsheet";

export type LinkedFileRecord<T extends string> = {
  id: string;
  title: string;
  type: T;
  description: string;
  fileUrl?: string;
  fileName?: string;
  dateAdded: string;
};

export type EditableText = {
  value: string;
  placeholder?: string;
  needsInput?: boolean;
};

export type CompanySegment = {
  name: string;
  description: string;
  mainNeed: string;
  desiredOutcome: string;
  includeInPdf: boolean;
  displayOrder: number;
};

export type CustomerNeed = {
  need: string;
  outcome: string;
  displayOrder: number;
};

export type CompanyService = {
  name: string;
  description: string;
  deliverable: string;
  pricingMethod: string;
  possibleSupport?: string[];
  displayOrder: number;
  includeInPdf: boolean;
  status: ServiceStatus;
};

export type ServiceGroup = {
  name: string;
  displayOrder: number;
  services: CompanyService[];
  note?: string;
};

export type WorkflowStep = {
  name: string;
  explanation: string;
  displayOrder: number;
};

export type CompanyLink = {
  company: string;
  description: string;
};

export type OwnershipGroup = {
  title: string;
  items: string[];
};

export type ServiceOwnership = {
  groups: OwnershipGroup[];
  note?: string;
};

export type NamedDescription = {
  name: string;
  description: string;
  displayOrder: number;
};

export type ServiceSectionCopy = {
  title: string;
  description?: string;
};

export type ProjectPortfolioGuide = {
  intro: string;
  structure: NamedDescription[];
  emptyPrompt: EditableText;
};

export type CapabilityRelationship = {
  title: string;
  description?: string;
  leadsTitle: string;
  leads: string[];
  deliversTitle?: string;
  note?: string;
};

export type QualificationCriterion = {
  name: string;
  question: string;
};

export type ProjectQualification = {
  title?: string;
  intro: string;
  criteria: QualificationCriterion[];
  decisionsTitle: string;
  decisions: string[];
};

export type NamedListGroup = {
  title: string;
  items: string[];
};

export type NamedWorkflow = {
  title: string;
  steps: WorkflowStep[];
};

export type CommercePlatform = {
  name: string;
  type: string;
  website: string;
  purpose: string;
  customer: string;
  offer: string;
  status: string;
  proof: EditableText;
};

export type CommercePortfolio = {
  intro: string;
  structure: NamedDescription[];
  platforms: CommercePlatform[];
};

export type GroupCompanyCard = {
  name: string;
  code: string;
  descriptor: string;
  whatItDoes: string;
  coreOffers: string[];
  primaryPlatform?: string;
  website: string;
  displayOrder: number;
};

export type IntegratedGroupSolution = {
  name: string;
  companies: string[];
  leadCompany?: string;
  outcome: string;
  displayOrder: number;
};

export type LeadRoute = {
  requirement: string;
  leadCompany: string;
  displayOrder: number;
};

export type ProofRecord = LinkedFileRecord<ProofType>;
export type AssetRecord = LinkedFileRecord<AssetType>;

export type IdentityContact = {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
  needsInput?: boolean;
};

export type SocialChannel = {
  network: "instagram" | "facebook" | "linkedin" | "whatsapp" | "youtube" | "tiktok" | "x";
  label: string;
  url: string;
  needsInput?: boolean;
};

export type DivisionProfile = {
  companyId: string;
  erpStatus: "live" | "planned";
  content: {
    status: ContentStatus;
    version: string;
    lastUpdated: string;
    updatedBy: string;
  };
  identity: {
    shortDescriptor: string;
    email: string;
    phone: string;
    additionalPhones?: string[];
    tagline?: string;
    primaryPlatform?: string;
    whatsapp?: EditableText;
    office?: EditableText;
    mainMarket: string;
    customerType: string;
    contacts: IdentityContact[];
    social: SocialChannel[];
  };
  public: {
    snapshot: {
      customer: string;
      problem: string;
      offer: string;
      value: string;
      pricing: string;
      delivery: string;
      keyProof: EditableText;
      zoomSupport: string;
      zoomSupportLabel?: string;
    };
    positioning: {
      overview: string;
      purpose: string;
      roleWithinZoom: string;
      roleLabel?: string;
      positioningStatement: string;
      customerPromise: string;
    };
    mission?: string;
    vision?: string;
    principles?: NamedDescription[];
    groupArchitecture?: NamedListGroup[];
    groupCompanies?: GroupCompanyCard[];
    integratedSolutions?: IntegratedGroupSolution[];
    segments: CompanySegment[];
    needs: CustomerNeed[];
    serviceGroups: ServiceGroup[];
    serviceSection?: ServiceSectionCopy;
    projectCategories?: NamedDescription[];
    projectPortfolio?: ProjectPortfolioGuide;
    commercePortfolio?: CommercePortfolio;
    whyZoom: string[];
    whyZoomTitle?: string;
    workflow: WorkflowStep[];
    workflowTitle?: string;
    additionalWorkflows?: NamedWorkflow[];
    connectedCapabilities: CompanyLink[];
    capabilityRelationship?: CapabilityRelationship;
    cta: {
      headline: string;
      supportingSentence: string;
      enquiryAction: string;
    };
  };
  internal: {
    customerProblems: string[];
    customerProblemGroups?: NamedListGroup[];
    buyingTriggers: string[];
    buyingTriggerGroups?: NamedListGroup[];
    alternatives: string[];
    competitors: EditableText;
    pricingMethods: string[];
    pricingMethodsTitle?: string;
    pricingRules?: string[];
    pricingRulesTitle?: string;
    revenueModels: string[];
    revenueNote?: string;
    revenueAttribution?: NamedDescription[];
    groupOperatingModel?: NamedListGroup[];
    leadCompanyRule?: WorkflowStep[];
    leadRouting?: LeadRoute[];
    crossCompanyOpportunities?: NamedListGroup[];
    crossCompanyOpportunitiesTitle?: string;
    merchantCommercialModels?: string[];
    productEvaluation?: {
      intro: string;
      criteria: string[];
    };
    pricingVariables?: string[];
    thirdPartyCosts?: {
      intro: string;
      items: string[];
      note?: string;
    };
    clientInputs?: {
      intro: string;
      items: string[];
      note?: string;
    };
    programRecords?: {
      title?: string;
      intro: string;
      items: string[];
    };
    participantInformation?: {
      title?: string;
      intro: string;
      items: string[];
    };
    programControls?: {
      title?: string;
      intro: string;
      items: string[];
    };
    deliveryClassification?: NamedDescription[];
    internalCostCategories?: string[];
    internalCostCategoriesTitle?: string;
    scopeControl?: string[];
    supplierCategories: string[];
    supplierCategoriesTitle?: string;
    supplierArrangements: EditableText;
    supplierMarkups: EditableText;
    internalNotes: EditableText;
    capabilityGaps: EditableText;
    supportedBy: CompanyLink[];
    supports: CompanyLink[];
    unpromotedServices: EditableText;
    unpromotedServiceItems?: string[];
    unpromotedTitle?: string;
    serviceRatings: EditableText;
    serviceRatingsTitle?: string;
    serviceOwnership?: ServiceOwnership;
    serviceOwnershipTitle?: string;
    projectQualification?: ProjectQualification;
    projectStatuses?: string[];
    projectStatusesTitle?: string;
  };
  proof: ProofRecord[];
  assets: AssetRecord[];
};

export function linkedFile<T extends string>(
  id: string,
  type: T,
  title: string,
  description: string,
): LinkedFileRecord<T> {
  return {
    id,
    type,
    title,
    description,
    dateAdded: "2026-08-26",
  };
}

export const divisionProfiles: Record<string, DivisionProfile> = {
  "real-estate": {
    companyId: "real-estate",
    erpStatus: "live",
    content: {
      status: "draft",
      version: "0.1",
      lastUpdated: "2026-08-26",
      updatedBy: "ERP setup",
    },
    identity: {
      shortDescriptor: "Property Management & Real Estate Solutions",
      email: "info@zoombahrain.co",
      phone: "+973 3881 4222",
      whatsapp: {
        value: "Confirm the WhatsApp number for Zoom Real Estate enquiries.",
        needsInput: true,
      },
      office: {
        value: "Add the Bahrain office or visiting address.",
        needsInput: true,
      },
      mainMarket: "Bahrain",
      customerType: "B2B and B2C",
      contacts: [
        {
          name: "Stojan",
          role: "Primary point of contact",
          isPrimary: true,
          needsInput: true,
        },
        {
          name: "Kamal",
          role: "Second point of contact",
          isPrimary: false,
          needsInput: true,
        },
      ],
      social: [
        {
          network: "instagram",
          label: "Instagram",
          url: "https://instagram.com/zoombahrain",
          needsInput: true,
        },
        {
          network: "facebook",
          label: "Facebook",
          url: "https://facebook.com/zoombahrain",
          needsInput: true,
        },
        {
          network: "linkedin",
          label: "LinkedIn",
          url: "https://linkedin.com/company/zoombahrain",
          needsInput: true,
        },
        {
          network: "youtube",
          label: "YouTube",
          url: "https://youtube.com/@zoombahrain",
          needsInput: true,
        },
      ],
    },
    public: {
      snapshot: {
        customer:
          "Property owners, landlords, investors, tenants, buyers, sellers and businesses in Bahrain.",
        problem:
          "Finding, leasing and managing property without one coordinated process.",
        offer:
          "Property management, leasing, sales support and connected property coordination.",
        value:
          "One point of contact from enquiry through management, leasing, transactions and follow-up.",
        pricing:
          "Monthly fees, commissions, annual contracts or custom quotations, depending on the work.",
        delivery:
          "Enquiry, requirement review, recommendation, agreement, then coordinated delivery and follow-up.",
        keyProof: {
          value: "",
          placeholder: "No approved proof added yet.",
          needsInput: true,
        },
        zoomSupport:
          "Zoom Advertising, Software Solutions, Technology Solutions, Warehousing and Professional Services.",
      },
      positioning: {
        overview:
          "Zoom Real Estate helps clients find, lease, manage and improve properties in Bahrain through one coordinated service.",
        purpose:
          "Give owners, tenants, buyers, sellers and businesses a single contact for property work.",
        roleWithinZoom:
          "Property contact for Zoom clients who need management, leasing, transactions or connected property support.",
        positioningStatement:
          "One coordinated property service in Bahrain, with other Zoom companies involved when the work requires it.",
        customerPromise:
          "One contact for management, leasing, transactions and coordination.",
      },
      segments: [
        {
          name: "Property owners and landlords",
          description: "People who own residential or commercial property and need it managed or leased.",
          mainNeed: "Reliable management, tenant communication and occupancy.",
          desiredOutcome: "An occupied, organized property with clear reporting.",
          includeInPdf: true,
          displayOrder: 1,
        },
        {
          name: "Investors and portfolio owners",
          description: "Owners with more than one property who need a single view of occupancy, tenants and income.",
          mainNeed: "Centralized records and coordinated management across properties.",
          desiredOutcome: "A clear portfolio picture and consistent rental-income follow-up.",
          includeInPdf: true,
          displayOrder: 2,
        },
        {
          name: "Tenants, buyers and sellers",
          description: "People looking for a home or commercial space, or selling a property.",
          mainNeed: "Suitable properties, viewings and a clear path to lease or purchase.",
          desiredOutcome: "A completed lease or transaction with coordinated next steps.",
          includeInPdf: true,
          displayOrder: 3,
        },
        {
          name: "Businesses requiring commercial or industrial property",
          description: "Companies that need offices, shops, warehouses or industrial space.",
          mainNeed: "A suitable commercial or industrial property on an agreed timeline.",
          desiredOutcome: "A shortlist, viewings and support through negotiation and completion.",
          includeInPdf: true,
          displayOrder: 4,
        },
        {
          name: "Developers and overseas property owners",
          description: "Developers and owners based outside Bahrain who need local property support.",
          mainNeed: "Local handling of management, leasing, sales or project coordination.",
          desiredOutcome: "A local contact who can move the property work forward.",
          includeInPdf: true,
          displayOrder: 5,
        },
      ],
      needs: [
        {
          need: "Finding suitable properties, buyers or tenants",
          outcome: "A shortlist, viewings and coordinated lease or sale support.",
          displayOrder: 1,
        },
        {
          need: "Reducing property-management workload",
          outcome: "Tenant communication, records and day-to-day coordination handled through one contact.",
          displayOrder: 2,
        },
        {
          need: "Improving occupancy and rental-income consistency",
          outcome: "Leasing support, occupancy follow-up and structured rent-collection administration.",
          displayOrder: 3,
        },
        {
          need: "Coordinating owners, tenants and service providers",
          outcome: "One process for communication, maintenance requests and connected property work.",
          displayOrder: 4,
        },
        {
          need: "Making clearer property and investment decisions",
          outcome: "Property assessment, reporting and advice based on the agreed scope.",
          displayOrder: 5,
        },
      ],
      serviceGroups: [
        {
          name: "Property Management",
          displayOrder: 1,
          services: [
            {
              name: "Property Management",
              description: "Management and coordination of residential and commercial properties.",
              deliverable:
                "An actively managed property with organized tenant communication, records, monitoring and reporting.",
              pricingMethod: "Monthly fee, annual contract or custom quotation.",
              displayOrder: 1,
              includeInPdf: true,
              status: "active",
            },
            {
              name: "Property Portfolio Management",
              description: "Centralized management of multiple properties for one owner or investor.",
              deliverable:
                "Portfolio records, occupancy monitoring, tenant coordination and consolidated reporting.",
              pricingMethod: "Monthly or annual portfolio-management fee.",
              displayOrder: 2,
              includeInPdf: true,
              status: "active",
            },
            {
              name: "Rent Collection Administration",
              description: "Structured follow-up and administration of tenant rental payments.",
              deliverable: "Payment tracking, tenant follow-up and rental-income reporting.",
              pricingMethod: "Monthly fee or annual management contract.",
              displayOrder: 3,
              includeInPdf: true,
              status: "active",
            },
            {
              name: "Property Owner Support",
              description:
                "Selected property support for owners who do not require complete property management.",
              deliverable:
                "Administration, tenant coordination, property monitoring or reporting based on the agreed scope.",
              pricingMethod: "Fixed fee, monthly fee or custom quotation.",
              displayOrder: 4,
              includeInPdf: true,
              status: "active",
            },
          ],
        },
        {
          name: "Leasing & Transactions",
          displayOrder: 2,
          services: [
            {
              name: "Residential & Commercial Leasing",
              description:
                "Support for leasing apartments, villas, offices, shops and commercial properties.",
              deliverable:
                "Property sourcing, viewings, negotiations and coordinated lease completion.",
              pricingMethod: "Commission, fixed fee or custom quotation.",
              displayOrder: 1,
              includeInPdf: true,
              status: "active",
            },
            {
              name: "Property Sales & Brokerage",
              description:
                "Support for clients buying or selling residential and commercial properties.",
              deliverable:
                "Property presentation, buyer and seller coordination, viewings, negotiations and transaction support.",
              pricingMethod: "Percentage commission or custom quotation.",
              displayOrder: 2,
              includeInPdf: true,
              status: "active",
            },
            {
              name: "Sole Lettings Agency",
              description:
                "Exclusive management of the property-leasing process on behalf of the owner.",
              deliverable:
                "Property marketing, tenant sourcing, viewing coordination and leasing support.",
              pricingMethod: "Commission, fixed fee or exclusive-agency agreement.",
              displayOrder: 3,
              includeInPdf: true,
              status: "active",
            },
          ],
        },
        {
          name: "Commercial Property Solutions",
          displayOrder: 3,
          services: [
            {
              name: "Commercial & Industrial Property Sourcing",
              description:
                "Finding suitable offices, shops, warehouses and industrial properties for businesses.",
              deliverable:
                "Property shortlist, viewing coordination and commercial negotiation support.",
              pricingMethod: "Commission, fixed fee or custom quotation.",
              displayOrder: 1,
              includeInPdf: true,
              status: "active",
            },
          ],
        },
        {
          name: "Property Advisory",
          displayOrder: 4,
          services: [
            {
              name: "Property Appraisal & Assessment",
              description:
                "Assessment and reporting related to the property and its commercial position.",
              deliverable: "Property assessment or appraisal report.",
              pricingMethod: "Fixed fee per assignment.",
              displayOrder: 1,
              includeInPdf: true,
              status: "active",
            },
            {
              name: "Real Estate Development Consulting",
              description: "Planning and coordination support for property-development projects.",
              deliverable:
                "Development direction, project planning and coordinated specialist support.",
              pricingMethod: "Project fee, consultancy fee or custom quotation.",
              displayOrder: 2,
              includeInPdf: true,
              status: "active",
            },
          ],
        },
        {
          name: "Managed Property Support",
          displayOrder: 5,
          services: [
            {
              name: "Managed Property Support",
              description:
                "Coordination of connected property requirements through other Zoom companies or external suppliers.",
              deliverable:
                "Coordinated delivery of connected property requirements based on agreed scope.",
              pricingMethod:
                "Project fee, coordination fee, supplier markup or custom quotation.",
              possibleSupport: [
                "Property maintenance",
                "Cleaning",
                "Fit-out and renovation",
                "Security systems",
                "Property photography",
                "Property advertising",
                "Signage",
                "Websites and digital property systems",
              ],
              displayOrder: 1,
              includeInPdf: true,
              status: "supporting",
            },
          ],
        },
      ],
      whyZoom: [
        "One coordinated point of contact for property requirements.",
        "Support for residential and commercial properties.",
        "Coordination between owners, tenants and service providers.",
        "Connected Zoom capabilities for marketing, systems, warehousing and specialist project work.",
        "Flexible support for individual properties and portfolios.",
      ],
      workflow: [
        {
          name: "Enquiry",
          explanation: "Contact Zoom with the property requirement, location, timing and objective.",
          displayOrder: 1,
        },
        {
          name: "Requirement Review",
          explanation: "Confirm property type, budget, timeline and whether the need is management, leasing, sale or support.",
          displayOrder: 2,
        },
        {
          name: "Property or Service Assessment",
          explanation: "Review the property or the customer requirement before recommending a path.",
          displayOrder: 3,
        },
        {
          name: "Recommendation and Quotation",
          explanation: "Propose the suitable service or property solution with commercial terms and scope.",
          displayOrder: 4,
        },
        {
          name: "Approval and Agreement",
          explanation: "Confirm the quotation or agreement and complete any required payment or contract.",
          displayOrder: 5,
        },
        {
          name: "Delivery and Coordination",
          explanation: "Begin sourcing, management, leasing or connected property work through one contact.",
          displayOrder: 6,
        },
        {
          name: "Completion and Follow-Up",
          explanation: "Complete the agreed work and keep communication open for management, repeat work or further requirements.",
          displayOrder: 7,
        },
      ],
      connectedCapabilities: [
        {
          company: "Zoom Advertising",
          description: "Property marketing, campaigns, photography and promotional materials.",
        },
        {
          company: "Zoom Software Solutions",
          description: "Property websites, portals and digital forms.",
        },
        {
          company: "Zoom Technology Solutions",
          description: "Property systems, automation and digitalization.",
        },
        {
          company: "Zoom Warehousing",
          description: "Connected warehouse and storage requirements.",
        },
        {
          company: "Zoom Professional Services",
          description: "Specialist project support.",
        },
      ],
      cta: {
        headline: "Discuss Your Property Requirement",
        supportingSentence:
          "Tell Zoom Real Estate what you need - management, leasing, a transaction or connected property support.",
        enquiryAction: "Email, call or use the website to start an enquiry.",
      },
    },
    internal: {
      customerProblems: [
        "Difficulty finding suitable properties or tenants",
        "Time required to manage properties and tenant communication",
        "Poor coordination between owners, tenants and suppliers",
        "Vacant properties producing no income",
        "Delayed rent collection",
        "Difficulty managing several properties",
        "Lack of clear property information",
        "Complex buying, selling or leasing processes",
        "Difficulty coordinating property maintenance and improvements",
      ],
      buyingTriggers: [
        "A property becomes vacant",
        "A tenant needs a new home or commercial space",
        "An owner wants to lease or sell a property",
        "A business needs an office, shop or warehouse",
        "An investor wants to purchase a property",
        "An owner is experiencing tenant or payment problems",
        "A property requires professional management",
        "A company enters or expands in Bahrain",
        "An owner acquires several properties",
        "A development or property project begins",
      ],
      alternatives: [
        "Independent real estate agents",
        "Property-management companies",
        "Online property portals",
        "Direct owner-to-tenant arrangements",
        "In-house property teams",
        "Individual maintenance and property suppliers",
      ],
      competitors: {
        value: "",
        placeholder: "Add named competitors only when confirmed.",
        needsInput: true,
      },
      pricingMethods: [
        "Monthly management fee",
        "Annual management or portfolio contract",
        "Leasing or sales commission",
        "Fixed fee per assignment",
        "Exclusive-agency agreement",
        "Project or consultancy fee",
        "Coordination fee",
        "Supplier markup on connected work",
        "Custom quotation",
      ],
      revenueModels: [],
      supplierCategories: [],
      supplierArrangements: {
        value: "",
        placeholder: "Add approved supplier names and terms when confirmed.",
        needsInput: true,
      },
      supplierMarkups: {
        value: "",
        placeholder: "Add the agreed markup rule for coordinated supplier work only.",
        needsInput: true,
      },
      internalNotes: {
        value: "",
        placeholder: "Add operating notes, exceptions and handover comments here.",
        needsInput: true,
      },
      capabilityGaps: {
        value: "",
        placeholder: "Add confirmed capability gaps after internal review.",
        needsInput: true,
      },
      supportedBy: [
        {
          company: "Zoom Advertising",
          description: "Property marketing, campaigns, photography and promotional materials",
        },
        {
          company: "Zoom Software Solutions",
          description: "Property websites, portals and digital forms",
        },
        {
          company: "Zoom Technology Solutions",
          description: "Property systems, automation and digitalization",
        },
        {
          company: "Zoom Warehousing",
          description: "Storage and warehouse operational requirements",
        },
        {
          company: "Zoom Professional Services",
          description: "Specialist project support",
        },
      ],
      supports: [
        {
          company: "Zoom Warehousing",
          description: "Warehouse and industrial-property enquiries",
        },
        {
          company: "Zoom Advertising",
          description: "Property-marketing projects",
        },
        {
          company: "Zoom Business Consultancy",
          description: "Property-related business planning",
        },
        {
          company: "Zoom Software Solutions",
          description: "Property platforms and websites",
        },
        {
          company: "Zoom Technology Solutions",
          description: "Property-management and automation systems",
        },
      ],
      unpromotedServices: {
        value: "",
        placeholder: "Add services that should stay off the public profile or PDF.",
        needsInput: true,
      },
      serviceRatings: {
        value: "",
        placeholder: "Add internal ratings after commercial review.",
        needsInput: true,
      },
    },
    proof: [
      linkedFile(
        "rea-testimonial-1",
        "testimonial",
        "Client testimonial",
        "Completed work with a quote we can use after the client is closed and has approved it.",
      ),
      linkedFile(
        "rea-client-1",
        "closed-client",
        "Closed client",
        "A finished client relationship from the ERP. File and name stay private until approved.",
      ),
      linkedFile(
        "rea-project-1",
        "project",
        "Completed project",
        "A finished property management, leasing or sales job with outcome on file.",
      ),
      linkedFile(
        "rea-case-1",
        "case-study",
        "Case study",
        "A closed case we can reuse internally, then in the public profile once approved.",
      ),
      linkedFile(
        "rea-photo-1",
        "photograph",
        "Project photograph",
        "Photo from completed work, stored in ERP and available to download when linked.",
      ),
    ],
    assets: [
      linkedFile(
        "rea-catalog-1",
        "catalog",
        "Service catalog",
        "Ready-to-send catalog of Zoom Real Estate services.",
      ),
      linkedFile(
        "rea-brochure-1",
        "brochure",
        "Brochure",
        "One-pager or brochure for owners, tenants or investors.",
      ),
      linkedFile(
        "rea-promotion-1",
        "promotion",
        "Promotion",
        "Current promotional offer or campaign pack.",
      ),
      linkedFile(
        "rea-poster-1",
        "poster",
        "Poster",
        "Print or digital poster for property or company promotion.",
      ),
      linkedFile(
        "rea-social-1",
        "social",
        "Social media pack",
        "Ready posts, sizes and artwork for Instagram, Facebook and similar channels.",
      ),
      linkedFile(
        "rea-presentation-1",
        "presentation",
        "Presentation",
        "Pitch deck for meetings, ready to send or present.",
      ),
    ],
  },
  events: eventsProfile,
  advertising: advertisingProfile,
  "professional-services": professionalServicesProfile,
  "business-consultancy": businessConsultancyProfile,
  "e-commerce": eCommerceProfile,
  "software-solutions": softwareSolutionsProfile,
  "technology-solutions": technologySolutionsProfile,
  sports: sportsProfile,
  "education-training": educationTrainingProfile,
  logistics: logisticsProfile,
  warehousing: warehousingProfile,
  group: groupProfile,
};

export function getDivisionProfile(id: string) {
  return divisionProfiles[id];
}

export function hasDivisionProfile(id: string) {
  return id in divisionProfiles;
}

export function getPublicProof(profile: DivisionProfile) {
  return profile.proof.filter(
    (item) => Boolean(item.fileUrl) && Boolean(item.title.trim()),
  );
}

export function getIdentityPhones(identity: DivisionProfile["identity"]) {
  return [identity.phone, ...(identity.additionalPhones ?? [])].filter((phone) =>
    Boolean(phone.trim()),
  );
}

export const proofTypeLabels: Record<ProofType, string> = {
  testimonial: "Testimonial",
  "closed-client": "Closed client",
  project: "Project",
  "case-study": "Case study",
  photograph: "Photograph",
  video: "Video",
  report: "Report",
  programme: "Programme",
  scope: "Scope",
  "venue-record": "Venue record",
  artwork: "Artwork",
  advertisement: "Advertisement",
  "media-record": "Media record",
  sample: "Sample",
  "brand-project": "Brand project",
  "feasibility-study": "Feasibility study",
  "project-plan": "Project plan",
  "commercial-model": "Commercial model",
  "partner-record": "Partner record",
  "supplier-comparison": "Supplier comparison",
  "final-deliverable": "Final deliverable",
  "outcome-record": "Outcome record",
  "business-diagnostic": "Business diagnostic",
  "strategy-document": "Strategy document",
  "business-plan": "Business plan",
  "org-structure": "Organizational structure",
  "process-project": "Process project",
  "sop-collection": "SOP collection",
  "kpi-framework": "KPI framework",
  "reporting-system": "Reporting system",
  "transformation-roadmap": "Transformation roadmap",
  "live-platform": "Live platform",
  store: "Store",
  merchant: "Merchant",
  "product-range": "Product range",
  "customer-order": "Customer order",
  "bulk-order": "Bulk order",
  "customer-review": "Customer review",
  "product-campaign": "Product campaign",
  "fulfilment-record": "Fulfilment record",
  screenshot: "Screenshot",
  "order-journey": "Order journey",
  website: "Website",
  "ecommerce-platform": "E-commerce platform",
  "web-application": "Web application",
  "mobile-application": "Mobile application",
  "custom-software": "Custom software",
  integration: "Integration",
  "digital-product": "Digital product",
  "digitalization-assessment": "Digitalization assessment",
  "technology-roadmap": "Technology roadmap",
  "solution-architecture": "Solution architecture",
  "backend-system": "Backend system",
  "automation-project": "Automation project",
  "ai-solution": "AI solution",
  "data-environment": "Data environment",
  "technology-deployment": "Technology deployment",
  "managed-engagement": "Managed engagement",
  "coach-profile": "Coach profile",
  "sports-program": "Sports program",
  "school-program": "School program",
  "corporate-program": "Corporate program",
  "sports-camp": "Sports camp",
  "skills-clinic": "Skills clinic",
  "athlete-development": "Athlete development",
  "competition-prep": "Competition preparation",
  "sports-partnership": "Sports partnership",
  "training-program": "Training program",
  workshop: "Workshop",
  "digital-skills-program": "Digital skills program",
  "career-program": "Career program",
  "trainer-profile": "Trainer profile",
  "training-partner": "Training partner",
  "learning-materials": "Learning materials",
  "participant-feedback": "Participant feedback",
  "cargo-handling": "Cargo handling",
  "bahrain-delivery": "Bahrain delivery",
  "gcc-shipment": "GCC shipment",
  "freight-assignment": "Freight assignment",
  "distribution-project": "Distribution project",
  "warehouse-logistics": "Warehouse logistics",
  "special-cargo": "Special cargo",
  "recurring-client": "Recurring client",
  "delivery-record": "Delivery record",
  "warehouse-facility": "Warehouse facility",
  "warehouse-capacity": "Warehouse capacity",
  "ambient-storage": "Ambient storage",
  "temperature-storage": "Temperature-controlled storage",
  "managed-warehouse": "Managed warehouse",
  "inventory-report": "Inventory report",
  "group-portfolio": "Group portfolio",
  "group-client": "Group client",
  "flagship-project": "Flagship project",
  "multi-company-project": "Multi-company project",
  "operating-facility": "Operating facility",
  "digital-platform": "Digital platform",
  "event-project": "Event project",
  "supply-chain-project": "Supply chain project",
  "people-development-program": "People development program",
  "strategic-partnership": "Strategic partnership",
};

export const assetTypeLabels: Record<AssetType, string> = {
  catalog: "Catalog",
  brochure: "Brochure",
  promotion: "Promotion",
  poster: "Poster",
  social: "Social",
  presentation: "Presentation",
  "company-profile": "Company profile",
  "proposal-template": "Proposal template",
  "quotation-template": "Quotation template",
  "concept-template": "Concept template",
  "photography-portfolio": "Photography portfolio",
  "video-showreel": "Video showreel",
  "venue-profile": "Venue profile",
  forms: "Forms",
  "media-plan-template": "Media plan template",
  "brand-portfolio": "Brand portfolio",
  "rate-card": "Rate card",
  "case-study-collection": "Case study collection",
  "capability-statement": "Capability statement",
  "project-portfolio": "Project portfolio",
  "discovery-template": "Discovery template",
  "feasibility-template": "Feasibility template",
  "scope-template": "Scope template",
  "plan-template": "Plan template",
  "comparison-template": "Comparison template",
  "partnership-template": "Partnership template",
  "commercial-model-template": "Commercial model template",
  "report-template": "Report template",
  "diagnostic-template": "Diagnostic template",
  "strategy-template": "Strategy template",
  "business-plan-template": "Business plan template",
  "operating-model-template": "Operating model template",
  "org-structure-template": "Organizational structure template",
  "roles-template": "Roles template",
  "process-mapping-template": "Process mapping template",
  "sop-template": "SOP template",
  "kpi-template": "KPI template",
  "reporting-template": "Reporting template",
  "transformation-template": "Transformation template",
  "workshop-template": "Workshop template",
  "platform-portfolio": "Platform portfolio",
  "platform-profile": "Platform profile",
  "onboarding-pack": "Onboarding pack",
  "supplier-pack": "Supplier pack",
  "listing-template": "Listing template",
  "commercial-terms": "Commercial terms",
  "campaign-calendar": "Campaign calendar",
  "photography-guide": "Photography guide",
  screenshot: "Screenshot",
  "website-portfolio": "Website portfolio",
  "application-portfolio": "Application portfolio",
  "pricing-guide": "Pricing guide",
  "maintenance-plan": "Maintenance plan",
  "architecture-template": "Architecture template",
  "integration-register": "Integration register",
  "ai-brief": "AI brief",
  "coach-profile-pack": "Coach profile pack",
  "program-schedule": "Program schedule",
  "participant-pack": "Participant pack",
  "trainer-profile-pack": "Trainer profile pack",
  "program-outline": "Program outline",
  "learning-materials-template": "Learning materials template",
  "feedback-form": "Feedback form",
  "rate-request": "Rate request",
  "job-sheet": "Job sheet",
  "proof-of-delivery": "Proof of delivery",
  "tracking-update": "Tracking update",
  "distribution-plan": "Distribution plan",
  "capacity-sheet": "Capacity sheet",
  "agreement-template": "Agreement template",
  "goods-receipt": "Goods receipt",
  "stock-report": "Stock report",
  "release-order": "Release order",
  "group-overview": "Group overview",
  "company-directory": "Company directory",
  "brand-architecture": "Brand architecture",
  "capability-matrix": "Capability matrix",
  "website-content": "Website content",
  "media-kit": "Media kit",
  "management-profile": "Management profile",
  "factsheet": "Factsheet",
};

export const contentStatusLabels: Record<ContentStatus, string> = {
  draft: "Draft",
  "under-review": "Under review",
  approved: "Approved",
  published: "Published",
};

export const serviceStatusLabels: Record<ServiceStatus, string> = {
  active: "Active",
  supporting: "Supporting",
  future: "Future",
  inactive: "Inactive",
};
