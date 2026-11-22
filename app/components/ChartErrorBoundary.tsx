import React from "react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Changing this value resets the boundary (e.g. when the period changes). */
  resetKey?: unknown;
}

interface State {
  hasError: boolean;
}

/**
 * Keeps a crash inside the chart from unmounting the whole screen
 * (which on web shows up as a blank white page).
 */
export default class ChartErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Chart render failed:", error);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
