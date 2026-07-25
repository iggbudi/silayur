export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "login-brand" : "brand"}>
      <div className="brand-mark" aria-hidden="true">
        <span className="sun-dot" />
        <span className="hill hill-one" />
        <span className="hill hill-two" />
      </div>
      <div>
        <strong>SILAYUR</strong>
        <span>{compact ? "Park Management System" : "Park Management"}</span>
      </div>
    </div>
  );
}
