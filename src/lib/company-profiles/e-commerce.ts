import type {
  CompanyService,
  DivisionProfile,
  ServiceGroup,
} from "@/lib/division-profiles";

const quoted = "Quoted according to commerce arrangement.";

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

const customerProblems = [
  "Difficulty discovering suitable products online",
  "Unclear product information or availability",
  "Complicated ordering processes",
  "Weak communication after placing an order",
  "Limited payment or delivery options",
  "Unclear return and refund processes",
];

const merchantProblems = [
  "No independent online store",
  "Limited access to digital customers",
  "High cost of building and promoting an e-commerce platform",
  "Weak product presentation",
  "Difficulty managing online orders",
  "Limited advertising capability",
  "Disconnected stock, order and delivery information",
  "Lack of reliable sales reporting",
];

const customerTriggers = [
  "A product is needed immediately",
  "A promotion or discount becomes available",
  "The customer prefers online purchasing",
  "A product is difficult to find locally",
  "A recommendation or advertisement creates interest",
  "The customer wants home or business delivery",
];

const merchantTriggers = [
  "A business wants to begin selling online",
  "An existing store needs another sales channel",
  "A new product or collection is launched",
  "Sales through physical channels are insufficient",
  "A supplier enters the Bahrain market",
  "A merchant wants to test online demand",
  "A business wants platform support without building its own store",
];

