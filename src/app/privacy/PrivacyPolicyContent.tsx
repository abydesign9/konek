import { LegalSection } from "../(legal)/LegalShell";

// The actual policy text, shared between the public marketing page (/privacy)
// and the authenticated in-app page (/settings/privacy) so the two never
// drift out of sync.
export function PrivacyPolicyContent() {
  return (
    <>
      <p>
        This policy explains what personal data Konek collects, why we collect it, and the choices you
        have. We collect only what we need to deliver connectivity services and to meet our legal and
        anti-fraud obligations.
      </p>

      <LegalSection heading="1. Data we collect">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li><strong>Account data</strong> — phone number, email, name.</li>
          <li>
            <strong>Identity data</strong> — BVN/NIN, government ID and, for USD accounts and cards, a
            liveness selfie, verified through our KYC partners.
          </li>
          <li><strong>Transaction data</strong> — the services you buy, amounts, and beneficiaries you save.</li>
          <li><strong>Device &amp; security data</strong> — device fingerprint, IP address and session activity for fraud prevention.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How we use your data">
        <p>
          To create and secure your account; deliver and support the services you buy; verify your
          identity; prevent fraud and money laundering; meet legal and regulatory requirements; and
          improve Konek. We do not sell your personal data.
        </p>
      </LegalSection>

      <LegalSection heading="3. Sharing with partners">
        <p>
          To deliver a service we share the minimum necessary data with vetted partners — for example
          VTU aggregators to fulfil a top-up, KYC providers to verify your identity, payment processors
          to fund your wallet, and the licensed institutions behind USD accounts and cards. Each is
          bound to protect your data and use it only for the service provided.
        </p>
      </LegalSection>

      <LegalSection heading="4. How we protect your data">
        <p>
          Data is encrypted in transit, access is role-restricted and audit-logged, and financial
          records are held in an immutable ledger. We apply device monitoring, velocity limits and risk
          scoring to protect your account.
        </p>
      </LegalSection>

      <LegalSection heading="5. Retention">
        <p>
          We keep your data for as long as your account is active and for any period required by law
          (financial and KYC records typically must be retained for several years after your last
          transaction).
        </p>
      </LegalSection>

      <LegalSection heading="6. Your rights">
        <p>
          You may request access to, correction of, or deletion of your personal data, subject to legal
          retention requirements. To exercise these rights, contact{" "}
          <a href="mailto:privacy@konek.app" className="text-indigo underline">privacy@konek.app</a>.
        </p>
      </LegalSection>

      <LegalSection heading="7. Contact">
        <p>
          Questions about your privacy? Email{" "}
          <a href="mailto:privacy@konek.app" className="text-indigo underline">privacy@konek.app</a>.
        </p>
      </LegalSection>
    </>
  );
}
