export type ProspectingIndustry = {
  id: string;
  label: string;
  group: string;
};

/**
 * Approved discovery presets for appointment-heavy and local-service businesses.
 * The label is intentionally search-friendly for the configured place-data provider.
 */
export const prospectingIndustries: ProspectingIndustry[] = [
  { id: "dental-practices", label: "Dental practices", group: "Health & Appointment Care" },
  { id: "orthodontists", label: "Orthodontists", group: "Health & Appointment Care" },
  { id: "chiropractors", label: "Chiropractors", group: "Health & Appointment Care" },
  { id: "physical-therapy-clinics", label: "Physical therapy clinics", group: "Health & Appointment Care" },
  { id: "med-spas", label: "Med spas", group: "Health & Appointment Care" },
  { id: "iv-therapy-clinics", label: "IV therapy clinics", group: "Health & Appointment Care" },
  { id: "wellness-clinics", label: "Wellness clinics", group: "Health & Appointment Care" },
  { id: "veterinary-clinics", label: "Veterinary clinics", group: "Health & Appointment Care" },
  { id: "optometrists", label: "Optometrists", group: "Health & Appointment Care" },
  { id: "dermatology-practices", label: "Dermatology practices", group: "Health & Appointment Care" },

  { id: "massage-studios", label: "Massage studios", group: "Beauty, Fitness & Wellness" },
  { id: "hair-salons", label: "Hair salons", group: "Beauty, Fitness & Wellness" },
  { id: "barbershops", label: "Barbershops", group: "Beauty, Fitness & Wellness" },
  { id: "nail-salons", label: "Nail salons", group: "Beauty, Fitness & Wellness" },
  { id: "personal-trainers", label: "Personal trainers", group: "Beauty, Fitness & Wellness" },
  { id: "fitness-studios", label: "Fitness studios", group: "Beauty, Fitness & Wellness" },

  { id: "hvac-companies", label: "HVAC companies", group: "Home & Field Services" },
  { id: "plumbing-companies", label: "Plumbing companies", group: "Home & Field Services" },
  { id: "electricians", label: "Electricians", group: "Home & Field Services" },
  { id: "roofing-companies", label: "Roofing companies", group: "Home & Field Services" },
  { id: "garage-door-companies", label: "Garage door companies", group: "Home & Field Services" },
  { id: "tree-removal-companies", label: "Tree removal companies", group: "Home & Field Services" },
  { id: "landscaping-companies", label: "Landscaping companies", group: "Home & Field Services" },
  { id: "pest-control-companies", label: "Pest control companies", group: "Home & Field Services" },
  { id: "cleaning-companies", label: "Cleaning companies", group: "Home & Field Services" },
  { id: "painting-companies", label: "Painting companies", group: "Home & Field Services" },
  { id: "flooring-companies", label: "Flooring companies", group: "Home & Field Services" },
  { id: "fence-installers", label: "Fence installers", group: "Home & Field Services" },
  { id: "concrete-contractors", label: "Concrete contractors", group: "Home & Field Services" },
  { id: "junk-removal-companies", label: "Junk removal companies", group: "Home & Field Services" },
  { id: "moving-companies", label: "Moving companies", group: "Home & Field Services" },
  { id: "locksmiths", label: "Locksmiths", group: "Home & Field Services" },

  { id: "law-firms", label: "Law firms", group: "Professional & B2B Services" },
  { id: "accounting-firms", label: "Accounting firms", group: "Professional & B2B Services" },
  { id: "bookkeeping-companies", label: "Bookkeeping companies", group: "Professional & B2B Services" },
  { id: "tax-preparation-firms", label: "Tax preparation firms", group: "Professional & B2B Services" },
  { id: "insurance-agencies", label: "Insurance agencies", group: "Professional & B2B Services" },
  { id: "mortgage-brokers", label: "Mortgage brokers", group: "Professional & B2B Services" },
  { id: "real-estate-teams", label: "Real estate teams", group: "Professional & B2B Services" },
  { id: "property-management-companies", label: "Property management companies", group: "Professional & B2B Services" },
  { id: "recruiting-firms", label: "Recruiting firms", group: "Professional & B2B Services" },
  { id: "staffing-agencies", label: "Staffing agencies", group: "Professional & B2B Services" },
  { id: "marketing-agencies", label: "Marketing agencies", group: "Professional & B2B Services" },
  { id: "it-service-providers", label: "IT service providers", group: "Professional & B2B Services" },
  { id: "business-consultants", label: "Business consultants", group: "Professional & B2B Services" },
  { id: "financial-advisory-firms", label: "Financial advisory firms", group: "Professional & B2B Services" },
  { id: "commercial-cleaning-companies", label: "Commercial cleaning companies", group: "Professional & B2B Services" },
  { id: "security-companies", label: "Security companies", group: "Professional & B2B Services" },

  { id: "auto-repair-shops", label: "Auto repair shops", group: "Automotive" },
  { id: "auto-detailers", label: "Auto detailers", group: "Automotive" },
  { id: "collision-repair-shops", label: "Collision repair shops", group: "Automotive" },
  { id: "car-dealerships", label: "Car dealerships", group: "Automotive" },
  { id: "towing-companies", label: "Towing companies", group: "Automotive" },

  { id: "restaurants", label: "Restaurants", group: "Hospitality & Events" },
  { id: "catering-companies", label: "Catering companies", group: "Hospitality & Events" },
  { id: "event-venues", label: "Event venues", group: "Hospitality & Events" },
  { id: "wedding-vendors", label: "Wedding vendors", group: "Hospitality & Events" },
  { id: "dance-studios", label: "Dance studios", group: "Hospitality & Events" },

  { id: "childcare-centers", label: "Childcare centers", group: "Family & Care" },
  { id: "tutoring-companies", label: "Tutoring companies", group: "Family & Care" },
  { id: "senior-care-providers", label: "Senior-care providers", group: "Family & Care" },

  { id: "pet-groomers", label: "Pet groomers", group: "Pet & Creative Services" },
  { id: "dog-training-businesses", label: "Dog-training businesses", group: "Pet & Creative Services" },
  { id: "photography-studios", label: "Photography studios", group: "Pet & Creative Services" },
];

export const prospectingIndustryGroups = Array.from(
  new Set(prospectingIndustries.map((industry) => industry.group)),
).map((group) => ({
  group,
  industries: prospectingIndustries.filter((industry) => industry.group === group),
}));