export const eCommerceProfile: DivisionProfile = {
  companyId: "e-commerce",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Online Retail & Digital Commerce",
    primaryPlatform: "Hello One Bahrain",
    email: "info@zoombahrain.co",
    phone: "+973 3881 6222",
    mainMarket: "Bahrain",
    customerType: "B2C and B2B",
    contacts: [],
    social: [],
  },
  public: {
    snapshot: {
      customer:
        "Online shoppers, local merchants, brands, product suppliers, distributors and businesses seeking digital sales opportunities in Bahrain.",
      problem:
        "Customers want a simple way to discover and purchase products online, while merchants and suppliers need an effective digital channel for reaching customers and processing sales.",
      offer:
        "Online retail platforms, digital storefronts, product catalogues, marketplace operations, online ordering and coordinated fulfilment.",
      value:
        "A connected digital-commerce journey bringing products, merchants, customers, payments and order coordination into one platform.",
      pricing:
        "Retail product pricing, product margins, merchant commissions, marketplace fees, promotional placements and agreed commercial arrangements.",
      delivery:
        "Product onboarding, listing, promotion, customer ordering, payment, fulfilment coordination, delivery and customer support.",
      keyProof: {
        value: "Hello One Bahrain is Zoom's existing digital-commerce platform.",
      },
      zoomSupport:
        "Zoom Advertising, Software Solutions, Technology Solutions, Warehousing and Logistics.",
    },
    positioning: {
      overview:
        "Zoom E-Commerce operates online retail and marketplace platforms that connect products, merchants and customers. The company manages the digital purchasing journey from product presentation and online ordering through payment, fulfilment coordination and customer communication.",
      purpose:
        "To create practical digital sales channels that make products easier to discover, purchase and deliver across Bahrain.",
      roleWithinZoom:
        "Zoom E-Commerce operates the Group's online retail platforms and digital-commerce projects. It creates sales opportunities that can be supported by Zoom Advertising, Software Solutions, Technology Solutions, Warehousing and Logistics.",
      positioningStatement:
        "A connected digital-commerce company combining online retail operations with the wider capabilities of Zoom Group.",
      customerPromise: "Clear products. Simple ordering. Coordinated fulfilment.",
    },
    commercePortfolio: {
      intro:
        "This section will become the main public proof of Zoom E-Commerce. Each approved store, platform or commerce brand should be presented using the same structure.",
      structure: [
        { name: "Brand or platform name", description: "The store, platform or commerce brand.", displayOrder: 1 },
        { name: "Website", description: "The public website used by customers.", displayOrder: 2 },
        { name: "Customer audience", description: "Who the platform is built for.", displayOrder: 3 },
        { name: "Product categories", description: "The product ranges available on the platform.", displayOrder: 4 },
        { name: "Commercial model", description: "How the platform earns and charges.", displayOrder: 5 },
        { name: "Main customer benefit", description: "The principal reason customers or merchants use it.", displayOrder: 6 },
        { name: "Current status", description: "Whether the platform is live, planned or paused.", displayOrder: 7 },
        { name: "Key proof", description: "Approved evidence supporting the platform.", displayOrder: 8 },
        { name: "Supporting Zoom companies", description: "Other Zoom companies connected to the platform.", displayOrder: 9 },
      ],
      platforms: [
        {
          name: "Hello One Bahrain",
          type: "Online retail and marketplace platform.",
          website: "https://helloonebahrain.com",
          purpose: "Connect products and merchants with customers through one digital shopping platform.",
          customer:
            "Consumers searching for products online and merchants seeking an additional digital sales channel.",
          offer: "Product discovery, online ordering, promotional offers and coordinated order fulfilment.",
          status: "Existing Zoom e-commerce platform.",
          proof: {
            value: "",
            placeholder:
              "Add approved platform statistics, merchants, products, orders, customer feedback and commercial results when available.",
            needsInput: true,
          },
        },
      ],
    },
    segments: [
      {
        name: "Online shoppers",
        description:
          "Customers looking for a convenient way to discover, compare and purchase products online.",
        mainNeed: "Clear product information, straightforward ordering and reliable communication.",
        desiredOutcome: "A completed purchase with an organized delivery and support process.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Local merchants and brands",
        description: "Businesses seeking an additional digital channel for selling products.",
        mainNeed: "Online product visibility, order generation and access to digital customers.",
        desiredOutcome: "Products listed, promoted and available for online purchase.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Product suppliers and distributors",
        description: "Suppliers looking to sell products through a digital retail or marketplace channel.",
        mainNeed: "A structured commercial arrangement for listing and selling products online.",
        desiredOutcome: "Increased product reach supported by organized order and stock coordination.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Small businesses without their own online store",
        description:
          "Businesses that want to sell online without independently building and operating a complete e-commerce platform.",
        mainNeed: "Access to an existing digital storefront and purchasing journey.",
        desiredOutcome: "A practical route for receiving online orders.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Corporate and bulk buyers",
        description: "Organizations purchasing selected products in larger quantities or for business use.",
        mainNeed: "Clear product options, quantities, commercial terms and coordinated delivery.",
        desiredOutcome: "A completed business order managed through one commercial contact.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "Zoom-owned products and projects",
        description:
          "Products or services developed within Zoom Group that require an online purchasing channel.",
        mainNeed: "A digital route from promotion to customer payment.",
        desiredOutcome: "A complete online sales journey supported by the relevant Zoom companies.",
        includeInPdf: true,
        displayOrder: 6,
      },
    ],
    needs: [
      {
        need: "Product discovery",
        outcome: "Organized product categories, search, images, descriptions and pricing.",
        displayOrder: 1,
      },
      {
        need: "Simple online purchasing",
        outcome: "A clear journey from product selection through checkout and order confirmation.",
        displayOrder: 2,
      },
      {
        need: "Reliable product information",
        outcome: "Accurate product details, availability, price and purchasing conditions.",
        displayOrder: 3,
      },
      {
        need: "Order visibility",
        outcome: "Clear order confirmation, status communication and customer support.",
        displayOrder: 4,
      },
      {
        need: "Merchant market access",
        outcome: "Products presented to online customers through an active digital platform.",
        displayOrder: 5,
      },
      {
        need: "Coordinated fulfilment",
        outcome: "Stock, order preparation, delivery and returns coordinated through defined processes.",
        displayOrder: 6,
      },
      {
        need: "Promotional opportunities",
        outcome: "Products supported by offers, campaigns, bundles and featured placements.",
        displayOrder: 7,
      },
    ],
    serviceSection: {
      title: "Commerce operations",
      description:
        "Zoom E-Commerce is presented through the commerce platforms it operates, not as a generic list of unrelated services.",
    },
    serviceGroups: [
      group("Online Store Operations", 1, [
        offer(
          "Digital Storefront Management",
          "Management of the customer-facing online store, product navigation and purchasing journey.",
          "Operational digital storefront.",
          1,
        ),
        offer(
          "Product Catalogue Management",
          "Organization of products, categories, descriptions, images, prices and availability.",
          "Updated online product catalogue.",
          2,
        ),
        offer(
          "Checkout and Payment Coordination",
          "Management of the customer journey from cart through payment confirmation.",
          "Working digital checkout and payment process.",
          3,
        ),
        offer(
          "Online Sales Administration",
          "Monitoring and administration of orders, customer information and sales activity.",
          "Organized online-order records.",
          4,
        ),
      ]),
      group("Product & Merchant Management", 2, [
        offer(
          "Product Sourcing",
          "Identification and commercial review of products suitable for the platform.",
          "Approved products and supply arrangements.",
          1,
        ),
        offer(
          "Merchant Onboarding",
          "Collection and review of merchant, product, pricing, stock and fulfilment information.",
          "Approved merchant profile and listed products.",
          2,
        ),
        offer(
          "Product Listing",
          "Preparation and publication of product titles, descriptions, images, prices and variations.",
          "Customer-ready online product listing.",
          3,
        ),
        offer(
          "Product Merchandising",
          "Organization and presentation of products to improve visibility and purchasing clarity.",
          "Structured product placement across the platform.",
          4,
        ),
        offer(
          "Stock Availability Coordination",
          "Coordination of product availability between merchants, suppliers and the online platform.",
          "Updated product-availability information.",
          5,
        ),
      ]),
      group("Promotions & Sales Growth", 3, [
        offer(
          "Promotional Offers",
          "Creation and management of discounts, bundles, limited offers and campaign pricing.",
          "Published promotional offer.",
          1,
        ),
        offer(
          "Featured Product Placement",
          "Priority presentation of selected products, brands or merchants within the platform.",
          "Scheduled featured placement.",
          2,
        ),
        offer(
          "Product Campaigns",
          "Coordination of advertising campaigns designed to generate product awareness and sales.",
          "Product-sales campaign delivered with Zoom Advertising.",
          3,
        ),
        offer(
          "Cross-Selling and Bundles",
          "Combination of related products into more useful or commercially attractive offers.",
          "Approved product bundle or cross-sell arrangement.",
          4,
        ),
        offer(
          "Seasonal Campaigns",
          "Preparation of commerce activity around relevant seasonal and commercial periods.",
          "Seasonal product and promotion plan.",
          5,
        ),
      ]),
      group("Order & Customer Management", 4, [
        offer(
          "Order Processing",
          "Review and coordination of confirmed customer orders.",
          "Order processed for fulfilment.",
          1,
        ),
        offer(
          "Customer Communication",
          "Communication related to order confirmation, availability, delivery and support.",
          "Documented customer-order communication.",
          2,
        ),
        offer(
          "Order Status Management",
          "Tracking and updating the progress of orders from confirmation through completion.",
          "Current order-status record.",
          3,
        ),
        offer(
          "Returns and Refund Administration",
          "Coordination of approved product returns, replacements or refunds according to platform rules.",
          "Completed return or refund record.",
          4,
        ),
        offer(
          "Customer Support",
          "Handling of product, order and purchasing enquiries through the approved support channels.",
          "Recorded and resolved customer enquiry.",
          5,
        ),
      ]),
      group(
        "Fulfilment Coordination",
        5,
        [
          offer(
            "Inventory Storage Coordination",
            "Connection of product-stock requirements with Zoom Warehousing or an approved merchant facility.",
            "Confirmed product-storage arrangement.",
            1,
          ),
          offer(
            "Order Preparation",
            "Coordination of product picking, preparation and packaging.",
            "Order prepared for dispatch.",
            2,
          ),
          offer(
            "Delivery Coordination",
            "Connection of completed orders with Zoom Logistics or approved delivery providers.",
            "Order released for delivery.",
            3,
          ),
          offer(
            "Return Coordination",
            "Management of the physical return of approved products.",
            "Returned product received and recorded.",
            4,
          ),
        ],
        "Zoom E-Commerce manages the customer order and commercial journey. Warehousing and delivery operations remain with the companies responsible for those activities.",
      ),
      group("Platform & Commerce Management", 6, [
        offer(
          "Platform Performance Monitoring",
          "Review of store traffic, product activity, orders and available sales information.",
          "Commerce performance report.",
          1,
        ),
        offer(
          "Product and Sales Reporting",
          "Reporting on product availability, order volume, sales and merchant activity.",
          "Periodic commerce report.",
          2,
        ),
        offer(
          "Commerce Automation",
          "Implementation of approved automation supporting orders, communication, reporting and platform administration.",
          "Automated commerce workflow delivered with Zoom Technology Solutions.",
          3,
        ),
        offer(
          "Platform Development",
          "Development and improvement of digital storefronts, checkout functions and merchant tools.",
          "Platform feature delivered through Zoom Software Solutions.",
          4,
        ),
      ]),
    ],
    whyZoom: [
      "Existing digital-commerce capability through Hello One Bahrain.",
      "One connected journey covering products, promotion, ordering and fulfilment coordination.",
      "Zoom Advertising available to support product and merchant campaigns.",
      "Zoom Software Solutions and Technology Solutions available for platform development and automation.",
      "Zoom Warehousing and Logistics available for connected operational requirements.",
      "Flexible commercial arrangements for products, merchants and marketplace opportunities.",
    ],
    workflowTitle: "Customer purchase journey",
    workflow: [
      {
        name: "Discover",
        explanation:
          "The customer finds a product through the platform, search, advertising or promotional content.",
        displayOrder: 1,
      },
      {
        name: "Review",
        explanation:
          "The customer reviews the product information, price, availability and purchasing conditions.",
        displayOrder: 2,
      },
      {
        name: "Select",
        explanation: "The customer selects the product, quantity and available options.",
        displayOrder: 3,
      },
      {
        name: "Order",
        explanation: "The customer submits the order through the digital storefront.",
        displayOrder: 4,
      },
      {
        name: "Payment",
        explanation: "The customer completes the available payment process.",
        displayOrder: 5,
      },
      {
        name: "Fulfilment",
        explanation: "The product is confirmed, prepared and released for delivery.",
        displayOrder: 6,
      },
      {
        name: "Delivery",
        explanation: "The order is delivered or collected according to the confirmed arrangement.",
        displayOrder: 7,
      },
      {
        name: "Support",
        explanation:
          "The customer receives assistance with order questions, returns or follow-up requirements.",
        displayOrder: 8,
      },
    ],
    additionalWorkflows: [
      {
        title: "Merchant onboarding journey",
        steps: [
          {
            name: "Merchant Enquiry",
            explanation: "The merchant introduces the products and proposed commercial opportunity.",
            displayOrder: 1,
          },
          {
            name: "Product Review",
            explanation:
              "Zoom reviews the product category, demand, pricing, supply and fulfilment requirements.",
            displayOrder: 2,
          },
          {
            name: "Commercial Agreement",
            explanation:
              "The merchant and Zoom confirm the pricing, commission, stock, payment and responsibility structure.",
            displayOrder: 3,
          },
          {
            name: "Product Preparation",
            explanation:
              "Product descriptions, images, prices, variations and stock information are prepared.",
            displayOrder: 4,
          },
          {
            name: "Listing",
            explanation: "Approved products are published on the platform.",
            displayOrder: 5,
          },
          {
            name: "Promotion",
            explanation:
              "Products may be included in advertising campaigns, featured placements or promotional offers.",
            displayOrder: 6,
          },
          {
            name: "Order Management",
            explanation: "Orders are shared and processed according to the agreed merchant workflow.",
            displayOrder: 7,
          },
          {
            name: "Reporting and Settlement",
            explanation:
              "Sales information and commercial settlements are handled according to the agreed schedule.",
            displayOrder: 8,
          },
        ],
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Advertising",
        description:
          "Product campaigns, social media, advertising content, photography, video and promotional materials.",
      },
      {
        company: "Zoom Software Solutions",
        description: "Storefront development, platform features, checkout functions and merchant tools.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Automation, system integration, reporting and advanced commerce technology.",
      },
      {
        company: "Zoom Warehousing",
        description: "Inventory storage, stock handling and order-preparation support.",
      },
      {
        company: "Zoom Logistics",
        description: "Order movement, delivery coordination and connected logistics requirements.",
      },
      {
        company: "Zoom Professional Services",
        description:
          "Customized marketplace projects, merchant partnerships and commercial opportunity development.",
      },
    ],
    cta: {
      headline: "Sell or Shop Through Zoom E-Commerce",
      supportingSentence:
        "Customers can browse and purchase through our digital platforms. Merchants and suppliers can contact Zoom to discuss product listing and commercial opportunities.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [...customerProblems, ...merchantProblems],
    customerProblemGroups: [
      { title: "Customer problems", items: customerProblems },
      { title: "Merchant problems", items: merchantProblems },
    ],
    buyingTriggers: [...customerTriggers, ...merchantTriggers],
    buyingTriggerGroups: [
      { title: "Customers", items: customerTriggers },
      { title: "Merchants", items: merchantTriggers },
    ],
    alternatives: [
      "Independent brand websites",
      "Large online marketplaces",
      "Physical retail stores",
      "Social media selling",
      "WhatsApp ordering",
      "Classified websites",
      "Merchant-operated delivery systems",
      "Direct supplier sales",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Retail selling price",
      "Product markup",
      "Merchant commission",
      "Marketplace commission",
      "Product-listing fee",
      "Merchant subscription",
      "Featured-placement fee",
      "Promotional-campaign fee",
      "Order-processing fee",
      "Packaging fee",
      "Fulfilment fee",
      "Delivery fee",
      "Custom commercial agreement",
    ],
    revenueModels: [
      "Margin on products purchased and resold by Zoom",
      "Commission on merchant sales",
      "Marketplace fees",
      "Merchant subscriptions",
      "Featured-product placements",
      "Promotional campaign fees",
      "Product bundles",
      "Corporate and bulk orders",
      "Order-processing fees",
      "Platform-service fees",
      "Partnership revenue",
      "Cross-selling opportunities for other Zoom companies",
    ],
    revenueNote:
      "Warehousing, logistics, advertising, software and technology revenue must be recorded under the company delivering that work unless Zoom E-Commerce directly contracts and charges for the combined package.",
    merchantCommercialModels: [
      "Zoom purchases and resells the product",
      "Merchant lists products and Zoom earns commission",
      "Merchant pays a fixed listing fee",
      "Merchant pays a monthly platform fee",
      "Zoom and merchant share campaign costs and revenue",
      "Custom commercial arrangement",
    ],
    productEvaluation: {
      intro: "Assess every product or category against:",
      criteria: [
        "Customer demand",
        "Selling price",
        "Gross margin",
        "Supplier reliability",
        "Stock availability",
        "Storage requirements",
        "Delivery complexity",
        "Return risk",
        "Product quality",
        "Competition",
        "Promotional potential",
      ],
    },
    supplierCategories: [
      "Product manufacturers",
      "Distributors",
      "Local merchants",
      "Importers",
      "Packaging suppliers",
      "Payment providers",
      "Warehousing providers",
      "Delivery providers",
      "Product photographers",
      "Customer-support providers",
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
        "Record confirmed platform, payment, merchant, product, inventory, fulfilment and customer-support gaps. Do not save examples as confirmed information.",
      needsInput: true,
    },
    serviceOwnershipTitle: "Company ownership boundaries",
    serviceOwnership: {
      groups: [
        {
          title: "Zoom E-Commerce owns",
          items: [
            "Online retail operations",
            "Digital storefront management",
            "Product catalogues",
            "Merchant onboarding",
            "Product listing",
            "Online ordering",
            "Checkout and payment coordination",
            "Order administration",
            "Customer communication",
            "Marketplace operations",
            "Commerce reporting",
          ],
        },
        {
          title: "Zoom Software Solutions owns",
          items: [
            "Website development",
            "E-commerce platform development",
            "Mobile applications",
            "Checkout-feature development",
            "Merchant portals",
            "Custom software",
          ],
        },
        {
          title: "Zoom Technology Solutions owns",
          items: [
            "Backend systems",
            "System integrations",
            "Advanced automation",
            "Artificial intelligence",
            "Data and reporting infrastructure",
          ],
        },
        {
          title: "Zoom Advertising owns",
          items: [
            "Product advertising",
            "Social media campaigns",
            "Content production",
            "Photography and video",
            "Promotional campaigns",
          ],
        },
        {
          title: "Zoom Warehousing owns",
          items: [
            "Physical inventory storage",
            "Stock handling",
            "Picking and order preparation",
            "Warehouse records",
          ],
        },
        {
          title: "Zoom Logistics owns",
          items: [
            "Cargo handling",
            "Movement and delivery coordination",
            "Connected logistics operations",
          ],
        },
      ],
    },
    supportedBy: [
      {
        company: "Zoom Advertising",
        description:
          "Product campaigns, social media, advertising content, photography, video and promotional materials",
      },
      {
        company: "Zoom Software Solutions",
        description: "Storefront development, platform features, checkout functions and merchant tools",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Automation, system integration, reporting and advanced commerce technology",
      },
      {
        company: "Zoom Warehousing",
        description: "Inventory storage, stock handling and order-preparation support",
      },
      {
        company: "Zoom Logistics",
        description: "Order movement, delivery coordination and connected logistics requirements",
      },
      {
        company: "Zoom Professional Services",
        description:
          "Customized marketplace projects, merchant partnerships and commercial opportunity development",
      },
    ],
    supports: [
      { company: "Zoom Advertising", description: "Product and merchant campaigns" },
      { company: "Zoom Software Solutions", description: "Platform-development opportunities" },
      { company: "Zoom Technology Solutions", description: "Automation and system projects" },
      { company: "Zoom Warehousing", description: "Inventory-storage requirements" },
      { company: "Zoom Logistics", description: "Delivery and fulfilment requirements" },
      { company: "Zoom Professional Services", description: "Merchant and marketplace partnerships" },
    ],
    unpromotedTitle: "Products and categories not currently promoted",
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep unapproved, unavailable or experimental product categories here. Do not publish them until their supply, pricing and fulfilment have been confirmed.",
      needsInput: true,
    },
    serviceRatingsTitle: "Internal category ratings",
    serviceRatings: {
      value: "",
      placeholder:
        "Assess each product category against demand, margin, supply reliability, inventory risk, fulfilment complexity, return rate, strategic value and promotional potential.",
      needsInput: true,
    },
  },
  proof: [
    file("ecm-platform-1", "live-platform", "Live Commerce Platform", "A live commerce platform stored in ERP."),
    file("ecm-store-1", "store", "Active Store or Marketplace", "An active store or marketplace record stored in ERP."),
    file("ecm-merchant-1", "merchant", "Approved Merchant", "An approved merchant record stored in ERP."),
    file("ecm-range-1", "product-range", "Listed Product Range", "A listed product range stored in ERP."),
    file("ecm-order-1", "customer-order", "Completed Customer Order", "A completed customer order stored in ERP."),
    file("ecm-bulk-1", "bulk-order", "Corporate or Bulk Order", "A completed corporate or bulk order stored in ERP."),
    file("ecm-review-1", "customer-review", "Customer Review", "Approved customer review stored in ERP."),
    file(
      "ecm-testimonial-1",
      "testimonial",
      "Merchant Testimonial",
      "Completed merchant feedback approved for use.",
    ),
    file(
      "ecm-case-1",
      "case-study",
      "E-Commerce Case Study",
      "A closed commerce case for internal use, then public use once approved.",
    ),
    file("ecm-report-1", "report", "Sales Performance Report", "Sales performance report stored in ERP."),
    file("ecm-campaign-1", "product-campaign", "Product Campaign", "A completed product campaign stored in ERP."),
    file("ecm-fulfilment-1", "fulfilment-record", "Fulfilment Record", "A fulfilment record stored in ERP."),
    file("ecm-screenshot-1", "screenshot", "Platform Screenshot", "Approved platform screenshot stored in ERP."),
    file(
      "ecm-journey-1",
      "order-journey",
      "Order-Journey Evidence",
      "Approved order-journey evidence stored in ERP.",
    ),
  ],
  assets: [
    file(
      "ecm-profile-1",
      "company-profile",
      "Zoom E-Commerce Company Profile",
      "Ready-to-send Zoom E-Commerce company profile.",
    ),
    file(
      "ecm-portfolio-1",
      "platform-portfolio",
      "Commerce Platform Portfolio",
      "Portfolio of commerce platforms ready to send.",
    ),
    file(
      "ecm-helloone-1",
      "platform-profile",
      "Hello One Bahrain Profile",
      "Hello One Bahrain platform profile ready to send.",
    ),
    file(
      "ecm-onboarding-1",
      "onboarding-pack",
      "Merchant Onboarding Pack",
      "Merchant onboarding pack ready to send.",
    ),
    file(
      "ecm-supplier-1",
      "supplier-pack",
      "Supplier Information Pack",
      "Supplier information pack ready to send.",
    ),
    file(
      "ecm-listing-1",
      "listing-template",
      "Product Listing Template",
      "Template for product listings.",
    ),
    file(
      "ecm-terms-1",
      "commercial-terms",
      "Merchant Commercial Terms",
      "Merchant commercial terms ready to send.",
    ),
    file("ecm-catalog-1", "catalog", "Product Catalogue", "Product catalogue ready to send."),
    file(
      "ecm-corporate-1",
      "catalog",
      "Corporate Order Catalogue",
      "Corporate order catalogue ready to send.",
    ),
    file(
      "ecm-presentation-1",
      "presentation",
      "Marketplace Presentation",
      "Pitch deck for marketplace meetings.",
    ),
    file(
      "ecm-calendar-1",
      "campaign-calendar",
      "Product Campaign Calendar",
      "Product campaign calendar ready to use.",
    ),
    file(
      "ecm-photo-guide-1",
      "photography-guide",
      "Product Photography Guide",
      "Product photography guide ready to send.",
    ),
    file("ecm-social-1", "social", "Social Media Pack", "Ready posts and artwork for commerce promotion."),
    file(
      "ecm-screens-1",
      "screenshot",
      "Storefront Screenshots",
      "Approved storefront screenshots ready to send.",
    ),
    file(
      "ecm-performance-1",
      "report-template",
      "Commerce Performance Report",
      "Commerce performance report template ready to use.",
    ),
    file(
      "ecm-cases-1",
      "case-study-collection",
      "E-Commerce Case Study Collection",
      "Collection of approved e-commerce case studies.",
    ),
  ],
};
