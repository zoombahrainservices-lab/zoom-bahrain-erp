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

const receivingPricing = "Per assignment, unit, load or recurring contract.";
const localTransportPricing = "Per trip, vehicle, route or recurring agreement.";
const pickupPricing = "Per trip, delivery point or scheduled contract.";
const warehouseConnectedPricing =
  "Combined custom quotation with charges assigned to the responsible Zoom companies.";
const distributionPricing = "Per route, stop, order or recurring distribution contract.";
const projectCargoPricing =
  "Project fee based on handling, transport, equipment and coordination requirements.";

export const logisticsProfile: DivisionProfile = {
  companyId: "logistics",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Cargo Handling & Coordinated Logistics",
    email: "info@zoombahrain.co",
    phone: "+973 3881 4222",
    mainMarket: "Bahrain and GCC",
    customerType: "B2B and B2G",
    contacts: [],
    social: [],
  },
  public: {
    snapshot: {
      customer:
        "Importers, exporters, distributors, manufacturers, retailers, e-commerce businesses and organizations moving commercial goods.",
      problem:
        "Cargo movement requires several suppliers, handovers and documents, making communication, timing and delivery difficult to control.",
      offer:
        "Cargo handling, transport coordination, freight coordination, pickup, delivery, distribution and warehouse-connected logistics.",
      value:
        "One point of coordination across cargo handling, movement, storage connections and final delivery.",
      pricing:
        "Per shipment, trip, vehicle, handling team, delivery point, project or recurring contract.",
      delivery:
        "Shipment review, route planning, supplier confirmation, quotation, handling, transport, delivery confirmation and follow-up.",
      keyProof: {
        value: "",
        placeholder:
          "Approved handling jobs, completed deliveries, shipment records, recurring clients and logistics case studies linked from the ERP.",
        needsInput: true,
      },
      zoomSupport:
        "Zoom Warehousing, Zoom Software Solutions, Zoom Technology Solutions, Zoom E-Commerce and Zoom Professional Services.",
    },
    positioning: {
      overview:
        "Zoom Logistics coordinates the handling and movement of commercial goods in Bahrain and across the GCC. We combine cargo-handling capability with transport, freight, delivery and distribution services coordinated through suitable logistics providers.",
      purpose:
        "Give businesses one point of contact for moving goods from collection through handling, transportation and final delivery.",
      roleWithinZoom:
        "Zoom's cargo-movement and logistics-coordination company, connecting customers, transport providers, handling operations and Zoom Warehousing.",
      positioningStatement:
        "A coordinated logistics partner for businesses requiring dependable cargo handling, transport and delivery support.",
      customerPromise: "Handled correctly. Coordinated clearly. Delivered as planned.",
    },
    segments: [
      {
        name: "Importers, Exporters & Distributors",
        description: "Businesses receiving, moving and distributing commercial goods.",
        mainNeed: "Coordinated handling, transport and delivery across several locations.",
        desiredOutcome: "Goods moved according to the agreed route, timing and delivery requirements.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Manufacturers & Industrial Companies",
        description: "Companies moving raw materials, equipment and finished products.",
        mainNeed: "Reliable movement between suppliers, production facilities, warehouses and customers.",
        desiredOutcome: "Consistent material and product flow supporting business operations.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Retailers & E-Commerce Businesses",
        description: "Businesses requiring stock movement and customer-order delivery.",
        mainNeed: "Pickup, distribution and delivery connected to stock availability and customer orders.",
        desiredOutcome: "Orders delivered through a clear and trackable process.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Warehousing Customers",
        description: "Businesses storing goods with Zoom or another warehouse provider.",
        mainNeed: "Coordinated inbound and outbound transport.",
        desiredOutcome:
          "Goods collected, received, stored, released and delivered through one connected process.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Project-Based Businesses",
        description: "Companies moving equipment, materials or goods for projects, installations and events.",
        mainNeed: "Transport and handling arranged around the project schedule and site conditions.",
        desiredOutcome: "Required materials delivered to the correct location at the agreed time.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "Corporate & Government Organizations",
        description:
          "Organizations requiring controlled movement and delivery of purchased goods, equipment or materials.",
        mainNeed: "Clear scope, supplier coordination and documented delivery.",
        desiredOutcome: "Completed movement with proper communication and delivery confirmation.",
        includeInPdf: true,
        displayOrder: 6,
      },
    ],
    needs: [
      {
        need: "Loading & Unloading Cargo",
        outcome: "Goods handled by an organized team using the appropriate method and equipment.",
        displayOrder: 1,
      },
      {
        need: "Moving Goods Within Bahrain",
        outcome: "Pickup and delivery completed through a confirmed vehicle, route and schedule.",
        displayOrder: 2,
      },
      {
        need: "Coordinating GCC Transportation",
        outcome: "Cross-border transport arranged with the required provider, route and shipment information.",
        displayOrder: 3,
      },
      {
        need: "Connecting Warehousing & Delivery",
        outcome: "Inbound and outbound movement coordinated with storage, receiving and release activities.",
        displayOrder: 4,
      },
      {
        need: "Managing Multiple Delivery Points",
        outcome: "Goods distributed across several locations through one delivery plan.",
        displayOrder: 5,
      },
      {
        need: "Coordinating Freight Requirements",
        outcome: "Shipment arrangements managed with the relevant freight and transport providers.",
        displayOrder: 6,
      },
      {
        need: "Handling Special Cargo Requirements",
        outcome:
          "A delivery plan prepared around the cargo type, dimensions, handling conditions and timing.",
        displayOrder: 7,
      },
    ],
    serviceGroups: [
      group("Cargo Handling", 1, [
        offer(
          "Cargo Loading & Unloading",
          "Organized loading and unloading of commercial goods at approved operating locations.",
          "Cargo loaded or unloaded according to the agreed quantity, location and handling requirements.",
          1,
          "Per handling team, hour, load, container, pallet or custom quotation.",
        ),
        offer(
          "Goods Receiving & Dispatch Handling",
          "Physical handling of goods entering or leaving a warehouse, facility or customer site.",
          "Goods received, staged or released for the next stage of movement.",
          2,
          receivingPricing,
        ),
        offer(
          "Cargo Sorting & Staging",
          "Organization of goods before loading, dispatch or distribution.",
          "Cargo grouped, staged and prepared according to the agreed shipment or destination plan.",
          3,
          receivingPricing,
        ),
        offer(
          "Handling Manpower & Equipment Coordination",
          "Coordination of the personnel and equipment required for a cargo-handling assignment.",
          "A confirmed handling team and required equipment for the approved work.",
          4,
          "Hourly, daily or project fee plus equipment costs.",
        ),
      ]),
      group("Bahrain Transport", 2, [
        offer(
          "Local Road Transport Coordination",
          "Coordination of commercial transport between locations within Bahrain.",
          "A confirmed vehicle, pickup schedule, route and delivery arrangement.",
          1,
          localTransportPricing,
        ),
        offer(
          "Pickup & Delivery Coordination",
          "Collection and delivery of goods between suppliers, warehouses, businesses and customer locations.",
          "Completed pickup and delivery with status communication and delivery confirmation.",
          2,
          pickupPricing,
        ),
        offer(
          "Dedicated Vehicle Coordination",
          "Arrangement of a dedicated vehicle for a specific shipment, route or period.",
          "A confirmed vehicle assigned to the approved cargo and delivery requirement.",
          3,
          localTransportPricing,
        ),
        offer(
          "Scheduled & Recurring Transport",
          "Regular transport arranged for businesses with repeated movement requirements.",
          "An agreed transport schedule covering routes, frequency, vehicles and reporting.",
          4,
          localTransportPricing,
        ),
      ]),
      group("GCC & Freight Coordination", 3, [
        offer(
          "GCC Road Transport Coordination",
          "Coordination of road transportation between Bahrain and GCC destinations.",
          "A confirmed transport arrangement covering route, provider, shipment details and delivery requirements.",
          1,
          "Supplier cost plus coordination fee or commercial margin.",
        ),
        offer(
          "Air & Sea Freight Coordination",
          "Coordination with approved freight providers for air or sea shipment requirements.",
          "A managed freight arrangement based on the shipment, destination and required mode.",
          2,
          "Freight-provider cost plus coordination fee or commercial margin.",
          "supporting",
        ),
        offer(
          "Shipment Documentation Coordination",
          "Collection and coordination of the commercial information required by the selected logistics providers.",
          "An organized shipment file containing the required customer and provider documents.",
          3,
          "Fixed coordination fee or included within the shipment quotation.",
          "supporting",
        ),
        offer(
          "Customs Clearance Coordination",
          "Coordination with an appropriate customs-clearance provider when required.",
          "A confirmed clearance arrangement with the required shipment information transferred to the provider.",
          4,
          "Provider cost plus approved coordination fee.",
          "supporting",
        ),
      ]),
      group("Distribution & Delivery", 4, [
        offer(
          "Business Distribution",
          "Movement of goods from a central location to branches, retailers or customer locations.",
          "A coordinated distribution route with confirmed delivery points and completed handovers.",
          1,
          distributionPricing,
        ),
        offer(
          "Multi-Point Delivery",
          "Delivery of one shipment across several approved locations.",
          "Completed deliveries according to the agreed destination list and route.",
          2,
          distributionPricing,
        ),
        offer(
          "E-Commerce Delivery Coordination",
          "Delivery coordination for online orders through approved delivery providers.",
          "Orders assigned, collected and delivered according to the agreed customer information.",
          3,
          pickupPricing,
          "supporting",
        ),
        offer(
          "Last-Mile Delivery Coordination",
          "Coordination of the final movement from a warehouse or distribution point to the customer.",
          "Final delivery with status tracking and delivery confirmation where available.",
          4,
          pickupPricing,
          "supporting",
        ),
      ]),
      group("Warehouse-Connected Logistics", 5, [
        offer(
          "Inbound Warehouse Coordination",
          "Coordination of goods arriving at Zoom Warehousing or another approved facility.",
          "A confirmed inbound schedule connecting transport, unloading and warehouse receiving.",
          1,
          warehouseConnectedPricing,
        ),
        offer(
          "Outbound Warehouse Coordination",
          "Coordination of goods released from storage for transport or customer delivery.",
          "A confirmed outbound schedule connecting stock release, loading and delivery.",
          2,
          warehouseConnectedPricing,
        ),
        offer(
          "Storage, Handling & Delivery Solutions",
          "A combined solution delivered with Zoom Warehousing.",
          "A coordinated service covering storage, cargo handling and movement according to the agreed scope.",
          3,
          warehouseConnectedPricing,
        ),
      ]),
      group("Specialized Logistics", 6, [
        offer(
          "Temperature-Controlled Transport Coordination",
          "Coordination of transport for goods requiring specific temperature conditions.",
          "A transport arrangement with the required vehicle type, conditions and delivery schedule.",
          1,
          "Custom quotation based on vehicle, conditions, route and duration.",
          "supporting",
        ),
        offer(
          "Project Cargo Coordination",
          "Planning and coordination for cargo linked to projects, installations or time-sensitive operations.",
          "A project-specific movement plan covering cargo, vehicles, handling, schedule and delivery points.",
          2,
          projectCargoPricing,
          "supporting",
        ),
        offer(
          "Special Handling Requirements",
          "Coordination for oversized, heavy, fragile or otherwise specialized commercial goods.",
          "A handling and movement plan based on the confirmed cargo characteristics.",
          3,
          projectCargoPricing,
          "supporting",
        ),
      ]),
    ],
    whyZoom: [
      "One point of contact for handling, transport and delivery.",
      "Coordination between customers, warehouses and logistics providers.",
      "Bahrain and GCC movement options.",
      "Direct connection with Zoom Warehousing.",
      "Flexible support for individual shipments and recurring requirements.",
      "Cargo-handling and transport requirements managed through one process.",
      "Connected digital support for tracking, documentation and reporting.",
      "Customized solutions based on cargo, route, timing and destination.",
    ],
    workflow: [
      {
        name: "Enquiry",
        explanation: "The customer provides the cargo and movement requirement.",
        displayOrder: 1,
      },
      {
        name: "Shipment Review",
        explanation:
          "We confirm the cargo type, quantity, dimensions, weight, pickup, destination and timeline.",
        displayOrder: 2,
      },
      {
        name: "Route & Delivery Planning",
        explanation:
          "The required handling, vehicle, route, delivery points and warehouse connections are identified.",
        displayOrder: 3,
      },
      {
        name: "Supplier & Cost Confirmation",
        explanation: "Suitable transport, freight, equipment and handling resources are confirmed.",
        displayOrder: 4,
      },
      {
        name: "Quotation",
        explanation: "The customer receives the approved scope, pricing and delivery conditions.",
        displayOrder: 5,
      },
      {
        name: "Confirmation & Scheduling",
        explanation: "Payment or commercial approval is completed and the job is scheduled.",
        displayOrder: 6,
      },
      {
        name: "Pickup & Handling",
        explanation: "Cargo is collected, loaded, unloaded or staged according to the approved plan.",
        displayOrder: 7,
      },
      {
        name: "Transportation",
        explanation: "The confirmed provider moves the goods along the agreed route.",
        displayOrder: 8,
      },
      {
        name: "Delivery & Confirmation",
        explanation: "The goods are delivered and the available delivery confirmation is recorded.",
        displayOrder: 9,
      },
      {
        name: "Follow-Up",
        explanation:
          "Any exceptions, repeat requirements, warehousing needs or future movements are reviewed.",
        displayOrder: 10,
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Warehousing",
        description: "Commercial storage, receiving, inventory administration and stock release.",
      },
      {
        company: "Zoom Software Solutions",
        description: "Booking systems, customer portals, digital forms and delivery records.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "System integration, automation, dashboards and logistics data environments.",
      },
      {
        company: "Zoom E-Commerce",
        description: "Online-order requirements, product information and customer-delivery coordination.",
      },
      {
        company: "Zoom Professional Services",
        description: "Special projects, supplier coordination and customized commercial requirements.",
      },
      {
        company: "Zoom Events",
        description: "Transport and handling requirements connected to event materials and equipment.",
      },
    ],
    cta: {
      headline: "Plan Your Cargo Movement",
      supportingSentence:
        "Tell us what you are moving, where it is located and where it needs to go. We will review the handling, transport and delivery requirements.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    deliveryClassification: [
      {
        name: "Direct Operations",
        description:
          "Cargo-handling activities performed through Zoom's available personnel, equipment or operating arrangements.",
        displayOrder: 1,
      },
      {
        name: "Coordinated Logistics",
        description:
          "Transport, freight, customs, specialized equipment and delivery activities coordinated through approved providers.",
        displayOrder: 2,
      },
      {
        name: "Cross-Company Delivery",
        description: "Storage and inventory services delivered and recorded under Zoom Warehousing.",
        displayOrder: 3,
      },
    ],
    customerProblems: [
      "Customers coordinate separate handling, transport and delivery providers.",
      "Vehicles arrive without matching the cargo requirements.",
      "Pickup and delivery times are poorly communicated.",
      "Cargo information is incomplete.",
      "Warehouses and transport providers are not coordinated.",
      "Goods are delayed during handover.",
      "Customers do not receive clear delivery updates.",
      "Businesses lack reliable recurring transport arrangements.",
      "Multiple delivery locations are difficult to organize.",
      "Supplier rates change between shipments.",
      "Special cargo requirements are identified too late.",
      "Shipment documents are scattered across messages and emails.",
      "Companies need GCC transport but lack suitable providers.",
      "E-commerce businesses struggle with delivery coordination.",
      "Project materials arrive outside the required schedule.",
    ],
    buyingTriggers: [
      "New goods arrive in Bahrain.",
      "A customer receives a large commercial order.",
      "Stock needs to move between warehouses.",
      "A company changes its warehouse location.",
      "Goods need to be distributed to branches or retailers.",
      "An importer needs delivery from a port or supplier.",
      "An exporter prepares a GCC shipment.",
      "A business begins selling online.",
      "A project requires materials at a specific time.",
      "A warehouse customer requests stock release and delivery.",
      "A regular transport provider becomes unavailable.",
      "Seasonal demand increases shipment volume.",
      "A business requires recurring scheduled deliveries.",
      "Fragile, large or temperature-sensitive goods need movement.",
    ],
    alternatives: [
      "Transport companies.",
      "Freight-forwarding companies.",
      "Courier services.",
      "Independent truck owners.",
      "Customs-clearance providers.",
      "Warehouse transport services.",
      "Internal company vehicles.",
      "Delivery-platform providers.",
      "Individual handling crews.",
      "Direct supplier-to-customer transport.",
      "Separate freight, handling and distribution companies.",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Fee per shipment.",
      "Fee per trip.",
      "Fee per vehicle.",
      "Fee per route.",
      "Fee per delivery point.",
      "Fee per container or load.",
      "Fee per pallet or handling unit.",
      "Handling-team fee.",
      "Hourly or daily manpower fee.",
      "Equipment fee.",
      "Freight coordination fee.",
      "Monthly transport contract.",
      "Distribution contract.",
      "Supplier cost plus commercial margin.",
      "Custom quotation.",
    ],
    pricingVariables: [
      "Cargo type.",
      "Quantity.",
      "Weight and dimensions.",
      "Packaging.",
      "Pickup and delivery locations.",
      "Number of delivery points.",
      "Vehicle type.",
      "Handling equipment.",
      "Number of workers.",
      "Loading and unloading conditions.",
      "Distance and route.",
      "Bahrain or GCC movement.",
      "Urgency.",
      "Waiting time.",
      "Special handling requirements.",
      "Temperature requirements.",
      "Documentation requirements.",
      "Customs or freight-provider requirements.",
      "Recurring or one-time movement.",
    ],
    revenueModels: [
      "Direct cargo-handling fees.",
      "Transport coordination margins.",
      "Freight coordination fees.",
      "Distribution contracts.",
      "Recurring transport agreements.",
      "Delivery charges.",
      "Handling manpower fees.",
      "Equipment coordination margins.",
      "Project logistics fees.",
      "Documentation and coordination fees.",
      "Managed supplier margins.",
      "Monthly logistics retainers.",
      "Cross-selling opportunities for Zoom Warehousing.",
    ],
    revenueNote:
      "Revenue belonging to storage must be recorded under Zoom Warehousing to avoid double-counting.",
    supplierCategoriesTitle: "Supplier arrangements",
    supplierCategories: [
      "Bahrain transport companies.",
      "GCC road-transport providers.",
      "Freight forwarders.",
      "Customs-clearance providers.",
      "Last-mile delivery providers.",
      "Handling-equipment providers.",
      "Manpower providers.",
      "Temperature-controlled transport providers.",
      "Specialist cargo providers.",
      "Packaging and pallet suppliers.",
    ],
    programRecords: {
      title: "Supplier records",
      intro: "Every supplier record should include:",
      items: [
        "Service area.",
        "Vehicle or equipment types.",
        "Coverage locations.",
        "Rate structure.",
        "Contact person.",
        "Availability.",
        "Payment terms.",
        "Waiting-time charges.",
        "Cancellation terms.",
        "Required cargo information.",
        "Previous jobs.",
        "Internal performance notes.",
      ],
    },
    participantInformation: {
      title: "Shipment information required",
      intro: "Collect before pricing:",
      items: [
        "Customer.",
        "Cargo description.",
        "Number of units.",
        "Packaging type.",
        "Weight.",
        "Dimensions.",
        "Pickup address.",
        "Delivery address.",
        "Contact persons.",
        "Required date and time.",
        "Loading conditions.",
        "Unloading conditions.",
        "Required vehicle.",
        "Handling equipment.",
        "Special conditions.",
        "Documents provided.",
        "Insurance requirement where requested.",
        "Warehouse connection.",
        "Number of delivery points.",
      ],
    },
    programControls: {
      title: "Job controls",
      intro: "Every active logistics job should record:",
      items: [
        "Job reference.",
        "Customer.",
        "Approved quotation.",
        "Supplier.",
        "Supplier cost.",
        "Customer price.",
        "Expected margin.",
        "Cargo information.",
        "Pickup time.",
        "Delivery time.",
        "Handling requirements.",
        "Driver or provider contact.",
        "Status updates.",
        "Delivery confirmation.",
        "Issues or delays.",
        "Client communication.",
        "Final supplier invoice.",
        "Client invoice.",
        "Related warehousing record.",
      ],
    },
    supplierArrangements: {
      value: "",
      placeholder: "Add approved transport, freight, handling and delivery provider names and terms when confirmed.",
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
        "Add only confirmed gaps. Do not save examples as confirmed information. Typical items to review later include missing transport-provider agreements, missing standard supplier rates, missing vehicle availability records, missing handling manpower, missing handling equipment, missing GCC provider coverage, missing temperature-controlled providers, missing shipment-tracking process, missing job-control procedure, missing proof of delivery records, missing approved case studies, missing recurring client references and missing supplier-performance records.",
      needsInput: true,
    },
    serviceOwnershipTitle: "Ownership boundaries",
    serviceOwnership: {
      groups: [
        {
          title: "Zoom Logistics owns",
          items: [
            "Cargo handling.",
            "Loading and unloading.",
            "Transport coordination.",
            "Freight coordination.",
            "Pickup and delivery.",
            "Distribution.",
            "Shipment coordination.",
            "Logistics-provider management.",
            "Warehouse inbound and outbound movement.",
            "Project logistics.",
          ],
        },
        {
          title: "Zoom Warehousing owns",
          items: [
            "Physical storage.",
            "Warehouse space.",
            "Goods custody.",
            "Inventory administration.",
            "Storage-location management.",
            "Receiving into storage.",
            "Stock release.",
            "Storage reporting.",
          ],
        },
        {
          title: "Zoom E-Commerce owns",
          items: [
            "Online orders.",
            "Product listings.",
            "Merchant management.",
            "Customer-order administration.",
            "Online retail operations.",
          ],
        },
        {
          title: "Zoom Software Solutions owns",
          items: [
            "Logistics websites.",
            "Booking systems.",
            "Customer portals.",
            "Delivery applications.",
          ],
        },
        {
          title: "Zoom Technology Solutions owns",
          items: [
            "Logistics automation.",
            "Systems integration.",
            "Tracking environments.",
            "Data and management dashboards.",
          ],
        },
        {
          title: "Zoom Professional Services owns",
          items: [
            "Non-standard commercial projects.",
            "Partner structuring.",
            "Multi-company project coordination.",
          ],
        },
      ],
    },
    supportedBy: [
      {
        company: "Zoom Warehousing",
        description: "Storage, receiving, inventory administration and stock release.",
      },
      {
        company: "Zoom Software Solutions",
        description: "Booking, customer and delivery systems.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "Automation, integration and reporting.",
      },
      {
        company: "Zoom E-Commerce",
        description: "Order and customer information.",
      },
      {
        company: "Zoom Professional Services",
        description: "Special project and supplier coordination.",
      },
    ],
    supports: [
      {
        company: "Zoom Warehousing",
        description: "Inbound and outbound cargo movement.",
      },
      {
        company: "Zoom E-Commerce",
        description: "Order collection and delivery coordination.",
      },
      {
        company: "Zoom Events",
        description: "Movement of equipment, materials and event items.",
      },
      {
        company: "Zoom Real Estate",
        description: "Movement requirements for commercial and industrial-property customers.",
      },
      {
        company: "Zoom Professional Services",
        description: "Logistics components within customized projects.",
      },
      {
        company: "Zoom Advertising",
        description: "Distribution of approved promotional materials.",
      },
    ],
    unpromotedTitle: "Services not currently promoted",
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep unsupported, inactive or experimental logistics services here. Do not place them in the public profile until management approves them.",
      needsInput: true,
    },
    unpromotedServiceItems: [
      "Warehouse storage recorded as Zoom Logistics revenue.",
      "Customs clearance presented as an internal Zoom service.",
      "Ownership of transport vehicles without confirmation.",
      "Ownership of a courier fleet without confirmation.",
      "Shipping-line or airline services.",
      "Cargo insurance underwriting.",
      "Specialized dangerous-goods movement without confirmed capability.",
      "Port or airport handling presented as direct Zoom operations.",
      "Guaranteed delivery times controlled by external providers.",
      "International freight presented without an approved provider.",
    ],
    serviceRatings: {
      value: "",
      placeholder:
        "Rate every offer after commercial review using demand, profit potential, ability to deliver, supplier availability, strategic value, recurring revenue potential, operational complexity, commercial risk and final priority.",
      needsInput: true,
    },
  },
  proof: [
    file(
      "log-handling-1",
      "cargo-handling",
      "Completed Cargo-Handling Job",
      "A completed loading, unloading or handling assignment with approved job information.",
    ),
    file(
      "log-bahrain-1",
      "bahrain-delivery",
      "Completed Bahrain Delivery",
      "A completed commercial movement between locations in Bahrain.",
    ),
    file(
      "log-gcc-1",
      "gcc-shipment",
      "Completed GCC Shipment",
      "An approved road-transport job between Bahrain and another GCC location.",
    ),
    file(
      "log-freight-1",
      "freight-assignment",
      "Completed Freight Assignment",
      "A shipment coordinated with an approved air or sea freight provider.",
    ),
    file(
      "log-distribution-1",
      "distribution-project",
      "Completed Distribution Project",
      "A project involving delivery to several branches, retailers or customer locations.",
    ),
    file(
      "log-warehouse-1",
      "warehouse-logistics",
      "Storage & Delivery Project",
      "A completed project connecting cargo handling, warehousing and delivery.",
    ),
    file(
      "log-special-1",
      "special-cargo",
      "Special Cargo Project",
      "A completed movement involving special handling, timing, equipment or conditions.",
    ),
    file(
      "log-recurring-1",
      "recurring-client",
      "Recurring Logistics Client",
      "An approved recurring transport or distribution relationship.",
    ),
    file(
      "log-delivery-1",
      "delivery-record",
      "Approved Delivery Record",
      "A completed job with available pickup, status and delivery confirmation.",
    ),
    file(
      "log-testimonial-1",
      "testimonial",
      "Logistics Client Testimonial",
      "An approved statement from a customer following completed work.",
    ),
    file(
      "log-case-1",
      "case-study",
      "Logistics Case Study",
      "A completed case documenting the cargo requirement, solution, delivery and outcome.",
    ),
  ],
  assets: [
    file(
      "log-catalog-1",
      "catalog",
      "Zoom Logistics Service Catalog",
      "A ready-to-send overview of cargo handling, transport, freight and distribution services.",
    ),
    file(
      "log-capability-1",
      "capability-statement",
      "Logistics Capability Statement",
      "A concise presentation of Zoom's handling and logistics-coordination capabilities.",
    ),
    file(
      "log-form-1",
      "forms",
      "Logistics Requirement Form",
      "A structured form for collecting cargo, route, timing and handling information.",
    ),
    file(
      "log-proposal-1",
      "proposal-template",
      "Logistics Service Proposal",
      "An editable proposal covering movement requirements, delivery model and commercial scope.",
    ),
    file(
      "log-rate-1",
      "rate-request",
      "Supplier Rate Request",
      "A standard request for transport, freight, handling or delivery quotations.",
    ),
    file(
      "log-job-1",
      "job-sheet",
      "Logistics Job Sheet",
      "An operational record covering cargo, supplier, pickup, delivery and status information.",
    ),
    file(
      "log-pod-1",
      "proof-of-delivery",
      "Proof of Delivery Template",
      "A standard record for confirming completed delivery.",
    ),
    file(
      "log-status-1",
      "tracking-update",
      "Shipment Status Update",
      "A customer-facing format for communicating shipment progress.",
    ),
    file(
      "log-route-1",
      "distribution-plan",
      "Delivery Route Plan",
      "A structured document for multi-point and recurring distribution work.",
    ),
    file(
      "log-presentation-1",
      "presentation",
      "Zoom Logistics Presentation",
      "A presentation for customer meetings and logistics proposals.",
    ),
    file(
      "log-cases-1",
      "case-study-collection",
      "Logistics Case Study Deck",
      "A presentation format for approved handling, transport and distribution projects.",
    ),
    file(
      "log-social-1",
      "social",
      "Zoom Logistics Social Pack",
      "Approved service posts, project highlights and commercial logistics content.",
    ),
  ],
};
