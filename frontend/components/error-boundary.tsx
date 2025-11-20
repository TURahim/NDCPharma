"use client"

/**
 * Error Boundary Component
 * Catches and displays errors in the component tree
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Log to monitoring service (if available)
    if (typeof window !== 'undefined' && (window as any).errorLogger) {
      (window as any).errorLogger.logError(error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-2 border-red-300 bg-red-50">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-red-900">
                    Oops! Something went wrong
                  </h1>
                  <p className="text-red-700 text-sm mt-1">
                    We encountered an unexpected error
                  </p>
                </div>
              </div>

              {this.state.error && (
                <div className="mb-6">
                  <details className="bg-white rounded-lg border border-red-200 p-4">
                    <summary className="cursor-pointer text-sm font-semibold text-red-900 mb-2">
                      Error Details (click to expand)
                    </summary>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Error Message:</p>
                        <p className="text-xs text-red-800 font-mono mt-1 p-2 bg-red-50 rounded">
                          {this.state.error.message}
                        </p>
                      </div>
                      {this.state.error.stack && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700">Stack Trace:</p>
                          <pre className="text-xs text-gray-700 mt-1 p-2 bg-gray-50 rounded overflow-x-auto max-h-40">
                            {this.state.error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="bg-white rounded-lg border border-red-200 p-4 mb-6">
                <p className="text-sm text-gray-900 mb-3">
                  <strong>What you can do:</strong>
                </p>
                <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                  <li>Try refreshing the page to see if the issue resolves</li>
                  <li>Go back to the home page and start over</li>
                  <li>If the problem persists, please contact support</li>
                  <li>Clear your browser cache and cookies</li>
                </ul>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={this.handleReset}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go to Home
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-6">
                Error ID: {Date.now().toString(36)} • Time: {new Date().toLocaleString()}
              </p>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to throw errors from function components
 */
export function useErrorHandler() {
  const [, setState] = React.useState();
  
  return React.useCallback(
    (error: Error) => {
      setState(() => {
        throw error;
      });
    },
    [setState]
  );
}

