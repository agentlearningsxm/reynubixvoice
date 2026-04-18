import React from 'react';

// Minimal ErrorBoundary using React.Component.
// This project has no @types/react, so we declare the class shape inline.
// biome-ignore lint/suspicious/noExplicitAny: React.Component type requires this for class extension
const ErrorBoundaryClass = React.Component as any;

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends ErrorBoundaryClass {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false } as ErrorBoundaryState;
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown): void {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render(): React.ReactNode {
    if ((this.state as ErrorBoundaryState).hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-main text-text-primary">
          <div className="text-center space-y-6 p-8">
            <h1 className="text-3xl font-bold">Something went wrong</h1>
            <p className="text-text-muted-strong max-w-md mx-auto">
              An unexpected error occurred. Please try again.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="px-6 py-3 rounded-lg bg-brand-primary text-accent-ink font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg-main"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return (this.props as { children: React.ReactNode }).children;
  }
}

export default ErrorBoundary;
