"use client"

/**
 * Main Calculator Component
 * Orchestrates form submission and results display
 */

import { useState } from 'react';
import { CalculatorForm } from './calculator-form';
import { CalculatorResults } from './calculator-results';
import { calculateNDC, APIError } from '@/lib/api-client';
import { CalculateResponse } from '@/types/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

export function Calculator() {
  const [result, setResult] = useState<CalculateResponse | null>(null);
  const [error, setError] = useState<APIError | Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { getIdToken } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (data: any) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Get Firebase ID token for authentication
      const idToken = await getIdToken();

      // Call backend API
      const response = await calculateNDC(data, idToken);

      setResult(response);

      if (response.success) {
        toast({
          title: 'Calculation Complete',
          description: `Found ${response.data?.recommendedPackages.length || 0} NDC package(s)`,
        });
      }
    } catch (err) {
      setError(err as APIError | Error);
      
      if (err instanceof APIError) {
        toast({
          title: 'Calculation Failed',
          description: err.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Unexpected Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <CalculatorForm onSubmit={handleSubmit} isLoading={isLoading} />
      <CalculatorResults result={result} error={error} />
    </div>
  );
}

