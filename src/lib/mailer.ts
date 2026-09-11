import nodemailer from "nodemailer";

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

export async function sendOtpEmail(to: string, code: string) {
  await sendEmail({
    to,
    subject: "Votre code de vérification ekonzo",
    text: `Votre code de vérification ekonzo est : ${code}\n\nIl expire dans 5 minutes.\nSi vous n'avez pas demandé ce code, ignorez cet e-mail.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#17418a;margin:0 0 12px">ekonzo</h2>
        <p style="color:#323230;margin:0 0 16px">Votre code de vérification :</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#17418a;margin:0 0 16px">${code}</p>
        <p style="color:#5a5a58;font-size:13px;margin:0">Il expire dans 5 minutes. Si vous n'avez pas demandé ce code, ignorez cet e-mail.</p>
      </div>
    `,
  });
}
