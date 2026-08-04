import { LegalSection } from "../(legal)/LegalShell";

// Shared between the public marketing page (/terms) and the authenticated
// in-app page (/settings/terms) so the two never drift out of sync.
export function TermsOfServiceContent() {
  return (
    <>
      <p>
        These terms govern your use of Konek, a connectivity and digital-services platform for
        Africans at home and abroad. By creating an account you agree to them. Please read the
        section on what Konek is <em>not</em> — it is the heart of how we keep your funds safe.
      </p>

      <LegalSection heading="1. What Konek is">
        <p>
          Konek lets you buy digital connectivity and services: local airtime, data, cable,
          electricity, education pins and betting top-ups; international airtime and data; eSIMs; and,
          where available to you, a receive-only USD account and virtual USD card. You fund a prepaid
          Konek wallet and spend it directly on these services.
        </p>
      </LegalSection>

      <LegalSection heading="2. What Konek is not — no money transfer">
        <p>Konek is deliberately not a money-transfer or remittance service. Konek does not support:</p>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Person-to-person or wallet-to-wallet transfers</li>
          <li>International remittance</li>
          <li>Sending money to a third party&rsquo;s bank account</li>
          <li>Airtime-to-cash, crypto, loans, savings or investments</li>
        </ul>
        <p>
          You may only withdraw funds to a Nigerian bank account held in your own verified name, after
          converting any USD balance to NGN. This structure is what allows Konek to move value, not
          money — keeping your funds secure and out of remittance risk.
        </p>
      </LegalSection>

      <LegalSection heading="3. Your account and identity">
        <p>
          You sign up with a phone number or email and a one-time code. Some services require identity
          verification (BVN/NIN, and for USD accounts and cards, a liveness check) in line with our
          progressive KYC tiers. You are responsible for keeping your device and transaction PIN
          secure, and for all activity under your account.
        </p>
      </LegalSection>

      <LegalSection heading="4. Payments, pricing and delivery">
        <p>
          Prices are shown before you confirm each purchase and are charged in full from your wallet.
          Digital services are delivered by our licensed vendor partners, usually within seconds. If a
          purchase fails, the amount is automatically reversed to your wallet — every movement is
          recorded in an immutable ledger.
        </p>
      </LegalSection>

      <LegalSection heading="5. Refunds and disputes">
        <p>
          A failed or undelivered service is reversed to your Konek wallet. Because Konek sells
          consumable digital services, successfully delivered top-ups are generally non-refundable.
          Card transaction disputes follow the process in the app and may carry a dispute fee to deter
          fraud.
        </p>
      </LegalSection>

      <LegalSection heading="6. Acceptable use">
        <p>
          You agree not to use Konek for fraud, money laundering, or to evade the money-transfer
          restrictions above. We apply velocity limits, device monitoring and risk scoring, and may
          hold or close accounts that violate these terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection heading="7. Changes and contact">
        <p>
          We may update these terms as Konek grows; we will notify you of material changes. Questions?
          Reach us at <a href="mailto:support@konek.app" className="text-indigo underline">support@konek.app</a>.
        </p>
      </LegalSection>
    </>
  );
}
