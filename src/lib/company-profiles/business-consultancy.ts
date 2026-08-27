import type {
  CompanyService,
  DivisionProfile,
  ServiceGroup,
} from "@/lib/division-profiles";

const quoted = "Quoted according to consultancy scope.";

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
  note?: string,
): ServiceGroup {
  return { name, displayOrder, services, note };
}

function file<T extends string>(id: string, type: T, title: string, description: string) {
  return { id, type, title, description, dateAdded: "2026-08-26" };
}

export const businessConsultancyProfile: DivisionProfile = {
  companyId: "business-consultancy",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Strategy, Operations & Management Improvement",
    email: "info@zoombahrain.co",
    phone: "+973 3881 6222",
    mainMarket: "Bahrain",
    customerType: "B2B and B2G",
    contacts: [],
    social: [],
  },
  public: {
    snapshot: {
      customer:
        "Business owners, leadership teams, growing companies, established organizations, institutions and government entities.",
      problem:
        "Organizations often struggle with unclear strategy, overlapping responsibilities, inefficient processes, weak performance controls and plans that are not translated into action.",
      offer:
        "Business strategy, organizational planning, operational improvement, management systems, performance frameworks and implementation support.",
      value:
        "Clear business direction supported by practical structures, processes, responsibilities and measurable actions.",
      pricing:
        "Diagnostic fees, fixed project fees, workshop fees, monthly retainers, milestone payments or custom quotations.",
      delivery:
        "Business brief, diagnostic review, findings, recommendations, improvement plan, implementation support and performance review.",
      keyProof: {
        value: "",
        placeholder: "No approved consultancy project selected for public use yet.",
        needsInput: true,
      },
      zoomSupport:
        "Zoom Professional Services, Software Solutions, Technology Solutions, Advertising and Education & Training.",
    },
    positioning: {
      overview:
        "Zoom Business Consultancy helps organizations improve how they plan, organize, manage and grow. We assess the current business situation, identify the issues affecting performance and develop practical structures, processes and management tools to move the organization forward.",
      purpose:
        "To help management turn business challenges into clear decisions, organized systems and practical improvement plans.",
      roleWithinZoom:
        "Zoom Business Consultancy provides the strategic and management direction that may later be implemented through other Zoom companies or the client's internal team.",
      positioningStatement:
        "A practical business advisory company focused on strategy, management structure, operational improvement and implementation.",
      customerPromise: "Clear diagnosis. Practical direction. Structured improvement.",
    },
    segments: [
      {
        name: "Business owners and leadership teams",
        description:
          "Owners and senior managers who need clearer business direction, stronger control and better decision-making.",
        mainNeed: "An objective assessment of the business and a practical plan for improvement.",
        desiredOutcome: "Clear priorities, responsibilities and management actions.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Small and medium-sized businesses",
        description:
          "Companies that have grown without formal systems, defined roles or consistent operating processes.",
        mainNeed: "Structure that supports growth without creating unnecessary complexity.",
        desiredOutcome: "Better organization, clearer workflows and stronger management control.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Growing and expanding companies",
        description:
          "Businesses introducing new services, entering new markets or increasing their operational capacity.",
        mainNeed: "A structured plan for growth, resources, processes and responsibilities.",
        desiredOutcome: "Expansion supported by a practical operating model.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Established organizations requiring improvement",
        description:
          "Organizations experiencing inefficiency, cost pressure, unclear accountability or inconsistent performance.",
        mainNeed: "Identification of the causes affecting productivity and performance.",
        desiredOutcome: "Improved processes, stronger controls and measurable performance expectations.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Government entities and institutions",
        description:
          "Public organizations and institutions requiring management studies, organizational improvement or operational planning.",
        mainNeed: "Structured analysis supported by clear recommendations and implementation requirements.",
        desiredOutcome: "Better organizational performance and clearer management systems.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "New ventures and business initiatives",
        description:
          "Owners and investors preparing a new business, service or commercial direction.",
        mainNeed: "A clear business model, operating structure and practical execution plan.",
        desiredOutcome: "A decision-ready business plan with defined priorities and requirements.",
        includeInPdf: true,
        displayOrder: 6,
      },
    ],
    needs: [
      {
        need: "Clear business direction",
        outcome: "Defined priorities, objectives and a practical route forward.",
        displayOrder: 1,
      },
      {
        need: "Better organizational structure",
        outcome: "Clear roles, responsibilities, reporting relationships and decision ownership.",
        displayOrder: 2,
      },
      {
        need: "More efficient operations",
        outcome: "Simplified workflows, reduced duplication and better use of resources.",
        displayOrder: 3,
      },
      {
        need: "Stronger management control",
        outcome: "Practical KPIs, reporting systems, review routines and accountability.",
        displayOrder: 4,
      },
      {
        need: "Better cost and productivity management",
        outcome: "Clearer cost-control procedures, resource planning and performance expectations.",
        displayOrder: 5,
      },
      {
        need: "Structured growth",
        outcome: "A growth plan supported by operational capacity, responsibilities and commercial priorities.",
        displayOrder: 6,
      },
      {
        need: "Implementation support",
        outcome: "Recommendations translated into actions, owners, deadlines and measurable follow-up.",
        displayOrder: 7,
      },
    ],
    serviceGroups: [
      group("Strategy & Business Planning", 1, [
        offer(
          "Corporate Strategy",
          "Development of the organization's priorities, direction and strategic objectives.",
          "Corporate strategy with defined priorities and actions.",
          1,
        ),
        offer(
          "Business Planning",
          "Preparation of a structured plan covering the business model, market direction, operations, resources and commercial objectives.",
          "Practical business plan.",
          2,
        ),
        offer(
          "Growth Strategy",
          "Identification of opportunities for increasing revenue, expanding services, entering markets or strengthening existing operations.",
          "Growth strategy and action plan.",
          3,
        ),
        offer(
          "Business Model Review",
          "Assessment of how the organization creates, delivers and earns value.",
          "Business-model assessment with recommended improvements.",
          4,
        ),
        offer(
          "Market Entry & Expansion Planning",
          "Planning for companies entering Bahrain, expanding locally or developing a new business area.",
          "Market-entry or expansion plan.",
          5,
        ),
      ]),
      group("Organization & Management Structure", 2, [
        offer(
          "Organizational Structure Design",
          "Design or improvement of departments, reporting lines and management relationships.",
          "Approved organizational structure.",
          1,
        ),
        offer(
          "Roles & Responsibilities",
          "Definition of responsibilities, decision ownership and accountability across the organization.",
          "Role and responsibility framework.",
          2,
        ),
        offer(
          "Operating Model Development",
          "Definition of how people, processes, systems and management should work together.",
          "Target operating model.",
          3,
        ),
        offer(
          "Management Structure Review",
          "Assessment of the current management arrangement and its effect on decision-making and delivery.",
          "Management-structure findings and recommendations.",
          4,
        ),
        offer(
          "Governance Process Development",
          "Creation of practical management, approval, review and reporting processes.",
          "Internal governance and decision framework.",
          5,
        ),
      ]),
      group("Operations & Process Improvement", 3, [
        offer(
          "Business Process Review",
          "Assessment of how work currently moves across teams and departments.",
          "Current-process findings and improvement opportunities.",
          1,
        ),
        offer(
          "Process Improvement",
          "Redesign of workflows to reduce delays, duplication, errors and unnecessary steps.",
          "Improved process design.",
          2,
        ),
        offer(
          "Standard Operating Procedures",
          "Development of clear procedures for recurring business activities.",
          "Approved SOP documents.",
          3,
        ),
        offer(
          "Workflow Design",
          "Definition of task movement, responsibilities, approvals and handovers.",
          "Structured workflow.",
          4,
        ),
        offer(
          "Operational Efficiency Review",
          "Assessment of resources, activities, bottlenecks and performance issues.",
          "Efficiency assessment and improvement plan.",
          5,
        ),
        offer(
          "Production & Service Delivery Planning",
          "Improvement of scheduling, resource coordination, quality control and delivery processes.",
          "Production or service-delivery framework.",
          6,
        ),
      ]),
      group("Performance & Management Systems", 4, [
        offer(
          "KPI Framework Development",
          "Definition of practical performance indicators aligned with business priorities.",
          "KPI framework with ownership and measurement rules.",
          1,
        ),
        offer(
          "Performance Management Framework",
          "Creation of a structured process for setting expectations, reviewing performance and managing improvement.",
          "Performance-management system.",
          2,
        ),
        offer(
          "Management Reporting Structure",
          "Design of reports that give management the information needed to make decisions.",
          "Management-reporting framework.",
          3,
        ),
        offer(
          "Management Information Framework",
          "Definition of what information should be collected, reviewed and acted upon.",
          "Management-information structure.",
          4,
        ),
        offer(
          "Management Review System",
          "Creation of meeting routines, reporting cycles, action tracking and follow-up processes.",
          "Management-review and accountability system.",
          5,
        ),
        offer(
          "Decision-Support Framework",
          "Development of criteria, information and approval processes supporting important business decisions.",
          "Decision-support structure.",
          6,
        ),
      ]),
      group(
        "People & Workforce Planning",
        5,
        [
          offer(
            "Workforce Planning",
            "Assessment of the roles, staffing levels and capabilities required by the business.",
            "Workforce requirement plan.",
            1,
          ),
          offer(
            "HR Policy Development",
            "Development of practical employee policies aligned with the organization's operating needs.",
            "HR policy framework.",
            2,
          ),
          offer(
            "Role Planning",
            "Definition of job purpose, responsibilities, reporting lines and performance expectations.",
            "Role descriptions and responsibility structure.",
            3,
          ),
          offer(
            "Capability & Training Needs Review",
            "Identification of the skills and knowledge required to support the business strategy.",
            "Capability-gap and training-needs assessment.",
            4,
          ),
          offer(
            "Organizational Performance Alignment",
            "Connection of employee responsibilities and measures with the organization's objectives.",
            "Employee-to-business performance framework.",
            5,
          ),
        ],
        "Zoom Business Consultancy designs workforce and management structures. Recruitment, payroll processing and manpower supply are not presented as consultancy services.",
      ),
      group(
        "Financial Management Procedures",
        6,
        [
          offer(
            "Budgetary Control Procedures",
            "Design of management procedures for preparing, monitoring and reviewing budgets.",
            "Budget-control procedure.",
            1,
          ),
          offer(
            "Cost-Control Procedures",
            "Development of methods for tracking, reviewing and controlling operational costs.",
            "Cost-control framework.",
            2,
          ),
          offer(
            "Management Accounting Procedures",
            "Design of internal methods for organizing management information related to cost, performance and decision-making.",
            "Management accounting procedure framework.",
            3,
          ),
          offer(
            "Pricing & Margin Review",
            "Assessment of how services or products are costed, priced and reviewed commercially.",
            "Pricing and margin framework.",
            4,
          ),
          offer(
            "Financial Performance Reporting",
            "Design of management-level reporting structures connecting financial information with operational performance.",
            "Financial performance reporting structure.",
            5,
          ),
        ],
        "This service focuses on management procedures and internal decision support. It does not replace accounting, bookkeeping, auditing or tax services.",
      ),
      group(
        "Marketing, Sales & Growth Advisory",
        7,
        [
          offer(
            "Marketing Objectives & Policy",
            "Definition of the organization's marketing objectives, priorities and management direction.",
            "Marketing objective and policy framework.",
            1,
          ),
          offer(
            "Market Positioning",
            "Clarification of the organization's target market, commercial position and customer value.",
            "Market-positioning statement and direction.",
            2,
          ),
          offer(
            "Go-to-Market Planning",
            "Development of the route for introducing a product, service or business into the market.",
            "Go-to-market plan.",
            3,
          ),
          offer(
            "Sales Process Review",
            "Assessment and improvement of lead management, qualification, proposals, follow-up and conversion.",
            "Improved sales process.",
            4,
          ),
          offer(
            "Customer Journey Design",
            "Definition of how customers move from awareness and enquiry through purchase, delivery and follow-up.",
            "Customer-journey framework.",
            5,
          ),
          offer(
            "Communication Strategy",
            "Development of the management direction for corporate, customer and stakeholder communication.",
            "Communication strategy.",
            6,
          ),
        ],
        "Zoom Business Consultancy defines the commercial and management direction. Zoom Advertising executes advertising campaigns and promotional materials.",
      ),
      group("Transformation & Implementation Support", 8, [
        offer(
          "Business Transformation Planning",
          "Development of a structured plan for changing how the organization operates.",
          "Transformation roadmap.",
          1,
        ),
        offer(
          "Change Management Planning",
          "Preparation of communication, responsibility, training and adoption requirements for organizational change.",
          "Change-management plan.",
          2,
        ),
        offer(
          "Implementation Roadmap",
          "Conversion of approved recommendations into actions, owners, priorities and deadlines.",
          "Implementation roadmap.",
          3,
        ),
        offer(
          "Implementation Monitoring",
          "Regular review of progress, obstacles, decisions and completed actions.",
          "Progress reports and action tracking.",
          4,
        ),
        offer(
          "Management Workshops",
          "Structured working sessions used to make decisions, align teams and develop solutions.",
          "Workshop outputs, decisions and action points.",
          5,
        ),
        offer(
          "Management Implementation Support",
          "Ongoing advisory support while the organization implements approved changes.",
          "Managed implementation guidance.",
          6,
        ),
      ]),
      group("Management Studies & Assessments", 9, [
        offer(
          "Organizational Assessment",
          "Review of structure, management, roles, processes and performance.",
          "Organizational assessment report.",
          1,
        ),
        offer(
          "Operational Assessment",
          "Review of workflows, resources, productivity, controls and delivery challenges.",
          "Operational findings and recommendations.",
          2,
        ),
        offer(
          "Business Efficiency Study",
          "Analysis of areas affecting cost, speed, output and management effectiveness.",
          "Business-efficiency study.",
          3,
        ),
        offer(
          "Management Research",
          "Research supporting an organizational, operational or strategic management decision.",
          "Management research report.",
          4,
        ),
        offer(
          "Feasibility & Decision Study",
          "Assessment of a business initiative from a strategy, management and operational perspective.",
          "Decision-ready feasibility study.",
          5,
        ),
      ]),
    ],
    whyZoom: [
      "Practical recommendations connected to actions, owners and deadlines.",
      "Advice covering strategy, organization, operations and performance.",
      "Solutions designed around the organization's actual size and situation.",
      "Connected Zoom companies available for implementation where required.",
      "Support from the initial assessment through implementation and review.",
    ],
    workflow: [
      {
        name: "Management Brief",
        explanation:
          "Confirm the challenge, business objective, decision-makers and expected outcome.",
        displayOrder: 1,
      },
      {
        name: "Diagnostic Review",
        explanation:
          "Examine the relevant strategy, structure, processes, performance information and management practices.",
        displayOrder: 2,
      },
      {
        name: "Findings",
        explanation: "Identify the main causes, gaps, risks and improvement opportunities.",
        displayOrder: 3,
      },
      {
        name: "Solution Design",
        explanation:
          "Develop the recommended strategy, structure, process or management framework.",
        displayOrder: 4,
      },
      {
        name: "Management Review",
        explanation:
          "Present the recommendations, discuss practical implications and agree on the direction.",
        displayOrder: 5,
      },
      {
        name: "Implementation Plan",
        explanation:
          "Convert the approved recommendations into actions, responsibilities, priorities and deadlines.",
        displayOrder: 6,
      },
      {
        name: "Implementation Support",
        explanation: "Support management and employees while the approved changes are introduced.",
        displayOrder: 7,
      },
      {
        name: "Performance Review",
        explanation:
          "Measure progress, resolve remaining issues and refine the approach where required.",
        displayOrder: 8,
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Professional Services",
        description:
          "Customized project development, specialist assignments and multi-company project coordination.",
      },
      {
        company: "Zoom Advertising",
        description: "Advertising execution, brand communication, campaigns and promotional materials.",
      },
      {
        company: "Zoom Software Solutions",
        description: "Websites, applications and management systems required to support new processes.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Digitalization, automation, AI and advanced technology implementation.",
      },
      {
        company: "Zoom Education & Training",
        description: "Workshops and skills-development programmes supporting organizational change.",
      },
      {
        company: "Other Zoom companies",
        description:
          "Real Estate, Events, E-Commerce, Sports, Logistics and Warehousing may contribute where the consultancy project involves their specialist area.",
      },
    ],
    cta: {
      headline: "Discuss Your Business Challenge",
      supportingSentence:
        "Tell us what is limiting performance, what needs to change and what result management wants to achieve. Zoom Business Consultancy will review the situation and recommend the appropriate engagement.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [
      "No clear business direction",
      "Growth has slowed or stopped",
      "Roles and responsibilities overlap",
      "Employees do not know who owns decisions",
      "Processes depend on individuals rather than systems",
      "Work is duplicated across departments",
      "Management reporting is weak or inconsistent",
      "KPIs do not reflect actual business priorities",
      "Costs are increasing without improved output",
      "Meetings do not produce clear actions",
      "Sales and marketing activities are disconnected",
      "Expansion is happening without operational preparation",
      "Policies and procedures are outdated or missing",
      "Approved plans are not implemented",
      "Digital tools are introduced without process planning",
      "Management lacks reliable information for decisions",
    ],
    buyingTriggers: [
      "Revenue or profitability declines",
      "A company prepares for growth or expansion",
      "Management changes",
      "A business introduces a new service or department",
      "Responsibilities become unclear",
      "Operational problems affect customers",
      "Costs increase",
      "Employee performance becomes inconsistent",
      "Investors or management request a business plan",
      "A digital-transformation project begins",
      "A company restructures",
      "A new market or commercial opportunity is considered",
      "Management needs SOPs, KPIs or reporting systems",
      "An existing strategy is not producing results",
    ],
    alternatives: [
      "Large consulting firms",
      "Independent management consultants",
      "Specialist boutique consultancies",
      "Internal strategy or operations teams",
      "Freelance business advisers",
      "Software implementation companies",
      "Training providers",
      "Management working without external support",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Initial diagnostic fee",
      "Fixed project fee",
      "Monthly advisory retainer",
      "Milestone-based payments",
      "Workshop fee",
      "Hourly or daily professional rate",
      "Implementation-support fee",
      "Assessment or study fee",
      "Per-document or framework fee",
      "Custom quotation",
    ],
    revenueModels: [
      "Business diagnostic fees",
      "Strategy and planning projects",
      "Organizational-design projects",
      "Process and SOP development",
      "KPI and performance-system projects",
      "Management studies",
      "Workshops",
      "Monthly advisory retainers",
      "Implementation-support fees",
      "Cross-selling implementation work to other Zoom companies",
    ],
    supplierCategoriesTitle: "Specialist support categories",
    supplierCategories: [
      "Industry specialists",
      "Market researchers",
      "Financial-modeling specialists",
      "HR and organizational specialists",
      "Process-improvement specialists",
      "Training facilitators",
      "Software implementation teams",
      "Technology specialists",
      "Advertising and market specialists",
    ],
    supplierArrangements: {
      value: "",
      placeholder: "Add approved specialist names and terms when confirmed.",
      needsInput: true,
    },
    supplierMarkups: {
      value: "",
      placeholder: "Add the agreed markup rule for coordinated specialist work only.",
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
        "Leave empty until the Consultancy team completes its operational review. Do not save example gaps as confirmed information.",
      needsInput: true,
    },
    serviceOwnership: {
      groups: [
        {
          title: "Zoom Business Consultancy owns",
          items: [
            "Strategy",
            "Business planning",
            "Organizational structure",
            "Operating models",
            "Process improvement",
            "Management systems",
            "KPI and performance frameworks",
            "Workforce planning",
            "Management procedures",
            "Growth and market advisory",
            "Transformation planning",
            "Implementation support",
            "Management studies",
          ],
        },
        {
          title: "Zoom Professional Services owns",
          items: [
            "Customized non-standard projects",
            "Specialist professional assignments",
            "Multi-company project coordination",
            "Partner-led commercial projects",
            "Bespoke project development and delivery",
          ],
        },
        {
          title: "Zoom Advertising owns",
          items: [
            "Advertising campaigns",
            "Creative production",
            "Media placement",
            "Social media execution",
            "Promotional materials",
          ],
        },
        {
          title: "Zoom Software Solutions owns",
          items: ["Websites", "Applications", "Portals", "Custom software"],
        },
        {
          title: "Zoom Technology Solutions owns",
          items: [
            "Digitalization",
            "Automation",
            "Artificial intelligence",
            "Backend systems",
            "Systems integration",
          ],
        },
        {
          title: "Zoom Education & Training owns",
          items: [
            "Training delivery",
            "Workshops sold as learning programmes",
            "Skills-development programmes",
          ],
        },
      ],
    },
    supportedBy: [
      {
        company: "Zoom Professional Services",
        description:
          "Customized project development, specialist assignments and multi-company project coordination",
      },
      {
        company: "Zoom Advertising",
        description: "Advertising execution, brand communication, campaigns and promotional materials",
      },
      {
        company: "Zoom Software Solutions",
        description: "Websites, applications and management systems required to support new processes",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Digitalization, automation, AI and advanced technology implementation",
      },
      {
        company: "Zoom Education & Training",
        description: "Workshops and skills-development programmes supporting organizational change",
      },
    ],
    supports: [
      {
        company: "Every Zoom company",
        description: "Can provide strategic and operational direction for every Zoom company.",
      },
    ],
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep unsupported, inactive or experimental consultancy services here. Do not place them in the public profile until management approves them.",
      needsInput: true,
    },
    unpromotedServiceItems: [
      "Payroll processing",
      "Recruitment",
      "Manpower supply",
      "Document clearance",
      "Accounting and bookkeeping",
      "Auditing",
      "Tax services",
      "Legal representation",
      "Advertising execution",
      "Software development",
      "General training delivery",
    ],
    serviceRatings: {
      value: "",
      placeholder:
        "Assess each service against customer demand, profit potential, ability to deliver, strategic value, required expertise, delivery complexity and implementation dependency.",
      needsInput: true,
    },
  },
  proof: [
    file(
      "bcn-project-1",
      "project",
      "Completed Consultancy Project",
      "A delivered consultancy project with outcome on file.",
    ),
    file("bcn-client-1", "closed-client", "Closed Client", "A finished consultancy client from the ERP."),
    file(
      "bcn-testimonial-1",
      "testimonial",
      "Client Testimonial",
      "Completed consultancy feedback approved for use.",
    ),
    file(
      "bcn-case-1",
      "case-study",
      "Consultancy Case Study",
      "A closed consultancy case for internal use, then public use once approved.",
    ),
    file(
      "bcn-diagnostic-1",
      "business-diagnostic",
      "Business Diagnostic",
      "A completed business diagnostic stored in ERP.",
    ),
    file(
      "bcn-strategy-1",
      "strategy-document",
      "Strategy Document",
      "An approved strategy document stored in ERP.",
    ),
    file("bcn-plan-1", "business-plan", "Business Plan", "An approved business plan stored in ERP."),
    file(
      "bcn-org-1",
      "org-structure",
      "Organizational Structure",
      "An approved organizational structure stored in ERP.",
    ),
    file(
      "bcn-process-1",
      "process-project",
      "Process Improvement Project",
      "A completed process-improvement project stored in ERP.",
    ),
    file("bcn-sop-1", "sop-collection", "SOP Collection", "Approved SOP collection stored in ERP."),
    file("bcn-kpi-1", "kpi-framework", "KPI Framework", "An approved KPI framework stored in ERP."),
    file(
      "bcn-reporting-1",
      "reporting-system",
      "Management Reporting System",
      "An approved management-reporting system stored in ERP.",
    ),
    file(
      "bcn-roadmap-1",
      "transformation-roadmap",
      "Transformation Roadmap",
      "An approved transformation roadmap stored in ERP.",
    ),
    file(
      "bcn-report-1",
      "report",
      "Implementation Report",
      "Implementation report from a completed consultancy project.",
    ),
    file(
      "bcn-result-1",
      "outcome-record",
      "Measurable Before-and-After Result",
      "Measurable before-and-after result stored in ERP.",
    ),
  ],
  assets: [
    file(
      "bcn-profile-1",
      "company-profile",
      "Zoom Business Consultancy Company Profile",
      "Ready-to-send Zoom Business Consultancy company profile.",
    ),
    file(
      "bcn-capability-1",
      "capability-statement",
      "Consultancy Capability Statement",
      "Capability statement ready to send.",
    ),
    file(
      "bcn-catalog-1",
      "catalog",
      "Consultancy Service Catalogue",
      "Catalogue of consultancy services ready to send.",
    ),
    file(
      "bcn-diagnostic-1",
      "diagnostic-template",
      "Business Diagnostic Template",
      "Template for business diagnostics.",
    ),
    file("bcn-strategy-1", "strategy-template", "Strategy Template", "Template for strategy documents."),
    file(
      "bcn-plan-1",
      "business-plan-template",
      "Business Plan Template",
      "Template for business plans.",
    ),
    file(
      "bcn-operating-1",
      "operating-model-template",
      "Operating Model Template",
      "Template for operating models.",
    ),
    file(
      "bcn-org-1",
      "org-structure-template",
      "Organizational Structure Template",
      "Template for organizational structures.",
    ),
    file(
      "bcn-roles-1",
      "roles-template",
      "Roles & Responsibilities Template",
      "Template for roles and responsibilities.",
    ),
    file(
      "bcn-process-1",
      "process-mapping-template",
      "Process Mapping Template",
      "Template for process mapping.",
    ),
    file("bcn-sop-1", "sop-template", "SOP Template", "Template for standard operating procedures."),
    file("bcn-kpi-1", "kpi-template", "KPI Framework Template", "Template for KPI frameworks."),
    file(
      "bcn-reporting-1",
      "reporting-template",
      "Management Reporting Template",
      "Template for management reporting.",
    ),
    file(
      "bcn-roadmap-1",
      "transformation-template",
      "Transformation Roadmap Template",
      "Template for transformation roadmaps.",
    ),
    file(
      "bcn-proposal-1",
      "proposal-template",
      "Consultancy Proposal Template",
      "Template for consultancy proposals.",
    ),
    file(
      "bcn-quotation-1",
      "quotation-template",
      "Consultancy Quotation Template",
      "Template for consultancy quotations.",
    ),
    file(
      "bcn-workshop-1",
      "workshop-template",
      "Management Workshop Template",
      "Template for management workshops.",
    ),
    file(
      "bcn-cases-1",
      "case-study-collection",
      "Case Study Collection",
      "Collection of approved consultancy case studies.",
    ),
  ],
};
