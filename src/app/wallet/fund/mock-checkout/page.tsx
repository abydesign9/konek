import { notFound } from "next/navigation";
import { mocksEnabled } from "@/lib/security/mockGuard";
import MockCheckoutClient from "./MockCheckoutClient";

// Local-development stand-in for Paystack's hosted checkout. Like the mock API
// routes it self-completes a payment, so it must not exist in production unless
// mocks are explicitly enabled — otherwise it 404s.
export default function MockCheckoutPage() {
  if (!mocksEnabled()) notFound();
  return <MockCheckoutClient />;
}
