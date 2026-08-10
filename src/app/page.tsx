import Image from "next/image";
import Link from "next/link";
import {
  BankIcon,
  BriefcaseIcon,
  ChartLineUpIcon,
  CheckIcon,
  DeviceMobileIcon,
  FileTextIcon,
  GlobeHemisphereWestIcon,
  IdentificationCardIcon,
  LockKeyIcon,
  ShieldCheckIcon,
  TrendUpIcon,
  UserIcon,
  UserPlusIcon,
  WalletIcon,
} from "@phosphor-icons/react/dist/ssr";
import { HomeNavbar } from "./components/HomeNavbar";

const FEATURES = [
  {
    icon: BankIcon,
    title: "Émis par l'État",
    desc: "Les Bons du Trésor sont émis et garantis par le Ministère des Finances de la RDC.",
  },
  {
    icon: ChartLineUpIcon,
    title: "Rendements attractifs",
    desc: "Des taux compétitifs sur des durées flexibles, adaptés à vos objectifs d'épargne.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Sécurité maximale",
    desc: "Placements encadrés par la Banque Centrale du Congo. Vos opérations sont tracées.",
  },
  {
    icon: DeviceMobileIcon,
    title: "100 % en ligne",
    desc: "Souscrivez depuis votre téléphone ou ordinateur, via Mobile Money ou virement.",
  },
];

const STEPS = [
  {
    n: "01",
    icon: UserPlusIcon,
    title: "Créer votre compte",
    desc: "Inscrivez-vous avec votre numéro de téléphone en moins de 2 minutes.",
  },
  {
    n: "02",
    icon: IdentificationCardIcon,
    title: "Vérifier votre identité",
    desc: "Soumettez votre pièce d'identité. Validation sous 24 à 48 h.",
  },
  {
    n: "03",
    icon: FileTextIcon,
    title: "Choisir un Bon du Trésor",
    desc: "Parcourez les émissions ouvertes et sélectionnez la durée qui vous convient.",
  },
  {
    n: "04",
    icon: WalletIcon,
    title: "Percevoir vos intérêts",
    desc: "Suivez votre portefeuille et recevez vos intérêts selon le calendrier du produit.",
  },
];

const AUDIENCES = [
  {
    icon: UserIcon,
    title: "Particuliers",
    desc: "Faites fructifier votre épargne avec des titres d'État, depuis votre Mobile Money.",
  },
  {
    icon: BriefcaseIcon,
    title: "Professionnels",
    desc: "Placez la trésorerie de votre activité sur des instruments publics réglementés.",
  },
  {
    icon: GlobeHemisphereWestIcon,
    title: "Diaspora",
    desc: "Investissez dans les titres du Trésor congolais où que vous soyez, en toute simplicité.",
  },
];

const PAYMENTS = [
  {
    name: "Airtel Money",
    initial: "A",
    accent: "bg-red-500/10 text-red-600 border-red-200",
    desc: "Confirmez le paiement directement depuis votre téléphone via prompt USSD.",
  },
  {
    name: "Orange Money",
    initial: "O",
    accent: "bg-orange-500/10 text-orange-600 border-orange-200",
    desc: "Souscrivez et payez en quelques secondes avec votre compte Orange Money.",
  },
  {
    name: "M-Pesa",
    initial: "M",
    accent: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    desc: "Utilisez M-Pesa pour finaliser votre souscription en toute sécurité.",
  },
  {
    name: "Virement bancaire",
    initial: "B",
    accent: "bg-primary/10 text-primary border-primary/20",
    desc: "Transférez vers le compte indiqué et conservez votre référence de paiement.",
  },
];

