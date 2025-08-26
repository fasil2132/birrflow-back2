import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { PaymentRequest } from "../types";
const API_URL = "https://api.telebirr.com/v1/payments";
const API_KEY = process.env.TELEBIRR_API_KEY;
const MERCHANT_ID = process.env.TELEBIRR_MERCHANT_ID;

export const initiatePayment = async (
  payment: PaymentRequest
): Promise<{ payment_url: string }> => {
  const transactionId = payment.transaction_id || uuidv4();

  const response = await axios.post(
    API_URL,
    {
      merchant_id: MERCHANT_ID,
      api_key: API_KEY,
      amount: payment.amount,
      phone_number: payment.phone,
      description: payment.description,
      callback_url: payment.callback_url,
      transaction_id: transactionId,
    },
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  // const result = response.data as string;
  if ((response.data as any).status !== "success") {
    throw new Error(
      `Telebirr payment failed: ${(response.data as any).message}`
    );
  }

  return { payment_url: (response.data as any).payment_url };
};
