import Image from "next/image";
import Link from "next/link";
import { HomeNavbar } from "./components/HomeNavbar";

const FEATURES = [
  {
    icon: "🏛️",
    title: "Émis par l'État",
    desc: "Les Bons du Trésor sont émis et garantis par le Ministère des Finances de la RDC.",
  },
  {
    icon: "📈",
    title: "Rendements attractifs",
    desc: "Des taux compétitifs sur des durées flexibles, adaptés à vos objectifs d'épargne.",
  },
  {
    icon: "🔒",
    title: "Sécurité maximale",
    desc: "Placements encadrés par la Banque Centrale du Congo. Vos opérations sont tracées.",
  },
  {
    icon: "📱",
    title: "100 % en ligne",
    desc: "Souscrivez depuis votre téléphone ou ordinateur, via Mobile Money ou virement.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Créer votre compte",
    desc: "Inscrivez-vous avec votre numéro de téléphone en moins de 2 minutes.",
  },
  {
    n: "02",
    title: "Vérifier votre identité",
    desc: "Soumettez votre pièce d'identité. Validation sous 24 à 48 h.",
  },
  {
    n: "03",
    title: "Choisir un Bon du Trésor",
    desc: "Parcourez les émissions ouvertes et sélectionnez la durée qui vous convient.",
  },
  {
    n: "04",
    title: "Percevoir vos intérêts",
    desc: "Suivez votre portefeuille et recevez vos intérêts selon le calendrier du produit.",
  },
];

const PRODUCTS = [
  {
    badge: "BT",
    badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
    name: "Bons du Trésor",
    duration: "4 semaines à 12 mois",
    desc: "Instruments à court terme pour une épargne sûre. Intérêts versés à l'échéance.",
    points: ["CDF ou USD", "Ticket accessible", "Liquidité courte"],
  },
];

const AUDIENCES = [
  {
    title: "Particuliers",
    desc: "Faites fructifier votre épargne avec des titres d'État, depuis votre Mobile Money.",
  },
  {
    title: "Professionnels",
    desc: "Placez la trésorerie de votre activité sur des instruments publics réglementés.",
  },
  {
    title: "Diaspora",
    desc: "Investissez dans les titres du Trésor congolais où que vous soyez, en toute simplicité.",
  },
];