const FAQ = [
  {
    q: "Qu'est-ce qu'ekonzo ?",
    a: "ekonzo est la plateforme digitale de souscription aux Bons du Trésor émis par le Ministère des Finances de la RDC.",
  },
  {
    q: "Qui peut souscrire ?",
    a: "Tout particulier ou professionnel disposant d'une pièce d'identité valide et d'un moyen de paiement accepté (Mobile Money ou virement).",
  },
  {
    q: "Le KYC est-il obligatoire ?",
    a: "Oui. La vérification d'identité est requise avant toute souscription, conformément aux règles de lutte contre le blanchiment et de protection des investisseurs.",
  },
  {
    q: "Comment sont versés les intérêts ?",
    a: "Pour les Bons du Trésor, les intérêts sont versés à l'échéance du titre, selon les conditions de l'émission.",
  },
  {
    q: "Puis-je souscrire en CDF et en USD ?",
    a: "Oui. Les émissions de Bons du Trésor peuvent être proposées en franc congolais ou en dollar américain, selon le calendrier du Trésor.",
  },
  {
    q: "Mes données sont-elles protégées ?",
    a: "Vos documents et informations personnelles sont traités de façon sécurisée, avec un accès restreint et une traçabilité des opérations.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
}) {
  return ( 
    <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center sm:mb-14">
      <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
        {title}
      </h2>
      {desc && (
        <p className="text-sm leading-relaxed text-slate-500 sm:text-[15px]">
          {desc}
        </p>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <HomeNavbar />

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-primary to-slate-800 text-white">
        {/* Liseré tricolore RDC */}
        <div className="absolute inset-x-0 top-0 z-10 flex h-[3px]">
          <div className="flex-[2] bg-primary" />
          <div className="flex-1 bg-yellow-400" />
          <div className="flex-[2] bg-[var(--rdc-red)]" />
        </div>

        {/* Touches lumineuses + trame fine */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden
        >
          <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
          <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.035) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 90% 80% at 50% 20%, black 40%, transparent 100%)",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:pt-16 lg:px-6 lg:pb-24 lg:pt-24">
          <div className="grid items-center gap-12 sm:gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            {/* Colonne texte */}
            <div className="space-y-6 sm:space-y-8">
              <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pl-2 pr-3.5 text-[11px] font-medium text-white/85 backdrop-blur-sm sm:text-xs">
                <span className="flex h-5 items-center rounded-full bg-yellow-400/15 px-2 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                  Officiel
                </span>
                <span className="truncate">
                  Ministère des Finances · République Démocratique du Congo
                </span>
              </div>

              <div className="space-y-4 sm:space-y-5">
                <h1 className="text-[2.1rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[2.75rem] md:text-5xl lg:text-[3.5rem]">
                  L&apos;épargne qui
                  <br />
                  construit le pays,
                  <br />
                  <span className="bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                    à votre portée.
                  </span>
                </h1>
                <p className="max-w-md text-[15px] leading-relaxed text-slate-300 sm:text-base">
                  Souscrivez aux Bons du Trésor de la RDC depuis votre
                  téléphone. Rendement garanti par l&apos;État, paiement Mobile
                  Money, dès 100 USD.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-slate-950 shadow-[0_8px_30px_rgb(0_0_0/0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgb(0_0_0/0.45)] sm:px-7"
                >
                  Ouvrir mon compte
                  <span
                    className="transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  >
                    →
                  </span>
                </Link>
                <a
                  href="#fonctionnement"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/[0.03] px-6 text-sm font-semibold text-white/90 backdrop-blur-sm transition-colors hover:border-white/35 hover:bg-white/[0.08] sm:px-7"
                >
                  Comment ça marche
                </a>
              </div>

              {/* Preuves de confiance */}
              <div className="flex items-center gap-4 border-t border-white/10 pt-5 sm:gap-6">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/logo.webp"
                    alt=""
                    width={34}
                    height={34}
                    className="rounded-lg bg-white object-contain p-1"
                  />
                  <p className="text-xs leading-tight text-slate-300">
                    <span className="block font-semibold text-white">
                      Ministère des Finances
                    </span>
                    Plateforme sous tutelle
                  </p>
                </div>
                <div className="h-8 w-px bg-white/10" aria-hidden />
                <p className="text-xs leading-tight text-slate-300">
                  <span className="block font-semibold text-white">
                    Cadre BCC
                  </span>
                  Opérations tracées
                </p>
              </div>
            </div>

            {/* Colonne visuelle */}
            <div className="relative mx-auto w-full max-w-[380px] lg:max-w-none lg:justify-self-end">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] sm:max-w-[360px]">
                {/* Cadre décoratif décalé */}
                <div
                  className="absolute -inset-3 rounded-[2rem] border border-white/10 sm:-inset-4"
                  aria-hidden
                />
                <div
                  className="absolute -right-3 -top-3 h-24 w-24 rounded-tr-[2rem] border-r-2 border-t-2 border-yellow-400/60 sm:-right-4 sm:-top-4"
                  aria-hidden
                />
                <div
                  className="absolute -bottom-3 -left-3 h-24 w-24 rounded-bl-[2rem] border-b-2 border-l-2 border-primary/70 sm:-bottom-4 sm:-left-4"
                  aria-hidden
                />

                <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/50 ring-1 ring-white/15">
                  <Image
                    src="/ekonzophoto.jpg"
                    alt="Investisseuse ekonzo"
                    fill
                    sizes="(max-width: 640px) 320px, 360px"
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-slate-950/80 to-transparent" />

                  {/* Carte taux intégrée */}
                  <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/15 bg-slate-950/70 p-3.5 backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Bon du Trésor · 26 semaines
                        </p>
                        <p className="mt-1 text-2xl font-black tracking-tight text-white sm:text-[1.75rem]">
                          8,50{" "}
                          <span className="text-base font-bold text-yellow-300">
                            %
                          </span>
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Taux annuel brut · dès 100 USD
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                          ● Ouvert
                        </span>
                        <p className="text-right text-[10px] leading-tight text-slate-400">
                          <span className="block text-sm font-bold text-yellow-300">
                            + 42,50 USD
                          </span>
                          sur 1 000 USD
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Pastille paiement */}
                <div className="absolute -left-2 top-6 flex items-center gap-2 rounded-xl border border-white/15 bg-slate-950/80 py-2 pl-2.5 pr-3.5 text-[11px] font-semibold text-white shadow-xl backdrop-blur-md sm:-left-8 sm:top-9">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-400/15 text-xs text-emerald-300">
                    ✓
                  </span>
                  <span className="leading-tight">
                    Paiement confirmé
                    <span className="block text-[10px] font-medium text-slate-400">
                      Mobile Money · USSD
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bandeau de chiffres clés */}
          <div className="mt-14 grid grid-cols-2 divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm sm:mt-16 lg:mt-20 lg:grid-cols-4 lg:divide-x">
            {[
              { val: "100 %", label: "Garanti par l'État congolais" },
              { val: "4 – 52 sem.", label: "Durées des Bons du Trésor" },
              { val: "100 USD", label: "Ticket minimum d'entrée" },
              { val: "CDF · USD", label: "Souscription en deux devises" },
            ].map((s, i) => (
              <div
                key={s.label}
                className={`px-5 py-4 sm:px-6 sm:py-5 ${i < 2 ? "border-b border-white/10 lg:border-b-0" : ""} ${i % 2 === 0 ? "border-r border-white/10 lg:border-r-0" : ""}`}
              >
                <p className="text-lg font-black tracking-tight text-white sm:text-xl">
                  {s.val}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-400 sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Produits ── */}
      <section
        id="produits"
        className="scroll-mt-20 py-16 sm:scroll-mt-24 sm:py-20 lg:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <SectionHeading
            eyebrow="Nos produits"
            title="Les Bons du Trésor"
            desc="Le Ministère des Finances émet régulièrement des Bons du Trésor adaptés à tous les profils d'épargnants."
          />

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_2px_40px_rgb(15_23_42/0.06)] lg:grid lg:grid-cols-[1.1fr_0.9fr]">
            {/* Contenu */}
            <div className="flex flex-col justify-center gap-6 p-6 sm:p-10 lg:p-12">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-black text-primary">
                  BT
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  4 semaines à 12 mois
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Un placement court terme,
                  <br className="hidden sm:block" /> sûr et rémunérateur
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                  Les Bons du Trésor sont des instruments à court terme émis
                  par l&apos;État. Vous prêtez au Trésor Public, vous récupérez
                  votre capital et vos intérêts à l&apos;échéance.
                </p>
              </div>

              <ul className="grid gap-2.5 sm:grid-cols-2">
                {[
                  "Souscription en CDF ou USD",
                  "Ticket d'entrée accessible",
                  "Intérêts versés à l'échéance",
                  "Émissions régulières du Trésor",
                ].map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2.5 text-sm text-slate-600"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                      <CheckIcon className="size-3" weight="bold" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  Souscrire maintenant →
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-6 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Voir les émissions ouvertes
                </Link>
              </div>
            </div>

            {/* Visuel */}
            <div className="relative min-h-[260px] sm:min-h-[340px] lg:min-h-0">
              <Image
                src="/photo.jpg"
                alt="Investisseur ekonzo consultant son portefeuille"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-white/5" />

              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-slate-950/70 p-4 backdrop-blur-md sm:inset-x-6 sm:bottom-6">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Exemple · 1 000 USD placés
                  </p>
                  <p className="mt-0.5 text-xl font-black text-white">
                    1 042,50 USD
                  </p>
                  <p className="text-[10px] text-slate-400">
                    récupérés après 26 semaines à 8,50 %
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                  <TrendUpIcon className="size-5" weight="bold" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pour qui ── */}
      <section
        id="pour-qui"
        className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-16 sm:scroll-mt-24 sm:py-20 lg:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <SectionHeading
            eyebrow="Public"
            title="Pour qui est ekonzo ?"
            desc="Une plateforme conçue pour démocratiser l'accès aux titres publics congolais."
          />

          <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {AUDIENCES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-slate-900/5 sm:p-7"
                >
                  <span
                    className="absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-gradient-to-r from-primary via-yellow-400 to-[var(--rdc-red)] transition-transform duration-300 group-hover:scale-x-100"
                    aria-hidden
                  />
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="size-5" weight="duotone" />
                  </span>
                  <h3 className="mt-4 text-base font-bold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Fonctionnement ── */}
      <section
        id="fonctionnement"
        className="scroll-mt-20 py-16 sm:scroll-mt-24 sm:py-20 lg:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <SectionHeading
            eyebrow="Processus"
            title="Comment ça marche ?"
            desc="Quatre étapes simples pour commencer à investir."
          />

          <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            <span
              className="pointer-events-none absolute left-0 right-0 top-[3.4rem] hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:block"
              aria-hidden
            />
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.n}
                  className="group relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg hover:shadow-slate-900/5"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="relative z-10 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-4 ring-white transition-colors group-hover:bg-primary group-hover:text-white">
                      <Icon className="size-5" weight="duotone" />
                    </span>
                    <span className="text-3xl font-black tracking-tight text-slate-100 transition-colors group-hover:text-primary/15">
                      {s.n}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {s.desc}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── Paiements ── */}
      <section
        id="paiements"
        className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-16 sm:scroll-mt-24 sm:py-20 lg:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                Paiements
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
                Payez comme vous en avez l&apos;habitude
              </h2>
              <p className="text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                ekonzo s&apos;intègre aux moyens de paiement les plus utilisés
                en RDC. Vous validez votre souscription directement sur votre
                téléphone, via le menu USSD de votre opérateur.
              </p>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <DeviceMobileIcon className="size-5" weight="duotone" />
                </span>
                <p className="text-xs leading-relaxed text-slate-500">
                  <span className="font-semibold text-slate-800">
                    Prompt USSD instantané —
                  </span>{" "}
                  confirmez avec votre code PIN Mobile Money, sans quitter
                  l&apos;application.
                </p>
              </div>
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-bold text-white shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
              >
                Créer mon compte →
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {PAYMENTS.map((item) => (
                <div
                  key={item.name}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md hover:shadow-slate-900/5"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border text-base font-black ${item.accent}`}
                    >
                      {item.initial}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {item.name}
                    </h3>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Callout photo ── */}
      <section className="py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-primary/90 to-slate-800 shadow-xl shadow-slate-900/15 lg:grid lg:grid-cols-2">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-[3px]"
              aria-hidden
            >
              <div className="flex-[2] bg-primary" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-[2] bg-[var(--rdc-red)]" />
            </div>

            <div className="relative min-h-[260px] sm:min-h-[340px] lg:min-h-[460px]">
              <Image
                src="/photo.jpg"
                alt="Investisseur satisfait ekonzo"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-slate-950/60" />
            </div>

            <div className="flex flex-col justify-center space-y-6 p-6 text-white sm:p-10 lg:p-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3.5 py-1 text-xs font-bold text-yellow-300">
                <TrendUpIcon className="size-3.5" weight="bold" />
                Des rendements concrets
              </div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Faites fructifier votre argent avec les titres du Ministère des
                Finances
              </h2>
              <p className="text-sm leading-relaxed text-white/70 sm:text-[15px]">
                Chaque franc investi dans un Bon du Trésor génère des intérêts
                garantis par l&apos;État congolais. Un placement sûr,
                transparent et accessible.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: "4 sem.", label: "Durée minimale BT" },
                  { val: "12 mois", label: "Durée maximale BT" },
                  { val: "100 USD", label: "Mise minimale" },
                  { val: "À l'échéance", label: "Versement intérêts" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm transition-colors hover:bg-white/10"
                  >
                    <p className="font-bold text-yellow-300">{s.val}</p>
                    <p className="mt-0.5 text-xs text-white/55">{s.label}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex h-11 w-fit items-center justify-center rounded-xl bg-white px-7 text-sm font-bold text-slate-950 transition-all hover:-translate-y-0.5 hover:bg-white/95"
              >
                Commencer à investir →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Avantages ── */}
      <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative order-last mx-auto w-full max-w-lg lg:order-first lg:max-w-none">
              <div className="relative h-[300px] overflow-hidden rounded-3xl shadow-xl shadow-slate-900/10 sm:h-[420px] lg:h-[500px]">
                <Image
                  src="/ekonzophoto.jpg"
                  alt="Investisseuse ekonzo"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 to-transparent" />

                <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg backdrop-blur sm:inset-x-6 sm:bottom-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        Intérêts perçus · 26 semaines
                      </p>
                      <p className="mt-0.5 text-2xl font-black text-emerald-600">
                        + 42,50 USD
                      </p>
                      <p className="text-xs text-slate-500">
                        sur un placement de 1 000 USD
                      </p>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-4 ring-emerald-100/60">
                      <ChartLineUpIcon className="size-6" weight="duotone" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-7">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  Pourquoi ekonzo ?
                </p>
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[2rem]">
                  Investir en toute confiance
                </h2>
                <p className="text-sm leading-relaxed text-slate-500 sm:text-[15px]">
                  Accédez aux titres publics congolais depuis votre téléphone,
                  avec un parcours clair et sécurisé.
                </p>
              </div>

              <div className="space-y-3">
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-primary/30 hover:shadow-md hover:shadow-slate-900/5 sm:p-5"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                        <Icon className="size-5" weight="duotone" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          {f.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                          {f.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        id="faq"
        className="scroll-mt-20 py-16 sm:scroll-mt-24 sm:py-20 lg:py-28"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <SectionHeading
            eyebrow="FAQ"
            title="Questions fréquentes"
            desc="Les réponses essentielles avant d'ouvrir votre compte et de souscrire."
          />

          <div className="mx-auto max-w-3xl space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-colors open:border-primary/25 open:shadow-sm sm:px-6"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-all group-open:rotate-45 group-open:bg-primary/10 group-open:text-primary">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 border-t border-slate-100 pt-3 text-sm leading-relaxed text-slate-500">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sécurité ── */}
      <section
        id="securite"
        className="relative scroll-mt-20 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-16 text-white sm:scroll-mt-24 sm:py-20 lg:py-28"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div
            className="absolute inset-0 opacity-[0.3]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgb(255 255 255 / 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.03) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)",
            }}
          />
          <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-sky-300">
                <LockKeyIcon className="size-3.5" weight="bold" />
                Conformité & Sécurité
              </p>
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-[2rem]">
                Une plateforme alignée sur les exigences de la BCC
              </h2>
              <p className="text-sm leading-relaxed text-white/70 sm:text-[15px]">
                ekonzo s&apos;inscrit dans le cadre défini par la Banque
                Centrale du Congo et le Ministère des Finances. Chaque
                opération est tracée et sécurisée.
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  "Vérification KYC obligatoire pour tous les investisseurs",
                  "Protection des données personnelles",
                  "Traçabilité complète des souscriptions et paiements",
                  "Parcours digital contrôlé de bout en bout",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/85">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <CheckIcon className="size-3" weight="bold" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <div className="relative w-full max-w-sm">
                <div
                  className="absolute -inset-3 rounded-[2rem] border border-white/10"
                  aria-hidden
                />
                <div className="relative w-full space-y-6 rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center backdrop-blur-sm sm:p-10">
                  <Image
                    src="/logo.webp"
                    alt="Ministère des Finances RDC"
                    width={80}
                    height={80}
                    className="mx-auto h-16 w-auto rounded-2xl bg-white object-contain p-2 sm:h-20"
                  />
                  <div>
                    <p className="text-lg font-bold">Ministère des Finances</p>
                    <p className="mt-1 text-sm text-white/60">
                      République Démocratique du Congo
                    </p>
                  </div>
                  <div className="flex h-[3px] overflow-hidden rounded-full" aria-hidden>
                    <div className="flex-[2] bg-primary" />
                    <div className="flex-1 bg-yellow-400" />
                    <div className="flex-[2] bg-[var(--rdc-red)]" />
                  </div>
                  <p className="text-xs leading-relaxed text-white/55">
                    ekonzo est la plateforme de souscription aux Bons du
                    Trésor, sous la tutelle du Ministère des Finances.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative overflow-hidden py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-primary to-slate-800 px-6 py-14 text-center text-white shadow-xl shadow-slate-900/15 sm:px-10 sm:py-16 lg:py-20">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
              <Image
                src="/ekonzophoto.jpg"
                alt=""
                fill
                sizes="100vw"
                className="object-cover object-center opacity-[0.12]"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/60 via-transparent to-slate-950/40" />
              <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-yellow-300/10 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-2xl space-y-6">
              <h2 className="text-2xl font-bold tracking-tight sm:text-[2.25rem] sm:leading-tight">
                Prêt à investir pour votre avenir&nbsp;?
              </h2>
              <p className="text-sm leading-relaxed text-white/75 sm:text-base">
                Ouvrez votre compte ekonzo gratuitement et accédez aux Bons du
                Trésor du Ministère des Finances de la RDC.
              </p>
              <div className="flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-sm font-bold text-slate-950 shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-white/95"
                >
                  Créer mon compte →
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/25 bg-white/[0.05] px-8 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                >
                  J&apos;ai déjà un compte
                </Link>
              </div>
              <p className="text-xs text-white/50">
                Inscription gratuite · KYC en ligne · Paiement Mobile Money
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1.2fr_1fr_1fr] lg:px-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.webp"
                alt=""
                width={32}
                height={32}
                className="object-contain"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800">ekonzo</p>
                <p className="text-[10px] text-slate-500">
                  Ministère des Finances · RDC
                </p>
              </div>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Plateforme digitale de souscription aux Bons du Trésor de la
              République Démocratique du Congo.
            </p>
            <div className="flex h-[3px] w-24 overflow-hidden rounded-full" aria-hidden>
              <div className="flex-[2] bg-primary" />
              <div className="flex-1 bg-yellow-400" />
              <div className="flex-[2] bg-[var(--rdc-red)]" />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Navigation
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-500">
              <a href="#produits" className="transition-colors hover:text-primary">
                Produits
              </a>
              <a href="#fonctionnement" className="transition-colors hover:text-primary">
                Parcours
              </a>
              <a href="#paiements" className="transition-colors hover:text-primary">
                Paiements
              </a>
              <a href="#faq" className="transition-colors hover:text-primary">
                FAQ
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Accès
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-500">
              <Link href="/register" className="transition-colors hover:text-primary">
                Créer un compte
              </Link>
              <Link href="/login" className="transition-colors hover:text-primary">
                Se connecter
              </Link>
              <a href="#securite" className="transition-colors hover:text-primary">
                Sécurité
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-slate-200 px-4 pt-6 lg:px-6">
          <p className="text-center text-xs text-slate-500 md:text-left">
            © {new Date().getFullYear()} ekonzo · Ministère des Finances de la
            RDC · Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
