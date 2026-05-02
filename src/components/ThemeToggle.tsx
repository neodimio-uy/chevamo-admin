"use client";

import { useTheme } from "@/lib/theme";
import { SunIcon, MoonIcon } from "./icons";

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={`Cambiar a ${resolved === "dark" ? "claro" : "oscuro"}`}
      className="flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-subtle hover:text-text transition-colors"
    >
      {resolved === "dark" ? <SunIcon size={14} /> : <MoonIcon size={14} />}
    </button>
  );
}