const PAYMENTS = [
  {
    name: "Airtel Money",
    desc: "Confirmez le paiement directement depuis votre téléphone via prompt USSD.",
  },
  {
    name: "Orange Money",
    desc: "Souscrivez et payez en quelques secondes avec votre compte Orange Money.",
  },
  {
    name: "M-Pesa",
    desc: "Utilisez M-Pesa pour finaliser votre souscription en toute sécurité.",
  },
  {
    name: "Virement bancaire",
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

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <HomeNavbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-primary to-slate-800 text-white">
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="absolute inset-y-0 left-0 w-1 bg-[var(--rdc-red)] sm:w-1.5" />
        <div className="absolute inset-y-0 right-0 w-1 bg-[var(--rdc-red)] sm:w-1.5" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400/80 via-yellow-300 to-yellow-400/80" />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16 lg:px-6 lg:py-28">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-5 sm:space-y-7">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:px-3.5 sm:text-xs">
                <span aria-hidden>🇨🇩</span>
                <span className="truncate">Plateforme officielle · Ministère des Finances</span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <h1 className="text-[1.875rem] font-bold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl lg:text-[3.25rem]">
                  Investissez dans les{" "}
                  <span className="text-yellow-300">titres d&apos;État</span>{" "}
                  congolais
                </h1>
                <p className="max-w-lg text-sm leading-relaxed text-white/80 sm:text-base lg:text-lg">
                  Souscrivez aux Bons du Trésor de la RDC depuis votre téléphone.
                  Un placement sûr, réglementé et accessible.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-primary shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-white/95 sm:h-12 sm:px-6"
                >
                  Commencer maintenant
                  <span className="ml-2" aria-hidden>
                    →
                  </span>
                </Link>
                <a
                  href="#fonctionnement"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 px-5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:h-12 sm:px-6"
                >
                  Voir le parcours
                </a>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-white/70">
                {["Garanti par l'État", "Cadre BCC", "Mobile Money"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] text-emerald-300">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto mb-6 w-full max-w-[360px] pb-8 sm:mb-0 sm:pb-4 lg:max-w-none lg:justify-self-end lg:pb-0">
              <div className="relative mx-auto h-[300px] w-full max-w-[300px] sm:h-[420px] sm:max-w-[340px]">
                <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/20 sm:rounded-[1.75rem]">
                  <Image
                    src="/ekonzophoto.jpg"
                    alt="Investisseuse ekonzo"
                    fill
                    sizes="(max-width: 640px) 280px, 340px"
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                <div className="absolute -bottom-2 left-1/2 w-[min(100%,14.5rem)] -translate-x-1/2 space-y-1.5 rounded-2xl border border-white/20 bg-slate-950/55 p-3 shadow-xl backdrop-blur-md sm:-bottom-4 sm:left-0 sm:right-auto sm:w-56 sm:translate-x-0 sm:space-y-2 sm:p-4 md:-left-8">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                      Bon du Trésor · 26 sem.
                    </span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Ouvert
                    </span>
                  </div>
                  <p className="text-xl font-black tracking-tight sm:text-2xl">8,50 %</p>
                  <p className="text-[10px] text-white/60">Taux annuel brut · min. 100 USD</p>
                  <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-center">
                    <p className="text-xs font-bold text-yellow-300">+ 42,50 USD</p>
                    <p className="text-[10px] text-white/50">sur 1 000 USD investis</p>
                  </div>
                </div>

                <div className="absolute -top-2 right-0 flex max-w-[11rem] items-center gap-2 rounded-xl bg-white p-2 text-[11px] font-semibold text-slate-700 shadow-xl sm:-top-3 sm:-right-4 sm:max-w-none sm:p-2.5 sm:text-xs">
                  <Image
                    src="/logo.webp"
                    alt=""
                    width={22}
                    height={22}
                    className="shrink-0 object-contain"
                  />
                  <span className="leading-tight">
                    Ministère des Finances
                    <span className="block text-[10px] font-medium text-slate-500">RDC</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Produits ── */}
      <section id="produits" className="scroll-mt-20 py-14 sm:scroll-mt-24 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto mb-8 max-w-2xl space-y-3 text-center sm:mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Nos produits
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Les Bons du Trésor
            </h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Le Ministère des Finances émet régulièrement des Bons du Trésor adaptés à tous les profils d&apos;épargnants.
            </p>
          </div>

          <div className="mx-auto max-w-lg">
            {PRODUCTS.map((p) => (
              <div
                key={p.badge}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md sm:p-7"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center rounded-lg border px-3 py-1 text-sm font-bold ${p.badgeClass}`}
                  >
                    {p.badge}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{p.duration}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{p.desc}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {p.points.map((point) => (
                    <li
                      key={point}
                      className="rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
                    >
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <Link
                    href="/register"
                    className="inline-flex w-full items-center justify-center rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white sm:w-auto"
                  >
                    Souscrire →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pour qui ── */}
      <section id="pour-qui" className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-14 sm:scroll-mt-24 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto mb-8 max-w-2xl space-y-3 text-center sm:mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Public
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Pour qui est ekonzo ?
            </h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Une plateforme conçue pour démocratiser l&apos;accès aux titres publics congolais.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {AUDIENCES.map((item, i) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-primary/20 hover:shadow-sm"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-sm font-black text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fonctionnement ── */}
      <section id="fonctionnement" className="scroll-mt-20 py-14 sm:scroll-mt-24 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto mb-8 max-w-2xl space-y-3 text-center sm:mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Processus
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Comment ça marche ?
            </h2>
            <p className="text-sm text-slate-500">
              Quatre étapes simples pour commencer à investir.
            </p>
          </div>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {STEPS.map((s, i) => (
              <li
                key={s.n}
                className="relative flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-primary/20 hover:shadow-sm"
              >
                {i < STEPS.length - 1 && (
                  <span
                    className="pointer-events-none absolute top-10 left-[calc(100%+0.15rem)] z-0 hidden h-px w-[calc(1.25rem-0.3rem)] bg-slate-200 lg:block"
                    aria-hidden
                  />
                )}
                <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-black text-primary">
                  {s.n}
                </span>
                <h3 className="text-sm font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Paiements ── */}
      <section id="paiements" className="scroll-mt-20 bg-slate-50 py-14 sm:scroll-mt-24 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Paiements
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Payez comme vous en avez l&apos;habitude
              </h2>
              <p className="text-sm leading-relaxed text-slate-500">
                ekonzo s&apos;intègre aux moyens de paiement les plus utilisés en RDC pour rendre la souscription fluide et accessible.
              </p>
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Créer mon compte
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENTS.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-primary/25 hover:shadow-sm"
                >
                  <h3 className="text-sm font-bold text-slate-900">{item.name}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Callout photo ── */}
      <section className="py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 to-slate-800 shadow-lg shadow-slate-900/10 sm:rounded-3xl lg:grid lg:grid-cols-2">
            <div className="relative min-h-[240px] sm:min-h-[320px] lg:min-h-[440px]">
              <Image
                src="/photo.jpg"
                alt="Investisseur satisfait ekonzo"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-slate-950/70" />
            </div>

            <div className="flex flex-col justify-center space-y-5 p-6 text-white sm:space-y-6 sm:p-8 lg:p-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                Des rendements concrets
              </div>
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Faites fructifier votre argent avec les titres du Ministère des Finances
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                Chaque franc investi dans un Bon du Trésor génère des intérêts garantis par l&apos;État congolais. Un placement sûr, transparent et accessible.
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
                    className="rounded-xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
                  >
                    <p className="font-bold text-yellow-300">{s.val}</p>
                    <p className="mt-0.5 text-xs text-white/55">{s.label}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/register"
                className="inline-flex h-11 w-fit items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-white/95"
              >
                Commencer à investir →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Avantages ── */}
      <section className="bg-slate-50 py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative order-last h-[300px] overflow-hidden rounded-2xl shadow-xl shadow-slate-900/10 sm:h-[420px] sm:rounded-3xl lg:order-first lg:h-[480px]">
              <Image
                src="/photo.jpg"
                alt="Investisseur satisfait ekonzo"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/60 bg-white/95 p-4 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Intérêts perçus · 26 semaines</p>
                    <p className="mt-0.5 text-2xl font-black text-emerald-600">+ 42,50 USD</p>
                    <p className="text-xs text-slate-500">sur un placement de 1 000 USD</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-50 text-2xl">
                    📈
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  Pourquoi ekonzo ?
                </p>
                <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  Investir en toute confiance
                </h2>
                <p className="text-sm leading-relaxed text-slate-500">
                  Accédez aux titres publics congolais depuis votre téléphone, avec un parcours clair et sécurisé.
                </p>
              </div>

              <div className="space-y-3">
                {FEATURES.map((f) => (
                  <div
                    key={f.title}
                    className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl">
                      {f.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{f.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="scroll-mt-20 py-14 sm:scroll-mt-24 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto mb-8 max-w-2xl space-y-3 text-center sm:mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              FAQ
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Questions fréquentes
            </h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Les réponses essentielles avant d&apos;ouvrir votre compte et de souscrire.
            </p>
          </div>

          <div className="mx-auto max-w-3xl space-y-3">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl border border-slate-200 bg-white px-5 py-4 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center justify-between gap-4">
                    {item.q}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-transform group-open:rotate-45">
                      +
                    </span>
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sécurité ── */}
      <section
        id="securite"
        className="scroll-mt-20 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-14 text-white sm:scroll-mt-24 sm:py-20 lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/90">
                Conformité & Sécurité
              </p>
              <h2 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                Une plateforme alignée sur les exigences de la BCC
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                ekonzo s&apos;inscrit dans le cadre défini par la Banque Centrale du Congo et le Ministère des Finances. Chaque opération est tracée et sécurisée.
              </p>
              <ul className="space-y-3 text-sm">
                {[
                  "Vérification KYC obligatoire pour tous les investisseurs",
                  "Protection des données personnelles",
                  "Traçabilité complète des souscriptions et paiements",
                  "Parcours digital contrôlé de bout en bout",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-white/85">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-[11px] text-emerald-300">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-xs space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm sm:space-y-6 sm:p-8">
                <Image
                  src="/logo.webp"
                  alt="Ministère des Finances RDC"
                  width={80}
                  height={80}
                  className="mx-auto h-14 w-auto object-contain sm:h-20"
                />
                <div>
                  <p className="text-base font-bold sm:text-lg">Ministère des Finances</p>
                  <p className="mt-1 text-sm text-white/60">
                    République Démocratique du Congo
                  </p>
                </div>
                <div className="h-px bg-white/10" />
                <p className="text-xs leading-relaxed text-white/55">
                  ekonzo est la plateforme de souscription aux Bons du Trésor, sous la tutelle du Ministère des Finances.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="border-t border-slate-200 py-14 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-2xl space-y-6 px-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Prêt à investir pour votre avenir ?
          </h2>
          <p className="text-sm leading-relaxed text-slate-500">
            Ouvrez votre compte ekonzo gratuitement et accédez aux Bons du Trésor du Ministère des Finances de la RDC.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-bold text-white shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Créer mon compte →
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-8 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              J&apos;ai déjà un compte
            </Link>
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
                <p className="text-[10px] text-slate-500">Ministère des Finances · RDC</p>
              </div>
            </div>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500">
              Plateforme digitale de souscription aux Bons du Trésor de la République Démocratique du Congo.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Navigation
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-500">
              <a href="#produits" className="hover:text-slate-800">Produits</a>
              <a href="#fonctionnement" className="hover:text-slate-800">Parcours</a>
              <a href="#paiements" className="hover:text-slate-800">Paiements</a>
              <a href="#faq" className="hover:text-slate-800">FAQ</a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">
              Accès
            </p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-slate-500">
              <Link href="/register" className="hover:text-slate-800">Créer un compte</Link>
              <Link href="/login" className="hover:text-slate-800">Se connecter</Link>
              <a href="#securite" className="hover:text-slate-800">Sécurité</a>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-slate-200 px-4 pt-6 lg:px-6">
          <p className="text-center text-xs text-slate-500 md:text-left">
            © {new Date().getFullYear()} ekonzo · Ministère des Finances de la RDC · Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
