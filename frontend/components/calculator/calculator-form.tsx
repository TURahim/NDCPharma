"use client"

/**
 * Calculator Form Component
 * Handles input for NDC calculation with structured and free-text SIG options
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const calculatorSchema = z.object({
  drugInput: z.string().min(2, 'Drug name or RxCUI must be at least 2 characters').max(200),
  sigMode: z.enum(['structured', 'freetext']),
  // Structured SIG fields
  dose: z.coerce.number().positive('Dose must be positive').optional(),
  frequency: z.coerce.number().positive('Frequency must be positive').optional(),
  unit: z.string().min(1, 'Unit is required').optional(),
  // Free-text SIG field
  sigText: z.string().optional(),
  daysSupply: z.coerce.number().int().min(1, 'Days supply must be at least 1').max(365, 'Days supply cannot exceed 365'),
}).refine(
  (data) => {
    if (data.sigMode === 'structured') {
      return data.dose && data.frequency && data.unit;
    }
    return data.sigText && data.sigText.length > 0;
  },
  {
    message: 'Please fill in all SIG fields',
    path: ['sigMode'],
  }
);

type CalculatorFormData = z.infer<typeof calculatorSchema>;

interface CalculatorFormProps {
  onSubmit: (data: {
    drug: { name?: string; rxcui?: string };
    sig: { dose: number; frequency: number; unit: string } | string;
    daysSupply: number;
  }) => Promise<void>;
  isLoading: boolean;
}

const COMMON_UNITS = [
  'tablet',
  'capsule',
  'mL',
  'gm',
  'mg',
  'unit',
  'patch',
  'suppository',
  'spray',
  'drop',
  'puff',
];

export function CalculatorForm({ onSubmit, isLoading }: CalculatorFormProps) {
  const [sigMode, setSigMode] = useState<'structured' | 'freetext'>('structured');

  const form = useForm<CalculatorFormData>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: {
      drugInput: '',
      sigMode: 'structured',
      dose: undefined,
      frequency: undefined,
      unit: '',
      sigText: '',
      daysSupply: 30,
    },
  });

  const handleSubmit = async (data: CalculatorFormData) => {
    // Transform form data to API format
    const apiData: any = {
      drug: {},
      daysSupply: data.daysSupply,
    };

    // Parse drug input (check if it's an RxCUI or drug name)
    const isRxCUI = /^\d+$/.test(data.drugInput.trim());
    if (isRxCUI) {
      apiData.drug.rxcui = data.drugInput.trim();
    } else {
      apiData.drug.name = data.drugInput.trim();
    }

    // Handle SIG based on mode
    if (data.sigMode === 'structured') {
      apiData.sig = {
        dose: data.dose!,
        frequency: data.frequency!,
        unit: data.unit!,
      };
    } else {
      // For free-text, we'll need to parse it or send as-is
      // For now, just send a structured format with default values
      // In production, this would require backend AI parsing
      apiData.sig = { dose: 1, frequency: 1, unit: 'tablet', freeText: data.sigText };
    }

    await onSubmit(apiData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Drug Input */}
          <FormField
            control={form.control}
            name="drugInput"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Drug Name or RxCUI</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Lisinopril or 314076"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormDescription>
                  Enter the drug name (e.g., "Lisinopril") or RxCUI (e.g., "314076")
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* SIG Mode Toggle */}
          <FormField
            control={form.control}
            name="sigMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prescription Directions (SIG)</FormLabel>
                <FormControl>
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={(value) => {
                      if (value) {
                        field.onChange(value);
                        setSigMode(value as 'structured' | 'freetext');
                      }
                    }}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="structured" aria-label="Structured Input">
                      Structured Input
                    </ToggleGroupItem>
                    <ToggleGroupItem value="freetext" aria-label="Free Text">
                      Free Text
                    </ToggleGroupItem>
                  </ToggleGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Structured SIG Fields */}
          {sigMode === 'structured' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="dose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dose</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 1"
                        {...field}
                        disabled={isLoading}
                        step="0.5"
                        min="0"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Per administration</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 2"
                        {...field}
                        disabled={isLoading}
                        step="1"
                        min="0"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Times per day</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COMMON_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Free Text SIG Field */}
          {sigMode === 'freetext' && (
            <FormField
              control={form.control}
              name="sigText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescription Directions</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Take 1 tablet by mouth twice daily"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-amber-600">
                    ⚠️ AI parsing is experimental. Structured input is recommended.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Days Supply */}
          <FormField
            control={form.control}
            name="daysSupply"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Days Supply</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 30"
                    {...field}
                    disabled={isLoading}
                    step="1"
                    min="1"
                    max="365"
                  />
                </FormControl>
                <FormDescription>Number of days the prescription should last (1-365)</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              'Calculate NDC'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

