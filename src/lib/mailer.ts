import nodemailer from "nodemailer";
import { buildOtpEmail, type OtpEmailType } from "./email/otp";
import { renderEmailHtml, type EmailContent } from "./email/layout";

function getTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error("SMTP_USER et SMTP_PASS doivent être définis dans .env");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const from = process.env.SMTP_USER!;

  if (process.env.NODE_ENV !== "production") {
    console.log(`[EMAIL] → ${opts.to} | ${opts.subject}\n${opts.text}`);
  }

  const transport = getTransport();
  await transport.sendMail({
    from: `"ekonzo" <${from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html ?? `<p>${opts.text.replace(/\n/g, "<br/>")}</p>`,
  });
}

/** Envoie un e-mail déjà composé via le layout ekonzo. */
export async function sendTemplatedEmail(
  to: string,
  subject: string,
  content: EmailContent,
) {
  await sendEmail({
    to,
    subject,
    text: content.text,
    html: renderEmailHtml(content),
  });
}

export async function sendOtpEmail(
  to: string,
  code: string,
  type: OtpEmailType = "email-verification",
) {
  const email = buildOtpEmail(code, type);
  await sendEmail({
    to,
    subject: email.subject,
    text: email.text,
    html: email.html,
  });
}

export { buildOtpEmail, renderEmailHtml };
export type { EmailContent, OtpEmailType };
