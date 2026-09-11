/**
 * Templates e-mail transactionnels ekonzo.
 * HTML table + styles inline pour compatibilité clients (Gmail, Outlook, Apple Mail).
 */

const COLORS = {
  navy: "#17418a",
  navyDark: "#0f2d5c",
  red: "#ce1126",
  yellow: "#f7d618",
  text: "#1c2434",
  muted: "#5c6578",
  border: "#e2e6ef",
  bg: "#eef1f6",
  card: "#ffffff",
  codeBg: "#f4f6fb",
} as const;

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export type EmailContent = {
  /** Titre visible dans le corps (sous le header) */
  heading: string;
  /** HTML du corps (paragraphes, boutons, etc.) */
  bodyHtml: string;
  /** Version texte brut obligatoire pour l’envoi */
  text: string;
  /** Pied de page optionnel (défaut : note sécurité) */
  footerNote?: string;
};

/** Bandeau tricolore RDC (bleu / jaune / rouge) */
function flagStripe() {
  return `
    <tr>
      <td style="padding:0;line-height:0;font-size:0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="33.33%" style="height:4px;background-color:${COLORS.navy};font-size:0;line-height:0">&nbsp;</td>
            <td width="33.33%" style="height:4px;background-color:${COLORS.yellow};font-size:0;line-height:0">&nbsp;</td>
            <td width="33.34%" style="height:4px;background-color:${COLORS.red};font-size:0;line-height:0">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

/**
 * Enveloppe HTML commune à tous les e-mails ekonzo.
 */
export function renderEmailHtml(content: EmailContent): string {
  const year = new Date().getFullYear();
  const base = appUrl();
  const footer =
    content.footerNote ??
    "Cet e-mail a été envoyé automatiquement. Ne répondez pas à ce message. Si vous n'êtes pas à l'origine de cette demande, vous pouvez l'ignorer en toute sécurité.";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ekonzo</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
    ${content.heading} — ekonzo · Ministère des Finances · RDC
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg};margin:0;padding:0">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto">
          <!-- Marque -->
          <tr>
            <td align="center" style="padding:0 0 20px">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px">
                    <div style="width:36px;height:36px;border-radius:10px;background-color:${COLORS.navy};color:#ffffff;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;line-height:36px;text-align:center">e</div>
                  </td>
                  <td style="vertical-align:middle">
                    <span style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;color:${COLORS.navy};letter-spacing:-0.02em">ekonzo</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Carte -->
          <tr>
            <td style="padding:0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.card};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border}">
                ${flagStripe()}
                <tr>
                  <td style="padding:28px 28px 8px;background-color:${COLORS.navy}">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.72)">
                      Ministère des Finances · RDC
                    </p>
                    <h1 style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;line-height:1.3;color:#ffffff">
                      ${content.heading}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.text}">
                    ${content.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLORS.border}">
                      <tr>
                        <td style="padding-top:18px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:${COLORS.muted}">
                          ${footer}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pied -->
          <tr>
            <td align="center" style="padding:24px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${COLORS.muted}">
              <p style="margin:0 0 6px">
                <a href="${base}" style="color:${COLORS.navy};text-decoration:none;font-weight:600">ekonzo</a>
                · Plateforme des Bons &amp; Obligations du Trésor
              </p>
              <p style="margin:0;color:#8a93a5">© ${year} République Démocratique du Congo</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailParagraph(text: string) {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.text}">${text}</p>`;
}

export function emailMuted(text: string) {
  return `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:${COLORS.muted}">${text}</p>`;
}

/** Bloc code OTP / référence mise en avant */
export function emailCodeBlock(code: string) {
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 4px"><div style="min-width:36px;height:48px;border-radius:10px;background-color:${COLORS.codeBg};border:1px solid ${COLORS.border};font-family:'Courier New',Courier,monospace;font-size:24px;font-weight:700;line-height:48px;text-align:center;color:${COLORS.navy}">${d}</div></td>`,
    )
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px auto 24px">
      <tr>
        ${digits}
      </tr>
    </table>
    <p style="margin:0 0 20px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.muted}">
      Code à usage unique · 5&nbsp;min
    </p>
  `;
}

export function emailButton(label: string, href: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px">
      <tr>
        <td style="border-radius:10px;background-color:${COLORS.navy}">
          <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export { COLORS, appUrl };
