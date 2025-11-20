"use client";

/**
 * Step 4: SIG Entry & Validation
 * User enters prescription directions (SIG) using structured or free-text mode
 * Includes template library, validation, and previous SIG recall
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Pill,
  Calendar,
  Search,
  X,
  Info,
  Copy,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  History,
  Trash2,
  Loader2,
} from "lucide-react";
import { useWorkflow } from "@/lib/workflow-context";
import { SIGData, WorkflowStep } from "@/types/workflow";
import {
  getRecentSIGs,
  saveRecentSIG,
  deleteRecentSIG,
  StoredSIG,
} from "@/lib/sig-storage";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { parseFreeTextSig, APIError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

/**
 * SIG Template Library
 * Common prescription directions organized by category
 */
interface SIGTemplate {
  id: string;
  label: string;
  category: string;
  structured: {
    dose: number;
    frequency: number;
    unit: string;
  };
  freetext: string;
  daysSupply: number;
}

const SIG_TEMPLATES: SIGTemplate[] = [
  // Antibiotics - Short Course
  {
    id: "abx-bid-7",
    label: "Take 1 tablet twice daily for 7 days",
    category: "Antibiotics",
    structured: { dose: 1, frequency: 2, unit: "tablet" },
    freetext: "Take 1 tablet by mouth twice daily for 7 days",
    daysSupply: 7,
  },
  {
    id: "abx-bid-10",
    label: "Take 1 tablet twice daily for 10 days",
    category: "Antibiotics",
    structured: { dose: 1, frequency: 2, unit: "tablet" },
    freetext: "Take 1 tablet by mouth twice daily for 10 days",
    daysSupply: 10,
  },
  {
    id: "abx-tid-7",
    label: "Take 1 tablet three times daily for 7 days",
    category: "Antibiotics",
    structured: { dose: 1, frequency: 3, unit: "tablet" },
    freetext: "Take 1 tablet by mouth three times daily for 7 days",
    daysSupply: 7,
  },
  {
    id: "abx-qid-10",
    label: "Take 1 tablet four times daily for 10 days",
    category: "Antibiotics",
    structured: { dose: 1, frequency: 4, unit: "tablet" },
    freetext: "Take 1 tablet by mouth four times daily for 10 days",
    daysSupply: 10,
  },

  // Maintenance - Daily
  {
    id: "maint-qd-30",
    label: "Take 1 tablet once daily for 30 days",
    category: "Maintenance",
    structured: { dose: 1, frequency: 1, unit: "tablet" },
    freetext: "Take 1 tablet by mouth once daily",
    daysSupply: 30,
  },
  {
    id: "maint-qd-90",
    label: "Take 1 tablet once daily for 90 days",
    category: "Maintenance",
    structured: { dose: 1, frequency: 1, unit: "tablet" },
    freetext: "Take 1 tablet by mouth once daily",
    daysSupply: 90,
  },
  {
    id: "maint-bid-30",
    label: "Take 1 tablet twice daily for 30 days",
    category: "Maintenance",
    structured: { dose: 1, frequency: 2, unit: "tablet" },
    freetext: "Take 1 tablet by mouth twice daily",
    daysSupply: 30,
  },
  {
    id: "maint-bid-90",
    label: "Take 1 tablet twice daily for 90 days",
    category: "Maintenance",
    structured: { dose: 1, frequency: 2, unit: "tablet" },
    freetext: "Take 1 tablet by mouth twice daily",
    daysSupply: 90,
  },

  // Diabetes
  {
    id: "diabetes-metformin-bid",
    label: "Take 1 tablet twice daily with meals",
    category: "Diabetes",
    structured: { dose: 1, frequency: 2, unit: "tablet" },
    freetext: "Take 1 tablet by mouth twice daily with meals",
    daysSupply: 30,
  },
  {
    id: "diabetes-insulin-qd",
    label: "Inject 10 units once daily",
    category: "Diabetes",
    structured: { dose: 10, frequency: 1, unit: "unit" },
    freetext: "Inject 10 units subcutaneously once daily",
    daysSupply: 30,
  },

  // Pain Management
  {
    id: "pain-prn",
    label: "Take 1-2 tablets every 4-6 hours as needed",
    category: "Pain",
    structured: { dose: 1, frequency: 4, unit: "tablet" },
    freetext: "Take 1-2 tablets by mouth every 4-6 hours as needed for pain",
    daysSupply: 30,
  },
  {
    id: "pain-qid",
    label: "Take 1 tablet four times daily",
    category: "Pain",
    structured: { dose: 1, frequency: 4, unit: "tablet" },
    freetext: "Take 1 tablet by mouth four times daily",
    daysSupply: 30,
  },

  // Cardiovascular
  {
    id: "cardio-statin-qhs",
    label: "Take 1 tablet at bedtime",
    category: "Cardiovascular",
    structured: { dose: 1, frequency: 1, unit: "tablet" },
    freetext: "Take 1 tablet by mouth at bedtime",
    daysSupply: 30,
  },
  {
    id: "cardio-aspirin-qd",
    label: "Take 1 tablet once daily",
    category: "Cardiovascular",
    structured: { dose: 1, frequency: 1, unit: "tablet" },
    freetext: "Take 1 tablet by mouth once daily",
    daysSupply: 90,
  },

  // Liquid Medications
  {
    id: "liquid-bid-5ml",
    label: "Take 5 mL twice daily",
    category: "Liquid",
    structured: { dose: 5, frequency: 2, unit: "mL" },
    freetext: "Take 5 mL by mouth twice daily",
    daysSupply: 30,
  },
  {
    id: "liquid-tid-10ml",
    label: "Take 10 mL three times daily",
    category: "Liquid",
    structured: { dose: 10, frequency: 3, unit: "mL" },
    freetext: "Take 10 mL by mouth three times daily",
    daysSupply: 10,
  },

  // Inhaler
  {
    id: "inhaler-bid-2puff",
    label: "Inhale 2 puffs twice daily",
    category: "Inhaler",
    structured: { dose: 2, frequency: 2, unit: "puff" },
    freetext: "Inhale 2 puffs by mouth twice daily",
    daysSupply: 30,
  },
  {
    id: "inhaler-prn",
    label: "Inhale 1-2 puffs as needed",
    category: "Inhaler",
    structured: { dose: 1, frequency: 4, unit: "puff" },
    freetext: "Inhale 1-2 puffs by mouth every 4-6 hours as needed",
    daysSupply: 30,
  },

  // Topical
  {
    id: "topical-bid",
    label: "Apply to affected area twice daily",
    category: "Topical",
    structured: { dose: 1, frequency: 2, unit: "application" },
    freetext: "Apply to affected area twice daily",
    daysSupply: 30,
  },
  {
    id: "topical-tid",
    label: "Apply to affected area three times daily",
    category: "Topical",
    structured: { dose: 1, frequency: 3, unit: "application" },
    freetext: "Apply to affected area three times daily",
    daysSupply: 30,
  },

  // Eye/Ear Drops
  {
    id: "drops-qid",
    label: "Instill 1-2 drops four times daily",
    category: "Drops",
    structured: { dose: 1, frequency: 4, unit: "drop" },
    freetext: "Instill 1-2 drops in affected eye/ear four times daily",
    daysSupply: 14,
  },
  {
    id: "drops-bid",
    label: "Instill 1 drop twice daily",
    category: "Drops",
    structured: { dose: 1, frequency: 2, unit: "drop" },
    freetext: "Instill 1 drop in affected eye/ear twice daily",
    daysSupply: 30,
  },
];

