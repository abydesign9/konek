export interface SmsSender {
  sendOtp(phone: string, code: string): Promise<{ vendorRef: string }>;
}
