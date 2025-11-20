/**
 * Toast Notification Utilities
 * Provides easy-to-use toast notification functions
 */

import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Success toast
 */
export function toastSuccess(message: string, options?: ToastOptions) {
  return sonnerToast.success(options?.title || 'Success', {
    description: message,
    duration: options?.duration || 4000,
    action: options?.action,
  });
}

/**
 * Error toast
 */
export function toastError(message: string, options?: ToastOptions) {
  return sonnerToast.error(options?.title || 'Error', {
    description: message,
    duration: options?.duration || 6000,
    action: options?.action,
  });
}

/**
 * Warning toast
 */
export function toastWarning(message: string, options?: ToastOptions) {
  return sonnerToast.warning(options?.title || 'Warning', {
    description: message,
    duration: options?.duration || 5000,
    action: options?.action,
  });
}

/**
 * Info toast
 */
export function toastInfo(message: string, options?: ToastOptions) {
  return sonnerToast.info(options?.title || 'Info', {
    description: message,
    duration: options?.duration || 4000,
    action: options?.action,
  });
}

/**
 * Promise toast (for async operations)
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string;
    error: string;
  }
) {
  return sonnerToast.promise(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
  });
}

/**
 * API Error Handler
 * Converts API errors to user-friendly toast messages
 */
export function handleApiError(error: any, fallbackMessage = 'An unexpected error occurred') {
  let message = fallbackMessage;
  
  if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.message) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  toastError(message, {
    action: {
      label: 'Dismiss',
      onClick: () => {},
    },
  });
}

/**
 * Network Error Handler
 */
export function handleNetworkError(error: any) {
  const isOffline = !navigator.onLine;
  
  if (isOffline) {
    toastError('No internet connection', {
      title: 'Offline',
      description: 'Please check your internet connection and try again',
      duration: 8000,
    });
  } else {
    toastError('Unable to reach the server', {
      title: 'Connection Error',
      description: 'Please try again in a moment',
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
    });
  }
}

/**
 * Validation Error Handler
 */
export function handleValidationError(errors: Record<string, string>) {
  const errorMessages = Object.values(errors).join(', ');
  toastError(errorMessages, {
    title: 'Validation Error',
    description: 'Please check your input and try again',
  });
}

