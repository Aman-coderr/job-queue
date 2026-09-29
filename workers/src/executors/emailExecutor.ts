import { Resend } from "resend";
import * as dotenv from "dotenv";
dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function emailSender(to: string, subject: string, text: string) {
  const result = await resend.emails.send({
    from: "onboarding@resend.dev",
    to,
    subject,
    text
  })
  if (result.error) {
    throw new Error(result.error.message);
  }
}
