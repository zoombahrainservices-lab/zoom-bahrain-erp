import type {
  CompanyService,
  DivisionProfile,
  ServiceGroup,
} from "@/lib/division-profiles";

const quoted = "Quoted according to campaign scope.";

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

export const advertisingProfile: DivisionProfile = {
  companyId: "advertising",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Advertising Campaigns, Media & Brand Communication",
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
        "Companies, government entities, institutions, retailers, property businesses, event organizers and brands operating in Bahrain.",
      problem:
        "Businesses often manage strategy, creative work, content, media placement, printing and campaign production through separate suppliers without one consistent direction.",
      offer:
        "Advertising campaigns, brand communication, creative content, digital advertising, social media, media placement, print, outdoor advertising and promotional materials.",
      value:
        "One coordinated advertising partner from the initial brief and campaign concept through production, publication and performance review.",
      pricing:
        "Project fees, monthly retainers, campaign packages, media-management fees, production margins, per-item charges or custom quotations.",
      delivery:
        "Brief, audience review, campaign direction, proposal, approval, production, launch, monitoring and completion.",
      keyProof: {
        value: "",
        placeholder: "No approved proof selected for public use yet.",
        needsInput: true,
      },
      zoomSupport:
        "Zoom Events, Software Solutions, Technology Solutions, E-Commerce and Professional Services.",
    },
    positioning: {
      overview:
        "Zoom Advertising plans and delivers advertising campaigns across digital, social, print, outdoor, promotional and event channels. We coordinate strategy, creative direction, content, production and media placement through one managed campaign process.",
      purpose:
        "To help organizations communicate clearly, reach the right audience and promote their brands, products, services and campaigns through professionally coordinated advertising.",
      roleWithinZoom:
        "Zoom Advertising leads brand communication, campaigns and promotional work for external clients and the other Zoom companies.",
      positioningStatement:
        "A coordinated advertising partner combining campaign direction, creative production and media execution under one commercial scope.",
      customerPromise: "Clear message. Consistent creative. Coordinated execution.",
    },
    segments: [
      {
        name: "Established companies",
        description:
          "Organizations requiring ongoing campaigns, corporate advertising, promotional materials and consistent brand communication.",
        mainNeed:
          "Reliable advertising support that follows the company's commercial objectives and brand standards.",
        desiredOutcome: "Consistent advertising across the channels used by the business.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Growing businesses and new brands",
        description:
          "Businesses entering the market, launching new services or improving how they present themselves.",
        mainNeed: "Clear market presentation, campaign direction and professional creative materials.",
        desiredOutcome: "A recognizable market presence supported by structured advertising.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Government and public organizations",
        description:
          "Government entities and public institutions communicating initiatives, events, programmes and public campaigns.",
        mainNeed: "Clear, controlled and professionally presented campaign materials.",
        desiredOutcome: "Consistent communication across approved public channels.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Retail and e-commerce businesses",
        description:
          "Businesses promoting products, offers, collections and online purchasing opportunities.",
        mainNeed: "Campaigns that connect products with the right customers and encourage action.",
        desiredOutcome: "Increased product visibility, enquiries, store visits or online purchases.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Event organizers and exhibitors",
        description:
          "Organizations promoting conferences, exhibitions, launches, ceremonies and branded experiences.",
        mainNeed: "Coordinated advertising before, during and after the event.",
        desiredOutcome: "Stronger awareness, attendance and event visibility.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "Property and business-service companies",
        description:
          "Companies promoting properties, commercial spaces, professional services and business solutions.",
        mainNeed: "Advertising that explains the offer clearly and generates qualified enquiries.",
        desiredOutcome: "Better market visibility and stronger lead generation.",
        includeInPdf: true,
        displayOrder: 6,
      },
    ],
    needs: [
      {
        need: "Clear campaign direction",
        outcome:
          "One campaign direction connecting the commercial objective, audience, message and selected channels.",
        displayOrder: 1,
      },
      {
        need: "Consistent brand communication",
        outcome:
          "Advertising materials that look and sound connected across digital, print and physical applications.",
        displayOrder: 2,
      },
      {
        need: "Professional creative production",
        outcome:
          "Campaign artwork, content, photography, video and promotional materials prepared to the approved standard.",
        displayOrder: 3,
      },
      {
        need: "Effective media execution",
        outcome:
          "Advertising published through the selected channels according to an approved schedule and budget.",
        displayOrder: 4,
      },
      {
        need: "Better campaign control",
        outcome:
          "One point of contact coordinating creative work, suppliers, media placement, production and reporting.",
        displayOrder: 5,
      },
      {
        need: "Measurable campaign activity",
        outcome: "Clear records of campaign delivery, media activity and available performance results.",
        displayOrder: 6,
      },
    ],
    serviceGroups: [
      group("Advertising Strategy & Campaigns", 1, [
        offer(
          "Campaign Planning",
          "Development of the campaign objective, audience, message, channels, deliverables and schedule.",
          "Approved campaign plan.",
          1,
        ),
        offer(
          "Advertising Campaign Management",
          "Coordination of creative work, production, publication, suppliers and campaign deadlines.",
          "Managed advertising campaign delivered according to the approved scope.",
          2,
        ),
        offer(
          "Campaign Concept Development",
          "Creation of the central campaign idea, message and visual direction.",
          "Approved campaign concept and creative direction.",
          3,
        ),
        offer(
          "Promotional Campaigns",
          "Planning and delivery of campaigns supporting products, services, offers, launches or commercial periods.",
          "Coordinated promotional campaign across the selected channels.",
          4,
        ),
        offer(
          "Corporate Advertising",
          "Advertising support for company announcements, capabilities, services, milestones and corporate communication.",
          "Corporate advertising materials prepared for publication.",
          5,
        ),
      ]),
      group("Brand Identity & Communication", 2, [
        offer(
          "Brand Identity Development",
          "Development or refinement of the visual identity used to represent a company, product or initiative.",
          "Approved identity direction and essential brand elements.",
          1,
        ),
        offer(
          "Brand Messaging",
          "Development of clear company, service or campaign messages for use across advertising materials.",
          "Approved messaging set.",
          2,
        ),
        offer(
          "Brand Guidelines",
          "Documentation of the approved logo, colors, typography and basic visual-application rules.",
          "Practical brand-guideline document.",
          3,
        ),
        offer(
          "Corporate Marketing Materials",
          "Development of company profiles, brochures, presentations, service catalogues and promotional documents.",
          "Approved digital or print-ready corporate materials.",
          4,
        ),
        offer(
          "Campaign Identity",
          "Creation of a dedicated visual and messaging system for a campaign, event, launch or initiative.",
          "Campaign identity and application set.",
          5,
        ),
      ]),
      group("Digital Advertising & Social Media", 3, [
        offer(
          "Social Media Management",
          "Planning, production, scheduling and coordination of ongoing social media content.",
          "Managed social media presence based on an approved content plan.",
          1,
        ),
        offer(
          "Social Media Advertising",
          "Creation and management of paid advertising campaigns across selected social platforms.",
          "Published and monitored social advertising campaign.",
          2,
        ),
        offer(
          "Search Advertising",
          "Planning and management of paid search campaigns designed to generate traffic, enquiries or sales.",
          "Active search advertising campaign with performance reporting.",
          3,
        ),
        offer(
          "Display and Video Advertising",
          "Creation and placement of digital banner, display and video advertisements.",
          "Published digital advertising assets across selected channels.",
          4,
        ),
        offer(
          "Content Calendars",
          "Planning of campaign themes, publication dates, content formats and required materials.",
          "Approved monthly or campaign-based content calendar.",
          5,
        ),
        offer(
          "Community and Enquiry Coordination",
          "Monitoring and handling of public comments, messages and basic campaign enquiries according to the agreed scope.",
          "Organized audience-response process.",
          6,
        ),
      ]),
      group("Creative Content Production", 4, [
        offer(
          "Advertising Artwork",
          "Design of campaign visuals for digital, print, outdoor and event applications.",
          "Approved advertising artwork in the required formats.",
          1,
        ),
        offer(
          "Copywriting",
          "Development of headlines, advertising copy, captions, calls to action and supporting campaign text.",
          "Approved campaign copy.",
          2,
        ),
        offer(
          "Photography",
          "Production of photographs for corporate, product, property, event and promotional use.",
          "Selected and edited photographs.",
          3,
        ),
        offer(
          "Videography",
          "Production of corporate videos, advertisements, interviews, event content and promotional footage.",
          "Edited video based on the approved scope.",
          4,
        ),
        offer(
          "Reels and Short-Form Content",
          "Production of short promotional videos for social media and digital campaigns.",
          "Platform-ready short-form video content.",
          5,
        ),
        offer(
          "Motion Graphics",
          "Creation of animated advertising elements, titles, messages and campaign visuals.",
          "Approved motion-graphics files.",
          6,
        ),
      ]),
      group("Media Planning & Placement", 5, [
        offer(
          "Media Planning",
          "Selection of suitable media channels based on the audience, objective, budget and campaign period.",
          "Recommended media plan.",
          1,
        ),
        offer(
          "Media Buying",
          "Coordination and purchase of advertising space or placement through selected media providers.",
          "Confirmed advertising placement.",
          2,
        ),
        offer(
          "Newspaper and Magazine Advertising",
          "Preparation and placement of advertisements in relevant publications.",
          "Print-ready advertisement and confirmed publication schedule.",
          3,
        ),
        offer(
          "Radio and Television Advertising",
          "Coordination of advertising content, production requirements and placement schedules.",
          "Approved broadcast advertisement and placement plan.",
          4,
        ),
        offer(
          "Digital Media Placement",
          "Placement of advertisements across websites, search platforms, social media and digital networks.",
          "Published digital campaign.",
          5,
        ),
        offer(
          "Campaign Scheduling",
          "Coordination of publication dates, placement periods, creative variations and campaign deadlines.",
          "Confirmed campaign schedule.",
          6,
        ),
      ]),
      group("Print, Outdoor & Promotional Advertising", 6, [
        offer(
          "Outdoor Advertising",
          "Coordination of billboards, outdoor panels, building advertisements and large-format campaign displays.",
          "Produced and installed outdoor advertisement.",
          1,
        ),
        offer(
          "Vehicle Advertising",
          "Design and production coordination for branded vehicles and mobile advertising applications.",
          "Approved and installed vehicle branding.",
          2,
        ),
        offer(
          "Point-of-Sale Advertising",
          "Development of retail displays, counter materials, product displays and promotional signage.",
          "Produced point-of-sale advertising materials.",
          3,
        ),
        offer(
          "Posters, Roll-Ups and Banners",
          "Design and production coordination for printed campaign materials.",
          "Print-ready artwork and produced items based on the approved order.",
          4,
        ),
        offer(
          "Brochures, Flyers and Catalogues",
          "Development and production of printed or digital promotional documents.",
          "Approved brochure, flyer or catalogue.",
          5,
        ),
        offer(
          "Promotional Gifts and Giveaways",
          "Sourcing, branding and supply coordination for campaign gifts and promotional products.",
          "Branded promotional items delivered according to the approved specification.",
          6,
        ),
        offer(
          "Direct Promotional Distribution",
          "Coordination of promotional-material or sample distribution where required.",
          "Completed distribution activity based on the approved plan.",
          7,
        ),
      ]),
      group("Event Advertising & Promotion", 7, [
        offer(
          "Event Advertising Campaigns",
          "Planning and delivery of advertising campaigns supporting conferences, exhibitions, launches and corporate events.",
          "Coordinated event-advertising campaign.",
          1,
        ),
        offer(
          "Invitations and Event Artwork",
          "Creation of invitations, programmes, speaker announcements, social materials and supporting event graphics.",
          "Approved event artwork package.",
          2,
        ),
        offer(
          "Exhibition and Activation Branding",
          "Development of branded visuals for booths, activation points, registration areas and event environments.",
          "Production-ready exhibition or activation artwork.",
          3,
        ),
        offer(
          "Event Media Placement",
          "Coordination of newspaper, digital, social or outdoor advertising supporting an event.",
          "Confirmed event-advertising placements.",
          4,
        ),
        offer(
          "Post-Event Content",
          "Preparation of photographs, videos, highlights and follow-up materials after the event.",
          "Approved post-event content package.",
          5,
        ),
      ]),
    ],
    whyZoom: [
      "One coordinated point for campaign planning, creative production and media execution.",
      "Advertising support across digital, social, print, outdoor, promotional and event channels.",
      "Consistent communication across campaign materials and customer touchpoints.",
      "Connected Zoom capabilities supporting events, software, technology and e-commerce.",
      "Flexible project, campaign and ongoing retainer arrangements.",
    ],
    workflow: [
      {
        name: "Client Brief",
        explanation:
          "Confirm the business objective, offer, target audience, required channels, timeline and available budget.",
        displayOrder: 1,
      },
      {
        name: "Brand and Market Review",
        explanation:
          "Review the existing brand, previous advertising, competitors and current market presentation.",
        displayOrder: 2,
      },
      {
        name: "Campaign Direction",
        explanation:
          "Define the message, campaign concept, channel plan, required deliverables and schedule.",
        displayOrder: 3,
      },
      {
        name: "Proposal and Quotation",
        explanation:
          "Present the recommended scope, commercial terms, responsibilities and required approvals.",
        displayOrder: 4,
      },
      {
        name: "Creative Development",
        explanation: "Prepare the campaign messaging, artwork, content and production direction.",
        displayOrder: 5,
      },
      {
        name: "Review and Approval",
        explanation:
          "Submit the materials for client review and obtain approval before production or publication.",
        displayOrder: 6,
      },
      {
        name: "Production and Placement",
        explanation:
          "Produce the approved materials and publish or install them through the selected channels.",
        displayOrder: 7,
      },
      {
        name: "Monitoring and Coordination",
        explanation:
          "Monitor active campaigns, manage agreed adjustments and coordinate remaining deliverables.",
        displayOrder: 8,
      },
      {
        name: "Completion and Reporting",
        explanation:
          "Close the campaign, organize final files and report the available delivery and performance information.",
        displayOrder: 9,
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Events",
        description: "Event delivery, activations, exhibition environments and physical campaign experiences.",
      },
      {
        company: "Zoom Software Solutions",
        description: "Campaign websites, landing pages, enquiry forms and customer-facing digital platforms.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Automation, campaign systems, analytics integration and advanced digital solutions.",
      },
      {
        company: "Zoom E-Commerce",
        description: "Products, online storefronts, promotional offers and digital purchasing campaigns.",
      },
      {
        company: "Zoom Professional Services",
        description: "Research, specialist content and project support.",
      },
    ],
    cta: {
      headline: "Start Your Advertising Campaign",
      supportingSentence:
        "Tell us what you need to promote, who you want to reach and when the campaign needs to run. Zoom Advertising will review the requirement and prepare the appropriate campaign scope.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [
      "The business has no clear advertising direction",
      "Campaign messages change across different channels",
      "Creative work is produced without a defined commercial objective",
      "Social media activity is inconsistent",
      "Advertising suppliers are managed separately",
      "Marketing materials do not follow one brand system",
      "Campaigns are launched without a clear audience or call to action",
      "Advertising budgets are used without structured planning",
      "Content production is delayed",
      "Media placement and production deadlines are not coordinated",
      "Campaign results are not recorded clearly",
      "Internal teams lack time or specialist advertising capability",
    ],
    buyingTriggers: [
      "A company, product or service is launching",
      "A new promotional campaign is approved",
      "Social media activity needs to become consistent",
      "A business enters Bahrain or targets a new market",
      "A company requires rebranding or refreshed communication",
      "An event, exhibition or conference requires promotion",
      "A property, warehouse or commercial offer needs advertising",
      "Sales are declining or enquiries are insufficient",
      "A seasonal or national campaign period is approaching",
      "Management requests a company profile, presentation or campaign",
      "Existing advertising is inconsistent or underperforming",
    ],
    alternatives: [
      "Internal marketing teams",
      "Independent designers and freelancers",
      "Digital marketing agencies",
      "Advertising agencies",
      "Media owners",
      "Printing companies",
      "Photography and video-production companies",
      "Direct management of advertising platforms",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Fixed project fee",
      "Monthly retainer",
      "Campaign-management fee",
      "Creative-development fee",
      "Media-management fee",
      "Percentage of advertising spend",
      "Production markup",
      "Supplier markup",
      "Per-design or per-content-item fee",
      "Photography or videography day rate",
      "Per-video or reel fee",
      "Print and production pricing",
      "Package pricing",
      "Custom quotation",
    ],
    revenueModels: [
      "Advertising campaign fees",
      "Monthly advertising and social media retainers",
      "Creative and content-production fees",
      "Media planning and placement fees",
      "Printing and production margins",
      "Photography and videography packages",
      "Branding and corporate-material projects",
      "Outdoor and promotional advertising margins",
      "Event-advertising packages",
      "Gifts and giveaway supply",
      "Cross-selling through other Zoom companies",
    ],
    supplierCategories: [
      "Printing companies",
      "Outdoor-media providers",
      "Newspapers and magazines",
      "Radio and television providers",
      "Digital media platforms",
      "Photographers and videographers",
      "Video-production specialists",
      "Voice-over artists",
      "Influencers and content creators",
      "Signage and fabrication companies",
      "Gift and promotional-product suppliers",
      "Freelance creative specialists",
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
        "Leave empty until the Advertising team completes its operational review. Do not save example gaps as confirmed information.",
      needsInput: true,
    },
    serviceOwnership: {
      note: "Zoom Advertising may promote these services but should not present their technical delivery as its own work.",
      groups: [
        {
          title: "Zoom Advertising owns",
          items: [
            "Advertising strategy",
            "Campaign concepts",
            "Branding and campaign communication",
            "Social media content and advertising",
            "Creative production",
            "Media planning and placement",
            "Print, outdoor and promotional advertising",
            "Event advertising",
          ],
        },
        {
          title: "Zoom Software Solutions owns",
          items: [
            "Websites",
            "Applications",
            "Portals",
            "Landing-page development",
            "Custom software",
          ],
        },
        {
          title: "Zoom Technology Solutions owns",
          items: [
            "Backend systems",
            "Advanced automation",
            "Digitalization",
            "Artificial intelligence solutions",
            "Systems integration",
          ],
        },
        {
          title: "Zoom E-Commerce owns",
          items: [
            "Online stores",
            "Product catalogues",
            "Online ordering",
            "Electronic checkout",
            "E-commerce operations",
          ],
        },
      ],
    },
    supportedBy: [
      { company: "Zoom Events", description: "Event delivery, activations and physical campaign experiences" },
      {
        company: "Zoom Software Solutions",
        description: "Campaign websites, landing pages and customer-facing digital platforms",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Automation, campaign systems and advanced digital solutions",
      },
      { company: "Zoom E-Commerce", description: "Products, online storefronts and digital purchasing campaigns" },
      { company: "Zoom Professional Services", description: "Research, specialist content and project support" },
    ],
    supports: [
      { company: "Zoom Real Estate", description: "Property advertising and presentation" },
      { company: "Zoom Events", description: "Campaigns, artwork and promotional materials" },
      { company: "Zoom Business Consultancy", description: "Corporate communication materials" },
      { company: "Zoom E-Commerce", description: "Product and sales campaigns" },
      { company: "Zoom Software Solutions", description: "Launch and lead-generation campaigns" },
      { company: "Zoom Technology Solutions", description: "Technology-product promotion" },
      { company: "Zoom Sports", description: "Programme and membership campaigns" },
      { company: "Zoom Education & Training", description: "Course and workshop promotion" },
      { company: "Zoom Logistics", description: "Service advertising" },
      { company: "Zoom Warehousing", description: "Warehouse and storage campaigns" },
    ],
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep inactive, experimental or unsupported advertising services here. Do not place them in the public profile until management approves them.",
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
    file(
      "adv-project-1",
      "project",
      "Completed Advertising Campaign",
      "A delivered advertising campaign with outcome on file.",
    ),
    file("adv-client-1", "closed-client", "Closed Client", "A finished advertising client from the ERP."),
    file(
      "adv-testimonial-1",
      "testimonial",
      "Client Testimonial",
      "Completed campaign feedback approved for use.",
    ),
    file(
      "adv-case-1",
      "case-study",
      "Campaign Case Study",
      "A closed campaign case for internal use, then public use once approved.",
    ),
    file(
      "adv-artwork-1",
      "artwork",
      "Approved Campaign Artwork",
      "Approved campaign artwork stored in ERP.",
    ),
    file(
      "adv-ad-1",
      "advertisement",
      "Published Advertisement",
      "A published advertisement record stored in ERP.",
    ),
    file(
      "adv-media-1",
      "media-record",
      "Media Placement Record",
      "Confirmed media placement record stored in ERP.",
    ),
    file(
      "adv-report-1",
      "report",
      "Campaign Performance Report",
      "Available delivery and performance information from a completed campaign.",
    ),
    file(
      "adv-photo-1",
      "photograph",
      "Photography Portfolio",
      "Photography from completed work, stored in ERP.",
    ),
    file("adv-video-1", "video", "Video Portfolio", "Video from completed work, stored in ERP."),
    file(
      "adv-sample-1",
      "sample",
      "Printed Production Sample",
      "A printed production sample stored in ERP.",
    ),
    file(
      "adv-brand-1",
      "brand-project",
      "Brand Identity Project",
      "A completed brand-identity project stored in ERP.",
    ),
  ],
  assets: [
    file(
      "adv-profile-1",
      "company-profile",
      "Zoom Advertising Company Profile",
      "Ready-to-send Zoom Advertising company profile.",
    ),
    file(
      "adv-catalog-1",
      "catalog",
      "Advertising Service Catalogue",
      "Catalogue of advertising services ready to send.",
    ),
    file(
      "adv-brochure-1",
      "brochure",
      "Advertising Capabilities Brochure",
      "Brochure covering advertising capabilities.",
    ),
    file("adv-presentation-1", "presentation", "Campaign Presentation", "Pitch deck for campaign meetings."),
    file(
      "adv-proposal-1",
      "proposal-template",
      "Campaign Proposal Template",
      "Template for advertising campaign proposals.",
    ),
    file(
      "adv-quotation-1",
      "quotation-template",
      "Advertising Quotation Template",
      "Template for advertising quotations.",
    ),
    file(
      "adv-social-catalog-1",
      "catalog",
      "Social Media Package Catalogue",
      "Catalogue of social media packages ready to send.",
    ),
    file("adv-media-plan-1", "media-plan-template", "Media Plan Template", "Template for media plans."),
    file(
      "adv-brand-portfolio-1",
      "brand-portfolio",
      "Brand Identity Portfolio",
      "Brand identity portfolio ready to send.",
    ),
    file(
      "adv-photos-1",
      "photography-portfolio",
      "Photography Portfolio",
      "Photography portfolio ready to send.",
    ),
    file("adv-showreel-1", "video-showreel", "Video Showreel", "Advertising video showreel ready to send."),
    file(
      "adv-poster-1",
      "poster",
      "Poster and Campaign Templates",
      "Poster and campaign templates ready to use.",
    ),
    file("adv-social-1", "social", "Social Media Pack", "Ready posts and artwork for campaign promotion."),
    file("adv-rate-card-1", "rate-card", "Advertising Rate Card", "Rate card ready to send."),
    file(
      "adv-cases-1",
      "case-study-collection",
      "Case Study Collection",
      "Collection of approved campaign case studies.",
    ),
  ],
};
