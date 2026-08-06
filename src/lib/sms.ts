/**
 * Envoi de SMS via Infobip (https://www.infobip.com/docs/api).
 * En développement, si les credentials ne sont pas définis, le message est
 * simplement affiché dans la console.
 */

const INFOBIP_BASE_URL = process.env.INFOBIP_BASE_URL; // ex : xxxxx.api.infobip.com
const INFOBIP_API_KEY = process.env.INFOBIP_API_KEY;
const INFOBIP_SENDER = process.env.INFOBIP_SENDER ?? "ekonzo";

export async function sendSms(to: string, message: string): Promise<void> {
  // Mode dev / sandbox : pas de credentials → log console
  if (!INFOBIP_BASE_URL || !INFOBIP_API_KEY) {
    console.log(`[SMS:DEV] → ${to} : ${message}`);
    return;
  }

  const res = await fetch(`https://${INFOBIP_BASE_URL}/sms/2/text/advanced`, {
    method: "POST",
    headers: {
      Authorization: `App ${INFOBIP_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          destinations: [{ to }],
          from: INFOBIP_SENDER,
          text: message,
        },
      ],
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(`Echec envoi SMS Infobip (${res.status}) : ${JSON.stringify(json)}`);
  }

  // Infobip renvoie 200 même si le message est rejeté — le vrai statut
  // est dans messages[0].status (ex : REJECTED_DESTINATION en compte trial).
  const status = json?.messages?.[0]?.status;
  console.log(`[SMS:INFOBIP] → ${to} : ${status?.groupName ?? "?"} / ${status?.name ?? "?"} — ${status?.description ?? ""}`);

  if (status?.groupName === "REJECTED") {
    throw new Error(`SMS rejeté par Infobip : ${status.name} — ${status.description}`);
  }
}
