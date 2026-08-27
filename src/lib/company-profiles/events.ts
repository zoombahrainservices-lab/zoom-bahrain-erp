import type {
  CompanyService,
  DivisionProfile,
  ServiceGroup,
} from "@/lib/division-profiles";

const quoted = "Quoted according to event scope.";

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

export const eventsProfile: DivisionProfile = {
  companyId: "events",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Corporate Events, Conferences & Exhibitions",
    email: "info@zoombahrain.co",
    phone: "+973 3881 4222",
    mainMarket: "Bahrain",
    customerType: "B2B and B2G",
    contacts: [],
    social: [],
  },
  public: {
    snapshot: {
      customer:
        "Companies, government entities, professional associations, institutions, brands and international organizations conducting events in Bahrain.",
      problem:
        "Professional events require coordinated planning across venues, production teams, suppliers, speakers, guests, registration, branding and event-day operations.",
      offer:
        "Complete event planning, management, production coordination, registration, guest management and on-site execution.",
      value:
        "One accountable event partner coordinating the complete requirement from the initial brief through final delivery.",
      pricing:
        "Fixed project fees, event-management fees, production packages, supplier margins, per-unit charges or custom quotations.",
      delivery:
        "Brief, requirement review, concept, proposal, approval, production planning, event execution and close-out.",
      keyProof: {
        value: "",
        placeholder: "No approved proof selected for public use yet.",
        needsInput: true,
      },
      zoomSupport:
        "Zoom Advertising, Software Solutions, Technology Solutions, Logistics, Warehousing and Professional Services.",
    },
    positioning: {
      overview:
        "Zoom Events plans, coordinates and delivers corporate events, conferences, exhibitions and business experiences in Bahrain. We bring planning, venues, production, registration, guest management, creative requirements and on-site execution into one professionally managed scope.",
      purpose:
        "To give organizations one dependable point of contact for managing the many moving parts required to deliver a professional event.",
      roleWithinZoom:
        "Zoom Events leads event opportunities within Zoom Group and coordinates the internal companies, venues and specialist suppliers required for each project.",
      positioningStatement:
        "A coordinated event-management partner for organizations that require clear planning, controlled execution and professional presentation.",
      customerPromise: "Clear scope. Controlled coordination. Professional delivery.",
    },
    segments: [
      {
        name: "Corporate organizations",
        description:
          "Companies organizing conferences, corporate gatherings, launches, employee-engagement activities and client events.",
        mainNeed:
          "A professional event without placing the complete planning and coordination burden on the internal team.",
        desiredOutcome:
          "An event delivered according to the approved objective, scope, schedule and budget.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Government and public organizations",
        description:
          "Government entities and public institutions organizing conferences, exhibitions, ceremonies and official events.",
        mainNeed:
          "Structured coordination, professional presentation and organized handling of guests, suppliers and event requirements.",
        desiredOutcome:
          "A controlled event appropriate for its audience, purpose and level of representation.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Professional associations and institutions",
        description:
          "Industry associations, educational institutions and professional organizations conducting conferences, seminars and business gatherings.",
        mainNeed: "Coordination of programmes, speakers, registration, venues and attendees.",
        desiredOutcome:
          "A well-organized programme with a smooth experience for participants and organizers.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Brands and exhibitors",
        description:
          "Companies participating in exhibitions, launching products or creating branded experiences.",
        mainNeed: "Strong visual presentation, production, visitor engagement and operational support.",
        desiredOutcome:
          "A professional brand presence that attracts attention and supports the commercial objective.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "International organizations operating in Bahrain",
        description:
          "International companies and organizers requiring local event coordination, venue support and supplier management in Bahrain.",
        mainNeed: "A dependable local partner who can coordinate the event requirement on the ground.",
        desiredOutcome: "Local execution managed through one accountable contact.",
        includeInPdf: true,
        displayOrder: 5,
      },
    ],
    needs: [
      {
        need: "Clear event planning",
        outcome:
          "One approved event plan covering responsibilities, schedule, deliverables and operational requirements.",
        displayOrder: 1,
      },
      {
        need: "Venue and supplier coordination",
        outcome:
          "Venues, hotels, production suppliers, catering and supporting services coordinated through one process.",
        displayOrder: 2,
      },
      {
        need: "Professional event production",
        outcome:
          "Stage, sound, screens, lighting, branding and physical event elements aligned with the approved concept.",
        displayOrder: 3,
      },
      {
        need: "Guest, speaker and registration management",
        outcome:
          "Organized invitations, registration, seating, speaker requirements and guest movement.",
        displayOrder: 4,
      },
      {
        need: "Controlled event-day execution",
        outcome:
          "A coordinated programme with clear timing, responsible teams and immediate handling of operational issues.",
        displayOrder: 5,
      },
      {
        need: "Meaningful audience engagement",
        outcome:
          "Activities and experiences designed around the event objective rather than added only for decoration or entertainment.",
        displayOrder: 6,
      },
    ],
    serviceGroups: [
      group("Event Planning & Management", 1, [
        offer(
          "Event Concept and Direction",
          "Development of the event approach based on the client's objective, audience and required outcome.",
          "Approved event direction and initial scope.",
          1,
        ),
        offer(
          "Event Scope and Budget Planning",
          "Definition of the required services, responsibilities, priorities and budget structure.",
          "Structured event scope and commercial plan.",
          2,
        ),
        offer(
          "Event Programme and Schedule",
          "Preparation of the programme, operational schedule and run of show.",
          "Approved programme and execution timeline.",
          3,
        ),
        offer(
          "Supplier Procurement and Coordination",
          "Sourcing, comparison and coordination of the suppliers required for the event.",
          "Coordinated supplier plan under one event scope.",
          4,
        ),
        offer(
          "On-Site Event Management",
          "Management of setup, programme timing, suppliers, guest movement and event-day requirements.",
          "Controlled on-site execution from setup through completion.",
          5,
        ),
      ]),
      group("Corporate Events, Conferences & Exhibitions", 2, [
        offer(
          "Corporate Events",
          "Planning and delivery of structured events for employees, clients, partners and stakeholders.",
          "A professionally managed corporate event.",
          1,
        ),
        offer(
          "Conferences and Conventions",
          "Coordination of programmes, speakers, delegates, venues, production and supporting services.",
          "A complete conference environment ready for attendees and speakers.",
          2,
        ),
        offer(
          "Business Forums and Seminars",
          "Management of focused business, technical, educational or industry gatherings.",
          "An organized forum or seminar with coordinated programme and participant requirements.",
          3,
        ),
        offer(
          "Product and Business Launches",
          "Planning and production of launch events designed to introduce a company, product, service or initiative.",
          "A branded launch experience aligned with the commercial objective.",
          4,
        ),
        offer(
          "Exhibitions and Trade Shows",
          "Coordination of exhibition requirements, exhibitors, floor plans, production, branding and visitor operations.",
          "A managed exhibition or trade-show presence.",
          5,
        ),
        offer(
          "Corporate Ceremonies and Award Events",
          "Planning and delivery of formal company ceremonies, recognition events and award programmes.",
          "A professionally staged and coordinated ceremony.",
          6,
        ),
      ]),
      group("Event Production & Environment", 3, [
        offer(
          "Stage and Backdrop Production",
          "Coordination of stages, backdrops, podiums and presentation environments.",
          "Installed event stage and branded background.",
          1,
        ),
        offer(
          "Audiovisual and Technical Production",
          "Coordination of sound systems, microphones, screens, projectors, lighting and technical operators.",
          "Tested and operational event-technology setup.",
          2,
        ),
        offer(
          "Exhibition Booths and Branded Structures",
          "Design and production coordination for exhibition booths, activation points, registration counters and branded structures.",
          "Installed branded structure ready for operation.",
          3,
        ),
        offer(
          "Event Branding and Signage",
          "Coordination of visual materials including entrance branding, directional signs, roll-ups, screens and printed event elements.",
          "Consistent event branding across the venue.",
          4,
        ),
        offer(
          "Setup and Dismantling Coordination",
          "Management of supplier access, installation schedules, final checks and post-event removal.",
          "Controlled setup and dismantling process.",
          5,
        ),
      ]),
      group("Registration, Guests & Protocol", 4, [
        offer(
          "Online Registration",
          "Creation and management of event-registration forms and attendee records.",
          "Working registration process and organized attendee data.",
          1,
        ),
        offer(
          "Registration Counter Setup",
          "Coordination of registration counters, signage, attendee lists, badges and supporting materials.",
          "Operational guest-registration area.",
          2,
        ),
        offer(
          "Invitations and RSVP Coordination",
          "Preparation and management of invitations, confirmations and attendance updates.",
          "Organized invitation and RSVP record.",
          3,
        ),
        offer(
          "Speaker and Programme Coordination",
          "Collection and coordination of speaker information, presentations, timing and programme requirements.",
          "Confirmed speaker and programme schedule.",
          4,
        ),
        offer(
          "VIP and Official Guest Coordination",
          "Coordination of reserved seating, arrival arrangements, programme involvement and venue requirements for important guests.",
          "Clear VIP and official guest plan.",
          5,
        ),
        offer(
          "Seating and Guest Flow",
          "Planning of seating arrangements, reserved sections, entrances, registration movement and audience flow.",
          "Approved seating and guest-movement plan.",
          6,
        ),
      ]),
      group("Corporate Engagement & Brand Experiences", 5, [
        offer(
          "Employee-Engagement Activities",
          "Development and coordination of interactive activities designed around communication, teamwork and participation.",
          "A structured employee-engagement experience.",
          1,
        ),
        offer(
          "Team-Building Experiences",
          "Creation of practical group activities that encourage collaboration and interaction.",
          "Coordinated team-building programme and activity materials.",
          2,
        ),
        offer(
          "Brand Activations",
          "Design and coordination of branded experiences that introduce or promote a company, campaign, product or service.",
          "Operational brand activation ready for participants.",
          3,
        ),
        offer(
          "Interactive Activity Stations",
          "Development and production of branded activity points, games, challenges and participant journeys.",
          "Complete activity stations with instructions, materials and operational requirements.",
          4,
        ),
        offer(
          "Corporate Gifts and Giveaways",
          "Sourcing, branding and supply coordination for gifts, notebooks, awards and promotional items.",
          "Approved and branded items delivered according to the agreed quantity and specification.",
          5,
        ),
      ]),
      group("Venue, Hospitality & Official Coordination", 6, [
        offer(
          "Venue and Hotel Coordination",
          "Sourcing and coordination of event spaces, access, schedules, layouts and venue responsibilities.",
          "Confirmed venue arrangement aligned with the event requirement.",
          1,
        ),
        offer(
          "Catering Coordination",
          "Coordination of menus, service timing, attendee quantities and hospitality requirements.",
          "Confirmed catering plan.",
          2,
        ),
        offer(
          "Accommodation Coordination",
          "Coordination of rooms and hotel arrangements for speakers, guests or visiting teams where required.",
          "Confirmed accommodation arrangement.",
          3,
        ),
        offer(
          "Event Licensing Coordination",
          "Preparation and coordination of the required event-licensing process where applicable.",
          "Completed submission and follow-up process.",
          4,
        ),
        offer(
          "Government and Official Coordination",
          "Preparation and follow-up of event-related communication with relevant authorities or official stakeholders where required.",
          "Coordinated official communication and documented follow-up.",
          5,
        ),
      ]),
      group("Event Media & Digital Support", 7, [
        offer(
          "Photography",
          "Professional event photography covering the venue, speakers, guests, activities and key moments.",
          "Selected and edited event photographs.",
          1,
        ),
        offer(
          "Videography",
          "Event video coverage and edited highlights based on the approved scope.",
          "Edited event video or highlight reel.",
          2,
        ),
        offer(
          "Event Artwork",
          "Creation and coordination of invitations, programmes, speaker announcements, newspaper advertisements and supporting event graphics.",
          "Approved event artwork package.",
          3,
        ),
        offer(
          "Event Registration and Information Platforms",
          "Development of registration pages, forms, event information pages and digital attendee tools.",
          "Operational event platform or digital registration system.",
          4,
        ),
        offer(
          "Presentation and Content Coordination",
          "Collection, organization and technical preparation of presentations, videos and screen content.",
          "Organized and tested event presentation package.",
          5,
        ),
      ]),
    ],
    whyZoom: [
      "One accountable point of contact for the complete event requirement.",
      "Structured planning from the initial brief through event completion.",
      "Coordination of venues, production teams, suppliers, speakers and guests.",
      "Connected Zoom capabilities covering advertising, software, technology and operations.",
      "Flexible event scopes built around the objective, audience and available budget.",
    ],
    workflow: [
      {
        name: "Event Brief",
        explanation:
          "Confirm the purpose, audience, date, location, scale, budget and expected outcome.",
        displayOrder: 1,
      },
      {
        name: "Requirement Review",
        explanation:
          "Identify the venue, production, guest, programme, branding, supplier and operational requirements.",
        displayOrder: 2,
      },
      {
        name: "Concept and Scope",
        explanation: "Prepare the recommended event direction, responsibilities and deliverables.",
        displayOrder: 3,
      },
      {
        name: "Proposal and Quotation",
        explanation:
          "Present the proposed solution, commercial terms, exclusions and required decisions.",
        displayOrder: 4,
      },
      {
        name: "Approval and Confirmation",
        explanation:
          "Confirm the approved scope, schedule, payment requirements and responsibilities.",
        displayOrder: 5,
      },
      {
        name: "Planning and Production",
        explanation:
          "Coordinate the venue, suppliers, production, guests, programme, artwork and event materials.",
        displayOrder: 6,
      },
      {
        name: "Final Readiness",
        explanation:
          "Complete technical checks, confirmations, schedules, contact lists and final approvals.",
        displayOrder: 7,
      },
      {
        name: "Event Execution",
        explanation:
          "Manage setup, suppliers, timing, registration, guest movement and on-site delivery.",
        displayOrder: 8,
      },
      {
        name: "Close-Out and Follow-Up",
        explanation:
          "Complete final deliverables, supplier closure, client feedback and future-event follow-up.",
        displayOrder: 9,
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Advertising",
        description: "Event campaigns, invitations, artwork, promotional materials and media support.",
      },
      {
        company: "Zoom Software Solutions",
        description: "Registration platforms, event websites, forms and attendee-management tools.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Digital systems, automation, technical integration and event technology.",
      },
      {
        company: "Zoom Logistics",
        description: "Coordination support for event materials and operational requirements.",
      },
      {
        company: "Zoom Warehousing",
        description: "Storage of reusable event materials, equipment and promotional items.",
      },
      {
        company: "Zoom Professional Services",
        description: "Specialist research, documentation and project support.",
      },
    ],
    cta: {
      headline: "Plan Your Event With Zoom",
      supportingSentence:
        "Share the event objective, audience, date and location. Zoom Events will review the requirement and prepare the appropriate scope.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [
      "Internal teams do not have the time or resources to manage the complete event",
      "Requirements are spread across venues, suppliers and different internal stakeholders",
      "Scope, responsibilities and exclusions are not clearly documented",
      "Venue, production and supplier decisions are delayed",
      "Budgets become difficult to control",
      "Registration and guest information are not properly organized",
      "Branding and production elements are developed separately",
      "Speaker and programme information arrives late",
      "Technical requirements are not confirmed early enough",
      "Event-day responsibilities are unclear",
      "Last-minute changes create operational and financial pressure",
    ],
    buyingTriggers: [
      "A conference, seminar or business forum is announced",
      "A corporate gathering or employee-engagement event is approved",
      "A company launches a new product, service or initiative",
      "An organization participates in an exhibition or trade show",
      "A formal ceremony or award event is planned",
      "An international company requires local event support in Bahrain",
      "A venue has been selected but the remaining delivery requires coordination",
      "Event licensing or official coordination is required",
      "The internal team needs one company to consolidate suppliers and production",
      "A previous event exposed planning or execution problems",
    ],
    alternatives: [
      "Internal corporate event teams",
      "Independent event planners",
      "Hotels providing venue coordination",
      "Production and audiovisual companies",
      "Advertising agencies",
      "Exhibition contractors",
      "Direct coordination with separate suppliers",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Fixed project fee",
      "Event-management fee",
      "Cost-plus pricing",
      "Supplier markup",
      "Package pricing",
      "Per-item or per-unit pricing",
      "Per-day or per-hour staffing",
      "Venue rental",
      "Production fee",
      "Registration fee",
      "Custom quotation",
    ],
    revenueModels: [
      "Event planning and management fees",
      "Supplier and production margins",
      "Venue and event-space income",
      "Production and fabrication charges",
      "Registration and technology services",
      "Photography and videography packages",
      "Artwork and advertising support",
      "Engagement activity packages",
      "Gifts and giveaway supply",
      "Repeat corporate-event agreements",
      "Cross-selling through connected Zoom companies",
    ],
    supplierCategories: [
      "Hotels and venues",
      "Stage and fabrication suppliers",
      "Audiovisual and lighting suppliers",
      "Printing and branding suppliers",
      "Caterers",
      "Event staffing providers",
      "Photographers and videographers",
      "Entertainment providers",
      "Gift and giveaway suppliers",
      "Furniture and equipment rental suppliers",
    ],
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
        "Leave empty until the Events team completes an operational review. Do not save example gaps as confirmed information.",
      needsInput: true,
    },
    supportedBy: [
      { company: "Zoom Advertising", description: "Event campaigns, invitations, artwork and media support" },
      { company: "Zoom Software Solutions", description: "Registration platforms, event websites and forms" },
      { company: "Zoom Technology Solutions", description: "Digital systems, automation and event technology" },
      { company: "Zoom Logistics", description: "Event materials and operational requirements" },
      { company: "Zoom Warehousing", description: "Storage of reusable event materials and equipment" },
      { company: "Zoom Professional Services", description: "Specialist research, documentation and project support" },
    ],
    supports: [
      { company: "Zoom Advertising", description: "Event campaigns, artwork and media requirements" },
      { company: "Zoom Software Solutions", description: "Registration platforms and event websites" },
      { company: "Zoom Technology Solutions", description: "Event systems and technical integration" },
      { company: "Zoom Logistics", description: "Event-material handling requirements" },
      { company: "Zoom Warehousing", description: "Event-material and equipment storage" },
      { company: "Zoom Education & Training", description: "Conferences, seminars and learning events" },
    ],
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep inactive, experimental or unsupported event services here. Do not place them in the public profile until management approves them.",
      needsInput: true,
    },
    serviceRatings: {
      value: "",
      placeholder:
        "Rate each service after reviewing customer demand, profit potential, ability to deliver, strategic value and supplier dependency.",
      needsInput: true,
    },
  },
  proof: [
    file("evn-project-1", "project", "Completed Event", "A delivered event with date, venue and outcome on file."),
    file("evn-client-1", "closed-client", "Closed Client", "A finished event client from the ERP."),
    file("evn-testimonial-1", "testimonial", "Client Testimonial", "Completed event feedback approved for use."),
    file("evn-case-1", "case-study", "Event Case Study", "A closed event case for internal use, then public use once approved."),
    file("evn-photo-1", "photograph", "Event Photographs", "Photographs from a completed event, stored in ERP."),
    file("evn-video-1", "video", "Event Video", "Video from a completed event, stored in ERP."),
    file("evn-programme-1", "programme", "Event Programme", "Programme from a completed event."),
    file("evn-report-1", "report", "Event Completion Report", "Close-out report from a completed event."),
    file("evn-scope-1", "scope", "Approved Event Scope", "Approved scope document stored in ERP."),
    file(
      "evn-venue-1",
      "venue-record",
      "Approved Venue or Production Record",
      "Venue or production record approved for internal use.",
    ),
  ],
  assets: [
    file("evn-profile-1", "company-profile", "Zoom Events Company Profile", "Ready-to-send Zoom Events company profile."),
    file("evn-catalog-1", "catalog", "Event Service Catalogue", "Catalogue of event services ready to send."),
    file("evn-brochure-1", "brochure", "Event Capabilities Brochure", "Brochure covering event capabilities."),
    file("evn-presentation-1", "presentation", "Event Presentation", "Pitch deck for event meetings."),
    file("evn-proposal-1", "proposal-template", "Event Proposal Template", "Template for event proposals."),
    file("evn-quotation-1", "quotation-template", "Event Quotation Template", "Template for event quotations."),
    file("evn-concept-1", "concept-template", "Event Concept Template", "Template for event concepts and scopes."),
    file("evn-venue-profile-1", "venue-profile", "Venue Profile", "Venue information pack ready to send."),
    file("evn-photos-1", "photography-portfolio", "Photography Portfolio", "Event photography portfolio ready to send."),
    file("evn-showreel-1", "video-showreel", "Event Showreel", "Event video showreel ready to send."),
    file("evn-social-1", "social", "Social Media Pack", "Ready posts and artwork for event promotion."),
    file("evn-forms-1", "forms", "Standard Event Forms and Checklists", "Standard forms and checklists ready to use."),
  ],
};
