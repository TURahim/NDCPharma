"use client"

/**
 * Calculator Results Component
 * Displays calculation results with drug info, recommendations, warnings, and explanations
 */

import { CalculateResponse } from '@/types/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { CheckCircle2, XCircle, AlertTriangle, Info, ChevronDown } from 'lucide-react';
import { APIError } from '@/lib/api-client';

interface CalculatorResultsProps {
  result: CalculateResponse | null;
  error: APIError | Error | null;
}

export function CalculatorResults({ result, error }: CalculatorResultsProps) {
  // Error view
  if (error) {
    const isAPIError = error instanceof APIError;
    const errorCode = isAPIError ? error.code : 'UNKNOWN_ERROR';

    let suggestion = 'Please try again';
    if (errorCode === 'DRUG_NOT_FOUND') {
      suggestion = 'Try a different drug name or verify the RxCUI';
    } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
      const retryAfter = isAPIError && error.details ? (error.details as any).retryAfter : null;
      suggestion = retryAfter
        ? `Please wait ${retryAfter} seconds before trying again`
        : 'You have exceeded the rate limit. Please wait and try again later';
    } else if (errorCode === 'VALIDATION_ERROR') {
      suggestion = 'Please check your input fields and try again';
    } else if (errorCode === 'NETWORK_ERROR') {
      suggestion = 'Please check your internet connection and try again';
    }

    return (
      <Alert variant="destructive" className="mt-6">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Calculation Failed</AlertTitle>
        <AlertDescription>
          <p className="font-medium">{error.message}</p>
          <p className="text-sm mt-1">{suggestion}</p>
        </AlertDescription>
      </Alert>
    );
  }

  // No result yet
  if (!result || !result.success || !result.data) {
    return null;
  }

  const { data } = result;

  // Helper to get badge color based on percentage
  const getPercentageBadge = (percentage: number, type: 'overfill' | 'underfill') => {
    if (percentage === 0) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Perfect Match</Badge>;
    }
    
    if (type === 'overfill') {
      if (percentage < 5) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">+{percentage.toFixed(1)}% Overfill</Badge>;
      if (percentage < 10) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">+{percentage.toFixed(1)}% Overfill</Badge>;
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">+{percentage.toFixed(1)}% Overfill</Badge>;
    } else {
      if (percentage < 5) return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">-{percentage.toFixed(1)}% Underfill</Badge>;
      if (percentage < 10) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">-{percentage.toFixed(1)}% Underfill</Badge>;
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">-{percentage.toFixed(1)}% Underfill</Badge>;
    }
  };

  return (
    <div className="mt-8 space-y-6">
      {/* Success Banner */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900">Calculation Successful</AlertTitle>
        <AlertDescription className="text-green-700">
          Found optimal NDC package recommendations for your prescription
        </AlertDescription>
      </Alert>

      {/* Drug Information */}
      <Card>
        <CardHeader>
          <CardTitle>Normalized Drug Information</CardTitle>
          <CardDescription>Identified drug details from RxNorm</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Drug Name</p>
              <p className="text-lg font-semibold text-gray-900">{data.drug.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">RxCUI</p>
              <p className="text-lg font-semibold text-gray-900">{data.drug.rxcui}</p>
            </div>
            {data.drug.dosageForm && (
              <div>
                <p className="text-sm font-medium text-gray-500">Dosage Form</p>
                <p className="text-lg font-semibold text-gray-900">{data.drug.dosageForm}</p>
              </div>
            )}
            {data.drug.strength && (
              <div>
                <p className="text-sm font-medium text-gray-500">Strength</p>
                <p className="text-lg font-semibold text-gray-900">{data.drug.strength}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Total Quantity */}
      <Card>
        <CardHeader>
          <CardTitle>Total Quantity</CardTitle>
          <CardDescription>Calculated quantity to dispense</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-600">{data.totalQuantity}</p>
        </CardContent>
      </Card>

      {/* Recommended Packages */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended NDC Packages</CardTitle>
          <CardDescription>Optimal packages to fulfill the prescription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.recommendedPackages.map((pkg, index) => (
              <div
                key={pkg.ndc}
                className="border border-gray-200 rounded-lg p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">NDC</p>
                    <p className="text-lg font-mono font-semibold text-gray-900">{pkg.ndc}</p>
                  </div>
                  {pkg.isActive ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <XCircle className="w-3 h-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Package Size</p>
                    <p className="font-medium text-gray-900">{pkg.packageSize}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Unit</p>
                    <p className="font-medium text-gray-900">{pkg.unit}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Dosage Form</p>
                    <p className="font-medium text-gray-900">{pkg.dosageForm}</p>
                  </div>
                  {pkg.marketingStatus && (
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium text-gray-900">{pkg.marketingStatus}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Overfill/Underfill */}
          <div className="mt-4 flex flex-wrap gap-2">
            {data.overfillPercentage > 0 && getPercentageBadge(data.overfillPercentage, 'overfill')}
            {data.underfillPercentage > 0 && getPercentageBadge(data.underfillPercentage, 'underfill')}
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <Alert variant="default" className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-900">Warnings</AlertTitle>
          <AlertDescription className="text-yellow-700">
            <ul className="list-disc list-inside space-y-1 mt-2">
              {data.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Accordions for Excluded and Explanations */}
      <Accordion type="multiple" className="space-y-4">
        {/* Excluded NDCs */}
        {data.excluded && data.excluded.length > 0 && (
          <AccordionItem value="excluded" className="border border-gray-200 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="font-medium">Excluded NDCs ({data.excluded.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {data.excluded.map((excluded, index) => (
                  <div key={index} className="border-l-4 border-red-300 pl-4 py-2">
                    <p className="font-mono text-sm font-medium text-gray-900">{excluded.ndc}</p>
                    <p className="text-sm text-gray-600 mt-1">{excluded.reason}</p>
                    {excluded.marketingStatus && (
                      <p className="text-xs text-gray-500 mt-1">Status: {excluded.marketingStatus}</p>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Step-by-Step Explanations */}
        {data.explanations && data.explanations.length > 0 && (
          <AccordionItem value="explanations" className="border border-gray-200 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-500" />
                <span className="font-medium">Step-by-Step Explanation</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                {data.explanations.map((explanation, index) => (
                  <div key={index} className="border-l-4 border-blue-300 pl-4 py-2">
                    <p className="text-sm font-medium text-blue-900 capitalize">
                      {index + 1}. {explanation.step.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{explanation.description}</p>
                    {explanation.details && Object.keys(explanation.details).length > 0 && (
                      <pre className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(explanation.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

