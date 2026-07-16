import type { SelectHTMLAttributes } from "react";

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  selectClassName?: string;
};

export function FormSelect({
  label,
  helperText,
  error,
  required,
  className = "",
  selectClassName = "",
  children,
  id,
  ...props
}: FormSelectProps) {
  const describedBy = [
    helperText && id ? `${id}-helper` : null,
    error && id ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const select = (
    <select
      id={id}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy || undefined}
      className={`paydesk-select h-11 w-full rounded-[8px] border px-3 text-sm font-bold outline-none transition focus:border-[#7c5cff] focus:ring-4 focus:ring-[#7c5cff]/20 disabled:cursor-not-allowed disabled:opacity-70 ${selectClassName}`}
      {...props}
    >
      {children}
    </select>
  );

  if (!label) {
    return select;
  }

  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-bold">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <span className="mt-2 block">{select}</span>
      {helperText ? (
        <span id={id ? `${id}-helper` : undefined} className="mt-2 block text-xs font-semibold leading-5 text-slate-500">
          {helperText}
        </span>
      ) : null}
      {error ? (
        <span id={id ? `${id}-error` : undefined} className="mt-2 block text-xs font-bold text-red-500">
          {error}
        </span>
      ) : null}
    </label>
  );
}
