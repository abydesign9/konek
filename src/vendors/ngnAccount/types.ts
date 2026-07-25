// NGN reserved (virtual) account provider. Monnify is the first implementation.
// Receive-only: money lands on the account and credits the user's NGN wallet.
// There is no send() method — outbound is a separate withdraw-to-own-bank path.

export interface CreateNgnAccountResult {
  providerRef: string; // the provider's account reference (accountReference)
  accountNumber: string;
  bankName: string;
}

export interface NgnInflowVerifyResult {
  status: "received" | "not_found";
  accountProviderRef: string;
  amountMinor: number; // kobo
  senderName: string;
  senderBank: string;
}

export interface NgnAccountAdapter {
  id: string;
  // bvn is required by NGN providers to reserve an account.
  createAccount(input: { userId: string; name: string; email: string; bvn?: string }): Promise<CreateNgnAccountResult>;
  verifyInflow(inflowRef: string): Promise<NgnInflowVerifyResult>;
}
