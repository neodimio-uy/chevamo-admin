"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBusStops, getLineVariants } from "@/lib/api";
import type { BusStop, LineVariant } from "@/lib/types";

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  group: string;
  href?: string;
  action?: () => void;
}

const STATIC_ACTIONS: CommandItem[] = [
  { id: "go-home", label: "Mission Control", group: "Navegación", href: "/home", hint: "G H" },
  { id: "go-alerts", label: "Alertas", group: "Navegación", href: "/alerts", hint: "G A" },
  { id: "go-map", label: "Mapa en vivo", group: "Navegación", href: "/map", hint: "G M" },
  { id: "go-stops", label: "Paradas", group: "Navegación", href: "/stops", hint: "G S" },
  { id: "go-lines", label: "Líneas", group: "Navegación", href: "/lines", hint: "G L" },
  { id: "go-schedules", label: "Horarios", group: "Navegación", href: "/schedules" },
  { id: "go-community", label: "Comunidad", group: "Navegación", href: "/community", hint: "G C" },
  { id: "go-support", label: "Centro de Soporte", group: "Navegación", href: "/support" },
  { id: "go-templates", label: "Plantillas de alertas", group: "Navegación", href: "/templates" },
  { id: "go-flags", label: "Feature Flags", group: "Navegación", href: "/flags" },
  { id: "go-audit", label: "Audit Log", group: "Navegación", href: "/activity" },
  { id: "go-b2b", label: "Dashboard B2B", group: "Navegación", href: "/b2b" },
  { id: "new-alert", label: "Crear nueva alerta", group: "Acciones", href: "/alerts/new", hint: "N" },
];

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stops, setStops] = useState<BusStop[]>([]);
  const [lines, setLines] = useState<LineVariant[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || stops.length > 0) return;
    Promise.all([getBusStops(), getLineVariants()])
      .then(([s, l]) => {
        setStops(s);
        setLines(l);
      })
      .catch(() => {});
  }, [open, stops.length]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATIC_ACTIONS.slice(0, 8);
    const result: CommandItem[] = [];
    for (const action of STATIC_ACTIONS) {
      if (action.label.toLowerCase().includes(q)) result.push(action);
    }
    const stopMatches = stops
      .filter((s) => {
        const name = `${s.street1 || ""} ${s.street2 || ""}`.toLowerCase();
        return name.includes(q) || s.id.toString() === q;
      })
      .slice(0, 8)
      .map(
        (s): CommandItem => ({
          id: `stop-${s.id}`,
          label:
            s.street1 && s.street2
              ? `${s.street1} y ${s.street2}`
              : s.street1 || s.street2 || `Parada ${s.id}`,
          hint: `#${s.id}`,
          group: "Paradas",
          href: `/stops/detail?id=${s.id}`,
        })
      );
    result.push(...stopMatches);
    const seenLines = new Set<string>();
    for (const v of lines) {
      if (seenLines.has(v.line)) continue;
      if (v.line.toLowerCase().includes(q)) {
        seenLines.add(v.line);
        result.push({
          id: `line-${v.line}`,
          label: `Línea ${v.line}`,
          hint: v.destination || v.subline || "",
          group: "Líneas",
          href: `/lines/detail?line=${encodeURIComponent(v.line)}`,
        });
        if (seenLines.size >= 8) break;
      }
    }
    return result.slice(0, 30);
  }, [query, stops, lines]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[activeIndex];
        if (item) {
          if (item.href) router.push(item.href);
          else item.action?.();
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, items, activeIndex, router, onClose]);

  if (!open) return null;

  const grouped: Record<string, CommandItem[]> = {};
  items.forEach((item) => {
    if (!grouped[item.group]) grouped[item.group] = [];
    grouped[item.group].push(item);
  });

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[15vh] animate-fade-in"
      style={{ background: "rgba(0, 0, 0, 0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-border-strong bg-bg-card shadow-xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <svg
            className="h-4 w-4 text-text-muted shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar paradas, líneas, acciones…"
            className="flex-1 bg-transparent text-[14px] text-text placeholder:text-text-muted focus:outline-none tracking-tight"
          />
          <kbd>ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {items.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-text-muted">
              Sin resultados para <span className="font-semibold">&ldquo;{query}&rdquo;</span>
            </p>
          ) : (
            Object.entries(grouped).map(([group, groupItems]) => (
              <div key={group}>
                <p className="label-xs px-4 pt-2 pb-1">{group}</p>
                {groupItems.map((item) => {
                  const idx = globalIdx++;
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.href) router.push(item.href);
                        else item.action?.();
                        onClose();
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left transition-colors ${
                        isActive
                          ? "bg-bg-subtle"
                          : ""
                      }`}
                    >
                      <span className="truncate text-[13px] font-medium text-text">
                        {item.label}
                      </span>
                      {item.hint && (
                        <span className="ml-3 shrink-0 text-[11px] text-text-muted tabular-nums">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-bg-subtle px-4 py-2 text-[10px] text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
            <span className="flex items-center gap-1"><kbd>↵</kbd> seleccionar</span>
          </div>
          <span className="tabular-nums">{items.length} resultado{items.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}
