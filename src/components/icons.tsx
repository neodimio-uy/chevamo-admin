import type { SVGProps } from "react";

/**
 * Iconografía Vamo — sistema custom inspirado en signalética de transporte.
 * Mantienen stroke-linecap/linejoin consistentes con el resto de la app.
 */

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
}

function base(props: IconProps, d: string | React.ReactNode) {
  const { size = 18, strokeWidth = 1.75, ...rest } = props;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {typeof d === "string" ? <path d={d} /> : d}
    </svg>
  );
}

// ─── Navegación / secciones ───
export const BusIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="4" y="4" width="16" height="14" rx="3" />
      <path d="M4 11h16" />
      <circle cx="8" cy="15" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15" r="1" fill="currentColor" stroke="none" />
      <path d="M7 18v2M17 18v2" />
    </>
  );

export const StopIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="6" y="3" width="12" height="7" rx="1.5" />
      <path d="M12 10v11M8 21h8" />
    </>
  );

export const RouteIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M6 8v4a4 4 0 0 0 4 4h4" />
    </>
  );

export const LiveIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="12" cy="12" r="2.5" />
      <path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </>
  );

export const AlertIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M12 3L2 20h20L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  );

export const CommunityIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5M15 19c0-1.8 1.6-3.5 4-3.5" />
    </>
  );

export const SupportIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M21 11.5a8.5 8.5 0 0 0-17 0c0 1.5.4 3 1 4.3L3 21l5.5-1.6a8.5 8.5 0 0 0 12.5-7.9z" />
    </>
  );

export const TemplateIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M9 4v16" />
    </>
  );

export const ClockIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  );

export const FlagIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M4 22V4M4 16s2-1 5-1 5 2 8 2 3-1 3-1V4s-1 1-3 1-5-2-8-2-5 1-5 1" />
    </>
  );

export const AuditIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M8 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2z" />
      <path d="M12 8h4M12 12h4M12 16h2" />
    </>
  );

export const BusinessIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M3 21V7l6-4 6 4v4h6v10" />
      <path d="M9 9v2M9 13v2M9 17v2M14 13v2M14 17v2M18 15v2M18 19v2" />
    </>
  );

export const CashIcon = (props: IconProps) =>
  base(
    props,
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 10v4M18 10v4" />
    </>
  );

export const BeakerIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M9 3v7L4 20a2 2 0 0 0 1.8 3h12.4A2 2 0 0 0 20 20l-5-10V3" />
      <path d="M8 3h8M7 15h10" />
    </>
  );

// ─── Status / indicadores ───
export const RadioIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M9 9a4 4 0 0 0 0 6M15 9a4 4 0 0 1 0 6M6 6a8 8 0 0 0 0 12M18 6a8 8 0 0 1 0 12" />
    </>
  );

export const ChevronUp = (props: IconProps) => base(props, "M18 15l-6-6-6 6");
export const ChevronDown = (props: IconProps) => base(props, "M6 9l6 6 6-6");
export const ChevronLeft = (props: IconProps) => base(props, "M15 18l-6-6 6-6");
export const ChevronRight = (props: IconProps) => base(props, "M9 6l6 6-6 6");
export const PlusIcon = (props: IconProps) => base(props, "M12 5v14M5 12h14");
export const XIcon = (props: IconProps) => base(props, "M18 6L6 18M6 6l12 12");
export const SearchIcon = (props: IconProps) =>
  base(props, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);

export const SunIcon = (props: IconProps) =>
  base(
    props,
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </>
  );

export const MoonIcon = (props: IconProps) =>
  base(props, "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z");

export const BellIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M6 19h12l-1.4-1.5a2 2 0 0 1-.6-1.4V10a4 4 0 0 0-8 0v6.1a2 2 0 0 1-.6 1.4z" />
      <path d="M10 21a2 2 0 0 0 4 0" />
    </>
  );

export const LogoutIcon = (props: IconProps) =>
  base(
    props,
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 12H21M18 9l3 3-3 3" />
    </>
  );

// ─── Company icons / line glyph ───
export function LineGlyph({
  line,
  company,
  size = "md",
}: {
  line: string;
  company?: string;
  size?: "xs" | "sm" | "md" | "lg";
}) {
  const color =
    company === "CUTCSA"
      ? "var(--color-cutcsa)"
      : company === "COETC"
        ? "var(--color-coetc)"
        : company === "COME"
          ? "var(--color-come)"
          : company === "UCOT"
            ? "var(--color-ucot)"
            : "var(--color-text)";

  const sizeClasses = {
    xs: "h-4 min-w-6 text-[9px] px-1",
    sm: "h-5 min-w-7 text-[10px] px-1.5",
    md: "h-6 min-w-9 text-[11px] px-2",
    lg: "h-8 min-w-12 text-sm px-2.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center rounded font-bold tabular-nums text-white ${sizeClasses}`}
      style={{ backgroundColor: color, letterSpacing: "0.02em" }}
    >
      {line}
    </span>
  );
}
