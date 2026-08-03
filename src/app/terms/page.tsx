import type { Metadata } from "next";
import { LegalShell } from "../(legal)/LegalShell";
import { TermsOfServiceContent } from "./TermsOfServiceContent";

export const metadata: Metadata = {
  title: "Terms of Service — Konek",
  description: "The terms that govern your use of Konek.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="July 2026">
      <TermsOfServiceContent />
    </LegalShell>
  );
}
