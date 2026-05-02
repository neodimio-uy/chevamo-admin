"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, isAdmin, loading, error, signIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      router.replace("/home");
    }
  }, [user, isAdmin, loading, router]);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-4 overflow-hidden"
      style={{ background: "#FFFFFF" }}
    >
      {/* Halo verde sutil al fondo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 0%, rgba(0, 200, 83, 0.06) 0%, transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        {/* Logo hero */}
        <div className="mb-10 text-center">
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-extrabold"
            style={{
              background: "#0A0A0A",
              color: "#FFFFFF",
              boxShadow:
                "0 10px 30px -8px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)",
            }}
          >
            <span style={{ color: "#FFFFFF" }}>Vam</span>
            <span style={{ color: "#00C853" }}>o</span>
          </div>
          <h1
            className="text-[22px] font-bold tracking-tight"
            style={{ color: "#0A0A0A" }}
          >
            Panel de control
          </h1>
          <p
            className="mt-1 text-[13px]"
            style={{ color: "#71717A" }}
          >
            chevamo.com.uy / admin
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-7"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E4E4E7",
            boxShadow:
              "0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06)",
          }}
        >
          <div className="mb-5">
            <h2
              className="text-[16px] font-semibold"
              style={{ color: "#0A0A0A" }}
            >
              Iniciar sesión
            </h2>
            <p
              className="mt-1 text-[13px]"
              style={{ color: "#71717A" }}
            >
              Con tu cuenta corporativa de Neodimio.
            </p>
          </div>

          {error && (
            <div
              className="mb-4 rounded-lg px-3.5 py-2.5 text-[12px]"
              style={{
                border: "1px solid rgba(220, 38, 38, 0.25)",
                background: "rgba(254, 242, 242, 1)",
                color: "#B91C1C",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={signIn}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl px-4 py-3 text-[14px] font-semibold transition-all active:scale-[0.99] disabled:opacity-50"
            style={{
              border: "1px solid #E4E4E7",
              background: "#FFFFFF",
              color: "#0A0A0A",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#00C853";
              e.currentTarget.style.boxShadow =
                "0 0 0 3px rgba(0, 200, 83, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#E4E4E7";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </button>
        </div>

        <p
          className="mt-6 text-center text-[11px]"
          style={{ color: "#9C9CA3" }}
        >
          Restringido a cuentas{" "}
          <span
            className="font-mono font-semibold"
            style={{ color: "#0A0A0A" }}
          >
            @neodimio.com.uy
          </span>
        </p>
      </div>
    </div>
  );
}
