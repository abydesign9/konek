// Shared definition of each community-program application form. Imported by the
// client form (to render fields) AND the server (to validate + whitelist which
// answers are stored), so the two can never drift apart. No server-only imports
// here — it must be safe to bundle into the client.

export type FieldType = "text" | "email" | "tel" | "textarea" | "select" | "number" | "url";

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  help?: string;
}

export type ProgramKey = "ambassador" | "influencer" | "creator_club";

// full_name / email / phone / country are stored as table columns; everything
// else in a program's `fields` is stored in the `details` jsonb.
export const COMMON_FIELDS: FormField[] = [
  { name: "fullName", label: "Full name", type: "text", required: true, placeholder: "Your full name" },
  { name: "email", label: "Email address", type: "email", required: true, placeholder: "you@example.com" },
  { name: "phone", label: "Phone / WhatsApp", type: "tel", required: true, placeholder: "+234…" },
  { name: "country", label: "Country", type: "text", required: true, placeholder: "e.g. Nigeria" },
];

const FOLLOWERS = ["Under 1,000", "1,000 – 10,000", "10,000 – 50,000", "50,000 – 250,000", "250,000+"];

export const PROGRAM_FORMS: Record<ProgramKey, { title: string; intro: string; fields: FormField[] }> = {
  ambassador: {
    title: "Apply to be a Campus Ambassador",
    intro: "Tell us about you and your campus. Applications take a few minutes and our team reviews every one.",
    fields: [
      { name: "school", label: "University / School", type: "text", required: true, placeholder: "Institution name" },
      { name: "cityState", label: "City / State", type: "text", required: true, placeholder: "Where is your campus?" },
      { name: "levelOfStudy", label: "Level / Year of study", type: "text", required: true, placeholder: "e.g. 300 level" },
      { name: "graduationYear", label: "Expected graduation year", type: "text", placeholder: "e.g. 2028" },
      { name: "instagram", label: "Instagram handle", type: "text", placeholder: "@yourhandle" },
      { name: "twitter", label: "X (Twitter) handle", type: "text", placeholder: "@yourhandle" },
      { name: "tiktok", label: "TikTok handle", type: "text", placeholder: "@yourhandle" },
      { name: "reach", label: "Total social following", type: "select", options: FOLLOWERS },
      { name: "experience", label: "Leadership / marketing experience", type: "textarea", placeholder: "Clubs, roles, campaigns you've run…" },
      { name: "motivation", label: "Why do you want to be a Konek Ambassador?", type: "textarea", required: true, placeholder: "What excites you about representing Konek?" },
      { name: "plan", label: "How would you promote Konek on your campus?", type: "textarea", required: true, placeholder: "Your ideas for reaching fellow students" },
    ],
  },
  influencer: {
    title: "Apply to the Influencer program",
    intro: "Share your platforms and audience so we can find the right way to work together. We review every application.",
    fields: [
      { name: "primaryPlatform", label: "Primary platform", type: "select", required: true, options: ["Instagram", "TikTok", "YouTube", "X (Twitter)", "Facebook", "Other"] },
      { name: "instagram", label: "Instagram handle", type: "text", placeholder: "@yourhandle" },
      { name: "tiktok", label: "TikTok handle", type: "text", placeholder: "@yourhandle" },
      { name: "youtube", label: "YouTube channel", type: "text", placeholder: "Channel name or link" },
      { name: "twitter", label: "X (Twitter) handle", type: "text", placeholder: "@yourhandle" },
      { name: "followers", label: "Largest audience size", type: "select", required: true, options: FOLLOWERS },
      { name: "niche", label: "Content niche", type: "text", required: true, placeholder: "e.g. finance, travel, tech, lifestyle" },
      { name: "audienceLocation", label: "Main audience location", type: "text", placeholder: "e.g. Nigeria, UK, US" },
      { name: "portfolio", label: "Link to your best content / media kit", type: "url", placeholder: "https://…" },
      { name: "motivation", label: "Why do you want to partner with Konek?", type: "textarea", required: true, placeholder: "Tell us what draws you to Konek" },
    ],
  },
  creator_club: {
    title: "Join the Creator Club",
    intro: "Tell us about your work and how you get paid, so we can set you up to earn globally. We review every application.",
    fields: [
      { name: "creatorType", label: "What do you create?", type: "text", required: true, placeholder: "e.g. music, design, writing, video, dev" },
      { name: "platforms", label: "Where do you publish / find clients?", type: "text", required: true, placeholder: "e.g. Instagram, Upwork, Fiverr, YouTube" },
      { name: "handle", label: "Main handle / profile link", type: "text", placeholder: "@handle or link" },
      { name: "audienceSize", label: "Audience / client base size", type: "select", options: FOLLOWERS },
      { name: "getsPaidInternationally", label: "Do you already get paid internationally?", type: "select", required: true, options: ["Yes, regularly", "Sometimes", "Not yet, but I want to"] },
      { name: "currentMethod", label: "How do you get paid today?", type: "text", placeholder: "e.g. PayPal, bank transfer, another app" },
      { name: "monthlyRange", label: "Monthly international earnings (optional)", type: "select", options: ["Prefer not to say", "Under $500", "$500 – $2,000", "$2,000 – $10,000", "$10,000+"] },
      { name: "portfolio", label: "Portfolio / work link", type: "url", placeholder: "https://…" },
      { name: "motivation", label: "Why do you want to join the Creator Club?", type: "textarea", required: true, placeholder: "What would help you most?" },
    ],
  },
};

export const PROGRAM_LABEL: Record<ProgramKey, string> = {
  ambassador: "Campus Ambassador",
  influencer: "Influencer",
  creator_club: "Creator Club",
};

export function isProgramKey(v: unknown): v is ProgramKey {
  return v === "ambassador" || v === "influencer" || v === "creator_club";
}
