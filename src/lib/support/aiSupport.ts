export interface AiSupportFaq {
  id: string;
  category: string;
  question: string;
  answer: string;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AiSupportResponse {
  answer: string;
  needsHumanSupport: boolean;
  matchedFaqs: AiSupportFaq[];
  confidence: "low" | "medium" | "high";
}

const HUMAN_ESCALATION_PATTERNS = [
  "refund",
  "reverse",
  "bank details",
  "account hacked",
  "fraud",
  "unauthorized",
  "stolen",
  "suspicious",
  "charged but",
  "did not receive",
  "payment failed",
  "wrong wallet",
  "kyc",
  "verification",
  "document",
  "identity",
  "banned",
  "blocked",
  "security",
  "sensitive",
  "used my account",
  "someone has access",
  "why was my",
  "urgent",
  "refund me",
  "dispute",
  "complaint",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function findRelevantFaqs(question: string, faqs: AiSupportFaq[]): AiSupportFaq[] {
  const norm = normalize(question);
  if (!norm) return [];

  return [...faqs]
    .map((faq) => {
      const faqText = normalize(`${faq.question} ${faq.answer}`);
      const score = computeKeywordScore(norm, faqText);
      return { faq, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ faq }) => faq);
}

function computeKeywordScore(question: string, faqText: string): number {
  const questionWords = question.split(" ").filter((word) => word.length > 2);
  const faqWords = new Set(faqText.split(" ").filter((word) => word.length > 2));

  let score = 0;
  for (const word of questionWords) {
    if (faqWords.has(word)) score += 3;
    else if (faqText.includes(word)) score += 1;
  }

  return score;
}

export function shouldEscalateToHuman(question: string): boolean {
  const normalized = normalize(question);
  if (!normalized) return false;

  return HUMAN_ESCALATION_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function answerSupportInquiry(question: string, faqs: AiSupportFaq[]): AiSupportResponse {
  const normalized = normalize(question);
  const relevantFaqs = findRelevantFaqs(question, faqs);

  if (shouldEscalateToHuman(question)) {
    return {
      answer:
        "I’m not able to resolve sensitive account or security issues here. Please contact our support team and include your reference number or the details of the issue so we can take a closer look.",
      needsHumanSupport: true,
      matchedFaqs: relevantFaqs,
      confidence: relevantFaqs.length > 0 ? "medium" : "low",
    };
  }

  if (relevantFaqs.length === 0) {
    return {
      answer:
        "I couldn’t find a direct answer for that yet. Please send us a quick message with your issue and we’ll help you personally.",
      needsHumanSupport: true,
      matchedFaqs: [],
      confidence: "low",
    };
  }

  const primaryFaq = relevantFaqs[0];
  return {
    answer: primaryFaq.answer,
    needsHumanSupport: false,
    matchedFaqs: relevantFaqs,
    confidence: "high",
  };
}
