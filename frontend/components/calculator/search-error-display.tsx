/**
 * Search Error Display Component
 * Displays user-friendly error messages with suggested actions
 */

import React from 'react';
import {
  AlertCircle,
  WifiOff,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Info,
} from 'lucide-react';
import { APIError } from '@/lib/api-client';
import type { AvailabilityState } from '@/lib/search-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SearchErrorDisplayProps {
  error: Error | APIError | null;
  onRetry?: () => void;
  onClearError?: () => void;
  className?: string;
}

interface SuggestedAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'secondary';
}

/**
 * Get error details based on error type
 */
function getErrorDetails(error: Error | APIError): {
  title: string;
  message: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive';
  actions: SuggestedAction[];
  showDetails: boolean;
} {
  // Network errors
  if (error instanceof APIError && error.code === 'NETWORK_ERROR') {
    return {
      title: 'Connection Error',
      message:
        'Unable to connect to the server. Please check your internet connection and try again.',
      icon: <WifiOff className="h-4 w-4" />,
      variant: 'destructive',
      actions: [],
      showDetails: false,
    };
  }

  // Rate limit errors
  if (error instanceof APIError && error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = (error.details as any)?.retryAfter;
    return {
      title: 'Too Many Requests',
      message: retryAfter
        ? `You've made too many search requests. Please wait ${retryAfter} seconds and try again.`
        : "You've made too many search requests. Please wait a moment and try again.",
      icon: <Clock className="h-4 w-4" />,
      variant: 'default',
      actions: [],
      showDetails: false,
    };
  }

  // Validation errors
  if (error instanceof APIError && error.code === 'VALIDATION_ERROR') {
    return {
      title: 'Invalid Search',
      message:
        error.message || 'Your search query is invalid. Please check your input and try again.',
      icon: <AlertCircle className="h-4 w-4" />,
      variant: 'default',
      actions: [],
      showDetails: true,
    };
  }

  // Server errors
  if (error instanceof APIError && error.code === 'SERVER_ERROR') {
    return {
      title: 'Server Error',
      message:
        'The server encountered an error while processing your request. Please try again in a moment.',
      icon: <XCircle className="h-4 w-4" />,
      variant: 'destructive',
      actions: [],
      showDetails: false,
    };
  }

  // Generic error
  return {
    title: 'Search Error',
    message: error.message || 'An unexpected error occurred. Please try again.',
    icon: <AlertCircle className="h-4 w-4" />,
    variant: 'destructive',
    actions: [],
    showDetails: false,
  };
}

/**
 * Search Error Display - Main Component
 */
