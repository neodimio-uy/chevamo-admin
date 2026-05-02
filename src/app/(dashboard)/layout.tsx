"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import CommandPalette from "@/components/CommandPalette";
import KeyboardCheatsheet from "@/components/KeyboardCheatsheet";
import { useKeyboardShortcuts } from "@/hooks/useKeyboard";
import { CityProvider } from "@/lib/cityContext";

// Páginas que usan el layout completo sin padding (map-first)
const FULL_BLEED = new Set(["/home", "/map"]);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cheatOpen, setCheatOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const isFullBleed =
    FULL_BLEED.has(pathname) ||
    Array.from(FULL_BLEED).some((p) => pathname.startsWith(p + "/"));

  useKeyboardShortcuts([
    { combo: "cmd+k", description: "Command palette", handler: () => setPaletteOpen(true), global: true },
    { combo: "shift+/", description: "Cheatsheet", handler: () => setCheatOpen(true), global: true },
    { combo: "?", description: "Cheatsheet", handler: () => setCheatOpen(true) },
    { combo: "g+h", description: "En vivo", handler: () => router.push("/home") },
    { combo: "g+a", description: "Alertas", handler: () => router.push("/alerts") },
    { combo: "g+m", description: "Mapa", handler: () => router.push("/map") },
    { combo: "g+s", description: "Paradas", handler: () => router.push("/stops") },
    { combo: "g+l", description: "Líneas", handler: () => router.push("/lines") },
    { combo: "g+c", description: "Comunidad", handler: () => router.push("/community") },
    { combo: "g+t", description: "Plantillas", handler: () => router.push("/templates") },
    { combo: "n", description: "Nueva alerta", handler: () => router.push("/alerts/new") },
  ]);

  return (
    <AuthGuard>
      <CityProvider>
        <div className="flex h-screen bg-bg overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <StatusBar onCommandPalette={() => setPaletteOpen(true)} />
            {isFullBleed ? (
              <main className="relative flex-1 overflow-hidden">{children}</main>
            ) : (
              <main className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-7xl px-8 py-7">{children}</div>
              </main>
            )}
          </div>
        </div>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <KeyboardCheatsheet open={cheatOpen} onClose={() => setCheatOpen(false)} />
      </CityProvider>
    </AuthGuard>
  );
}
