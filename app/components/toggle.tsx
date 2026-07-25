"use client";

export function Toggle({
  active,
  label,
  disabled,
  onChange,
}: {
  active: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className={`switch ${active ? "switch-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${active ? "Nonaktifkan" : "Aktifkan"} ${label}`}
      disabled={disabled}
      onClick={onChange}
    >
      <span />
    </button>
  );
}
