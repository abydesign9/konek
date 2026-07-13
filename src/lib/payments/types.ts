export interface InitializeParams {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  callbackUrl: string;
}

export interface InitializeResult {
  authorizationUrl: string;
  reference: string;
}

export type VerifyStatus = "success" | "failed" | "pending";

export interface VerifyResult {
  status: VerifyStatus;
  amountMinor: number;
  currency: string;
}

export interface PaymentGateway {
  initialize(params: InitializeParams): Promise<InitializeResult>;
  verifyTransaction(reference: string): Promise<VerifyResult>;
}