export function SearchErrorDisplay({
  error,
  onRetry,
  onClearError,
  className,
}: SearchErrorDisplayProps) {
  if (!error) return null;

  const details = getErrorDetails(error);

  const actions: SuggestedAction[] = [
    ...details.actions,
    ...(onRetry
      ? [
          {
            label: 'Try Again',
            icon: <RefreshCw className="h-4 w-4" />,
            onClick: onRetry,
            variant: 'outline' as const,
          },
        ]
      : []),
    ...(onClearError
      ? [
          {
            label: 'Dismiss',
            icon: null,
            onClick: onClearError,
            variant: 'secondary' as const,
          },
        ]
      : []),
  ];

  return (
    <Alert variant={details.variant} className={className}>
      {details.icon}
      <AlertTitle>{details.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{details.message}</p>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                size="sm"
                onClick={action.onClick}
                className="gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Error details for development */}
        {details.showDetails && error instanceof APIError && error.details && (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium">
              Technical Details
            </summary>
            <pre className="mt-2 rounded bg-muted p-2 text-xs overflow-auto">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          </details>
        )}
      </AlertDescription>
    </Alert>
  );
}

interface AvailabilityMessageProps {
  state: AvailabilityState;
  drugName?: string;
  onSwitchFilter?: () => void;
  onSearchAlternatives?: () => void;
  className?: string;
}

/**
 * Get availability state details
 */
function getAvailabilityDetails(
  state: AvailabilityState,
  drugName?: string
): {
  title: string;
  message: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive';
  severity: 'info' | 'warning' | 'error';
} {
  switch (state) {
    case 'ACTIVE_FOUND':
      return {
        title: 'Active Medications Found',
        message: 'We found active medications matching your search.',
        icon: <Search className="h-4 w-4" />,
        variant: 'default',
        severity: 'info',
      };

    case 'ONLY_INACTIVE':
      return {
        title: 'Only Inactive Medications Found',
        message: drugName
          ? `${drugName} exists in our database but has no active NDC packages. This medication may be discontinued or temporarily unavailable.`
          : 'This medication exists but has no active NDC packages. It may be discontinued or temporarily unavailable.',
        icon: <Info className="h-4 w-4" />,
        variant: 'default',
        severity: 'warning',
      };

    case 'NO_FDA_NDCS':
      return {
        title: 'No FDA-Listed Packages',
        message: drugName
          ? `${drugName} is recognized clinically but has no FDA-listed NDC packages. This is common for compounded medications or clinical trial drugs.`
          : 'This medication is recognized clinically but has no FDA-listed NDC packages. This is common for compounded medications or clinical trial drugs.',
        icon: <Info className="h-4 w-4" />,
        variant: 'default',
        severity: 'warning',
      };

    case 'NOT_FOUND':
      return {
        title: 'No Medications Found',
        message: drugName
          ? `No medications found matching "${drugName}". Try a different spelling, brand name, or generic name.`
          : 'No medications found. Try a different spelling, brand name, or generic name.',
        icon: <Search className="h-4 w-4" />,
        variant: 'default',
        severity: 'error',
      };

    default:
      return {
        title: 'Unknown State',
        message: 'An unexpected availability state occurred.',
        icon: <AlertCircle className="h-4 w-4" />,
        variant: 'default',
        severity: 'info',
      };
  }
}

/**
 * Availability Message Display
 * Shows contextual messages based on drug availability state
 */
export function AvailabilityMessageDisplay({
  state,
  drugName,
  onSwitchFilter,
  onSearchAlternatives,
  className,
}: AvailabilityMessageProps) {
  // Don't show message for successful searches
  if (state === 'ACTIVE_FOUND') {
    return null;
  }

  const details = getAvailabilityDetails(state, drugName);

  // Build suggested actions based on state
  const actions: SuggestedAction[] = [];

  if (state === 'ONLY_INACTIVE' && onSwitchFilter) {
    actions.push({
      label: 'Show Inactive Results',
      icon: <Search className="h-4 w-4" />,
      onClick: onSwitchFilter,
      variant: 'outline',
    });
  }

  if ((state === 'ONLY_INACTIVE' || state === 'NO_FDA_NDCS') && onSearchAlternatives) {
    actions.push({
      label: 'Search Alternatives',
      icon: <Search className="h-4 w-4" />,
      onClick: onSearchAlternatives,
      variant: 'default',
    });
  }

  // Color based on severity
  const alertClassName =
    details.severity === 'error'
      ? 'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100'
      : details.severity === 'warning'
      ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100'
      : '';

  return (
    <Alert className={`${alertClassName} ${className || ''}`}>
      {details.icon}
      <AlertTitle>{details.title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{details.message}</p>

        {/* Suggested Actions */}
        {actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                size="sm"
                onClick={action.onClick}
                className="gap-2"
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Additional help for NOT_FOUND */}
        {state === 'NOT_FOUND' && (
          <div className="mt-3 text-sm">
            <p className="font-semibold mb-1">Suggestions:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Check spelling and try again</li>
              <li>Try the brand name instead of generic (or vice versa)</li>
              <li>Use a partial name (e.g., "Lisin" instead of "Lisinopril")</li>
              <li>Search for the active ingredient</li>
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

