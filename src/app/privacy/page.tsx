import type { Metadata } from "next";
import { LegalShell } from "../(legal)/LegalShell";
import { PrivacyPolicyContent } from "./PrivacyPolicyContent";

export const metadata: Metadata = {
  title: "Privacy Policy — Konek",
  description: "How Konek collects, uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="July 2026">
      <PrivacyPolicyContent />
    </LegalShell>
  );
}
