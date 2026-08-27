import type {
  CompanyService,
  DivisionProfile,
  ServiceGroup,
} from "@/lib/division-profiles";

const quoted = "Quoted according to project scope.";

function offer(
  name: string,
  description: string,
  deliverable: string,
  displayOrder: number,
): CompanyService {
  return {
    name,
    description,
    deliverable,
    pricingMethod: quoted,
    displayOrder,
    includeInPdf: true,
    status: "active",
  };
}

function group(
  name: string,
  displayOrder: number,
  services: CompanyService[],
): ServiceGroup {
  return { name, displayOrder, services };
}

function file<T extends string>(id: string, type: T, title: string, description: string) {
  return { id, type, title, description, dateAdded: "2026-08-26" };
}

export const professionalServicesProfile: DivisionProfile = {
  companyId: "professional-services",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Customized Projects & Professional Solutions",
    email: "info@zoombahrain.co",
    phone: "+973 3881 6222",
    mainMarket: "Bahrain",
    customerType: "B2B, B2G and selected partnership projects",
    contacts: [],
    social: [],
  },
  public: {
    snapshot: {
      customer:
        "Businesses, government entities, institutions, investors and organizations with specialized or non-standard project requirements.",
      problem:
        "Some requirements do not fit a standard service package and require research, planning, specialist knowledge, supplier coordination and customized delivery.",
      offer:
        "Customized professional assignments and project solutions developed around the client's specific objective.",
      value:
        "One project partner to define the requirement, assess feasibility, assemble the required capabilities and coordinate delivery.",
      pricing:
        "Discovery fees, fixed project fees, milestone payments, professional fees, coordination fees, retainers or custom quotations.",
      delivery:
        "Requirement, discovery, feasibility, solution design, proposal, team assembly, delivery and close-out.",
      keyProof: {
        value: "",
        placeholder: "No approved project selected for public use yet.",
        needsInput: true,
      },
      zoomSupport: "All Zoom companies may contribute according to the requirements of the project.",
    },
    positioning: {
      overview:
        "Zoom Professional Services develops and coordinates customized projects for organizations whose requirements do not fit a standard service package. We define the problem, structure the assignment, identify the required expertise and manage the work through an appropriate combination of Zoom companies, specialists, partners and suppliers.",
      purpose:
        "To give clients a practical way to move unusual, complex or undefined requirements from an initial idea into a structured and deliverable project.",
      roleWithinZoom:
        "Zoom Professional Services acts as the custom-project and specialist-solutions company within Zoom Group. It connects client requirements with the appropriate internal companies, professional expertise and external delivery resources.",
      positioningStatement:
        "A flexible project-development and coordination partner for specialized business requirements.",
      customerPromise:
        "Bring us the requirement. We will define the path, assemble the right capability and coordinate delivery.",
    },
    segments: [
      {
        name: "Businesses with non-standard requirements",
        description:
          "Companies facing a specific operational, commercial or technical requirement that does not fit a normal service package.",
        mainNeed: "A structured solution designed around the actual requirement.",
        desiredOutcome:
          "A clear project scope with defined deliverables, responsibilities and commercial terms.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Government and public organizations",
        description:
          "Government entities and institutions requiring specialized projects, research, coordination or multi-party delivery.",
        mainNeed: "Structured project development and accountable coordination.",
        desiredOutcome:
          "A professionally managed assignment supported by the required expertise and documentation.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Investors and project owners",
        description:
          "Individuals or organizations evaluating a business opportunity, partnership, new service or project.",
        mainNeed:
          "Clear assessment of whether the opportunity is practical, deliverable and commercially sensible.",
        desiredOutcome:
          "A decision-ready project direction supported by research, costs, risks and delivery requirements.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Companies entering or expanding in Bahrain",
        description:
          "Organizations requiring local research, supplier identification, project setup or coordinated operational support.",
        mainNeed: "A reliable local company able to structure and move the requirement forward.",
        desiredOutcome: "A defined local project with identified resources, responsibilities and next steps.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Organizations requiring multiple specialists",
        description:
          "Clients whose project requires expertise from several professional fields or suppliers.",
        mainNeed: "One accountable party to organize the specialists and keep the project connected.",
        desiredOutcome: "Coordinated delivery without the client independently managing every contributor.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "Partners with commercial opportunities",
        description:
          "Companies, professionals and suppliers seeking to develop a joint project or bring a specialist solution to the Bahrain market.",
        mainNeed: "Local project development, commercial structuring and coordinated market execution.",
        desiredOutcome: "A clear partnership model and practical route to market.",
        includeInPdf: true,
        displayOrder: 6,
      },
    ],
    needs: [
      {
        need: "Defining an unclear requirement",
        outcome: "A clear problem statement, objective, scope and expected result.",
        displayOrder: 1,
      },
      {
        need: "Testing whether an idea is practical",
        outcome:
          "A feasibility assessment covering demand, cost, capability, risks and delivery requirements.",
        displayOrder: 2,
      },
      {
        need: "Finding the right expertise",
        outcome: "An identified combination of internal companies, specialists, partners and suppliers.",
        displayOrder: 3,
      },
      {
        need: "Coordinating multiple contributors",
        outcome: "One project structure connecting responsibilities, timelines and deliverables.",
        displayOrder: 4,
      },
      {
        need: "Turning an idea into a commercial project",
        outcome: "A defined business model, commercial structure and implementation approach.",
        displayOrder: 5,
      },
      {
        need: "Managing a specialized assignment",
        outcome: "Controlled delivery, progress visibility and documented completion.",
        displayOrder: 6,
      },
    ],
    serviceSection: {
      title: "How we build custom solutions",
      description:
        "Zoom Professional Services is not presented as a fixed catalogue of unrelated services. Each engagement is built around the client's requirement.",
    },
    serviceGroups: [
      group("How we build custom solutions", 1, [
        offer(
          "Project Discovery & Definition",
          "We examine the requirement, intended outcome, stakeholders, timeline, available budget and known constraints.",
          "Project definition and discovery summary.",
          1,
        ),
        offer(
          "Research & Feasibility",
          "We assess whether the requirement is commercially, operationally and practically achievable.",
          "Feasibility assessment with findings, risks and recommendations.",
          2,
        ),
        offer(
          "Solution Design",
          "We define the delivery approach, required capabilities, project stages, responsibilities and expected outputs.",
          "Structured project solution and delivery model.",
          3,
        ),
        offer(
          "Specialist & Partner Assembly",
          "We identify and coordinate the Zoom companies, professional specialists, partners and suppliers required for the assignment.",
          "Confirmed project-delivery structure.",
          4,
        ),
        offer(
          "Commercial Structuring",
          "We calculate the expected costs, supplier requirements, professional fees, commercial model and client price.",
          "Commercial structure and quotation.",
          5,
        ),
        offer(
          "Project Coordination",
          "We manage timelines, responsibilities, communication, suppliers, deliverables and project decisions.",
          "Coordinated project execution.",
          6,
        ),
        offer(
          "Documentation & Reporting",
          "We prepare the necessary project documents, records, updates and completion information.",
          "Organized project documentation and final report.",
          7,
        ),
        offer(
          "Implementation Support",
          "Where required, we remain involved during implementation to ensure that the approved solution is properly delivered.",
          "Managed implementation support based on the agreed scope.",
          8,
        ),
      ]),
    ],
    projectPortfolio: {
      intro:
        "This section will become the main proof of what Zoom Professional Services can do. Each approved project should be displayed using the same structure.",
      structure: [
        {
          name: "Client requirement",
          description: "What did the client need?",
          displayOrder: 1,
        },
        {
          name: "Challenge",
          description: "Why did the requirement need a customized approach?",
          displayOrder: 2,
        },
        {
          name: "Zoom solution",
          description: "How did Zoom structure the project?",
          displayOrder: 3,
        },
        {
          name: "Capabilities involved",
          description: "Which Zoom companies, specialists, partners or suppliers participated?",
          displayOrder: 4,
        },
        {
          name: "Deliverables",
          description: "What exactly did the client receive?",
          displayOrder: 5,
        },
        {
          name: "Result",
          description: "What was completed, improved, launched, supplied or resolved?",
          displayOrder: 6,
        },
        {
          name: "Evidence",
          description:
            "Project documents, photographs, approvals, client feedback or measurable outcomes.",
          displayOrder: 7,
        },
      ],
      emptyPrompt: {
        value: "",
        placeholder: "Do not publish a project until its information and evidence have been approved.",
        needsInput: true,
      },
    },
    projectCategories: [
      {
        name: "Business & commercial projects",
        description:
          "Customized assignments connected to commercial opportunities, business operations, partnerships and market activity.",
        displayOrder: 1,
      },
      {
        name: "Specialist professional assignments",
        description:
          "Projects requiring specific professional knowledge, research, documentation or technical coordination.",
        displayOrder: 2,
      },
      {
        name: "Research & feasibility projects",
        description:
          "Assessments used to determine whether a business idea, service, investment or expansion should move forward.",
        displayOrder: 3,
      },
      {
        name: "Operational projects",
        description:
          "Customized solutions involving workflows, suppliers, resources, facilities or operational delivery.",
        displayOrder: 4,
      },
      {
        name: "Partnership projects",
        description:
          "Projects developed jointly with external companies, specialists, investors or service providers.",
        displayOrder: 5,
      },
      {
        name: "Multi-company Zoom solutions",
        description:
          "Assignments that require two or more Zoom companies to work together under one coordinated project.",
        displayOrder: 6,
      },
      {
        name: "Procurement & supplier projects",
        description:
          "Projects requiring supplier research, quotation comparison, product sourcing, production or managed external delivery.",
        displayOrder: 7,
      },
      {
        name: "Market entry & local support projects",
        description:
          "Customized support for organizations entering Bahrain or establishing a local commercial presence.",
        displayOrder: 8,
      },
    ],
    whyZoom: [
      "We begin with the requirement rather than forcing the client into a standard package.",
      "We can combine multiple Zoom companies within one coordinated project.",
      "We can assemble external specialists and suppliers when the project requires them.",
      "We structure the commercial and operational model before delivery begins.",
      "The client works through one project contact with clear responsibilities and deliverables.",
    ],
    workflow: [
      {
        name: "Initial Requirement",
        explanation: "The client explains the challenge, idea, objective or required result.",
        displayOrder: 1,
      },
      {
        name: "Discovery",
        explanation:
          "We collect the information required to understand the project, stakeholders, timeline, budget and constraints.",
        displayOrder: 2,
      },
      {
        name: "Feasibility Review",
        explanation:
          "We assess whether the project is achievable and identify the required capabilities, costs and risks.",
        displayOrder: 3,
      },
      {
        name: "Project Definition",
        explanation:
          "We convert the requirement into a clear scope, delivery model, responsibilities and expected outputs.",
        displayOrder: 4,
      },
      {
        name: "Proposal & Commercial Structure",
        explanation:
          "We present the recommended solution, project stages, commercial terms and required decisions.",
        displayOrder: 5,
      },
      {
        name: "Capability Assembly",
        explanation:
          "We confirm the Zoom companies, specialists, partners and suppliers required for delivery.",
        displayOrder: 6,
      },
      {
        name: "Project Execution",
        explanation: "We coordinate the approved work, contributors, timelines and deliverables.",
        displayOrder: 7,
      },
      {
        name: "Progress Control",
        explanation:
          "We monitor delivery, manage changes and keep the client informed of important developments.",
        displayOrder: 8,
      },
      {
        name: "Completion & Close-Out",
        explanation:
          "We confirm the completed deliverables, organize project records and identify any follow-up work.",
        displayOrder: 9,
      },
    ],
    capabilityRelationship: {
      title: "Relationship with other Zoom companies",
      leadsTitle: "Zoom Professional Services leads",
      leads: [
        "Customized projects",
        "Multi-company assignments",
        "Specialist professional requirements",
        "Feasibility-based projects",
        "Partner-developed opportunities",
        "Projects that do not fit one standard Zoom service",
      ],
      deliversTitle: "Other Zoom companies deliver",
      note: "Zoom Professional Services coordinates the complete project where several of these capabilities are required together.",
    },
    connectedCapabilities: [
      { company: "Zoom Real Estate", description: "Real estate work through Zoom Real Estate." },
      { company: "Zoom Events", description: "Events through Zoom Events." },
      { company: "Zoom Advertising", description: "Advertising through Zoom Advertising." },
      {
        company: "Zoom Business Consultancy",
        description: "Business advisory through Zoom Business Consultancy.",
      },
      { company: "Zoom E-Commerce", description: "Online retail through Zoom E-Commerce." },
      {
        company: "Zoom Software Solutions",
        description: "Websites and applications through Zoom Software Solutions.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Digitalization, automation and AI through Zoom Technology Solutions.",
      },
      { company: "Zoom Sports", description: "Sports programmes through Zoom Sports." },
      {
        company: "Zoom Education & Training",
        description: "Learning programmes through Zoom Education & Training.",
      },
      { company: "Zoom Logistics", description: "Cargo operations through Zoom Logistics." },
      { company: "Zoom Warehousing", description: "Storage solutions through Zoom Warehousing." },
    ],
    cta: {
      headline: "Discuss Your Project Requirement",
      supportingSentence:
        "Tell us what you are trying to achieve, what challenge you are facing and what result you need. Zoom Professional Services will review the requirement and determine how the project can be structured.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [
      "The requirement does not fit a standard supplier category",
      "The client has an idea but no defined scope",
      "Several specialists or companies are required",
      "The client does not know whether the project is feasible",
      "Internal teams do not have the time or expertise to structure the work",
      "Suppliers provide disconnected quotations without one complete solution",
      "Responsibilities and deliverables are unclear",
      "The project has no commercial or operational model",
      "A local Bahrain partner is required",
      "The client needs one party to coordinate the complete assignment",
      "The opportunity requires research before management can decide",
      "A partnership exists but the delivery model has not been defined",
    ],
    buyingTriggers: [
      "Management identifies a problem without an existing solution",
      "A new business or project idea is proposed",
      "A company needs specialized support outside its normal operations",
      "An investor needs a feasibility assessment",
      "An international company requires local project support",
      "Several suppliers must be coordinated",
      "A partnership or commercial opportunity is introduced",
      "A project has stalled because responsibilities are unclear",
      "A client wants one company to manage a multi-service requirement",
      "An internal team lacks the time or resources to execute the project",
    ],
    alternatives: [
      "Management consulting companies",
      "Independent consultants",
      "Specialist professional firms",
      "Project-management companies",
      "Freelancers",
      "Procurement companies",
      "Direct supplier coordination",
      "Internal project teams",
      "Business-development agencies",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Initial discovery fee",
      "Research or feasibility fee",
      "Fixed project fee",
      "Milestone-based payments",
      "Professional consulting fee",
      "Hourly or daily rate",
      "Monthly retainer",
      "Project-management fee",
      "Coordination fee",
      "Supplier markup",
      "Commission",
      "Success fee where appropriate",
      "Partnership revenue share",
      "Custom quotation",
    ],
    revenueModels: [
      "Discovery and feasibility fees",
      "Professional project fees",
      "Project-management fees",
      "Specialist-service margins",
      "Supplier and subcontractor margins",
      "Coordination fees",
      "Monthly retainers",
      "Commercial commissions",
      "Partnership income",
      "Success-based fees",
      "Revenue share",
      "Cross-selling through other Zoom companies",
    ],
    projectQualification: {
      intro: "Every opportunity must be reviewed before Zoom accepts it.",
      criteria: [
        {
          name: "Client",
          question: "Is the customer, decision-maker and paying party clear?",
        },
        {
          name: "Requirement",
          question: "Can the problem and desired outcome be clearly defined?",
        },
        {
          name: "Capability",
          question: "Can Zoom assemble the required internal or external capability?",
        },
        {
          name: "Commercial value",
          question: "Can the project generate an acceptable return for the time, cost and risk involved?",
        },
        {
          name: "Delivery",
          question: "Can responsibilities, timelines and deliverables be controlled?",
        },
        {
          name: "Risk",
          question: "Are the financial, operational and reputation risks acceptable?",
        },
        {
          name: "Strategic value",
          question:
            "Can the project create repeat work, partnerships, knowledge or opportunities for other Zoom companies?",
        },
      ],
      decisionsTitle: "Decision",
      decisions: [
        "Proceed",
        "Proceed With Conditions",
        "Further Research Required",
        "Partner-Led",
        "Refer to Another Zoom Company",
        "Do Not Proceed",
      ],
    },
    projectStatuses: [
      "1. Opportunity",
      "2. Discovery",
      "3. Feasibility",
      "4. Solution Design",
      "5. Proposed",
      "6. Approved",
      "7. Active",
      "8. Completed",
      "9. On Hold",
      "10. Rejected",
    ],
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
      placeholder:
        "Record confirmed capability gaps for each proposed project. Do not use generic or assumed gaps.",
      needsInput: true,
    },
    serviceOwnership: {
      note: "This prevents Zoom Professional Services from duplicating every service offered elsewhere in the Group.",
      groups: [
        {
          title: "Zoom Professional Services",
          items: [
            "Structures and coordinates customized projects and specialist assignments.",
          ],
        },
        {
          title: "Zoom Business Consultancy",
          items: [
            "Advises businesses on strategy, management, operations and organizational improvement.",
          ],
        },
        {
          title: "Other Zoom companies",
          items: [
            "Deliver their specialized services when those capabilities form part of the project.",
          ],
        },
      ],
    },
    supportedBy: [
      {
        company: "All Zoom companies",
        description: "Potentially supported by all Zoom companies according to the project requirement.",
      },
    ],
    supports: [
      {
        company: "Any Zoom company",
        description: "Can generate, coordinate or manage opportunities involving any Zoom company.",
      },
    ],
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep inactive, experimental or unsupported professional-services work here. Do not place it in the public profile until management approves it.",
      needsInput: true,
    },
    serviceRatingsTitle: "Internal project ratings",
    serviceRatings: {
      value: "",
      placeholder:
        "Assess each project against demand, profit potential, ability to deliver, strategic value, supplier dependency, delivery complexity, financial risk and reputation risk.",
      needsInput: true,
    },
  },
  proof: [
    file(
      "prs-project-1",
      "project",
      "Completed Custom Project",
      "A delivered custom project with outcome on file.",
    ),
    file("prs-client-1", "closed-client", "Closed Client", "A finished professional-services client from the ERP."),
    file(
      "prs-testimonial-1",
      "testimonial",
      "Client Testimonial",
      "Completed project feedback approved for use.",
    ),
    file(
      "prs-case-1",
      "case-study",
      "Project Case Study",
      "A closed project case for internal use, then public use once approved.",
    ),
    file(
      "prs-feasibility-1",
      "feasibility-study",
      "Feasibility Study",
      "A completed feasibility study stored in ERP.",
    ),
    file("prs-scope-1", "scope", "Approved Project Scope", "Approved scope document stored in ERP."),
    file("prs-plan-1", "project-plan", "Project Plan", "Approved project plan stored in ERP."),
    file(
      "prs-commercial-1",
      "commercial-model",
      "Commercial Model",
      "Approved commercial model stored in ERP.",
    ),
    file(
      "prs-partner-1",
      "partner-record",
      "Specialist or Partner Record",
      "Specialist or partner record stored in ERP.",
    ),
    file(
      "prs-supplier-1",
      "supplier-comparison",
      "Supplier Comparison",
      "Supplier comparison record stored in ERP.",
    ),
    file(
      "prs-deliverable-1",
      "final-deliverable",
      "Final Deliverable",
      "Final project deliverable stored in ERP.",
    ),
    file(
      "prs-report-1",
      "report",
      "Completion Report",
      "Close-out report from a completed project.",
    ),
    file(
      "prs-photo-1",
      "photograph",
      "Project Photographs",
      "Photographs from a completed project, stored in ERP.",
    ),
    file(
      "prs-outcome-1",
      "outcome-record",
      "Measurable Outcome Record",
      "Measurable outcome record stored in ERP.",
    ),
  ],
  assets: [
    file(
      "prs-profile-1",
      "company-profile",
      "Zoom Professional Services Company Profile",
      "Ready-to-send Zoom Professional Services company profile.",
    ),
    file(
      "prs-capability-1",
      "capability-statement",
      "Professional Services Capability Statement",
      "Capability statement ready to send.",
    ),
    file(
      "prs-portfolio-1",
      "project-portfolio",
      "Custom Project Portfolio",
      "Approved custom-project portfolio ready to send.",
    ),
    file(
      "prs-concept-1",
      "concept-template",
      "Project Concept Note Template",
      "Template for project concept notes.",
    ),
    file(
      "prs-discovery-1",
      "discovery-template",
      "Discovery Brief Template",
      "Template for discovery briefs.",
    ),
    file(
      "prs-feasibility-1",
      "feasibility-template",
      "Feasibility Study Template",
      "Template for feasibility studies.",
    ),
    file(
      "prs-proposal-1",
      "proposal-template",
      "Project Proposal Template",
      "Template for project proposals.",
    ),
    file(
      "prs-quotation-1",
      "quotation-template",
      "Project Quotation Template",
      "Template for project quotations.",
    ),
    file("prs-scope-1", "scope-template", "Project Scope Template", "Template for project scopes."),
    file("prs-plan-1", "plan-template", "Project Plan Template", "Template for project plans."),
    file(
      "prs-comparison-1",
      "comparison-template",
      "Supplier Comparison Template",
      "Template for supplier comparisons.",
    ),
    file(
      "prs-partnership-1",
      "partnership-template",
      "Partnership Proposal Template",
      "Template for partnership proposals.",
    ),
    file(
      "prs-commercial-1",
      "commercial-model-template",
      "Commercial Model Template",
      "Template for commercial models.",
    ),
    file(
      "prs-presentation-1",
      "presentation",
      "Project Presentation",
      "Pitch deck for project meetings.",
    ),
    file(
      "prs-cases-1",
      "case-study-collection",
      "Case Study Collection",
      "Collection of approved project case studies.",
    ),
    file(
      "prs-completion-1",
      "report-template",
      "Completion Report Template",
      "Template for project completion reports.",
    ),
  ],
};
