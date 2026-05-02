"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { useAlert, updateAlert } from "@/hooks/useAlerts";
import AlertForm from "@/components/AlertForm";
import Link from "next/link";
import { Suspense } from "react";

function EditAlertContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const { alert, loading } = useAlert(id ?? "");

  if (!id) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
        <h3 className="text-base font-semibold text-text">
          ID no especificado
        </h3>
        <Link
          href="/alerts"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Volver a alertas
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!alert) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
        <h3 className="text-base font-semibold text-text">
          Alerta no encontrada
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Es posible que haya sido eliminada.
        </p>
        <Link
          href="/alerts"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Volver a alertas
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/alerts"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Volver a alertas
        </Link>
        <h1 className="text-2xl font-bold text-text">Editar alerta</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Modificá los datos de la alerta. Los cambios se aplican en tiempo real.
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <AlertForm
          initial={alert}
          userEmail={user?.email ?? ""}
          submitLabel="Guardar cambios"
          onSubmit={async (data) => {
            await updateAlert(id, data);
            toast("Alerta actualizada", "success");
            router.push("/alerts");
          }}
        />
      </div>
    </div>
  );
}

export default function EditAlertPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <EditAlertContent />
    </Suspense>
  );
}
