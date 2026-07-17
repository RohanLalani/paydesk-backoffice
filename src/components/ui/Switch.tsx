"use client";

import { useId } from "react";

type PayDeskSwitchProps = {
  label: string;
  helper?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  compact?: boolean;
};

export function PayDeskSwitch({
  label,
  helper,
  checked,
  disabled = false,
  onChange,
  className = "",
  compact = false,
}: PayDeskSwitchProps) {
  const labelId = useId();
  const helperId = useId();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={helper ? helperId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group flex min-h-0 cursor-pointer items-start gap-3 text-left outline-none disabled:cursor-not-allowed disabled:opacity-60 ${compact ? "" : "w-full"} ${className}`}
    >
      <span
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition group-focus-visible:ring-4 group-focus-visible:ring-[#7c5cff]/35 ${checked ? "bg-[#4f2df2]" : "bg-slate-300"}`}
        aria-hidden="true"
      >
        <span className={`size-4 rounded-full bg-white shadow-sm transition ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </span>
      <span className="min-w-0">
        <span id={labelId} className="block text-sm font-bold">
          {label}
        </span>
        {helper ? (
          <span id={helperId} className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
            {helper}
          </span>
        ) : null}
      </span>
    </button>
  );
}
