import Image from "next/image";
import Link from "next/link";

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

const STATS = [
  { val: "1960", label: "Création du Ministère des Finances" },
  { val: "BCC", label: "Cadre de la Banque Centrale du Congo" },
  { val: "USD / CDF", label: "Souscription en deux devises" },
  { val: "24–48 h", label: "Délai de vérification KYC" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between px-4 lg:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt="Ministère des Finances RDC"
              width={40}
              height={40}
              className="h-10 w-auto object-contain transition-transform group-hover:scale-[1.03]"
              priority
            />
            <div>
              <p className="text-[15px] font-bold leading-none tracking-tight text-primary">
                ekonzo
              </p>
              <p className="mt-1 text-[10px] leading-none text-slate-500">
                Bons du Trésor · RDC
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#produits", label: "Produits" },
              { href: "#fonctionnement", label: "Comment ça marche" },
              { href: "#securite", label: "Sécurité" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-xl px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30"
            >
              Ouvrir un compte
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-primary to-slate-800 text-white">
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-yellow-300/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" />
        <div className="absolute inset-y-0 left-0 w-1.5 bg-[var(--rdc-red)]" />
        <div className="absolute inset-y-0 right-0 w-1.5 bg-[var(--rdc-red)]" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-yellow-400/80 via-yellow-300 to-yellow-400/80" />

        <div className="relative mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
                <span aria-hidden>🇨🇩</span>
                Plateforme officielle · Ministère des Finances
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                  Investissez dans les{" "}
                  <span className="text-yellow-300">titres d&apos;État</span>{" "}
                  congolais
                </h1>
                <p className="max-w-lg text-base leading-relaxed text-white/80 sm:text-lg">
                  Souscrivez aux Bons du Trésor de la RDC depuis votre téléphone.
                  Un placement sûr, réglementé et accessible.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/register"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 text-sm font-bold text-primary shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-white/95"
                >
                  Commencer maintenant
                  <span className="ml-2" aria-hidden>
                    →
                  </span>
                </Link>
                <a
                  href="#fonctionnement"
                  className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-6 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Comment ça marche
                </a>
              </div>

              <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-white/70">
                {["Garanti par l'État", "Cadre BCC", "100 % en ligne"].map((item) => (
                  <li key={item} className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] text-emerald-300">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Hero visual */}
            <div className="relative mx-auto w-full max-w-[360px] lg:max-w-none lg:justify-self-end">
              <div className="relative mx-auto h-[380px] w-full max-w-[320px] sm:h-[420px] sm:max-w-[340px]">
                <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/40 ring-1 ring-white/20">
                  <Image
                    src="/ekonzophoto.jpg"
                    alt="Investisseuse ekonzo"
                    fill
                    sizes="(max-width: 1024px) 340px, 340px"
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" />
                </div>

                <div className="absolute -bottom-4 left-0 right-0 mx-auto w-[min(100%,15.5rem)] space-y-2 rounded-2xl border border-white/20 bg-slate-950/55 p-4 shadow-xl backdrop-blur-md sm:-left-8 sm:right-auto sm:mx-0 sm:w-56">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">
                      Bon du Trésor · 26 sem.
                    </span>
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Ouvert
                    </span>
                  </div>
                  <p className="text-2xl font-black tracking-tight">8,50 %</p>
                  <p className="text-[10px] text-white/60">Taux annuel brut · min. 100 USD</p>
                  <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-1.5 text-center">
                    <p className="text-xs font-bold text-yellow-300">+ 42,50 USD</p>
                    <p className="text-[10px] text-white/50">sur 1 000 USD investis</p>
                  </div>
                </div>

                <div className="absolute -top-3 right-0 flex items-center gap-2 rounded-xl bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-xl sm:-right-4">
                  <Image
                    src="/logo.webp"
                    alt=""
                    width={22}
                    height={22}
                    className="object-contain"
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

      {/* ── Chiffres clés ── */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-slate-200 lg:grid-cols-4">
          {STATS.map((s) => (
            <div
              key={s.val}
              className="bg-slate-50 px-4 py-8 text-center transition-colors hover:bg-white"
            >
              <p className="text-2xl font-bold tracking-tight text-primary">{s.val}</p>
              <p className="mx-auto mt-1.5 max-w-[11rem] text-xs leading-snug text-slate-500">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Produits ── */}
      <section id="produits" className="scroll-mt-24 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Nos produits
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Les Bons du Trésor
            </h2>
            <p className="text-sm leading-relaxed text-slate-500">
              Le Ministère des Finances émet régulièrement des Bons du Trésor adaptés à tous les profils d&apos;épargnants.
            </p>
          </div>

          <div className="mx-auto max-w-lg">
            <div className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
              <div className="mb-5 flex items-start justify-between gap-3">
                <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
                  BT
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Taux attractif
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900">Bons du Trésor</h3>
              <p className="mt-1 text-xs text-slate-500">Maturité : 4 semaines à 12 mois</p>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Instruments à court terme émis par le Ministère des Finances de la RDC. Idéal pour une épargne sûre avec des intérêts versés à l&apos;échéance.
              </p>
              <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                <span className="text-xs font-medium text-slate-500">
                  Mise minimale : 100 USD
                </span>
                <Link
                  href="/register"
                  className="inline-flex items-center rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
                >
                  Souscrire →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Fonctionnement ── */}
      <section id="fonctionnement" className="scroll-mt-24 bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Processus
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
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

      {/* ── Callout photo ── */}
      <section className="py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 shadow-lg shadow-slate-900/10 lg:grid lg:grid-cols-2">
            <div className="relative min-h-[320px] lg:min-h-[440px]">
              <Image
                src="/photo.jpg"
                alt="Investisseur satisfait ekonzo"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-slate-950/70" />
            </div>

            <div className="flex flex-col justify-center space-y-6 p-8 text-white lg:p-12">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-semibold text-yellow-300">
                Des rendements concrets
              </div>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">
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
      <section className="bg-slate-50 py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="relative order-last h-[420px] overflow-hidden rounded-3xl shadow-xl shadow-slate-900/10 lg:order-first lg:h-[480px]">
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
                <h2 className="text-3xl font-bold leading-tight tracking-tight text-slate-900">
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

      {/* ── Sécurité ── */}
      <section
        id="securite"
        className="scroll-mt-24 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-20 text-white lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300/90">
                Conformité & Sécurité
              </p>
              <h2 className="text-3xl font-bold leading-tight tracking-tight">
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

            <div className="hidden justify-center lg:flex">
              <div className="w-full max-w-xs space-y-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
                <Image
                  src="/logo.webp"
                  alt="Ministère des Finances RDC"
                  width={80}
                  height={80}
                  className="mx-auto object-contain"
                />
                <div>
                  <p className="text-lg font-bold">Ministère des Finances</p>
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
      <section className="border-t border-slate-200 py-20 lg:py-24">
        <div className="mx-auto max-w-2xl space-y-6 px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
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
      <footer className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 md:flex-row lg:px-6">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.webp"
              alt=""
              width={28}
              height={28}
              className="object-contain opacity-70"
            />
            <div>
              <p className="text-sm font-semibold text-slate-700">ekonzo</p>
              <p className="text-[10px] text-slate-500">
                Ministère des Finances · RDC
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500">
            <a href="#produits" className="transition-colors hover:text-slate-800">
              Produits
            </a>
            <a href="#fonctionnement" className="transition-colors hover:text-slate-800">
              Fonctionnement
            </a>
            <a href="#securite" className="transition-colors hover:text-slate-800">
              Sécurité
            </a>
            <Link href="/login" className="transition-colors hover:text-slate-800">
              Connexion
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} ekonzo · Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  );
}
