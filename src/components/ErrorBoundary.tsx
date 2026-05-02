"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  info: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("Dashboard error:", error, info);
    this.setState({ info: info.componentStack ?? null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-bg p-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-danger/30 bg-bg-card p-6 shadow-sm">
            <h1 className="mb-2 text-xl font-bold text-danger">
              Error al cargar la página
            </h1>
            <p className="mb-4 text-sm text-text-secondary">
              Mandale este error al equipo para diagnosticar:
            </p>
            <div className="rounded-xl border border-border bg-bg p-4">
              <p className="mb-2 font-mono text-sm font-semibold text-text">
                {this.state.error.name}: {this.state.error.message}
              </p>
              {this.state.error.stack && (
                <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-text-muted">
                  {this.state.error.stack}
                </pre>
              )}
              {this.state.info && (
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs text-text-muted border-t border-border pt-3">
                  {this.state.info}
                </pre>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                Recargar
              </button>
              <a
                href="/alerts"
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg"
              >
                Ir a alertas
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
