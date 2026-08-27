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

const digitalSkillsPricing = "Participant fee, workshop fee or corporate package.";
const workplaceSkillsPricing = "Participant fee, workshop package or corporate contract.";
const careerPricing = "Participant fee, institutional contract or sponsored-program arrangement.";

export const educationTrainingProfile: DivisionProfile = {
  companyId: "education-training",
  erpStatus: "live",
  content: {
    status: "draft",
    version: "0.2",
    lastUpdated: "2026-08-26",
    updatedBy: "ERP setup",
  },
  identity: {
    shortDescriptor: "Learning Programs, Workshops & Skills Development",
    primaryPlatform: "NextSkill Bahrain",
    email: "info@zoombahrain.com",
    phone: "+973 3881 6222",
    mainMarket: "Bahrain",
    customerType: "B2B, B2C and B2G",
    contacts: [],
    social: [],
  },
  public: {
    snapshot: {
      customer:
        "Companies, professionals, employees, students, job seekers, entrepreneurs and institutions seeking practical learning and skills development.",
      problem:
        "Skills gaps, changing workplace requirements and difficulty finding relevant training connected to practical outcomes.",
      offer:
        "Corporate training, professional development, digital skills, AI workshops, workplace skills and customized learning programs.",
      value:
        "Relevant learning programs designed around the audience, objective and practical skills required.",
      pricing:
        "Program fees, participant fees, workshop fees, corporate contracts or custom quotations.",
      delivery:
        "Learning-needs review, program design, trainer coordination, registration, delivery, feedback and follow-up.",
      keyProof: {
        value: "",
        placeholder:
          "Approved programs, trainers, completed workshops, participant records, client feedback and case studies linked from the ERP.",
        needsInput: true,
      },
      zoomSupport:
        "Zoom Business Consultancy, Zoom Technology Solutions, Zoom Software Solutions, Zoom Events and Zoom Professional Services.",
    },
    positioning: {
      overview:
        "Zoom Education & Training develops practical learning programs for companies, professionals, students and institutions. Through NextSkill Bahrain and the wider Zoom network, we coordinate relevant subjects, capable trainers and flexible delivery formats around clear learning objectives.",
      purpose:
        "Help individuals and organizations build useful skills that support workplace performance, professional development and future opportunities.",
      roleWithinZoom:
        "Zoom's learning and skills-development company, responsible for training programs, workshops, trainer coordination and participant-learning experiences.",
      positioningStatement:
        "A practical skills-development partner connecting learners and organizations with relevant programs, trainers and delivery formats.",
      customerPromise: "Relevant learning. Practical skills. Clear progress.",
    },
    segments: [
      {
        name: "Companies & employers",
        description: "Organizations seeking to improve employee skills and workplace capability.",
        mainNeed: "Training connected to actual business and employee requirements.",
        desiredOutcome: "Employees who can apply the learning within their roles.",
        includeInPdf: true,
        displayOrder: 1,
      },
      {
        name: "Professionals & employees",
        description: "Individuals seeking to improve their professional, digital or workplace skills.",
        mainNeed: "Practical learning that supports stronger performance or career development.",
        desiredOutcome: "Improved knowledge, confidence and applicable workplace skills.",
        includeInPdf: true,
        displayOrder: 2,
      },
      {
        name: "Students, graduates & job seekers",
        description: "Learners preparing for employment or the next stage of their development.",
        mainNeed: "Career-relevant skills and practical preparation.",
        desiredOutcome: "Greater readiness for employment, interviews and workplace responsibilities.",
        includeInPdf: true,
        displayOrder: 3,
      },
      {
        name: "Entrepreneurs & small businesses",
        description:
          "Business owners who need practical skills in technology, management, communication or growth.",
        mainNeed: "Focused learning that can be applied directly to the business.",
        desiredOutcome: "Improved decisions, stronger operations and better use of available tools.",
        includeInPdf: true,
        displayOrder: 4,
      },
      {
        name: "Government & institutional organizations",
        description:
          "Organizations requiring structured learning programs for employees, participants or community groups.",
        mainNeed: "A coordinated program with clear objectives, delivery and participant administration.",
        desiredOutcome:
          "A professionally delivered learning initiative with documented participation and feedback.",
        includeInPdf: true,
        displayOrder: 5,
      },
      {
        name: "Schools, universities & community organizations",
        description:
          "Institutions seeking workshops, digital-skills programs or career-development activities.",
        mainNeed: "Relevant learning delivered in a suitable format for their participants.",
        desiredOutcome: "An organized program supporting student or community development.",
        includeInPdf: true,
        displayOrder: 6,
      },
      {
        name: "Trainers & training partners",
        description:
          "Subject specialists and organizations looking to develop or deliver programs with Zoom.",
        mainNeed: "Program structure, participant access, administration and commercial coordination.",
        desiredOutcome: "A clearly organized and professionally presented learning program.",
        includeInPdf: true,
        displayOrder: 7,
      },
    ],
    needs: [
      {
        need: "Closing workforce skills gaps",
        outcome: "Training focused on the skills employees need within their roles.",
        displayOrder: 1,
      },
      {
        need: "Adopting AI & digital tools",
        outcome: "Participants understand how to use relevant tools within practical workplace tasks.",
        displayOrder: 2,
      },
      {
        need: "Improving workplace performance",
        outcome: "Stronger communication, organization, customer service and professional capability.",
        displayOrder: 3,
      },
      {
        need: "Preparing for employment",
        outcome: "Improved career readiness, workplace understanding and interview preparation.",
        displayOrder: 4,
      },
      {
        need: "Developing customized learning",
        outcome: "A program designed around the organization's audience, objectives and schedule.",
        displayOrder: 5,
      },
      {
        need: "Accessing short, practical programs",
        outcome: "Focused workshops or intensive programs without unnecessary academic content.",
        displayOrder: 6,
      },
      {
        need: "Coordinating trainers & participants",
        outcome: "One process covering program structure, trainers, registration, delivery and feedback.",
        displayOrder: 7,
      },
    ],
    serviceGroups: [
      group("Corporate Learning", 1, [
        offer(
          "Customized Corporate Training",
          "Training programs developed around a company's workforce, business needs and learning objectives.",
          "A complete corporate program covering learning objectives, content, trainer, schedule, materials and delivery.",
          1,
          "Fixed program fee or corporate contract.",
        ),
        offer(
          "Employee Skills Development",
          "Structured learning focused on improving practical employee capability.",
          "A scheduled employee-development program addressing the agreed workplace skills.",
          2,
          "Participant fee, program fee or annual learning agreement.",
        ),
        offer(
          "Training Needs & Program Design",
          "Review of the required audience, skills gaps and expected learning outcomes.",
          "A recommended program structure with subjects, audience, duration and delivery format.",
          3,
          "Consultancy fee or fixed program-design fee.",
        ),
        offer(
          "Management & Team Workshops",
          "Focused workshops supporting management, coordination, teamwork and workplace performance.",
          "A facilitated workshop with defined objectives, materials and participant activities.",
          4,
          "Fixed workshop fee or trainer daily rate.",
        ),
      ]),
      group("Digital & Technology Skills", 2, [
        offer(
          "AI Tools & Workplace Productivity",
          "Practical training on using AI tools to support research, communication, content, administration and daily work.",
          "A practical workshop or program showing participants how to apply selected AI tools responsibly within their work.",
          1,
          digitalSkillsPricing,
        ),
        offer(
          "Digital Skills Fundamentals",
          "Learning programs covering essential digital tools and modern workplace practices.",
          "A structured program developing practical digital confidence and capability.",
          2,
          digitalSkillsPricing,
        ),
        offer(
          "Software & Business Systems Training",
          "User training for approved software, platforms and business systems.",
          "Practical user instruction, guidance materials and system-focused exercises.",
          3,
          "Project fee, session fee or implementation-training package.",
        ),
        offer(
          "Technology Skills Programs",
          "Introductory or intermediate programs covering websites, software, automation and digital technology.",
          "A structured technical-learning program suited to the agreed participant level.",
          4,
          digitalSkillsPricing,
        ),
      ]),
      group("Professional & Workplace Skills", 3, [
        offer(
          "Communication & Presentation Skills",
          "Training focused on clearer professional communication and confident presentations.",
          "A practical program covering communication structure, presentation delivery and participant exercises.",
          1,
          workplaceSkillsPricing,
        ),
        offer(
          "Customer Service & Sales Skills",
          "Workplace training focused on customer interaction, service standards and commercial communication.",
          "A practical workshop or program based on relevant customer and sales situations.",
          2,
          workplaceSkillsPricing,
        ),
        offer(
          "Workplace Effectiveness",
          "Programs covering time management, organization, collaboration and professional conduct.",
          "A structured workplace-skills program with practical methods and participant activities.",
          3,
          workplaceSkillsPricing,
        ),
        offer(
          "Business & Management Skills",
          "Learning programs covering practical business, management and operational topics.",
          "A workshop or short program designed around the selected management or business subject.",
          4,
          workplaceSkillsPricing,
        ),
      ]),
      group("Career & Youth Development", 4, [
        offer(
          "Career Readiness Programs",
          "Programs helping students, graduates and job seekers prepare for employment.",
          "Practical learning covering CV preparation, interviews, workplace expectations and professional communication.",
          1,
          careerPricing,
        ),
        offer(
          "Youth & Student Skills Programs",
          "Development programs prepared for schools, universities and youth groups.",
          "A structured program covering agreed digital, professional or personal-development skills.",
          2,
          careerPricing,
        ),
        offer(
          "Entrepreneurship Workshops",
          "Practical introductory programs for people developing business ideas or small ventures.",
          "A workshop covering business thinking, customer needs, offers and initial commercial planning.",
          3,
          careerPricing,
        ),
      ]),
      group("Workshops & Intensive Programs", 5, [
        offer(
          "Short Courses & Workshops",
          "Focused learning delivered over one or several sessions.",
          "A complete short program with defined content, trainer, materials and schedule.",
          1,
          "Fee per participant or fixed workshop fee.",
        ),
        offer(
          "Bootcamps & Intensive Programs",
          "Concentrated programs designed to develop a specific capability within a limited period.",
          "A structured intensive program with scheduled sessions, exercises and completion requirements.",
          2,
          "Complete program fee or participant-registration fee.",
        ),
        offer(
          "Professional Examination Preparation",
          "Learning support and preparation delivered directly or with an appropriate training partner.",
          "A preparation program covering the agreed subject, review materials and practice activities.",
          3,
          "Program fee or partner-agreed pricing.",
          "supporting",
        ),
      ]),
      group("Program Coordination", 6, [
        offer(
          "Trainer & Institution Coordination",
          "Coordination of trainers, specialists and learning partners for approved programs.",
          "A confirmed delivery structure covering the trainer, content, responsibilities and schedule.",
          1,
          "Coordination fee, management fee or revenue share.",
          "supporting",
        ),
        offer(
          "Online & Hybrid Learning",
          "Programs delivered online or through a combination of online and physical sessions.",
          "A coordinated learning experience with digital access, materials, schedules and participant support.",
          2,
          digitalSkillsPricing,
        ),
        offer(
          "Training Program Administration",
          "Management of registration, schedules, attendance, materials, communication and feedback.",
          "An organized program with clear participant records and delivery administration.",
          3,
          "Fixed administration fee or percentage of the total program value.",
          "supporting",
        ),
      ]),
    ],
    whyZoom: [
      "Learning programs designed around practical outcomes.",
      "Corporate, professional, digital and career-development subjects.",
      "Customized programs for specific audiences and organizations.",
      "Access to subject knowledge across the wider Zoom Group.",
      "Flexible physical, online and hybrid delivery.",
      "Coordination of trainers, schedules, materials and participants.",
      "Support from program planning through delivery and follow-up.",
      "NextSkill Bahrain provides a focused public platform for learning opportunities.",
    ],
    workflow: [
      {
        name: "Enquiry",
        explanation: "The learner or organization explains the required subject, audience and objective.",
        displayOrder: 1,
      },
      {
        name: "Learning-Needs Review",
        explanation:
          "We confirm the skills gap, participant profile, delivery format, schedule and expected outcome.",
        displayOrder: 2,
      },
      {
        name: "Program Design",
        explanation: "The program structure, content, duration, activities and materials are defined.",
        displayOrder: 3,
      },
      {
        name: "Trainer Confirmation",
        explanation: "A suitable trainer or delivery partner is assigned.",
        displayOrder: 4,
      },
      {
        name: "Proposal & Commercial Terms",
        explanation: "The scope, schedule, responsibilities and pricing are provided.",
        displayOrder: 5,
      },
      {
        name: "Registration & Preparation",
        explanation: "Participants, venue or platform access, materials and communication are organized.",
        displayOrder: 6,
      },
      {
        name: "Program Delivery",
        explanation: "The approved workshop, course or training program is delivered.",
        displayOrder: 7,
      },
      {
        name: "Feedback & Completion",
        explanation: "Attendance, participant feedback and completion requirements are recorded.",
        displayOrder: 8,
      },
      {
        name: "Follow-Up",
        explanation: "Further learning, advanced programs or organizational support may be recommended.",
        displayOrder: 9,
      },
    ],
    connectedCapabilities: [
      {
        company: "Zoom Business Consultancy",
        description: "Training-needs analysis, management subjects and organizational-development direction.",
      },
      {
        company: "Zoom Technology Solutions",
        description: "AI, automation, digitalization and advanced technology subject support.",
      },
      {
        company: "Zoom Software Solutions",
        description: "Software, website and business-system training support.",
      },
      {
        company: "Zoom Events",
        description: "Venues, program launches, conferences and larger learning events.",
      },
      {
        company: "Zoom Advertising",
        description: "Program promotion, participant communication and creative learning materials.",
      },
      {
        company: "Zoom Professional Services",
        description: "Specialist trainers, partnerships and customized learning projects.",
      },
      {
        company: "Zoom Sports",
        description: "Sports instruction and physical-development programs.",
      },
    ],
    cta: {
      headline: "Develop the Skills That Matter",
      supportingSentence:
        "Tell us who the learners are, what they need to improve and what outcome you want. We will recommend or develop the appropriate program.",
      enquiryAction: "Email, call or use the website to start an enquiry.",
    },
  },
  internal: {
    customerProblems: [
      "Employees lack skills required for current responsibilities",
      "Companies introduce new tools without proper user training",
      "Existing training is too generic",
      "Management cannot connect training to workplace performance",
      "Learners cannot find practical short programs",
      "Professionals need updated digital or AI skills",
      "Students are not prepared for workplace expectations",
      "Organizations lack internal trainers",
      "Training content exists but is not properly structured",
      "Trainers lack participant administration and promotion",
      "Programs have unclear objectives or outcomes",
      "Attendance and feedback are not recorded consistently",
      "Employees attend training but do not apply the learning",
      "Companies need customized schedules or delivery formats",
      "Institutions need one provider to coordinate trainers, venues and participants",
    ],
    buyingTriggers: [
      "A company introduces new software or technology",
      "Management identifies a workforce skills gap",
      "New employees require structured learning",
      "A department's performance needs improvement",
      "The organization begins a digitalization project",
      "AI tools are introduced into the workplace",
      "A school or university plans a student-development program",
      "An institution receives a training budget",
      "A company prepares its annual learning calendar",
      "Employees request professional development",
      "A new policy, process or service is introduced",
      "A trainer proposes a new program",
      "A professional examination is approaching",
      "A company plans an employee-development initiative",
      "A government or institutional learning opportunity is released",
    ],
    alternatives: [
      "Independent trainers",
      "Training institutes",
      "Online course platforms",
      "Universities and educational institutions",
      "Internal company trainers",
      "Consulting firms",
      "Technology vendors providing user training",
      "Professional associations",
      "International online programs",
      "Free online content",
      "Self-directed learning",
      "Doing no structured training",
    ],
    competitors: {
      value: "",
      placeholder: "Add named competitors only when confirmed.",
      needsInput: true,
    },
    pricingMethods: [
      "Fee per participant",
      "Fixed workshop fee",
      "Trainer daily rate",
      "Program package",
      "Corporate contract",
      "Institutional contract",
      "Monthly training retainer",
      "Online program fee",
      "Group-registration fee",
      "Sponsored-program fee",
      "Partner revenue share",
      "Training-management fee",
      "Custom quotation",
    ],
    pricingVariables: [
      "Subject and learning level",
      "Number of participants",
      "Program duration",
      "Number of sessions",
      "Trainer cost",
      "Physical, online or hybrid delivery",
      "Venue cost",
      "Training-material requirements",
      "Equipment and technology requirements",
      "Program customization",
      "Assessment requirements",
      "Participant administration",
      "Travel requirements",
      "Translation or language requirements",
      "Partner or institution fees",
      "Marketing requirements",
      "Completion-document requirements",
      "Follow-up and reporting requirements",
    ],
    revenueModels: [
      "Participant registration fees",
      "Corporate training contracts",
      "Institutional learning contracts",
      "Workshop fees",
      "Trainer and program-management fees",
      "Training-needs assessment fees",
      "Customized program-development fees",
      "Online-course fees",
      "Bootcamp and intensive-program fees",
      "Sponsored learning programs",
      "Partner revenue shares",
      "Monthly learning retainers",
      "Training-material fees",
      "Learning-platform subscriptions where applicable",
      "Cross-selling into consultancy, software and technology projects",
    ],
    supplierCategoriesTitle: "Trainer & partner arrangements",
    supplierCategories: [
      "Internal Zoom trainer",
      "Independent trainer",
      "Subject specialist",
      "Training institution",
      "Technology vendor",
      "Professional association",
      "Educational institution",
      "International content or learning partner",
      "Another Zoom company providing subject expertise",
    ],
    programRecords: {
      intro: "Every arrangement should record:",
      items: [
        "Trainer profile",
        "Subject responsibility",
        "Content ownership",
        "Delivery dates",
        "Trainer fee",
        "Participant capacity",
        "Materials responsibility",
        "Venue or platform responsibility",
        "Promotion responsibility",
        "Completion-document wording",
        "Revenue share where applicable",
        "Cancellation terms",
      ],
    },
    programControls: {
      intro: "Every program should have:",
      items: [
        "Program owner",
        "Approved title",
        "Target audience",
        "Learning objectives",
        "Program outline",
        "Trainer",
        "Delivery format",
        "Schedule",
        "Participant capacity",
        "Registration process",
        "Materials",
        "Attendance record",
        "Feedback process",
        "Completion requirements",
        "Pricing",
        "Partner responsibilities",
        "Follow-up decision",
      ],
    },
    participantInformation: {
      intro: "Depending on the program, collect:",
      items: [
        "Participant name",
        "Organization",
        "Position or learning stage",
        "Contact information",
        "Selected program",
        "Current experience level",
        "Learning objective",
        "Registration status",
        "Payment status",
        "Attendance",
        "Feedback",
        "Completion status",
        "Interest in further learning",
      ],
    },
    supplierArrangements: {
      value: "",
      placeholder: "Add approved trainer, institution and partner names and terms when confirmed.",
      needsInput: true,
    },
    supplierMarkups: {
      value: "",
      placeholder: "Add the agreed markup rule for coordinated trainer or partner work only.",
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
        "Add only confirmed gaps. Do not save examples as confirmed information. Typical items to review later include programs without an approved trainer, missing trainer profiles, program outlines, learning materials, participant records, client approvals, feedback or outcome records, program photographs, training-platform access, partner agreements, corporate references, pricing structure and delivery calendar.",
      needsInput: true,
    },
    serviceOwnershipTitle: "Ownership boundaries",
    serviceOwnership: {
      groups: [
        {
          title: "Zoom Education & Training owns",
          items: [
            "Corporate training",
            "Professional-development programs",
            "Digital and AI skills training",
            "Workplace-skills programs",
            "Career-readiness programs",
            "Youth and student learning",
            "Short courses and workshops",
            "Trainer coordination",
            "Participant administration",
            "Online and hybrid learning",
            "Learning partnerships",
          ],
        },
        {
          title: "Zoom Business Consultancy owns",
          items: [
            "Business diagnosis",
            "Organizational strategy",
            "Process improvement",
            "Management systems",
            "Identification of organizational capability gaps",
          ],
        },
        {
          title: "Zoom Technology Solutions owns",
          items: [
            "Digitalization projects",
            "AI implementation",
            "Automation systems",
            "Technology architecture",
            "Advanced technology solutions",
          ],
        },
        {
          title: "Zoom Software Solutions owns",
          items: [
            "Learning platforms",
            "Registration systems",
            "Learner portals",
            "Websites and applications",
          ],
        },
        {
          title: "Zoom Sports owns",
          items: [
            "Sports instruction",
            "Coaching",
            "Sports programs",
            "Camps and physical-development activities",
          ],
        },
        {
          title: "Zoom Events owns",
          items: [
            "Conferences",
            "Large learning events",
            "Venue and event-production coordination",
          ],
        },
        {
          title: "Zoom Professional Services owns",
          items: [
            "Non-standard learning projects",
            "Specialist partnerships",
            "Multi-company program coordination",
          ],
        },
      ],
    },
    supportedBy: [
      {
        company: "Zoom Business Consultancy",
        description: "Management subjects, training-needs analysis and organizational direction",
      },
      {
        company: "Zoom Technology Solutions",
        description: "AI, automation and advanced technology subject knowledge",
      },
      {
        company: "Zoom Software Solutions",
        description: "Digital platforms, registration and technical subject support",
      },
      { company: "Zoom Events", description: "Venue and larger program coordination" },
      { company: "Zoom Advertising", description: "Program promotion and participant communication" },
      { company: "Zoom Professional Services", description: "Specialist trainers and partnership development" },
    ],
    supports: [
      {
        company: "Zoom Business Consultancy",
        description: "Training implementation following business or organizational recommendations",
      },
      { company: "Zoom Technology Solutions", description: "User adoption and technology training" },
      { company: "Zoom Software Solutions", description: "System onboarding and user training" },
      { company: "Zoom Events", description: "Workshops, speakers and learning content for events" },
      { company: "Zoom Professional Services", description: "Learning components within customized projects" },
      { company: "Zoom Sports", description: "Supporting workshops and participant-development content" },
      { company: "Zoom Advertising", description: "Educational content and training-program campaigns" },
    ],
    unpromotedTitle: "Services not currently promoted",
    unpromotedServices: {
      value: "",
      placeholder:
        "Keep unsupported, inactive or experimental learning services here. Do not place them in the public profile until management approves them.",
      needsInput: true,
    },
    unpromotedServiceItems: [
      "Academic degrees",
      "School or university education",
      "Guaranteed employment",
      "Guaranteed examination results",
      "Professional qualifications presented without an approved awarding partner",
      "Formal accreditation presented without confirmation",
      "Medical or clinical training",
      "Legal or financial certification",
      "Sports coaching under Zoom Education",
      "General business consulting presented as training",
      "Software development",
      "Event production presented as education",
    ],
    serviceRatings: {
      value: "",
      placeholder:
        "Rate every offer after commercial review using demand, profit potential, ability to deliver, trainer availability, strategic value, program repeatability, recurring revenue potential, delivery complexity and final priority.",
      needsInput: true,
    },
  },
  proof: [
    file(
      "edt-program-1",
      "training-program",
      "Completed Training Program",
      "An approved program with its audience, trainer, schedule and learning objectives recorded.",
    ),
    file(
      "edt-corporate-1",
      "corporate-program",
      "Corporate Training Client",
      "A completed learning engagement delivered for a company or organization.",
    ),
    file(
      "edt-workshop-1",
      "workshop",
      "Completed Workshop",
      "A focused workshop with approved content, participant records and feedback.",
    ),
    file(
      "edt-digital-1",
      "digital-skills-program",
      "Digital Skills Program",
      "A completed program covering AI, digital tools, software or technology skills.",
    ),
    file(
      "edt-career-1",
      "career-program",
      "Career Development Program",
      "A completed program for students, graduates or job seekers.",
    ),
    file(
      "edt-trainer-1",
      "trainer-profile",
      "Approved Trainer",
      "A trainer profile with expertise, experience and approved supporting records.",
    ),
    file(
      "edt-partner-1",
      "training-partner",
      "Approved Training Partner",
      "A documented relationship with a trainer, institution or subject specialist.",
    ),
    file(
      "edt-materials-1",
      "learning-materials",
      "Approved Learning Materials",
      "Training slides, exercises, guides or participant resources from an approved program.",
    ),
    file(
      "edt-feedback-1",
      "participant-feedback",
      "Participant Feedback",
      "Approved feedback from learners who completed a Zoom program.",
    ),
    file(
      "edt-testimonial-1",
      "testimonial",
      "Client Testimonial",
      "An approved statement from a corporate, institutional or individual client.",
    ),
    file(
      "edt-case-1",
      "case-study",
      "Training Case Study",
      "A completed case documenting the requirement, program, delivery and outcome.",
    ),
    file(
      "edt-photo-1",
      "photograph",
      "Training Program Photography",
      "Approved photographs from completed workshops or learning programs.",
    ),
  ],
  assets: [
    file(
      "edt-catalog-1",
      "catalog",
      "Education & Training Catalog",
      "A ready-to-send overview of learning programs, workshops and training services.",
    ),
    file(
      "edt-brochure-1",
      "brochure",
      "Corporate Training Brochure",
      "A focused brochure for companies and institutional customers.",
    ),
    file(
      "edt-calendar-1",
      "program-schedule",
      "Training Calendar",
      "A current schedule of available workshops and learning programs.",
    ),
    file(
      "edt-outline-1",
      "program-outline",
      "Program Outline Template",
      "A standard format covering audience, objectives, content, schedule and trainer.",
    ),
    file(
      "edt-trainers-1",
      "trainer-profile-pack",
      "Trainer Profile Pack",
      "Approved profiles of trainers available through Zoom Education & Training.",
    ),
    file(
      "edt-proposal-1",
      "proposal-template",
      "Corporate Training Proposal",
      "An editable proposal covering learning requirements, program structure and commercial terms.",
    ),
    file(
      "edt-form-1",
      "forms",
      "Participant Registration Form",
      "A structured form for participant and program information.",
    ),
    file(
      "edt-guide-1",
      "participant-pack",
      "Participant Information Guide",
      "Program details, schedule, access information, materials and contact details.",
    ),
    file(
      "edt-materials-1",
      "learning-materials-template",
      "Training Materials Template",
      "A standard branded format for slides, exercises and participant resources.",
    ),
    file(
      "edt-feedback-form-1",
      "feedback-form",
      "Program Feedback Form",
      "A structured form for participant feedback and program review.",
    ),
    file(
      "edt-presentation-1",
      "presentation",
      "Education & Training Presentation",
      "A presentation for companies, institutions, trainers and learning partners.",
    ),
    file(
      "edt-social-1",
      "social",
      "Training Program Social Pack",
      "Approved program announcements, trainer features and promotional content.",
    ),
  ],
};
