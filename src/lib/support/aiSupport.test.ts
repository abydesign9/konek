import { describe, expect, it } from "vitest";
import { answerSupportInquiry, findRelevantFaqs, shouldEscalateToHuman } from "./aiSupport";

const faqs = [
  {
    id: "faq-1",
    category: "payments",
    question: "How do I fund my wallet?",
    answer: "Open Wallet, tap Add funds, then choose your preferred payment method and confirm the payment.",
    published: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "faq-2",
    category: "vtu",
    question: "What do I do if my airtime purchase fails?",
    answer: "Check your wallet balance, confirm the network and amount, then retry. If the payment is deducted but the order is not delivered, contact support with the reference number.",
    published: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: "faq-3",
    category: "kyc",
    question: "Why is my verification pending?",
    answer: "Verification can take a few minutes while we review your documents. Please make sure the photos are clear and the details match your ID.",
    published: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

describe("support AI assistant", () => {
  it("matches FAQs by keyword and gives a direct answer", () => {
    const result = answerSupportInquiry("How do I fund my wallet?", faqs);
    expect(result.needsHumanSupport).toBe(false);
    expect(result.answer.toLowerCase()).toContain("add funds");
    expect(result.answer.toLowerCase()).toContain("wallet");
  });

  it("routes sensitive or account-specific issues to a human", () => {
    const question = "I think someone has used my account and changed my bank details. Can you reverse it?";
    expect(shouldEscalateToHuman(question)).toBe(true);
    const result = answerSupportInquiry(question, faqs);
    expect(result.needsHumanSupport).toBe(true);
    expect(result.answer.toLowerCase()).toContain("support team");
  });

  it("finds relevant FAQ matches from multiple categories", () => {
    const matches = findRelevantFaqs("my airtime purchase failed", faqs);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]?.question).toContain("airtime");
  });
});
