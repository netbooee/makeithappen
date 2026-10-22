import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Catches any uncaught render error so the app shows a message instead of a blank screen —
 *  the only way to stop one (e.g. a thrown localStorage access in Safari Private Browsing)
 *  from blanking the whole page, since React unmounts everything above the nearest boundary. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 14, fontFamily: "system-ui, sans-serif", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Something went wrong.</div>
          <div style={{ fontSize: 13.5, color: "#6B7280", maxWidth: 420 }}>
            {this.state.error.message || "An unexpected error occurred."}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{ fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 7, border: "1px solid #D1D5DB", background: "#fff", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
