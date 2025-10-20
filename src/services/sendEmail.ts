// services/sendEmail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  try {
    const { data, error } = await resend.emails.send({
      from: "DILG Calapan City <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("❌ Resend API Error:", error);
      return false;
    }

    console.log("✅ Email sent:", data?.id);
    return true;
  } catch (err) {
    console.error("❌ Email sending failed:", err);
    return false;
  }
};
