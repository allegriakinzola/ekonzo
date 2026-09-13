import {
  emailCodeBlock,
  emailMuted,
  emailParagraph,
  renderEmailHtml,
} from "./layout";

export type OtpEmailType =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | string;

function otpCopy(type: OtpEmailType) {
  switch (type) {
    case "sign-in":
      return {
        subject: "Code de connexion ekonzo",
        heading: "Connexion à votre compte",
        intro:
          "Voici le code pour vous connecter à ekonzo. Saisissez-le dans l’application — ne le partagez avec personne.",
      };
    case "forget-password":
      return {
        subject: "Réinitialisation du mot de passe ekonzo",
        heading: "Réinitialiser votre mot de passe",
        intro:
          "Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code ci-dessous pour continuer.",
      };
    case "email-verification":
    default:
      return {
        subject: "Votre code de vérification ekonzo",
        heading: "Vérifiez votre adresse e-mail",
        intro:
          "Merci de votre inscription sur ekonzo, plateforme des Bons &amp; Obligations du Trésor. Confirmez votre adresse avec le code ci-dessous.",
      };
  }
}

export function buildOtpEmail(code: string, type: OtpEmailType = "email-verification") {
  const copy = otpCopy(type);
  const safeCode = code.replace(/[^0-9A-Za-z]/g, "").slice(0, 12);

  const bodyHtml = [
    emailParagraph(copy.intro),
    emailCodeBlock(safeCode),
    emailMuted(
      "Si vous n’avez pas demandé ce code, ignorez cet e-mail. Votre compte reste sécurisé.",
    ),
  ].join("");

  const text = [
    copy.heading,
    "",
    copy.intro.replace(/&amp;/g, "&"),
    "",
    `Code : ${safeCode}`,
    "",
    "Il expire dans 5 minutes.",
    "Si vous n’avez pas demandé ce code, ignorez cet e-mail.",
    "",
    "— ekonzo · Ministère des Finances · RDC",
  ].join("\n");

  return {
    subject: copy.subject,
    text,
    html: renderEmailHtml({
      heading: copy.heading,
      bodyHtml,
      text,
      preheader: `${copy.heading} · code ${safeCode} · 5 min`,
      footerNote:
        "Ne communiquez jamais ce code. Les équipes ekonzo ne vous le demanderont pas par téléphone ni par e-mail.",
    }),
  };
}
