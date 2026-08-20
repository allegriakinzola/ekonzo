/**
 * Texte type de la convention de compte-titres (version condensée).
 * Réf. : art. 66 loi n°22/069 ; décret n°18/025 ; OL n°23/010.
 */

export const CONVENTION_VERSION = "2026.1";

export const CONVENTION_TITLE =
  "Convention d'ouverture et de tenue de compte-titres — valeurs du Trésor";

export function buildConventionBody(partnerBankName: string): string {
  return `
## Article 1 — Objet

La présente convention a pour objet l'ouverture et la tenue d'un compte-titres pour l'inscription et la garde des bons et obligations du Trésor souscrits via ekonzo, conformément à l'article 66 de la loi n°22/069 du 27 décembre 2022.

## Article 2 — Parties

**La Banque (Teneur de comptes)** : ${partnerBankName}, établissement de crédit agréé par la Banque centrale du Congo.

**Le Titulaire** : la personne dont l'identité a été vérifiée (KYC) sur ekonzo.

**ekonzo** : canal numérique technique agissant pour le compte de la Banque. ekonzo n'est pas teneur de comptes-titres.

## Article 3 — Compte-titres et fonctionnement

Les titres du Trésor sont dématérialisés et inscrits exclusivement en compte-titres (décret n°18/025). La Banque tient le compte individuel du Titulaire ; le registre central est tenu par la Banque centrale du Congo.

Sur instructions du Titulaire transmises via ekonzo, la Banque enregistre les souscriptions, inscrit les titres, encaisse les intérêts et rembourse le principal à échéance. Les paiements s'effectuent par Mobile Money, virement ou tout autre canal indiqué sur ekonzo.

## Article 4 — Obligations du Titulaire

Le Titulaire s'engage à fournir des informations exactes, à ne pas céder l'usage de son compte ekonzo, à signaler toute opération non autorisée et à respecter les règles LBC/FT et plafonds de souscription.

## Article 5 — Signature électronique

Conformément à l'ordonnance-loi n°23/010 portant Code du numérique, le Titulaire reconnaît à l'écrit et à la signature électroniques la même force probante qu'un écrit papier. Une copie PDF signée lui est accessible depuis ekonzo.

## Article 6 — Durée et droit applicable

La convention est à durée indéterminée. Elle peut être résiliée par le Titulaire (compte sans titres) ou clôturée par la Banque selon la réglementation. Elle est régie par le droit de la RDC ; litiges : juridictions de Kinshasa/Gombe.
`.trim();
}
