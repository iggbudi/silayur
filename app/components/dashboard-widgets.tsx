"use client";

export function MetricCard({
  eyebrow,
  value,
  suffix,
  note,
  icon,
  tone,
  badge,
}: {
  eyebrow: string;
  value: string;
  suffix?: string;
  note: string;
  icon: string;
  tone: "green" | "blue" | "orange" | "purple" | "red";
  badge?: string;
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-heading">
        <span className="metric-icon" aria-hidden="true">
          {icon}
        </span>
        {badge ? <span className="metric-badge">{badge}</span> : null}
      </div>
      <p>{eyebrow}</p>
      <div className="metric-value">
        <strong>{value}</strong>
        {suffix ? <span>{suffix}</span> : null}
      </div>
      <small>{note}</small>
    </article>
  );
}
