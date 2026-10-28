import Link from "next/link";

export type KpiTone = "teal" | "amber" | "green" | "slate" | "red" | "muted";

type Props = {
  label: string;
  value: string | number;
  /** Petite phrase sous le chiffre (ex. « dont 2 à traiter »). */
  hint?: string;
  tone?: KpiTone;
  /** Si fourni, toute la carte devient un lien. */
  href?: string;
};

/** Carte d'indicateur du tableau de bord (réutilisable : stock, forum…). */
export default function KpiCard({ label, value, hint, tone = "teal", href }: Props) {
  const content = (
    <>
      <span className="kpi-card-label">{label}</span>
      <strong className="kpi-card-value">{value}</strong>
      {hint && <span className="kpi-card-hint">{hint}</span>}
    </>
  );

  const className = `kpi-card kpi-card--${tone}${href ? " kpi-card--link" : ""}`;

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
