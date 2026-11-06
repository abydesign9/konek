import type { Metadata } from "next";
import { LegalShell } from "../(legal)/LegalShell";
import { TermsOfServiceContent } from "./TermsOfServiceContent";

export const metadata: Metadata = {
  title: "Terms of Service — raviion",
  description: "The terms that govern your use of raviion.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <TermsOfServiceContent />
    </LegalShell>
  );
}
