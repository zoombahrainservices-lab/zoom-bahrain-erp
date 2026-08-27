import type {
  CompanyService,
  DivisionProfile,
  ServiceGroup,
  ServiceStatus,
} from "@/lib/division-profiles";

function offer(
  name: string,
  description: string,
  deliverable: string,
  displayOrder: number,
  pricingMethod: string,
  status: ServiceStatus = "active",
): CompanyService {
  return {
    name,
    description,
    deliverable,
    pricingMethod,
    displayOrder,
    includeInPdf: true,
    status,
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

export const technologySolutionsProfile: DivisionProfile = {
  companyId: "technology-solutions",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Digitalization, Backend Systems, Automation & AI",
    email: "info@zoombahrain.com",
    phone: "+973 3881 6222",
    mainMarket: "Bahrain",
    customerType: "B2B and B2G",
    contacts: [],
    social: [],
  },
  public: {
    snapshot: {
      customer:
        "Companies, institutions and organizations with complex operations, disconnected systems or digitalization requirements.",
      problem:
        "Manual processes, isolated software, duplicated information, limited operational visibility and technology that does not work as one connected environment.",
      offer:
        "Digitalization, backend systems, systems integration, automation, AI solutions, data environments and managed technology.",
      value: "A coordinated technology environment connecting processes, systems, data and users.",
      pricing:
        "Assessment fees, project fees, phased implementation, managed-service agreements or custom quotations.",
      delivery:
        "Assessment, solution architecture, implementation, integration, testing, deployment and ongoing support.",
      keyProof: {
        value: "",
        placeholder:
          "Approved digitalization projects, integrated systems, automation solutions, AI implementations and technology case studies linked from the ERP.",
        needsInput: true,
      },
      zoomSupport:
        "Zoom Software Solutions, Zoom Business Consultancy, Zoom Professional Services and Zoom Education & Training.",
    },
    positioning: {
      overview:
        "Zoom Technology Solutions helps organizations modernize their operations through digitalization, connected backend systems, automation, AI and systems integration. We examine how people, processes, software and information work together, then design and implement the technology environment required to improve them.",
      purpose:
        "Help organizations replace fragmented and manual operations with connected, controlled and intelligent technology systems.",
      roleWithinZoom:
        "Zoom's advanced technology company, responsible for organization-wide digitalization, backend environments, systems integration, automation, AI and managed technology.",
      positioningStatement:
        "A technology implementation partner for organizations that need connected systems, better operational visibility and practical digital transformation.",
      customerPromise: "Connected systems. Smarter operations. Controlled implementation.",
    },
    segments: [
      {
        name: "Growing companies",
        description:
          "Organizations whose existing systems and manual processes can no longer support their operations.",
        mainNeed:
          "Technology that can support increasing users, information, customers and operational activity.",
        desiredOutcome: "A connected technology environment prepared for continued business growth.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Established organizations",
        description:
          "Companies operating through several departments, platforms, locations or disconnected systems.",
        mainNeed: "Integration between systems, processes and information.",
        desiredOutcome: "Better coordination, consistent information and clearer management visibility.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Operations-heavy businesses",
        description:
          "Warehousing, logistics, property, events, retail and service businesses with complex daily workflows.",
        mainNeed: "Digital control of operational information, approvals, movements, users and reporting.",
        desiredOutcome: "Reduced manual work and improved operational control.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Government and institutional organizations",
        description:
          "Organizations requiring structured digital processes, controlled access and management reporting.",
        mainNeed: "Reliable technology environments supporting defined users, responsibilities and workflows.",
        desiredOutcome: "A controlled and documented digital operating process.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Organizations adopting AI and automation",
        description: "Businesses exploring how AI and automation can improve their work.",
        mainNeed: "Practical use cases connected to actual business requirements.",
        desiredOutcome: "Implemented AI or automation that produces a measurable operational benefit.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "Zoom companies and Group projects",
        description:
          "Zoom companies requiring shared systems, automation, reporting or advanced technology support.",
        mainNeed: "Connected systems supporting the wider Zoom business ecosystem.",
        desiredOutcome: "A coordinated digital environment across companies and projects.",
        includeInPdf: true,
        displayOrder: 6,
      },
    ],
    needs: [
      {
        need: "Digitalizing business operations",
        outcome:
          "A structured digital process replacing manual records, fragmented communication and repetitive administration.",
        displayOrder: 1,
      },
      {
        need: "Connecting existing systems",
        outcome: "Systems and data sources that exchange information through controlled integrations.",
        displayOrder: 2,
      },
      {
        need: "Automating repetitive work",
        outcome: "Automated workflows, notifications, approvals and information processing.",
        displayOrder: 3,
      },
      {
        need: "Building advanced backend environments",
        outcome:
          "A controlled backend supporting users, applications, data, permissions and business rules.",
        displayOrder: 4,
      },
      {
        need: "Applying AI to business requirements",
        outcome:
          "AI assistants, knowledge systems or intelligent workflows connected to defined operational use cases.",
        displayOrder: 5,
      },
      {
        need: "Improving data and management visibility",
        outcome: "Centralized information, dashboards and reporting that support clearer decisions.",
        displayOrder: 6,
      },
      {
        need: "Managing technology after implementation",
        outcome:
          "A documented and supported technology environment with ongoing monitoring and improvement.",
        displayOrder: 7,
      },
    ],
    serviceGroups: [
      group("Digitalization & Technology Planning", 1, [
        offer(
          "Digital Operations Assessment",
          "Assessment of current processes, systems, information flows and operational technology problems.",
          "A documented assessment identifying current systems, process gaps, technology requirements and improvement opportunities.",
          1,
          "Fixed assessment or consultancy fee.",
        ),
        offer(
          "Digitalization Roadmap",
          "Development of a structured plan for introducing or improving technology across the organization.",
          "A prioritized roadmap covering recommended systems, integrations, automation, implementation stages and dependencies.",
          2,
          "Fixed project fee based on company size and operational scope.",
        ),
        offer(
          "Technology Architecture & Solution Design",
          "Design of the overall technology environment required to support the organization.",
          "A solution architecture defining systems, users, data, integrations, infrastructure and implementation requirements.",
          3,
          "Fixed design fee or phased consultancy fee.",
        ),
      ]),
      group("Backend & Data Systems", 2, [
        offer(
          "Advanced Backend Systems",
          "Development and implementation of backend environments supporting applications, users, business rules and operational data.",
          "A working backend environment with approved functions, access controls, data structures and system connections.",
          1,
          "Phased project fee based on users, functions, data and integrations.",
        ),
        offer(
          "Database & Data Environments",
          "Design and organization of centralized data structures for operational systems and reporting.",
          "A structured data environment supporting approved systems, users, records and reporting requirements.",
          2,
          "Project fee based on data sources, volume, structure and migration requirements.",
        ),
        offer(
          "API & Backend Services",
          "Development of services that allow applications and systems to exchange information securely.",
          "Documented and tested backend services connecting the approved applications or data sources.",
          3,
          "Fixed integration fee, phased development fee or technical-day rate.",
        ),
      ]),
      group("Systems Integration", 3, [
        offer(
          "Enterprise System Integration",
          "Connection of business platforms, internal systems and approved third-party services.",
          "An integrated environment with defined information flows, system responsibilities and monitoring requirements.",
          1,
          "Project fee based on systems, vendors, data flows and implementation complexity.",
        ),
        offer(
          "Legacy & Third-Party System Connections",
          "Integration of existing systems with new applications, platforms or reporting environments.",
          "A tested connection allowing agreed information or actions to move between existing and new systems.",
          2,
          "Project fee based on systems, vendors, data flows and implementation complexity.",
          "supporting",
        ),
      ]),
      group("Automation Solutions", 4, [
        offer(
          "Workflow & Process Automation",
          "Automation of repetitive processes, approvals, notifications, data entry and operational actions.",
          "An automated workflow with defined triggers, actions, responsibilities and exception handling.",
          1,
          "Fee per workflow, process group or implementation phase.",
        ),
        offer(
          "Document & Approval Automation",
          "Digital control of forms, documents, approvals and internal decision processes.",
          "A working approval process with user roles, status tracking, notifications and records.",
          2,
          "Fee per workflow, process group or implementation phase.",
        ),
      ]),
      group("Artificial Intelligence", 5, [
        offer(
          "AI Readiness & Use-Case Design",
          "Identification and evaluation of practical AI opportunities within the organization.",
          "A prioritized AI use-case plan covering business value, data requirements, implementation needs and expected outcomes.",
          1,
          "Assessment or consultancy fee.",
        ),
        offer(
          "AI Assistants & Knowledge Systems",
          "AI-powered tools that help users find information, prepare responses or work with approved organizational knowledge.",
          "An AI assistant or knowledge system connected to the approved information sources and user requirements.",
          2,
          "Project fee plus applicable AI-platform and usage costs.",
        ),
        offer(
          "AI-Enabled Process Automation",
          "Use of AI within workflows that require information review, classification, extraction, drafting or decision support.",
          "An AI-supported workflow with defined inputs, outputs, controls and human-review points.",
          3,
          "Project fee based on workflows, information sources, controls and expected usage.",
        ),
      ]),
      group("Data & Management Visibility", 6, [
        offer(
          "Data Integration & Management Dashboards",
          "Consolidation of operational information into dashboards and reporting environments.",
          "A dashboard or reporting system showing approved operational and management information.",
          1,
          "Project fee based on data sources, indicators, users and reporting complexity.",
        ),
        offer(
          "Business Intelligence & Reporting",
          "Structured reporting designed around management questions and operational performance.",
          "A reporting environment with agreed indicators, data sources, filters and access levels.",
          2,
          "Project fee based on data sources, indicators, users and reporting complexity.",
          "supporting",
        ),
      ]),
      group("Infrastructure & Managed Technology", 7, [
        offer(
          "Technology Infrastructure & Deployment",
          "Planning and coordination of the infrastructure required to operate integrated systems.",
          "A configured technology environment covering the approved hardware, software, communication and deployment requirements.",
          1,
          "Project fee plus applicable hardware, software and supplier costs.",
        ),
        offer(
          "Managed Systems & Technology Support",
          "Ongoing management, monitoring and support of implemented technology environments.",
          "A managed-support arrangement covering the agreed systems, responsibilities, monitoring and support process.",
          2,
          "Monthly retainer or annual managed-service agreement.",
          "supporting",
        ),
        offer(
          "User Adoption & Technical Training",
          "Preparation of users to operate newly implemented systems and technology processes.",
          "User guidance, system documentation and practical training based on the approved implementation.",
          3,
          "Fixed workshop, implementation or training fee.",
          "supporting",
        ),
      ]),
    ],
    whyZoom: [
      "One connected view of processes, systems, users and information.",
      "Technology recommendations based on actual operational requirements.",
      "Strategy, implementation, integration and support coordinated through one company.",
      "Direct connection with Zoom Software Solutions for application development.",
      "Practical automation and AI linked to defined business use cases.",
      "Phased implementation suitable for complex technology projects.",
      "Continued support after deployment.",
      "Access to the wider capabilities of Zoom Group.",
    ],
    workflow: [
      {
        name: "Business Challenge",
        explanation:
          "The customer explains the operational, system, data, automation or AI requirement.",
        displayOrder: 1,
      },
      {
        name: "Operations & Systems Assessment",
        explanation:
          "We review current processes, software, users, information flows, infrastructure and problems.",
        displayOrder: 2,
      },
      {
        name: "Requirements & Use Cases",
        explanation:
          "We define what the technology must achieve, who will use it and how success will be evaluated.",
        displayOrder: 3,
      },
      {
        name: "Architecture & Roadmap",
        explanation:
          "We design the recommended environment, implementation stages, integrations and dependencies.",
        displayOrder: 4,
      },
      {
        name: "Proposal & Commercial Scope",
        explanation: "We present the solution, deliverables, responsibilities, timeline and commercial terms.",
        displayOrder: 5,
      },
      {
        name: "Implementation & Integration",
        explanation:
          "The approved systems, backend services, automation and integrations are configured or developed.",
        displayOrder: 6,
      },
      {
        name: "Testing & Validation",
        explanation:
          "The environment is tested against approved processes, data, user roles and expected outcomes.",
        displayOrder: 7,
      },
      {
        name: "Deployment & Adoption",
        explanation:
          "The solution is introduced into the organization with documentation, access setup and user preparation.",
        displayOrder: 8,
      },
      {
        name: "Monitoring & Support",
        explanation:
          "The implemented environment is monitored, supported and improved under the agreed arrangement.",
        displayOrder: 9,
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Software Solutions",
        description: "Websites, applications, portals, mobile applications and custom software interfaces.",
      },
      {
        company: "Zoom Business Consultancy",
        description: "Business-process analysis, operating-model development, KPIs and transformation planning.",
      },
      {
        company: "Zoom Professional Services",
        description: "Customized project structuring, specialist coordination and multi-company solutions.",
      },
      {
        company: "Zoom Education & Training",
        description: "User training, technology workshops and skills-development programs.",
      },
      {
        company: "Zoom Advertising",
        description: "Internal communication, launch materials and user-facing content where required.",
      },
    ],
    cta: {
      headline: "Transform Your Operations",
      supportingSentence:
        "Tell us where your processes, systems or information are disconnected. We will assess the requirement and recommend the appropriate technology path.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [
      "Important processes depend on spreadsheets, email or WhatsApp",
      "The same information is entered into several systems",
      "Departments use separate software with no connection",
      "Management cannot obtain one reliable operational view",
      "Approvals are slow and difficult to track",
      "Data is duplicated, incomplete or inconsistent",
      "Existing systems cannot support new operational requirements",
      "Employees spend too much time on repetitive administrative work",
      "Customers or suppliers cannot access the information they need",
      "Existing software has no suitable integration capability",
      "The organization wants to use AI but has no defined use case",
      "Technology projects begin without clear business requirements",
      "Systems depend heavily on one employee or supplier",
      "Existing technology has limited documentation",
      "Users resist new systems because implementation and training are weak",
      "The organization lacks internal technology leadership",
    ],
    buyingTriggers: [
      "Management approves a digital-transformation initiative",
      "The company expands into new locations or services",
      "Manual workloads become difficult to control",
      "A new management team requires better reporting",
      "Existing software no longer supports the business",
      "Two or more systems need to share information",
      "The organization implements a new ERP, CRM or operational platform",
      "A department requests workflow automation",
      "Management wants to introduce AI",
      "Data quality or reporting problems affect decisions",
      "A tender requires a digital or integrated solution",
      "A previous technology supplier stops providing support",
      "The organization experiences repeated process delays",
      "A new customer or regulatory requirement changes existing operations",
    ],
    alternatives: [
      "Internal IT departments",
      "IT consulting firms",
      "Systems integrators",
      "Software-development companies",
      "ERP implementation partners",
      "Automation specialists",
      "AI consulting companies",
      "Cloud and infrastructure providers",
      "Individual technical freelancers",
      "Purchasing additional off-the-shelf software",
      "Continuing with disconnected systems",
      "Expanding existing manual processes",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Technology assessment fee",
      "Digitalization-roadmap fee",
      "Solution-architecture fee",
      "Fixed implementation fee",
      "Phased project fee",
      "Milestone-based payments",
      "Integration fee",
      "Automation-workflow fee",
      "AI implementation fee",
      "Hourly or daily technical-consulting rate",
      "Monthly managed-service agreement",
      "Annual technology-support contract",
      "Software subscription or licence fee",
      "Hardware and software procurement margin",
      "Custom quotation",
    ],
    pricingVariables: [
      "Number of departments, locations and users",
      "Number of existing systems",
      "Number and complexity of integrations",
      "Data volume and data condition",
      "Data-migration requirements",
      "Number of workflows to automate",
      "Number and complexity of AI use cases",
      "Backend and infrastructure requirements",
      "Hardware and software requirements",
      "User roles and access controls",
      "Reporting and dashboard requirements",
      "Existing vendor cooperation",
      "Required testing environments",
      "Implementation deadline",
      "User-training requirements",
      "Managed-support requirements",
      "Third-party licences and usage charges",
      "Operational risk and acceptable downtime",
    ],
    revenueModels: [
      "Technology-assessment fees",
      "Consulting and architecture fees",
      "Implementation-project fees",
      "Systems-integration fees",
      "Automation-development fees",
      "AI implementation and configuration fees",
      "Backend and data-environment projects",
      "Monthly managed-technology retainers",
      "Annual support contracts",
      "System-monitoring fees",
      "Subscription or licence revenue from Zoom-owned technology",
      "Hardware and software procurement margins",
      "User-training and implementation-support fees",
      "Continuous-improvement and system-expansion projects",
    ],
    thirdPartyCosts: {
      intro: "Possible third-party costs include:",
      items: [
        "Cloud infrastructure",
        "AI model and API usage",
        "Database and data services",
        "Automation platforms",
        "Business software licences",
        "ERP and CRM licences",
        "Hardware and networking equipment",
        "Communication services",
        "Monitoring tools",
        "Data-migration specialists",
        "Security specialists",
        "External systems integrators",
        "Specialist developers",
        "Training and implementation resources",
      ],
      note: "Third-party costs must be identified before the commercial proposal is approved.",
    },
    clientInputs: {
      intro: "The customer may need to provide:",
      items: [
        "Access to existing systems",
        "Current process documentation",
        "Sample data",
        "System and vendor information",
        "Department representatives",
        "An authorized project owner",
        "Defined approval responsibilities",
        "Technology and data policies",
        "User lists and access requirements",
        "Existing contracts and software licences",
        "Test users",
        "Timely review and approval",
        "Support from existing technology suppliers",
        "Final acceptance of the implemented environment",
      ],
    },
    projectQualification: {
      title: "Technology project qualification",
      intro: "Every opportunity should be reviewed against:",
      criteria: [
        { name: "Business value", question: "Is the expected operational or commercial value clear?" },
        { name: "Problem clarity", question: "Can the problem be clearly defined?" },
        { name: "Process stability", question: "Are the processes stable enough to digitize or automate?" },
        { name: "System access", question: "Can Zoom obtain the required system access?" },
        { name: "Data availability", question: "Is the required data available and usable?" },
        { name: "Integration feasibility", question: "Can the required systems be connected?" },
        { name: "Vendor dependency", question: "Are existing vendor dependencies acceptable?" },
        { name: "Internal capability", question: "Can Zoom assemble the required internal capability?" },
        { name: "Partner requirements", question: "Are specialist partners required, and can they be engaged?" },
        { name: "Customer budget", question: "Is the customer budget sufficient for the likely scope?" },
        { name: "Implementation timeline", question: "Is the requested timeline realistic?" },
        { name: "Operational risk", question: "Are operational risks, including downtime, acceptable?" },
        { name: "Customer ownership", question: "Is there a clear customer owner for the project?" },
        { name: "User-adoption requirements", question: "Can users be prepared to adopt the solution?" },
        { name: "Recurring-revenue potential", question: "Does the work create acceptable recurring-revenue potential?" },
      ],
      decisionsTitle: "Decision outcomes",
      decisions: [
        "Proceed",
        "Proceed with conditions",
        "Further assessment required",
        "Software-led project",
        "Partner-led project",
        "Refer to another Zoom company",
        "Do not proceed",
      ],
    },
    scopeControl: [
      "Begin every project with an approved assessment or scope",
      "Record the systems, users, data and processes included",
      "Clearly document exclusions and customer responsibilities",
      "Additional integrations or workflows require assessment",
      "Changes must be commercially approved before implementation",
      "Data quality remains dependent on customer-provided information",
      "Third-party vendor delays may affect delivery",
      "Testing and acceptance criteria must be documented",
      "Deployment must follow an approved release process",
      "Support after launch must follow a separate agreement where applicable",
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
        "Add only confirmed gaps. Do not save examples as confirmed information. Typical items to review later include missing digitalization case studies, architecture standards, integration documentation, AI implementation records, data-governance procedures, deployment and rollback procedures, managed-support procedures, specialist partners, monitoring tools, approved supplier agreements, client publication approvals and internal technical ownership.",
      needsInput: true,
    },
    serviceOwnershipTitle: "Ownership boundaries",
    serviceOwnership: {
      note: "If the main requirement is one website, application, portal or software product, Zoom Software Solutions leads. If the requirement connects several systems, departments, processes, data sources, infrastructure or AI capabilities, Zoom Technology Solutions leads.",
      groups: [
        {
          title: "Zoom Technology Solutions owns",
          items: [
            "Organization-wide digitalization",
            "Technology assessments and roadmaps",
            "Enterprise technology architecture",
            "Advanced backend environments",
            "Cross-system integration",
            "Data environments",
            "Workflow and process automation",
            "AI use-case design and implementation",
            "Technology infrastructure",
            "Managed systems",
            "Technology operations and support",
          ],
        },
        {
          title: "Zoom Software Solutions owns",
          items: [
            "Corporate and service websites",
            "Online stores built for clients",
            "Web applications",
            "Mobile applications",
            "Customer and employee portals",
            "Individual custom software products",
            "Application interfaces",
            "Application maintenance and feature development",
          ],
        },
        {
          title: "Zoom Business Consultancy owns",
          items: [
            "Business strategy",
            "Operating-model design",
            "Process improvement",
            "Management systems",
            "KPIs and organizational transformation",
          ],
        },
        {
          title: "Zoom Professional Services owns",
          items: [
            "Non-standard projects",
            "Specialist assignments",
            "Multi-company solution coordination",
            "Partner-led delivery",
          ],
        },
        {
          title: "Zoom Education & Training owns",
          items: [
            "Structured training programs",
            "Skills development",
            "User-learning programs beyond system handover",
          ],
        },
        {
          title: "Zoom Advertising owns",
          items: [
            "Brand communication",
            "Advertising campaigns",
            "Promotional content",
            "Media planning and placement",
          ],
        },
        {
          title: "Zoom E-Commerce owns",
          items: [
            "Online retail operations",
            "Merchant and product management",
            "Marketplace administration",
            "Customer-order operations",
          ],
        },
      ],
    },
    supportedBy: [
      {
        company: "Zoom Software Solutions",
        description: "Application development, user interfaces, portals and mobile applications",
      },
      {
        company: "Zoom Business Consultancy",
        description: "Process definition, management requirements and transformation planning",
      },
      {
        company: "Zoom Professional Services",
        description: "Specialist coordination and customized project delivery",
      },
      {
        company: "Zoom Education & Training",
        description: "User training and technology-skills development",
      },
      {
        company: "Zoom Advertising",
        description: "Launch communication and user-facing materials",
      },
    ],
    supports: [
      {
        company: "Zoom Software Solutions",
        description: "Backend environments, complex integrations, AI, data and infrastructure",
      },
      {
        company: "Zoom Real Estate",
        description: "Property-management systems, automation, portals and reporting environments",
      },
      {
        company: "Zoom Events",
        description: "Registration environments, operational dashboards, automation and data systems",
      },
      {
        company: "Zoom Advertising",
        description: "Campaign automation, data connections and reporting systems",
      },
      {
        company: "Zoom E-Commerce",
        description: "Commerce integrations, backend environments, automation, data and AI",
      },
      {
        company: "Zoom Business Consultancy",
        description: "Technology implementation following management and process recommendations",
      },
      {
        company: "Zoom Professional Services",
        description: "Technology components within customized or multi-company projects",
      },
      {
        company: "Zoom Education & Training",
        description: "Learning platforms, data environments and automation",
      },
      {
        company: "Zoom Logistics",
        description: "Operational systems, integrations, automation and tracking environments",
      },
      {
        company: "Zoom Warehousing",
        description: "Warehouse systems, inventory data, automation, dashboards and customer access",
      },
    ],
    unpromotedTitle: "Services not currently promoted under Technology",
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep unsupported, inactive or experimental technology services here. Do not place them in the public profile until management approves them.",
      needsInput: true,
    },
    unpromotedServiceItems: [
      "Standard corporate websites",
      "Basic landing pages",
      "Standalone mobile applications without a wider technology requirement",
      "Generic website maintenance",
      "Advertising and social-media services",
      "Online retail operations",
      "Business strategy without technology implementation",
      "Standalone hardware resale",
      "Unverified cybersecurity services",
      "Legal, accounting or regulated technical consultancy",
      "Technology training without a defined program",
    ],
    serviceRatings: {
      value: "",
      placeholder:
        "Rate every offer after commercial review using demand, profit potential, ability to deliver, strategic value, delivery complexity, partner dependency, recurring revenue potential and final priority.",
      needsInput: true,
    },
  },
  proof: [
    file(
      "tsl-assessment-1",
      "digitalization-assessment",
      "Completed Digitalization Assessment",
      "An approved assessment documenting the customer's processes, systems, gaps and recommended technology direction.",
    ),
    file(
      "tsl-roadmap-1",
      "technology-roadmap",
      "Completed Technology Roadmap",
      "A phased technology plan prepared for an approved customer or Zoom project.",
    ),
    file(
      "tsl-architecture-1",
      "solution-architecture",
      "Approved Technology Architecture",
      "A documented architecture showing systems, users, data, integrations and infrastructure.",
    ),
    file(
      "tsl-backend-1",
      "backend-system",
      "Completed Backend Environment",
      "An implemented backend system supporting approved operational or application requirements.",
    ),
    file(
      "tsl-integration-1",
      "integration",
      "Completed Systems Integration",
      "A project connecting two or more systems, platforms or information sources.",
    ),
    file(
      "tsl-automation-1",
      "automation-project",
      "Completed Automation Solution",
      "An approved workflow or process automation with its operational outcome recorded.",
    ),
    file(
      "tsl-ai-1",
      "ai-solution",
      "Completed AI Implementation",
      "An AI assistant, knowledge system or AI-supported workflow with an approved business use case.",
    ),
    file(
      "tsl-data-1",
      "data-environment",
      "Completed Data Environment",
      "A dashboard, reporting environment or centralized data solution.",
    ),
    file(
      "tsl-deploy-1",
      "technology-deployment",
      "Completed Technology Deployment",
      "An implemented technology environment covering systems, infrastructure or integrated components.",
    ),
    file(
      "tsl-managed-1",
      "managed-engagement",
      "Managed Technology Client",
      "An approved ongoing technology-management or support relationship.",
    ),
    file(
      "tsl-case-1",
      "case-study",
      "Technology Case Study",
      "A completed project documenting the problem, architecture, implementation and outcome.",
    ),
    file(
      "tsl-testimonial-1",
      "testimonial",
      "Client Testimonial",
      "An approved client statement relating to the technology solution or delivery provided.",
    ),
  ],
  assets: [
    file(
      "tsl-catalog-1",
      "catalog",
      "Technology Solutions Service Catalog",
      "A ready-to-send overview of digitalization, integration, automation, AI and managed technology services.",
    ),
    file(
      "tsl-capability-1",
      "capability-statement",
      "Technology Capability Statement",
      "A concise document presenting Zoom's technology direction, capabilities and delivery model.",
    ),
    file(
      "tsl-assessment-1",
      "diagnostic-template",
      "Digital Operations Assessment",
      "A structured template for reviewing processes, systems, data and technology gaps.",
    ),
    file(
      "tsl-roadmap-1",
      "transformation-template",
      "Technology Roadmap",
      "An editable format for documenting priorities, phases, dependencies and expected outcomes.",
    ),
    file(
      "tsl-architecture-1",
      "architecture-template",
      "Technology Architecture Document",
      "A standard format for documenting systems, users, data, integrations and infrastructure.",
    ),
    file(
      "tsl-proposal-1",
      "proposal-template",
      "Technology Project Proposal",
      "An editable proposal covering the requirement, recommended solution, stages and commercial scope.",
    ),
    file(
      "tsl-register-1",
      "integration-register",
      "Systems Integration Register",
      "A document recording connected systems, data flows, responsibilities and technical dependencies.",
    ),
    file(
      "tsl-ai-brief-1",
      "ai-brief",
      "AI Opportunity Brief",
      "A structured document for defining an AI problem, business value, information requirements and controls.",
    ),
    file(
      "tsl-plan-1",
      "plan-template",
      "Technology Implementation Plan",
      "A project document covering activities, responsibilities, milestones, testing and deployment.",
    ),
    file(
      "tsl-support-1",
      "maintenance-plan",
      "Managed Technology Support Plan",
      "A document explaining supported systems, responsibilities, monitoring and support arrangements.",
    ),
    file(
      "tsl-presentation-1",
      "presentation",
      "Technology Solutions Presentation",
      "A presentation for management meetings, client discussions and technology proposals.",
    ),
    file(
      "tsl-cases-1",
      "case-study-collection",
      "Technology Case Study Deck",
      "A presentation format for approved digitalization, integration, automation and AI projects.",
    ),
  ],
};
