import React from 'react';

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-600">Something went wrong: {this.state.error?.message}</div>;
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
