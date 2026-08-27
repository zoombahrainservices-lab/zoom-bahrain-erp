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

export const softwareSolutionsProfile: DivisionProfile = {
  companyId: "software-solutions",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Websites, Applications & Custom Software",
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
        "Businesses, organizations, entrepreneurs and project owners requiring websites, applications or custom digital systems.",
      problem:
        "Outdated websites, manual processes, disconnected tools and software that does not fit the organization's requirements.",
      offer:
        "Websites, e-commerce platforms, web applications, mobile applications, portals and custom business software.",
      value:
        "One coordinated software-development process from requirement and scope through design, development, launch and support.",
      pricing:
        "Fixed project fees, phased development fees, maintenance agreements or custom quotations.",
      delivery:
        "Discovery, scope, design, development, testing, launch, handover and continued support.",
      keyProof: {
        value: "",
        placeholder:
          "Approved completed websites, applications, platforms, systems and case studies linked from the ERP.",
        needsInput: true,
      },
      zoomSupport:
        "Zoom Advertising, Zoom Technology Solutions, Zoom Business Consultancy, Zoom Professional Services and Zoom E-Commerce.",
    },
    positioning: {
      overview:
        "Zoom Software Solutions designs and develops practical digital products for businesses and organizations. We turn requirements into websites, online stores, applications, portals and custom software that are clear to use, built for purpose and supported after launch.",
      purpose:
        "Help organizations create useful digital products, improve customer experiences and replace inefficient manual processes with practical software.",
      roleWithinZoom:
        "Zoom's software-development company, responsible for converting business requirements, concepts and strategies into working digital products.",
      positioningStatement:
        "A practical software-development partner for organizations that need clear scope, coordinated delivery and dependable support.",
      customerPromise: "Clear scope. Practical software. Supported delivery.",
    },
    segments: [
      {
        name: "Small and medium businesses",
        description: "Businesses that need a professional website, online service or simple digital system.",
        mainNeed: "A cost-effective digital solution that is professional and easy to manage.",
        desiredOutcome: "A working website or system that supports daily business and customer enquiries.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Established companies",
        description: "Organizations replacing outdated websites, manual processes or disconnected software.",
        mainNeed: "Software that matches existing operations and improves how work is completed.",
        desiredOutcome: "A more organized digital process with fewer manual steps.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Entrepreneurs and product owners",
        description: "People developing a new application, platform or digital business idea.",
        mainNeed: "A structured path from an initial concept to a working product.",
        desiredOutcome: "A testable and commercially presentable digital product.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Retailers and service providers",
        description:
          "Businesses that need online selling, booking, registration or customer-service capabilities.",
        mainNeed: "A clear digital purchasing or service journey.",
        desiredOutcome: "Customers can browse, enquire, book, register, order or pay online.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Corporate and public organizations",
        description:
          "Organizations requiring portals, internal applications, digital forms or controlled workflows.",
        mainNeed: "A secure and organized way to manage information, users and business processes.",
        desiredOutcome: "A functional system with clear access, workflows and reporting.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "Zoom companies and Group projects",
        description: "Zoom companies requiring websites, platforms, portals or internal systems.",
        mainNeed: "Software aligned with the wider Zoom business and digital ecosystem.",
        desiredOutcome: "Connected digital products that support the company's commercial and operational goals.",
        includeInPdf: true,
        displayOrder: 6,
      },
    ],
    needs: [
      {
        need: "Building a professional digital presence",
        outcome:
          "A responsive website that clearly presents the organization, its services and the next action for customers.",
        displayOrder: 1,
      },
      {
        need: "Selling products or services online",
        outcome:
          "An e-commerce website with products, ordering, checkout, payment and order-management features.",
        displayOrder: 2,
      },
      {
        need: "Digitizing customer journeys",
        outcome: "Portals, booking systems, registration systems, digital forms and self-service tools.",
        displayOrder: 3,
      },
      {
        need: "Reducing manual administration",
        outcome:
          "A custom application or workflow system that organizes information and reduces repetitive work.",
        displayOrder: 4,
      },
      {
        need: "Launching a new digital product",
        outcome:
          "A prototype, minimum viable product or complete application prepared for launch and further development.",
        displayOrder: 5,
      },
      {
        need: "Improving existing software",
        outcome: "An updated, redesigned or extended system with improved functionality and support.",
        displayOrder: 6,
      },
    ],
    serviceGroups: [
      group("Website Solutions", 1, [
        offer(
          "Corporate & Service Websites",
          "Professional websites for companies, services, projects and organizations.",
          "A responsive website with an approved structure, design, content sections, enquiry journey and launch configuration.",
          1,
          "Fixed project fee or phased quotation.",
        ),
        offer(
          "Website Redesign & Modernization",
          "Improvement or replacement of outdated websites.",
          "A redesigned website with clearer navigation, improved presentation, updated functionality and better usability.",
          2,
          "Fixed project fee based on the existing website and required improvements.",
        ),
        offer(
          "Landing Pages & Campaign Websites",
          "Focused webpages for services, campaigns, promotions, registrations or lead generation.",
          "A campaign-focused webpage with a clear message, enquiry action and required integrations.",
          3,
          "Fixed fee per page, campaign or agreed package.",
        ),
      ]),
      group("E-Commerce Development", 2, [
        offer(
          "E-Commerce Website Development",
          "Development of online stores and digital sales platforms for businesses.",
          "An online store with product catalogue, shopping cart, checkout, payment integration and order-management capabilities.",
          1,
          "Project fee plus applicable integrations, third-party services and ongoing support.",
        ),
      ]),
      group("Applications & Portals", 3, [
        offer(
          "Web Applications & Customer Portals",
          "Browser-based applications for customers, employees, suppliers or other authorized users.",
          "A working web application or portal with the agreed users, functions, access levels and workflows.",
          1,
          "Phased project fee based on modules, users, workflows and integrations.",
        ),
        offer(
          "Mobile Application Development",
          "Mobile applications designed around a defined customer or business requirement.",
          "A tested mobile application with approved screens, functions and release preparation.",
          2,
          "Phased project fee based on platforms, screens, functions and release requirements.",
        ),
      ]),
      group("Business Software", 4, [
        offer(
          "Custom Business Software",
          "Software created around the organization's specific processes and information requirements.",
          "A custom system with the agreed modules, user roles, workflows, records and reporting functions.",
          1,
          "Phased project fee or development retainer.",
        ),
        offer(
          "Booking, Registration & Workflow Systems",
          "Digital systems for managing appointments, registrations, applications, approvals and operational workflows.",
          "A working system that captures information, manages process stages and provides relevant notifications or reports.",
          2,
          "Project fee based on forms, workflows, users, notifications and reporting.",
        ),
      ]),
      group("Digital Product Development", 5, [
        offer(
          "MVP & Digital Product Development",
          "Structured development of new software products from concept to an initial working release.",
          "A prototype or minimum viable product containing the agreed core features for testing, presentation or market entry.",
          1,
          "Phased discovery, prototype and development fees.",
        ),
      ]),
      group("Integration & Support", 6, [
        offer(
          "Software Integrations",
          "Connection of applications with approved payment systems, communication tools, external services or existing software.",
          "A tested connection that transfers information or performs the agreed action between systems.",
          1,
          "Fixed integration fee, hourly technical fee or custom quotation.",
        ),
        offer(
          "Software Maintenance & Continuous Improvement",
          "Ongoing technical support, issue resolution, updates and approved feature improvements.",
          "A maintained software product with documented support, updates and improvement work.",
          2,
          "Monthly retainer, annual agreement or approved hourly support.",
          "supporting",
        ),
      ]),
    ],
    whyZoom: [
      "One coordinated process from initial requirement through launch.",
      "Business requirements translated into practical software.",
      "Websites, applications and custom systems under one software company.",
      "Connected support from Zoom Advertising and Zoom Technology Solutions.",
      "Flexible project structures for small builds, phased developments and larger systems.",
      "Continued support and improvement after launch.",
      "Ability to connect software projects with the wider Zoom business ecosystem.",
    ],
    workflow: [
      {
        name: "Enquiry",
        explanation: "The customer explains the website, application, platform or software requirement.",
        displayOrder: 1,
      },
      {
        name: "Discovery",
        explanation:
          "We review the business objective, users, required functions, existing systems, content and expected outcome.",
        displayOrder: 2,
      },
      {
        name: "Scope Definition",
        explanation:
          "We define the project structure, main features, deliverables, responsibilities, timeline and exclusions.",
        displayOrder: 3,
      },
      {
        name: "Proposal & Quotation",
        explanation:
          "We present the recommended solution, development stages, commercial terms and support options.",
        displayOrder: 4,
      },
      {
        name: "Approval & Project Setup",
        explanation: "The customer approves the scope, payment structure and project schedule.",
        displayOrder: 5,
      },
      {
        name: "Structure & Design",
        explanation:
          "We prepare the information structure, user journeys, screens and approved visual direction.",
        displayOrder: 6,
      },
      {
        name: "Development & Integration",
        explanation:
          "We build the agreed website, application or system and connect the required services.",
        displayOrder: 7,
      },
      {
        name: "Testing & Client Review",
        explanation: "The software is tested, reviewed and corrected according to the approved scope.",
        displayOrder: 8,
      },
      {
        name: "Launch & Handover",
        explanation:
          "The approved product is deployed, required access is transferred and user guidance is provided where included.",
        displayOrder: 9,
      },
      {
        name: "Support & Improvement",
        explanation:
          "Maintenance, issue resolution and future enhancements continue under the agreed support arrangement.",
        displayOrder: 10,
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Advertising",
        description: "Brand identity, website content, creative materials and launch campaigns.",
      },
      {
        company: "Zoom Technology Solutions",
        description:
          "Advanced backend environments, digitalization, AI, automation, infrastructure and complex system integrations.",
      },
      {
        company: "Zoom Business Consultancy",
        description: "Business-process analysis, operating requirements and digital-transformation planning.",
      },
      {
        company: "Zoom Professional Services",
        description:
          "Customized project structuring and coordination involving multiple capabilities or specialist partners.",
      },
      {
        company: "Zoom E-Commerce",
        description:
          "Practical commerce requirements relating to products, merchants, orders and online purchasing journeys.",
      },
    ],
    cta: {
      headline: "Build Your Digital Solution",
      supportingSentence:
        "Tell us what you need to build, improve or digitize. We will help define the scope and recommend the appropriate software solution.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [
      "No professional website or digital presence",
      "An existing website is outdated, unclear or difficult to manage",
      "Customers cannot enquire, register, book, order or pay online",
      "Employees depend on spreadsheets, messages and manual records",
      "Information is duplicated across disconnected systems",
      "Existing software does not match the organization's workflow",
      "Customers or employees have no dedicated portal",
      "A digital product idea has no defined scope or delivery plan",
      "An existing application requires repair, redesign or new functionality",
      "The client lacks an internal software-development team",
      "Previous suppliers delivered incomplete or unsupported software",
      "Management cannot obtain clear reports from current processes",
    ],
    buyingTriggers: [
      "A new company, service or product is launching",
      "The business is rebranding",
      "An existing website has become outdated or unreliable",
      "The company wants to start selling online",
      "Manual administrative work is increasing",
      "A customer journey needs online booking, registration or payment",
      "A new digital product or platform is being proposed",
      "Management approves a digitalization project",
      "Existing software no longer supports the business",
      "A company expands into a new market",
      "A tender or corporate requirement includes a digital platform",
      "The existing software supplier can no longer provide support",
      "Two or more systems need to exchange information",
    ],
    alternatives: [
      "Freelance developers",
      "Website-development agencies",
      "Software-development companies",
      "No-code website builders",
      "Ready-made subscription software",
      "Internal IT or development teams",
      "Individual designers working with separate developers",
      "Continuing with spreadsheets and manual processes",
      "Repairing the existing system instead of replacing it",
      "Purchasing an off-the-shelf product",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Fixed project fee",
      "Phased development fee",
      "Milestone-based payments",
      "Monthly maintenance agreement",
      "Annual support agreement",
      "Development retainer",
      "Hourly or daily technical support",
      "Feature or development-phase quotation",
      "Subscription or licence fee for Zoom-owned products",
      "Third-party service and integration costs",
      "Custom quotation",
    ],
    pricingVariables: [
      "Number of pages, screens or modules",
      "Number and complexity of user roles",
      "Required functions and workflows",
      "Custom design requirements",
      "Content preparation requirements",
      "Number of languages",
      "Third-party integrations",
      "Payment-gateway requirements",
      "Data migration",
      "Reporting requirements",
      "Testing requirements",
      "Hosting and infrastructure",
      "Security and access requirements",
      "Application-store requirements",
      "Project deadline",
      "Maintenance and support period",
      "Client-requested changes after scope approval",
    ],
    revenueModels: [
      "Website and software project fees",
      "Development-phase fees",
      "Maintenance and support retainers",
      "Annual support contracts",
      "Feature-development and system-enhancement fees",
      "Integration fees",
      "Hosting and technical-management fees where included",
      "Subscription or licence revenue from Zoom-owned software products",
      "Training and handover fees where separately scoped",
      "Approved supplier or subcontractor margins",
      "Long-term product-development retainers",
    ],
    thirdPartyCosts: {
      intro: "Possible third-party costs include:",
      items: [
        "Hosting and cloud services",
        "Domain registration",
        "Email services",
        "Payment gateways",
        "SMS and communication services",
        "Licensed software",
        "External APIs",
        "Application-store fees",
        "Stock images, fonts or digital assets",
        "Specialist security testing",
        "Additional development or design resources",
        "Data-migration services",
      ],
      note: "Third-party costs must be identified separately before the final quotation is approved.",
    },
    clientInputs: {
      intro: "The customer may need to provide:",
      items: [
        "Final business requirements",
        "Brand identity and design assets",
        "Approved written content",
        "Product and service information",
        "Photographs and media",
        "Existing system access",
        "Domain and hosting access",
        "Payment-gateway information",
        "Required policies and customer notices",
        "Test data",
        "Review feedback",
        "Approval from the authorized decision maker",
      ],
      note: "Delays in required information or approvals may affect the project schedule.",
    },
    scopeControl: [
      "Every project must begin with an approved written scope",
      "Deliverables, exclusions and responsibilities must be recorded",
      "Features outside the approved scope require assessment",
      "Additional work must receive written approval and a separate quotation where applicable",
      "Client feedback should be consolidated through one authorized contact",
      "Project milestones should require formal approval before the next stage begins",
      "Major changes may affect both price and delivery time",
      "Final acceptance should be based on the approved scope and testing criteria",
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
        "Add only confirmed gaps. Do not save examples as confirmed information. Typical items to review later include missing development roles, specialist technologies, portfolio records, client publication approvals, application case studies, maintenance procedures, source-code and deployment standards, testing process, project documentation and approved supplier agreements.",
      needsInput: true,
    },
    serviceOwnershipTitle: "Ownership boundaries",
    serviceOwnership: {
      groups: [
        {
          title: "Zoom Software Solutions owns",
          items: [
            "Websites",
            "Online stores built for clients",
            "Web applications",
            "Mobile applications",
            "Customer and employee portals",
            "Custom business software",
            "Application-level databases and backend functions",
            "Booking and registration systems",
            "Digital forms and workflows",
            "Application integrations",
            "Software maintenance and improvements",
          ],
        },
        {
          title: "Zoom Technology Solutions owns",
          items: [
            "Organization-wide digitalization",
            "Advanced backend environments",
            "Enterprise technology architecture",
            "IT infrastructure",
            "Complex cross-system integration",
            "Advanced automation",
            "AI implementation",
            "Data environments",
            "Managed technology operations",
          ],
        },
        {
          title: "Zoom Advertising owns",
          items: [
            "Brand identity",
            "Campaign strategy",
            "Advertising content",
            "Social-media management",
            "Media planning and placement",
            "Promotional creative production",
          ],
        },
        {
          title: "Zoom E-Commerce owns",
          items: [
            "Operation of Zoom's online retail platforms",
            "Merchant and product management",
            "Online retail activity",
            "Order and customer administration",
            "Commerce promotions and marketplace operations",
          ],
        },
        {
          title: "Zoom Business Consultancy owns",
          items: [
            "Business strategy",
            "Process improvement",
            "Operating-model design",
            "Management systems",
            "Digital-transformation planning",
          ],
        },
        {
          title: "Zoom Professional Services owns",
          items: [
            "Non-standard project development",
            "Multi-company solution coordination",
            "Specialist assignments and partner-led projects",
          ],
        },
      ],
    },
    supportedBy: [
      { company: "Zoom Advertising", description: "Brand identity, content, visual design and campaigns" },
      {
        company: "Zoom Technology Solutions",
        description: "Advanced backend, infrastructure, digitalization, automation and AI requirements",
      },
      {
        company: "Zoom Business Consultancy",
        description: "Business-process definition and operational requirements",
      },
      {
        company: "Zoom Professional Services",
        description: "Customized project structuring and specialist coordination",
      },
      {
        company: "Zoom E-Commerce",
        description: "Commerce workflows, merchant requirements and online retail operations",
      },
    ],
    supports: [
      { company: "Zoom Advertising", description: "Landing pages, campaign websites and digital campaign tools" },
      {
        company: "Zoom Events",
        description: "Event websites, registration systems, guest portals and event applications",
      },
      {
        company: "Zoom Real Estate",
        description: "Property websites, listing portals, enquiry systems and management applications",
      },
      {
        company: "Zoom E-Commerce",
        description: "Online stores, marketplace platforms and commerce integrations",
      },
      {
        company: "Zoom Education & Training",
        description: "Learning websites, registration systems, learner portals and digital platforms",
      },
      {
        company: "Zoom Business Consultancy",
        description: "Software implementation following process or management recommendations",
      },
      {
        company: "Zoom Professional Services",
        description: "Custom software required within specialist or multi-company projects",
      },
      {
        company: "Zoom Warehousing",
        description: "Inventory applications, customer portals and operational software",
      },
      {
        company: "Zoom Logistics",
        description: "Booking, tracking, documentation and customer-service applications",
      },
    ],
    unpromotedTitle: "Services not currently promoted under Software",
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep unsupported, inactive or experimental software services here. Do not place them in the public profile until management approves them.",
      needsInput: true,
    },
    unpromotedServiceItems: [
      "Standalone advertising or social-media services",
      "Brand-identity design without a software project",
      "Operation of online retail businesses",
      "General IT infrastructure management",
      "Hardware supply as a standalone service",
      "Organization-wide digital-transformation consulting",
      "Advanced AI consultancy without a defined software product",
      "Cybersecurity services as a standalone offer",
      "Accounting, legal or regulated professional systems advice",
      "Accredited technology training",
    ],
    serviceRatings: {
      value: "",
      placeholder:
        "Rate every offer after commercial review using demand, profit potential, ability to deliver, strategic value, delivery complexity, recurring revenue potential and final priority.",
      needsInput: true,
    },
  },
  proof: [
    file(
      "sfs-website-1",
      "website",
      "Completed Website",
      "An approved website project with the scope, launch date, customer requirement and final result recorded.",
    ),
    file(
      "sfs-ecommerce-1",
      "ecommerce-platform",
      "Completed E-Commerce Platform",
      "An approved online store or marketplace project showing products, purchasing features and delivered functionality.",
    ),
    file(
      "sfs-webapp-1",
      "web-application",
      "Completed Web Application",
      "A working application or portal with its users, main functions and business outcome recorded.",
    ),
    file(
      "sfs-mobile-1",
      "mobile-application",
      "Completed Mobile Application",
      "An approved mobile application with screenshots, features and release information.",
    ),
    file(
      "sfs-custom-1",
      "custom-software",
      "Completed Custom Software",
      "A system developed around a specific client process, workflow or operational requirement.",
    ),
    file(
      "sfs-integration-1",
      "integration",
      "Completed Software Integration",
      "A project connecting systems, payments, communications or external services.",
    ),
    file(
      "sfs-product-1",
      "digital-product",
      "Completed Digital Product",
      "A prototype or initial product release created for testing, presentation or market entry.",
    ),
    file(
      "sfs-case-1",
      "case-study",
      "Software Case Study",
      "A completed project documenting the client requirement, challenge, solution, deliverables and result.",
    ),
    file(
      "sfs-testimonial-1",
      "testimonial",
      "Client Testimonial",
      "An approved client statement relating to the software, project delivery or support provided.",
    ),
    file(
      "sfs-client-1",
      "closed-client",
      "Closed Software Client",
      "A completed client relationship recorded in the ERP. The client name remains private until publication is approved.",
    ),
  ],
  assets: [
    file(
      "sfs-catalog-1",
      "catalog",
      "Software Solutions Service Catalog",
      "A ready-to-send overview of websites, applications, portals and custom software services.",
    ),
    file(
      "sfs-web-portfolio-1",
      "website-portfolio",
      "Website Portfolio",
      "Approved website projects organized by business type, objective and delivered features.",
    ),
    file(
      "sfs-app-portfolio-1",
      "application-portfolio",
      "Application & Platform Portfolio",
      "Approved web applications, mobile applications, portals and custom systems.",
    ),
    file(
      "sfs-ecommerce-brochure-1",
      "brochure",
      "E-Commerce Development Brochure",
      "A focused brochure explaining online-store and marketplace-development capabilities.",
    ),
    file(
      "sfs-presentation-1",
      "presentation",
      "Software Solutions Presentation",
      "A presentation for meetings, client introductions and project discussions.",
    ),
    file(
      "sfs-proposal-1",
      "proposal-template",
      "Software Project Proposal",
      "An editable proposal structure covering objectives, scope, deliverables, timeline and commercial terms.",
    ),
    file(
      "sfs-discovery-1",
      "discovery-template",
      "Software Project Discovery Form",
      "A structured form for collecting business requirements, users, features, integrations and project objectives.",
    ),
    file(
      "sfs-scope-1",
      "scope-template",
      "Software Scope of Work",
      "An editable document defining features, responsibilities, exclusions, milestones and acceptance criteria.",
    ),
    file(
      "sfs-pricing-1",
      "pricing-guide",
      "Software Pricing Guide",
      "An internal or client-ready guide to project pricing methods, payment stages and support options.",
    ),
    file(
      "sfs-maintenance-1",
      "maintenance-plan",
      "Software Maintenance Plan",
      "A document explaining support coverage, response process, updates and continuous-improvement options.",
    ),
    file(
      "sfs-cases-1",
      "case-study-collection",
      "Software Case Study Deck",
      "A presentation format for showing completed projects, business requirements, solutions and results.",
    ),
    file(
      "sfs-social-1",
      "social",
      "Software Solutions Social Pack",
      "Approved promotional posts, project visuals and service content for social-media channels.",
    ),
  ],
};
