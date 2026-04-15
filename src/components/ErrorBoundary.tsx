import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends (React.Component as any) {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (this.props as any).fallback || (
        <div className="p-8 text-center bg-red-50 border border-red-100 rounded-3xl my-8">
          <h2 className="text-xl font-black text-red-900 mb-2">Something went wrong</h2>
          <p className="text-red-700 text-sm mb-4">{(this.state as any).error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return (this.props as any).children;
  }
}

export default ErrorBoundary;
