import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* ----------------------------- Buttons ----------------------------- */

type ButtonVariant = "accent" | "ink" | "outline" | "ghost";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-2xl h-13 px-5 text-[15px] tracking-wide transition-active select-none active:scale-[.98] disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  accent: "btn-accent shadow-[0_8px_24px_rgba(250,204,21,.35)]",
  ink: "btn-ink",
  outline: "border-2 border-ink text-ink font-extrabold uppercase tracking-wide",
  ghost: "text-ink font-bold",
};

export function Button({
  variant = "accent",
  className,
  ...props
}: { variant?: ButtonVariant } & ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cx(buttonBase, "h-13", buttonVariants[variant], className)}
      style={{ height: 54 }}
    />
  );
}

export function LinkButton({
  variant = "accent",
  className,
  href,
  children,
  ...rest
}: {
  variant?: ButtonVariant;
  href: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href">) {
  return (
    <Link
      href={href}
      {...rest}
      className={cx(buttonBase, buttonVariants[variant], "w-full", className)}
      style={{ height: 54 }}
    >
      {children}
    </Link>
  );
}

/* ------------------------------ Cards ------------------------------ */

export function Card({
  className,
  active = false,
  children,
}: {
  className?: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl p-4",
        active ? "border-2 border-ink" : "border border-faint",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Badge ------------------------------ */

export function Badge({
  children,
  tone = "accent",
  className,
}: {
  children: ReactNode;
  tone?: "accent" | "ink" | "blue" | "danger" | "muted" | "success";
  className?: string;
}) {
  const tones: Record<string, string> = {
    accent: "bg-accent text-ink",
    ink: "bg-ink text-white",
    blue: "bg-blue text-white",
    danger: "bg-danger text-white",
    success: "bg-success text-white",
    muted: "bg-faint text-ink",
  };
  return (
    <span
      className={cx(
        "display inline-flex items-center rounded-md px-1.5 py-1 text-[10px] leading-none",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ----------------------------- Eyebrow ----------------------------- */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("eyebrow", className)}>{children}</div>;
}

/* --------------------------- Stat block ---------------------------- */

export function Stat({
  value,
  label,
  accent,
}: {
  value: ReactNode;
  label: string;
  accent?: "ink" | "blue" | "danger";
}) {
  const color = accent === "blue" ? "text-blue" : accent === "danger" ? "text-danger" : "text-ink";
  return (
    <div>
      <div className={cx("display text-[20px]", color)}>{value}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
    </div>
  );
}

/* ---------------------------- Page title --------------------------- */

export function PageTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="display mt-1.5 text-[28px]">{title}</h1>
      </div>
      {right}
    </div>
  );
}

/* ------------------------------ Field ------------------------------ */

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-faint bg-haze px-4 py-3 text-[15px] text-ink outline-none focus:border-ink placeholder:text-muted";

/* ------------------------- Empty / messages ------------------------ */

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-faint px-5 py-10 text-center">
      <div className="display text-[16px] text-ink">{title}</div>
      {body && <div className="mt-2 text-[13px] text-muted">{body}</div>}
    </div>
  );
}
