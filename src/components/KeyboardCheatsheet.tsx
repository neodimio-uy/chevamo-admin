"use client";

import { useEffect } from "react";

interface Shortcut {
  combo: string;
  description: string;
}

const GROUPS: { title: string; shortcuts: Shortcut[] }[] = [
  {
    title: "General",
    shortcuts: [
      { combo: "⌘K", description: "Abrir command palette (buscar todo)" },
      { combo: "?", description: "Abrir este cheatsheet" },
      { combo: "ESC", description: "Cerrar modales" },
    ],
  },
  {
    title: "Navegación",
    shortcuts: [
      { combo: "G H", description: "Mission Control" },
      { combo: "G A", description: "Alertas" },
      { combo: "G M", description: "Mapa en vivo" },
      { combo: "G S", description: "Paradas" },
      { combo: "G L", description: "Líneas" },
      { combo: "G C", description: "Comunidad" },
    ],
  },
  {
    title: "Acciones",
    shortcuts: [
      { combo: "N", description: "Nueva alerta" },
    ],
  },
  {
    title: "Command Palette (dentro)",
    shortcuts: [
      { combo: "↑ ↓", description: "Navegar resultados" },
      { combo: "↵", description: "Seleccionar" },
      { combo: "ESC", description: "Cerrar" },
    ],
  },
];

export default function KeyboardCheatsheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-text">
              Atajos de teclado
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Volveste a quedar productivo
            </p>
          </div>
          <kbd className="rounded border border-border bg-bg px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
            ESC
          </kbd>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {group.title}
              </p>
              <div className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <div
                    key={s.combo}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-bg"
                  >
                    <span className="text-sm text-text">{s.description}</span>
                    <div className="flex gap-1">
                      {s.combo.split(" ").map((key, i) => (
                        <kbd
                          key={i}
                          className="rounded-md border border-border bg-bg px-2 py-0.5 text-[11px] font-mono font-semibold text-text"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
