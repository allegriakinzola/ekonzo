/**
 * Texte type de la convention de compte-titres.
 * Tenue au nom de la banque partenaire (teneur de comptes).
 * Réf. : art. 66 loi n°22/069 ; décret n°18/025 art. 5 et 9 ; OL n°23/010 (écrit / signature électronique).
 */

export const CONVENTION_VERSION = "2026.1";

export const CONVENTION_TITLE =
  "Convention d'ouverture et de tenue de compte-titres — valeurs du Trésor";

export function buildConventionBody(partnerBankName: string): string {
  return `
## 1. Objet

La présente convention a pour objet l'ouverture et la tenue d'un compte-titres destiné à l'inscription, à la garde et à l'administration des bons du Trésor et obligations du Trésor souscrits par le Titulaire via la plateforme ekonzo.

Conformément à l'article 66 de la loi n°22/069 du 27 décembre 2022, toute ouverture d'un compte-titres fait l'objet d'une convention écrite entre le client et son établissement de crédit.

## 2. Parties

**Le Teneur de comptes** : ${partnerBankName}, établissement de crédit agréé par la Banque centrale du Congo, ci-après « la Banque ».

**Le Titulaire** : la personne physique ou morale dont l'identité a été vérifiée (KYC) sur la plateforme ekonzo, ci-après « le Titulaire ».

**ekonzo** : plateforme numérique de distribution opérant comme canal technique pour le compte de la Banque. ekonzo n'est pas teneur de comptes-titres et ne reçoit pas de fonds remboursables du public en son nom propre.

## 3. Nature des titres

Les bons et obligations du Trésor sont des titres dématérialisés exclusivement inscrits en comptes-titres, négociables et assimilables (décret n°18/025 du 11 juin 2018, article 5).

Le registre central des titres est tenu dans les livres de la Banque centrale du Congo. La Banque assure la tenue du compte-titres individuel du Titulaire. ekonzo tient un registre miroir à des fins d'information et de suivi, sans valeur de conservation juridique.

## 4. Ouverture du compte

L'ouverture du compte-titres est subordonnée :

1. à la vérification d'identité (KYC) du Titulaire ;
2. à l'acceptation et à la signature électronique de la présente convention ;
3. au respect des règles LBC/FT applicables.

Une copie de la présente convention est remise au Titulaire (téléchargement PDF depuis son espace ekonzo).

## 5. Fonctionnement

Sur instructions du Titulaire transmises via ekonzo, la Banque :

- enregistre les souscriptions retenues aux adjudications ;
- inscrit les titres sur le compte-titres du Titulaire ;
- encaisse les intérêts (coupons) et le remboursement du principal à échéance ;
- informe le Titulaire des mouvements affectant son compte (via ekonzo et/ou ses propres canaux).

## 6. Paiements

Les souscriptions sont réglées par Mobile Money, virement bancaire ou tout autre canal mis à disposition, selon les modalités communiquées sur ekonzo. Les fonds transitent vers les comptes de la Banque puis, le cas échéant, vers le compte général du Trésor ouvert à la Banque centrale du Congo.

## 7. Signature électronique

En application de l'ordonnance-loi n°23/010 du 13 mars 2023 portant Code du numérique, le Titulaire reconnaît que :

- l'écrit électronique horodaté et signé a la même force probante qu'un écrit sur papier ;
- sa signature électronique (nom saisi + horodatage + empreinte cryptographique du document) manifeste son consentement aux obligations de la présente convention ;
- une copie PDF signée est archivée et lui est accessible.

## 8. Obligations du Titulaire

Le Titulaire s'engage à :

- fournir des informations exactes et à jour ;
- ne pas céder l'usage de son compte ekonzo à un tiers ;
- signaler sans délai toute opération non autorisée ;
- respecter les plafonds et règles de souscription communiqués.

## 9. Durée et résiliation

La convention est conclue pour une durée indéterminée. Elle peut être résiliée par le Titulaire sous réserve de l'absence de titres en compte, ou clôturée par la Banque dans les cas prévus par la réglementation (notamment comptes inactifs — art. 67 de la loi n°22/069).

## 10. Droit applicable

La présente convention est régie par le droit de la République Démocratique du Congo. Tout litige relève des juridictions compétentes de Kinshasa/Gombe, sauf disposition contraire d'ordre public.
`.trim();
}