/**
 * Frequency options for structured form
 */
const FREQUENCY_OPTIONS = [
  { value: "1", label: "Once daily (QD)", abbrev: "QD" },
  { value: "2", label: "Twice daily (BID)", abbrev: "BID" },
  { value: "3", label: "Three times daily (TID)", abbrev: "TID" },
  { value: "4", label: "Four times daily (QID)", abbrev: "QID" },
  { value: "6", label: "Every 4 hours (Q4H)", abbrev: "Q4H" },
  { value: "8", label: "Every 3 hours (Q3H)", abbrev: "Q3H" },
];

/**
 * Unit options for structured form
 */
const UNIT_OPTIONS = [
  "tablet",
  "capsule",
  "mL",
  "unit",
  "puff",
  "drop",
  "application",
  "spray",
  "patch",
  "gram",
];

/**
 * Days supply presets
 */
const DAYS_SUPPLY_PRESETS = [7, 10, 14, 30, 60, 90];

/**
 * SIG Entry Step Component
 */
export function SIGEntryStep() {
  const { state, dispatch, registerNextInterceptor, setNavigationState } =
    useWorkflow();
  const { getIdToken } = useAuth();

  // Mode: 'structured' or 'freetext'
  const [mode, setMode] = useState<"structured" | "freetext">(
    state.sig?.mode || "structured",
  );

  // Structured form fields
  const [dose, setDose] = useState<string>(
    state.sig?.structured?.dose?.toString() || "",
  );
  const [frequency, setFrequency] = useState<string>(
    state.sig?.structured?.frequency?.toString() || "",
  );
  const [unit, setUnit] = useState<string>(
    state.sig?.structured?.unit || "tablet",
  );
  const [daysSupply, setDaysSupply] = useState<string>(
    state.sig?.daysSupply?.toString() || "",
  );

  // Free-text field
  const [freetext, setFreetext] = useState<string>(state.sig?.freetext || "");

  // Template selector
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");

  // Recent SIGs
  const [recentSIGs, setRecentSIGs] = useState<StoredSIG[]>([]);
  const [showRecentSIGs, setShowRecentSIGs] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const selectedPackage = state.selectedPackage?.package;
  const trimmedFreeText = freetext.trim();
  const daysSupplyNumber = parseInt(daysSupply || "", 10);
  const hasValidDaysSupply =
    !Number.isNaN(daysSupplyNumber) && daysSupplyNumber > 0;
  const shouldAttemptParse =
    mode === "freetext" && trimmedFreeText.length >= 5 && hasValidDaysSupply;
  const isSigEntryStep = state.currentStep === WorkflowStep.SIG_ENTRY;
  const parserRequest = useMemo(() => {
    if (!shouldAttemptParse) {
      return null;
    }

    return {
      sigText: trimmedFreeText,
      daysSupply: daysSupplyNumber,
      drugContext: {
        rxcui: state.drugSearch?.rxcui,
        genericName: selectedPackage?.genericName || state.drugSearch?.drugName,
        brandName: selectedPackage?.brandName,
        dosageForm: selectedPackage?.dosageForm || state.drugSearch?.dosageForm,
        strength: selectedPackage?.strength || state.drugSearch?.strength,
        route: selectedPackage?.route?.[0],
      },
    };
  }, [
    shouldAttemptParse,
    trimmedFreeText,
    daysSupplyNumber,
    selectedPackage,
    state.drugSearch,
  ]);

  // Load recent SIGs on mount
  useEffect(() => {
    setRecentSIGs(getRecentSIGs());
  }, []);

  useEffect(() => {
    if (!isSigEntryStep || mode !== "freetext") {
      registerNextInterceptor(null);
      setNavigationState?.({ isLoading: false });
      return;
    }

    const interceptor = async () => {
      if (!parserRequest) {
        setParseError(null);
        return true;
      }

      setParseError(null);
      setIsParsing(true);
      setNavigationState?.({ isLoading: true });

      try {
        const idToken = await getIdToken();
        const response = await parseFreeTextSig(parserRequest, idToken);

        if (response.success && response.data?.parsed) {
          dispatch({
            type: "SET_SIG",
            payload: {
              mode: "freetext",
              freetext: trimmedFreeText,
              daysSupply: daysSupplyNumber,
              parsed: response.data.parsed,
              parsingWarnings: response.data.warnings || [],
            },
          });
        } else {
          setParseError(
            response.error?.message ||
              "Unable to parse directions. Please enter the quantity manually.",
          );
        }
      } catch (error) {
        const message =
          error instanceof APIError
            ? error.message
            : "Unable to parse directions. Please enter the quantity manually.";
        setParseError(message);
      } finally {
        setIsParsing(false);
        setNavigationState?.({ isLoading: false });
      }

      return true;
    };

    registerNextInterceptor(() => interceptor());

    return () => {
      registerNextInterceptor(null);
      setNavigationState?.({ isLoading: false });
    };
  }, [
    registerNextInterceptor,
    setNavigationState,
    parserRequest,
    isSigEntryStep,
    mode,
    getIdToken,
    dispatch,
    trimmedFreeText,
    daysSupplyNumber,
  ]);

  useEffect(() => {
    if (mode === "freetext") {
      setParseError(null);
    }
  }, [trimmedFreeText, daysSupplyNumber, mode]);

  /**
   * Validate structured form
   */
  const validateStructured = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!dose || parseFloat(dose) <= 0) {
      newErrors.dose = "Dose must be greater than 0";
    }

    if (!frequency || parseInt(frequency) <= 0) {
      newErrors.frequency = "Frequency is required";
    }

    if (!unit) {
      newErrors.unit = "Unit is required";
    }

    if (!hasValidDaysSupply) {
      newErrors.daysSupply = "Days supply must be greater than 0";
    }

    // Unit compatibility check with package dosage form
    if (selectedPackage?.dosageForm && unit) {
      const dosageForm = selectedPackage.dosageForm.toLowerCase();

      if (
        dosageForm.includes("liquid") ||
        dosageForm.includes("solution") ||
        dosageForm.includes("syrup")
      ) {
        if (unit !== "mL") {
          newErrors.unit = `Expected 'mL' for liquid dosage form, got '${unit}'`;
        }
      } else if (
        dosageForm.includes("inhaler") ||
        dosageForm.includes("aerosol")
      ) {
        if (unit !== "puff" && unit !== "spray") {
          newErrors.unit = `Expected 'puff' or 'spray' for inhaler, got '${unit}'`;
        }
      } else if (dosageForm.includes("tablet") && unit !== "tablet") {
        // Soft warning, not error
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [dose, frequency, unit, hasValidDaysSupply, selectedPackage]);

  /**
   * Validate free-text form
   */
  const validateFreetext = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!trimmedFreeText || trimmedFreeText.length < 5) {
      newErrors.freetext = "SIG must be at least 5 characters";
    }

    if (!hasValidDaysSupply) {
      newErrors.daysSupply = "Days supply is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [trimmedFreeText, hasValidDaysSupply]);

  /**
   * Validate form based on mode
   */
  const validate = useCallback(() => {
    return mode === "structured" ? validateStructured() : validateFreetext();
  }, [mode, validateStructured, validateFreetext]);

  /**
   * Save SIG to workflow state
   */
  const saveSIG = useCallback(() => {
    if (!validate()) return;

    const sigData: SIGData = {
      mode,
      daysSupply: hasValidDaysSupply ? daysSupplyNumber : 0,
      ...(mode === "structured" && {
        structured: {
          dose: parseFloat(dose),
          frequency: parseInt(frequency),
          unit,
        },
      }),
      ...(mode === "freetext" && {
        freetext: trimmedFreeText,
      }),
    };

    if (
      mode === "freetext" &&
      state.sig?.mode === "freetext" &&
      state.sig.freetext === trimmedFreeText
    ) {
      if (state.sig.parsed) {
        sigData.parsed = state.sig.parsed;
      }
      if (state.sig.parsingWarnings) {
        sigData.parsingWarnings = state.sig.parsingWarnings;
      }
    }

    dispatch({ type: "SET_SIG", payload: sigData });

    // Save to recent SIGs
    const drugName = selectedPackage?.brandName || selectedPackage?.genericName;
    saveRecentSIG(sigData, drugName);

    // Refresh recent SIGs list
    setRecentSIGs(getRecentSIGs());
  }, [
    mode,
    dose,
    frequency,
    unit,
    trimmedFreeText,
    hasValidDaysSupply,
    daysSupplyNumber,
    validate,
    dispatch,
    selectedPackage,
    state.sig,
  ]);

  /**
   * Apply template
   */
  const applyTemplate = useCallback(
    (template: SIGTemplate) => {
      if (mode === "structured") {
        setDose(template.structured.dose.toString());
        setFrequency(template.structured.frequency.toString());
        setUnit(template.structured.unit);
      } else {
        setFreetext(template.freetext);
      }
      setDaysSupply(template.daysSupply.toString());
      setTemplateOpen(false);
    },
    [mode],
  );

  /**
   * Apply recent SIG
   */
  const applyRecentSIG = useCallback((sig: StoredSIG) => {
    setMode(sig.mode);

    if (sig.mode === "structured" && sig.structured) {
      setDose(sig.structured.dose.toString());
      setFrequency(sig.structured.frequency.toString());
      setUnit(sig.structured.unit);
    } else if (sig.freetext) {
      setFreetext(sig.freetext);
    }

    setDaysSupply(sig.daysSupply.toString());
    setShowRecentSIGs(false);
  }, []);

  /**
   * Delete a recent SIG
   */
  const handleDeleteRecentSIG = useCallback((id: string) => {
    deleteRecentSIG(id);
    setRecentSIGs(getRecentSIGs());
  }, []);

  /**
   * Auto-save when form is valid
   */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (validate()) {
        saveSIG();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [dose, frequency, unit, daysSupply, freetext, mode, validate, saveSIG]);

  /**
   * Generate SIG preview text
   */
  const sigPreview = useMemo(() => {
    if (mode === "structured") {
      if (!dose || !frequency || !unit || !daysSupply) return null;

      const frequencyLabel =
        FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ||
        `${frequency} times daily`;
      return `Take ${dose} ${unit}${
        parseFloat(dose) > 1 ? "s" : ""
      } ${frequencyLabel.toLowerCase()} for ${daysSupply} days`;
    } else {
      return freetext.trim() || null;
    }
  }, [mode, dose, frequency, unit, daysSupply, freetext]);

  /**
   * Calculated total quantity (estimate)
   */
  const calculatedQuantity = useMemo(() => {
    if (mode === "structured" && dose && frequency && daysSupply) {
      return parseFloat(dose) * parseInt(frequency) * parseInt(daysSupply);
    }
    return null;
  }, [mode, dose, frequency, daysSupply]);

  /**
   * Filter templates by search
   */
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return SIG_TEMPLATES;

    const search = templateSearch.toLowerCase();
    return SIG_TEMPLATES.filter(
      (t) =>
        t.label.toLowerCase().includes(search) ||
        t.category.toLowerCase().includes(search),
    );
  }, [templateSearch]);

  /**
   * Group templates by category
   */
  const templatesByCategory = useMemo(() => {
    const categories: Record<string, SIGTemplate[]> = {};

    filteredTemplates.forEach((template) => {
      if (!categories[template.category]) {
        categories[template.category] = [];
      }
      categories[template.category].push(template);
    });

    return categories;
  }, [filteredTemplates]);

  // If no package selected, show warning
  if (!selectedPackage) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Enter Prescription Directions
          </h2>
          <p className="text-gray-600 mt-1">
            Provide the SIG (Signatura) for this prescription
          </p>
        </div>

        <Card className="border-2 border-amber-300 bg-amber-50">
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <p className="text-amber-900 font-medium mb-2">
              Package Not Selected
            </p>
            <p className="text-sm text-amber-800">
              Please go back and select a package before entering SIG
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => dispatch({ type: "GO_TO_STEP", payload: 3 })}
            >
              Go to Package Selection
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Enter Prescription Directions
        </h2>
        <p className="text-gray-600 mt-1">
          Provide the SIG (Signatura) for this prescription
        </p>
      </div>

      {/* Selected Package Context */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                Selected Package
              </p>
              <div className="text-sm text-blue-800">
                <span className="font-medium">
                  {selectedPackage.brandName || selectedPackage.genericName}
                </span>
                {" • "}
                <span className="font-mono">{selectedPackage.ndc}</span>
                {" • "}
                <span>{selectedPackage.dosageForm}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Mode Toggle & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Mode Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <Button
            variant={mode === "structured" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("structured")}
            className="gap-2"
          >
            <ToggleLeft className="w-4 h-4" />
            Structured
          </Button>
          <Button
            variant={mode === "freetext" ? "default" : "ghost"}
            size="sm"
            onClick={() => setMode("freetext")}
            className="gap-2"
          >
            <ToggleRight className="w-4 h-4" />
            Free-Text
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Recent SIGs */}
          {recentSIGs.length > 0 && (
            <Popover open={showRecentSIGs} onOpenChange={setShowRecentSIGs}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <History className="w-4 h-4" />
                  Recent SIGs
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0">
                    {recentSIGs.length}
                  </Badge>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="end">
                <div className="p-3 border-b">
                  <h4 className="font-semibold text-sm">Recent SIGs</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Click to apply</p>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {recentSIGs.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex items-start gap-2 p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer group"
                      onClick={() => applyRecentSIG(sig)}
                    >
                      <Copy className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {sig.preview}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {sig.drugName && (
                            <span className="text-xs text-gray-500">
                              {sig.drugName}
                            </span>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {sig.mode === "structured"
                              ? "Structured"
                              : "Free-text"}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {new Date(sig.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecentSIG(sig.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Template Selector */}
          <Popover open={templateOpen} onOpenChange={setTemplateOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Sparkles className="w-4 h-4" />
                Templates
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="end">
              <Command>
                <CommandInput
                  placeholder="Search templates..."
                  value={templateSearch}
                  onValueChange={setTemplateSearch}
                />
                <CommandList className="max-h-[300px]">
                  <CommandEmpty>No templates found</CommandEmpty>
                  {Object.entries(templatesByCategory).map(
                    ([category, templates]) => (
                      <CommandGroup key={category} heading={category}>
                        {templates.map((template) => (
                          <CommandItem
                            key={template.id}
                            onSelect={() => applyTemplate(template)}
                            className="cursor-pointer"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {template.label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {template.daysSupply} days supply
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ),
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Structured Form */}
      {mode === "structured" && (
        <Card>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dose */}
              <div className="space-y-2">
                <Label htmlFor="dose" className="flex items-center gap-2">
                  <Pill className="w-4 h-4 text-gray-500" />
                  Dose <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dose"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="e.g., 1"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  className={errors.dose ? "border-red-500" : ""}
                />
                {errors.dose && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.dose}
                  </p>
                )}
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label htmlFor="unit" className="flex items-center gap-2">
                  Unit <span className="text-red-500">*</span>
                </Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger
                    id="unit"
                    className={errors.unit ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.unit}
                  </p>
                )}
              </div>

              {/* Frequency */}
              <div className="space-y-2">
                <Label htmlFor="frequency" className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  Frequency <span className="text-red-500">*</span>
                </Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger
                    id="frequency"
                    className={errors.frequency ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.frequency && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.frequency}
                  </p>
                )}
              </div>

              {/* Days Supply */}
              <div className="space-y-2">
                <Label htmlFor="daysSupply" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Days Supply <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="daysSupply"
                    type="number"
                    min="1"
                    placeholder="e.g., 30"
                    value={daysSupply}
                    onChange={(e) => setDaysSupply(e.target.value)}
                    className={`flex-1 ${
                      errors.daysSupply ? "border-red-500" : ""
                    }`}
                  />
                  <Select value={daysSupply} onValueChange={setDaysSupply}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_SUPPLY_PRESETS.map((days) => (
                        <SelectItem key={days} value={days.toString()}>
                          {days} days
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {errors.daysSupply && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.daysSupply}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Free-Text Form */}
      {mode === "freetext" && (
        <Card>
          <div className="p-6 space-y-6">
            {/* AI Parsing Info Banner */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-purple-900">
                  <p className="font-semibold mb-1">AI-Assisted Parsing</p>
                  <p className="text-purple-800">
                    Your prescription directions will be automatically parsed
                    using AI when you proceed to the next step. The system will
                    extract dose, frequency, and unit for quantity calculations.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="freetext" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Prescription Directions <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="freetext"
                rows={4}
                placeholder="e.g., Take 1 tablet by mouth twice daily with food for 30 days"
                value={freetext}
                onChange={(e) => setFreetext(e.target.value)}
                className={errors.freetext ? "border-red-500" : ""}
              />
              {errors.freetext && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.freetext}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Enter the complete prescription directions as they should appear
                on the label
              </p>

              {isParsing && (
                <div className="flex items-center gap-2 text-xs text-purple-700 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing directions…
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2 text-xs text-red-600 mt-2">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {!isParsing &&
                !parseError &&
                state.sig?.mode === "freetext" &&
                state.sig.parsed &&
                state.sig.freetext === trimmedFreeText && (
                  <div className="flex items-center gap-2 text-xs text-green-700 mt-2">
                    <CheckCircle2 className="w-3 h-3" />
                    Successfully parsed. Quantity will be calculated
                    automatically.
                  </div>
                )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="daysSupplyFT" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Days Supply <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="daysSupplyFT"
                  type="number"
                  min="1"
                  placeholder="e.g., 30"
                  value={daysSupply}
                  onChange={(e) => setDaysSupply(e.target.value)}
                  className={`flex-1 ${
                    errors.daysSupply ? "border-red-500" : ""
                  }`}
                />
                <Select value={daysSupply} onValueChange={setDaysSupply}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_SUPPLY_PRESETS.map((days) => (
                      <SelectItem key={days} value={days.toString()}>
                        {days} days
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {errors.daysSupply && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.daysSupply}
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* SIG Preview & Validation Status */}
      {sigPreview && (
        <Card
          className={`border-2 ${
            Object.keys(errors).length === 0
              ? "border-green-500 bg-green-50"
              : "border-gray-300 bg-gray-50"
          }`}
        >
          <div className="p-4">
            <div className="flex items-start gap-3">
              {Object.keys(errors).length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  SIG Preview
                </p>
                <p className="text-sm text-gray-800 italic">"{sigPreview}"</p>

                {mode === "structured" && calculatedQuantity && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      Estimated Total Quantity:{" "}
                      <span className="font-semibold text-gray-900">
                        {calculatedQuantity} {unit}
                        {calculatedQuantity > 1 ? "s" : ""}
                      </span>
                    </p>
                  </div>
                )}

                {Object.keys(errors).length === 0 && (
                  <Badge
                    variant="outline"
                    className="mt-2 bg-green-100 text-green-800 border-green-300"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Valid SIG
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900 space-y-2">
            <p className="font-semibold">SIG Entry Tips</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>
                <strong>Structured Mode:</strong> Use for precise quantity
                calculations
              </li>
              <li>
                <strong>Free-Text Mode:</strong> Type naturally - AI will parse
                dose, frequency, and unit
              </li>
              <li>
                <strong>Templates:</strong> Quick-fill common prescription
                patterns
              </li>
              <li>Your SIG will be validated and auto-saved as you type</li>
              {mode === "freetext" && (
                <li className="text-purple-700">
                  <strong>Next Step:</strong> System will automatically parse
                  your text and calculate quantity
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
