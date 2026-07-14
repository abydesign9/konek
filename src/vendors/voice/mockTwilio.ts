export interface PlaceCallResult {
  providerCallSid: string;
  durationSeconds: number;
  costMinor: number;
}

const NGN_PER_MINUTE = 5000; // ₦50/min mock CPaaS cost, only charged past the free bundle

export interface VoiceAdapter {
  id: string;
  placeCall(toNumber: string, durationSeconds: number): Promise<PlaceCallResult>;
}

export const mockTwilioAdapter: VoiceAdapter = {
  id: "mock_twilio",

  async placeCall(toNumber: string, durationSeconds: number): Promise<PlaceCallResult> {
    const minutes = Math.ceil(durationSeconds / 60);
    return {
      providerCallSid: `CA${crypto.randomUUID().replace(/-/g, "")}`,
      durationSeconds,
      costMinor: minutes * NGN_PER_MINUTE,
    };
  },
};
