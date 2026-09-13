/**
 * Templates e-mail transactionnels ekonzo.
 * Aligné sur la charte web : Geist, teal primaire, bandeau RDC, logo Ministère.
 * HTML table + styles inline (Gmail, Outlook, Apple Mail).
 */

const COLORS = {
  primary: "#0095c3",
  navy: "#082c91",
  red: "#d00021",
  text: "#0a0a0a",
  muted: "#737373",
  border: "#e5e5e5",
  bg: "#eef6fa",
  card: "#ffffff",
  codeBg: "#f0f7fb",
  header: "#0a0a0a",
} as const;

const FONT_SANS =
  "'Geist', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FONT_MONO =
  "'Geist Mono', ui-monospace, 'SFMono-Regular', Consolas, 'Courier New', monospace";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** URL d’assets visibles depuis Gmail (pas localhost). */
function emailAssetBase() {
  const publicUrl = (
    process.env.NEXT_PUBLIC_EKONZO_PUBLIC_URL ?? ""
  ).replace(/\/$/, "");
  if (publicUrl && !/localhost|127\.0\.0\.1/.test(publicUrl)) return publicUrl;
  const env = appUrl();
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env;
  return "https://www.ekonzo.site";
}

export type EmailContent = {
  heading: string;
  bodyHtml: string;
  text: string;
  footerNote?: string;
  preheader?: string;
};

function flagStripe() {
  return `
    <tr>
      <td style="padding:0;line-height:0;font-size:0;height:4px;background:linear-gradient(90deg,${COLORS.red} 0%,${COLORS.primary} 45%,${COLORS.navy} 100%)">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td width="28%" style="height:4px;background-color:${COLORS.red};font-size:0;line-height:0">&nbsp;</td>
            <td width="44%" style="height:4px;background-color:${COLORS.primary};font-size:0;line-height:0">&nbsp;</td>
            <td width="28%" style="height:4px;background-color:${COLORS.navy};font-size:0;line-height:0">&nbsp;</td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

export function renderEmailHtml(content: EmailContent): string {
  const year = new Date().getFullYear();
  const base = appUrl();
  const logoSrc = `${emailAssetBase()}/logo.webp`;
  const footer =
    content.footerNote ??
    "Cet e-mail a été envoyé automatiquement. Ne répondez pas à ce message. Si vous n'êtes pas à l'origine de cette demande, vous pouvez l'ignorer en toute sécurité.";
  const preheader =
    content.preheader ??
    `${content.heading} — ekonzo · Ministère des Finances · RDC`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>ekonzo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=Geist+Mono:wght@700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, h1 { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent">
    ${preheader}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.bg};margin:0;padding:0">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto">
          <tr>
            <td style="padding:0">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.card};border-radius:16px;overflow:hidden;border:1px solid ${COLORS.border}">
                <tr>
                  <td align="center" style="padding:22px 28px 18px;background-color:${COLORS.header}">
                    <img src="${logoSrc}" width="240" height="89" alt="Ministère des Finances — République Démocratique du Congo" style="display:block;border:0;outline:none;text-decoration:none;width:240px;height:auto;max-width:100%">
                    <p style="margin:14px 0 0;font-family:${FONT_SANS};font-size:20px;font-weight:700;letter-spacing:-0.03em;color:${COLORS.primary};line-height:1">
                      ekonzo
                    </p>
                    <p style="margin:6px 0 0;font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.55)">
                      Bons &amp; Obligations du Trésor
                    </p>
                  </td>
                </tr>
                ${flagStripe()}
                <tr>
                  <td style="padding:28px 28px 8px">
                    <h1 style="margin:0;font-family:${FONT_SANS};font-size:22px;font-weight:700;letter-spacing:-0.03em;line-height:1.25;color:${COLORS.text}">
                      ${content.heading}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 28px 28px;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${COLORS.text}">
                    ${content.bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px 28px">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLORS.border}">
                      <tr>
                        <td style="padding-top:18px;font-family:${FONT_SANS};font-size:12px;line-height:1.55;color:${COLORS.muted}">
                          ${footer}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 8px 0;font-family:${FONT_SANS};font-size:12px;line-height:1.5;color:${COLORS.muted}">
              <p style="margin:0 0 6px">
                <a href="${base}" style="color:${COLORS.primary};text-decoration:none;font-weight:700">ekonzo</a>
                · Ministère des Finances · RDC
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
  return `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:15px;line-height:1.6;color:${COLORS.text}">${text}</p>`;
}

export function emailMuted(text: string) {
  return `<p style="margin:0 0 16px;font-family:${FONT_SANS};font-size:13px;line-height:1.55;color:${COLORS.muted}">${text}</p>`;
}

export function emailCodeBlock(code: string) {
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 3px"><div style="min-width:38px;height:50px;border-radius:10px;background-color:${COLORS.codeBg};border:1px solid ${COLORS.border};font-family:${FONT_MONO};font-size:22px;font-weight:700;line-height:50px;text-align:center;color:${COLORS.primary};letter-spacing:0">${d}</div></td>`,
    )
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 8px">
      <tr>
        ${digits}
      </tr>
    </table>
    <p style="margin:0 0 20px;text-align:center;font-family:${FONT_SANS};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${COLORS.muted}">
      Code à usage unique · 5&nbsp;min
    </p>
  `;
}

export function emailButton(label: string, href: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px">
      <tr>
        <td style="border-radius:10px;background-color:${COLORS.primary}">
          <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${FONT_SANS};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">
            ${label}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export { COLORS, FONT_SANS, FONT_MONO, appUrl, emailAssetBase };
