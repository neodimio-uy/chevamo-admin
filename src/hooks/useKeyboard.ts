"use client";

import { useEffect } from "react";

/**
 * Sistema de keyboard shortcuts para power users.
 * - Soporta combos simples (Cmd+K) y secuencias (G+H tipo Vim).
 * - No interfiere con typing en inputs.
 */

interface ShortcutHandler {
  combo: string;
  description: string;
  handler: (e: KeyboardEvent) => void;
  /** Si true, dispara incluso dentro de inputs */
  global?: boolean;
}

const sequenceTimeoutMs = 1000;

export function useKeyboardShortcuts(shortcuts: ShortcutHandler[]) {
  useEffect(() => {
    let lastKey: { key: string; at: number } | null = null;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      const isMod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Detectar secuencias tipo G+H
      if (lastKey && Date.now() - lastKey.at < sequenceTimeoutMs) {
        const combo = `${lastKey.key}+${key}`;
        const match = shortcuts.find(
          (s) => s.combo.toLowerCase() === combo && (s.global || !isTyping)
        );
        if (match) {
          e.preventDefault();
          match.handler(e);
          lastKey = null;
          return;
        }
      }

      // Combos con modificador
      if (isMod) {
        const combo = `cmd+${key}`;
        const match = shortcuts.find(
          (s) => s.combo.toLowerCase() === combo && (s.global || !isTyping)
        );
        if (match) {
          e.preventDefault();
          match.handler(e);
          return;
        }
      }

      // Tecla simple (sin mod)
      if (!isMod && !isTyping) {
        const match = shortcuts.find(
          (s) => s.combo.toLowerCase() === key && (s.global || !isTyping)
        );
        if (match) {
          e.preventDefault();
          match.handler(e);
          return;
        }
      }

      // Almacenar para posible secuencia
      if (!isMod && !isTyping && key.length === 1) {
        lastKey = { key, at: Date.now() };
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
