"use client"

/**
 * Step 6: Final Confirmation & Summary
 * Comprehensive review of all workflow data before final dispensing
 */

import React, { useState, useMemo, useRef } from 'react';
import { 
  CheckCircle, AlertTriangle, Info, Printer, Download,
  Edit, RefreshCw, Package, Pill, Calendar, FileText,
  Building2, FlaskConical, Route as RouteIcon, TrendingUp,
  ClipboardCheck, AlertCircle, ChevronRight
} from 'lucide-react';
import { useWorkflow } from '@/lib/workflow-context';
import { WorkflowStep } from '@/types/workflow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

/**
 * Summary Section Component
 */
function SummarySection({ 
  icon: Icon, 
  title, 
  children 
}: { 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

/**
 * Data Row Component
 */
function DataRow({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: React.ReactNode; 
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-600 flex-shrink-0">{label}</span>
      <span className={`text-sm text-right ${highlight ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
        {value}
      </span>
    </div>
  );
}

/**
 * Confirmation Step Component
 */
export function ConfirmationStep() {
  const { state, resetWorkflow, goToStep } = useWorkflow();
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  const selectedPackage = state.selectedPackage?.package;
  const selectedPackages = state.selectedPackages || [];
  const isMultiPackage = state.multiPackageMode && selectedPackages.length > 0;
  const sig = state.sig;
  const quantity = state.quantity;
  
  /**
   * Generate SIG display text
   */
  const sigDisplayText = useMemo(() => {
    if (!sig) return 'Not specified';
    
    if (sig.mode === 'structured' && sig.structured) {
      const { dose, frequency, unit } = sig.structured;
      const frequencyMap: Record<number, string> = {
        1: 'once daily',
        2: 'twice daily',
        3: 'three times daily',
        4: 'four times daily',
        6: 'every 4 hours',
        8: 'every 3 hours',
      };
      
      const freqText = frequencyMap[frequency] || `${frequency} times daily`;
      return `Take ${dose} ${unit}${dose > 1 ? 's' : ''} ${freqText} for ${sig.daysSupply} days`;
    } else if (sig.freetext) {
      return sig.freetext;
    }
    
    return 'Not specified';
  }, [sig]);
  
  /**
   * Get strength from package
   */
  const packageStrength = useMemo(() => {
    if (!selectedPackage?.activeIngredients || selectedPackage.activeIngredients.length === 0) {
      return 'N/A';
    }
    return selectedPackage.activeIngredients
      .map(ing => ing.strength)
      .filter(Boolean)
      .join(' / ') || 'N/A';
  }, [selectedPackage]);
  
  /**
   * Get route from package
   */
  const packageRoute = useMemo(() => {
    if (!selectedPackage?.route || selectedPackage.route.length === 0) {
      return 'N/A';
    }
    return selectedPackage.route.join(', ');
  }, [selectedPackage]);
  
  /**
   * Collect warnings
   */
  const warnings = useMemo(() => {
    const warns: Array<{ type: 'warning' | 'info'; message: string }> = [];
    
    // Check for inactive NDC
    if (selectedPackage && (!selectedPackage.marketingStatus || 
        (typeof selectedPackage.marketingStatus === 'object' && !selectedPackage.marketingStatus.isActive))) {
      warns.push({
        type: 'warning',
        message: 'This NDC is marked as inactive. Verify availability before dispensing.',
      });
    }
    
    // Check for significant overfill
    if (quantity && quantity.overfillPercentage > 20) {
      warns.push({
        type: 'warning',
        message: `Significant overfill: ${quantity.overfillPercentage.toFixed(1)}% more than required quantity will be dispensed.`,
      });
    }
    
    // Check for manual override
    if (quantity?.manualOverride) {
      warns.push({
        type: 'info',
        message: `Manual quantity override applied: ${quantity.manualOverride.reason}`,
      });
    }
    
    return warns;
  }, [selectedPackage, quantity]);
  
  /**
   * Check if workflow is complete
   */
  const isWorkflowComplete = useMemo(() => {
    const hasPackageSelection = isMultiPackage 
      ? selectedPackages.length > 0 
      : !!selectedPackage;
    
    return !!(
      state.drugSearch &&
      state.availablePackages &&
      hasPackageSelection &&
      sig &&
      quantity
    );
  }, [state, selectedPackage, selectedPackages, isMultiPackage, sig, quantity]);
  
  /**
   * Handle print
   */
  const handlePrint = () => {
    window.print();
  };
  
  /**
   * Handle confirm
   */
  const handleConfirm = () => {
    if (!isWorkflowComplete) {
      alert('Please complete all previous steps before confirming.');
      return;
    }
    
    setShowConfirmDialog(true);
  };
  
  /**
   * Handle final confirmation
   */
  const handleFinalConfirm = () => {
    setIsConfirmed(true);
    setShowConfirmDialog(false);
    
    // TODO: In a real implementation, this would:
    // 1. Save to Firestore
    // 2. Create audit log entry
    // 3. Send to pharmacy system
    // 4. Generate label
    
    console.log('Final confirmation:', {
      ...state,
      clinicalNotes,
      confirmedAt: new Date().toISOString(),
    });
  };
  
  /**
   * Handle new calculation
   */
  const handleNewCalculation = () => {
    if (confirm('Start a new calculation? This will clear all current data.')) {
      setIsConfirmed(false);
      setClinicalNotes('');
      resetWorkflow();
    }
  };
  
  /**
   * Handle edit (go back to specific step)
   */
  const handleEdit = (step: WorkflowStep) => {
    goToStep(step);
  };
  
  // Show incomplete workflow message
  if (!isWorkflowComplete) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Final Confirmation</h2>
          <p className="text-gray-600 mt-1">
            Review all details before confirming dispensing
          </p>
        </div>
        
        <Card className="border-2 border-amber-300 bg-amber-50">
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-amber-900 font-medium mb-2">Incomplete Workflow</p>
            <p className="text-sm text-amber-800 mb-4">
              Please complete all previous steps before final confirmation
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {!state.drugSearch && (
                <Button variant="outline" size="sm" onClick={() => goToStep(WorkflowStep.DRUG_SEARCH)}>
                  <ChevronRight className="w-4 h-4 mr-1" />
                  Step 1: Drug Search
                </Button>
              )}
              {!selectedPackage && (
                <Button variant="outline" size="sm" onClick={() => goToStep(WorkflowStep.CHOOSE_PACKAGE)}>
                  <ChevronRight className="w-4 h-4 mr-1" />
                  Step 3: Select Package
                </Button>
              )}
              {!sig && (
                <Button variant="outline" size="sm" onClick={() => goToStep(WorkflowStep.SIG_ENTRY)}>
                  <ChevronRight className="w-4 h-4 mr-1" />
                  Step 4: Enter SIG
                </Button>
              )}
              {!quantity && (
                <Button variant="outline" size="sm" onClick={() => goToStep(WorkflowStep.QUANTITY_REVIEW)}>
                  <ChevronRight className="w-4 h-4 mr-1" />
                  Step 5: Review Quantity
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Final Confirmation</h2>
        <p className="text-gray-600 mt-1">
          Review all details before confirming dispensing
        </p>
      </div>
      
      {/* Success Banner (after confirmation) */}
      {isConfirmed && (
        <Card className="border-2 border-green-500 bg-green-50">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-lg font-bold text-green-900">Dispensing Confirmed</h3>
                <p className="text-sm text-green-800">
                  Prescription has been verified and approved for dispensing
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print Summary
              </Button>
              <Button size="sm" variant="outline" onClick={handleNewCalculation}>
                <RefreshCw className="w-4 h-4 mr-2" />
                New Calculation
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Warnings Section */}
      {warnings.length > 0 && (
        <Card className="border-2 border-amber-400 bg-amber-50">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">Warnings & Alerts</h3>
            </div>
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div 
                  key={index}
                  className={`flex items-start gap-2 text-sm p-2 rounded ${
                    warning.type === 'warning' 
                      ? 'bg-amber-100 text-amber-900' 
                      : 'bg-blue-100 text-blue-900'
                  }`}
                >
                  {warning.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      
      {/* Main Summary Card */}
      <Card className="border-2 border-gray-300" ref={printRef}>
        <div className="p-6 space-y-6">
          {/* Drug Information */}
          <SummarySection icon={Pill} title="Drug Information">
            <DataRow 
              label="Brand Name" 
              value={selectedPackage!.brandName || '—'} 
            />
            <DataRow 
              label="Generic Name" 
              value={selectedPackage!.genericName || 'N/A'} 
            />
            <DataRow 
              label="Strength" 
              value={packageStrength} 
            />
            <DataRow 
              label="Dosage Form" 
              value={selectedPackage!.dosageForm || 'N/A'} 
            />
            <DataRow 
              label="Route" 
              value={packageRoute} 
            />
          </SummarySection>
          
          <Separator />
          
          {/* Package Information */}
          <SummarySection icon={Package} title={isMultiPackage ? "Package Combination" : "Package Information"}>
            {isMultiPackage ? (
              <>
                <DataRow 
                  label="Selection Mode" 
                  value={<Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">Multi-Package</Badge>}
                />
                <div className="space-y-2 mt-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase">Selected Packages ({selectedPackages.length})</p>
                  {selectedPackages.map((sp, index) => (
                    <div key={sp.package.ndc} className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {sp.package.brandName || sp.package.genericName}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Package {index + 1}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-gray-600">
                        <div>NDC: <span className="font-mono">{sp.package.ndc}</span></div>
                        <div>Size: {sp.package.packageSize?.quantity} {sp.package.packageSize?.unit}</div>
                        <div>Labeler: {sp.package.labeler || '—'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <DataRow 
                  label="NDC" 
                  value={<span className="font-mono">{selectedPackage!.ndc}</span>}
                  highlight
                />
                <DataRow 
                  label="Package Size" 
                  value={`${selectedPackage!.packageSize?.quantity} ${selectedPackage!.packageSize?.unit}`} 
                />
                <DataRow 
                  label="Manufacturer/Labeler" 
                  value={selectedPackage!.labeler || '—'} 
                />
                <DataRow 
                  label="Marketing Status" 
                  value={
                    <Badge variant={
                      selectedPackage!.marketingStatus && 
                      typeof selectedPackage!.marketingStatus === 'object' && 
                      selectedPackage!.marketingStatus.isActive 
                        ? 'default' 
                        : 'secondary'
                    }>
                      {selectedPackage!.marketingStatus && 
                       typeof selectedPackage!.marketingStatus === 'object' && 
                       selectedPackage!.marketingStatus.isActive 
                        ? 'Active' 
                        : 'Inactive'}
                    </Badge>
                  } 
                />
              </>
            )}
          </SummarySection>
          
          <Separator />
          
          {/* Prescription Directions (SIG) */}
          <SummarySection icon={FileText} title="Prescription Directions (SIG)">
            <div className="bg-white rounded p-3 border border-gray-200">
              <p className="text-sm text-gray-900 italic leading-relaxed">
                "{sigDisplayText}"
              </p>
            </div>
            <DataRow 
              label="Days Supply" 
              value={`${sig!.daysSupply} days`} 
            />
            {sig!.mode === 'structured' && sig!.structured && (
              <>
                <DataRow 
                  label="Dose" 
                  value={`${sig!.structured.dose} ${sig!.structured.unit}`} 
                />
                <DataRow 
                  label="Frequency" 
                  value={`${sig!.structured.frequency} times daily`} 
                />
              </>
            )}
          </SummarySection>
          
          <Separator />
          
          {/* Quantity & Dispensing */}
          <SummarySection icon={ClipboardCheck} title="Quantity & Dispensing">
            <DataRow 
              label="Total Quantity to Dispense" 
              value={
                <span className="text-lg">
                  {quantity!.totalQuantity} {sig!.structured?.unit || 'units'}
                </span>
              }
              highlight
            />
            <DataRow 
              label="Number of Packages" 
              value={`${quantity!.packagesNeeded} package${quantity!.packagesNeeded !== 1 ? 's' : ''}`} 
            />
            {quantity!.manualOverride && (
              <DataRow 
                label="Override Applied" 
                value={
                  <Badge variant="outline" className="bg-purple-50 text-purple-800 border-purple-200">
                    Manual Override
                  </Badge>
                } 
              />
            )}
            {quantity!.overfillPercentage > 0 && (
              <DataRow 
                label="Overfill" 
                value={
                  <span className={quantity!.overfillPercentage > 20 ? 'text-amber-600 font-semibold' : ''}>
                    +{quantity!.overfillPercentage.toFixed(1)}%
                  </span>
                } 
              />
            )}
          </SummarySection>
        </div>
      </Card>
      
      {/* Clinical Notes */}
      <Card>
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-600" />
            <Label htmlFor="clinicalNotes" className="text-lg font-semibold text-gray-900">
              Clinical Notes (Optional)
            </Label>
          </div>
          <Textarea
            id="clinicalNotes"
            rows={4}
            placeholder="Add any clinical notes, special instructions, or pharmacist observations..."
            value={clinicalNotes}
            onChange={(e) => setClinicalNotes(e.target.value)}
            disabled={isConfirmed}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">
            These notes will be saved with the dispensing record
          </p>
        </div>
      </Card>
      
      {/* Action Buttons */}
      {!isConfirmed ? (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Confirm?</h3>
              <p className="text-sm text-gray-600">
                Please review all details above. Once confirmed, this prescription will be marked as dispensed.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                onClick={handleConfirm}
                size="lg"
                className="bg-green-600 hover:bg-green-700 gap-2 px-8"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm & Dispense
              </Button>
              
              <Button
                onClick={handlePrint}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <Printer className="w-5 h-5" />
                Print Summary
              </Button>
            </div>
            
            <Separator className="my-4" />
            
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                onClick={() => handleEdit(WorkflowStep.DRUG_SEARCH)}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit Drug
              </Button>
              <Button
                onClick={() => handleEdit(WorkflowStep.CHOOSE_PACKAGE)}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit Package
              </Button>
              <Button
                onClick={() => handleEdit(WorkflowStep.SIG_ENTRY)}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit SIG
              </Button>
              <Button
                onClick={() => handleEdit(WorkflowStep.QUANTITY_REVIEW)}
                variant="ghost"
                size="sm"
                className="gap-1"
              >
                <Edit className="w-3 h-3" />
                Edit Quantity
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
          <div className="p-6 text-center">
            <p className="text-sm text-gray-600 mb-4">
              This prescription has been confirmed and is ready for dispensing
            </p>
            <Button onClick={handleNewCalculation} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Start New Calculation
            </Button>
          </div>
        </Card>
      )}
      
      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Confirm Dispensing
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 text-left">
              <p>
                You are about to confirm the following prescription for dispensing:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <p><strong>Drug:</strong> {selectedPackage!.brandName || selectedPackage!.genericName}</p>
                <p><strong>NDC:</strong> <span className="font-mono">{selectedPackage!.ndc}</span></p>
                <p><strong>Quantity:</strong> {quantity!.totalQuantity} {sig!.structured?.unit || 'units'}</p>
                <p><strong>Packages:</strong> {quantity!.packagesNeeded}</p>
              </div>
              <p className="text-amber-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Please verify all details are correct before confirming.</span>
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFinalConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Dispensing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 print:hidden">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 space-y-2">
            <p className="font-semibold">Before Confirming</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 text-xs">
              <li>Verify the NDC matches the prescription</li>
              <li>Confirm the quantity calculation is correct</li>
              <li>Review all warnings and alerts</li>
              <li>Add clinical notes if needed</li>
              <li>Use Edit buttons to make any changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
