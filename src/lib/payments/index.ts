import { PaymentGateway } from "./types";
import { mockPaymentGateway } from "./mock";
import { paystackGateway } from "./paystack";

const key = process.env.PAYSTACK_SECRET_KEY;
const hasLiveKey = Boolean(key && key !== "sk_test_...");

export const paymentGateway: PaymentGateway = hasLiveKey ? paystackGateway : mockPaymentGateway;
