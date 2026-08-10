import { FileTextIcon } from "@phosphor-icons/react/dist/ssr";
import { ConventionSignForm } from "./ConventionSignForm";

export default function ConventionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <FileTextIcon className="size-5" weight="duotone" />
          <span className="text-xs font-medium uppercase tracking-wide">
            Compte-titres
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-rdc-navy">
          Convention de compte-titres
        </h1>
        <p className="text-sm text-muted-foreground">
          Choisissez votre banque partenaire, lisez la convention, puis signez
          électroniquement. Sans cette étape, l&apos;accès à l&apos;application
          reste bloqué.
        </p>
      </div>
      <ConventionSignForm />
    </div>
  );
}
