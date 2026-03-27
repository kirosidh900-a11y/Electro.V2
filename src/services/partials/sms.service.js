import twilio from "twilio";
import dotenv from "dotenv";
dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

export const sendSMS = async ({ phone, message }) => {
  try {
    // ✅ DEV MODE (no cost)
    //     if (process.env.NODE_ENV !== "production") {
    //       console.log("📱 OTP (DEV):", message);
    //       return;
    //     }

    const res = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phone}`, // 🇮🇳 India format
    });

    console.log("Sent SMS OTP Response: ", res.body);

    return res;
  } catch (error) {
    console.error("Twilio Error:", error.message);
    throw new Error("Failed to send SMS");
  }
};
