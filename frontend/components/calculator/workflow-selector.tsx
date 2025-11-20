"use client"

/**
 * Workflow Selector Component
 * Allows users to choose between guided workflow and quick calculator
 */

import React, { useState } from 'react';
import { Workflow, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PharmacistWorkflow } from './pharmacist-workflow';
import { Calculator } from './calculator';

type WorkflowMode = 'select' | 'guided' | 'quick';

export function WorkflowSelector() {
  const [mode, setMode] = useState<WorkflowMode>('select');
  
  if (mode === 'guided') {
    return (
      <div>
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => setMode('select')}
            className="mb-4"
          >
            ← Back to Mode Selection
          </Button>
        </div>
        <PharmacistWorkflow />
      </div>
    );
  }
  
  if (mode === 'quick') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setMode('select')}
          className="mb-4"
        >
          ← Back to Mode Selection
        </Button>
        <Calculator />
      </div>
    );
  }
  
  // Mode selection screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              NDC Calculator
            </h1>
            <p className="text-lg text-gray-600">
              Choose your preferred workflow
            </p>
          </div>
          
          {/* Mode selection cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Guided Workflow Card */}
            <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all cursor-pointer group"
                  onClick={() => setMode('guided')}>
              <CardHeader>
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Workflow className="w-7 h-7 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Guided Workflow</CardTitle>
                <CardDescription className="text-base">
                  Step-by-step process for accurate dispensing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <span className="text-sm text-gray-700">Search and browse all available packages</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <span className="text-sm text-gray-700">Select specific NDC package</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <span className="text-sm text-gray-700">Enter prescription directions (SIG)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">4</span>
                    </div>
                    <span className="text-sm text-gray-700">Review and confirm final quantity</span>
                  </li>
                </ul>
                
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">Recommended for:</span> New users, complex prescriptions, or when package selection requires clinical judgment
                  </p>
                </div>
                
                <Button className="w-full bg-blue-600 hover:bg-blue-700 group/button">
                  Start Guided Workflow
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/button:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
            
            {/* Quick Calculator Card */}
            <Card className="border-2 border-gray-200 hover:border-gray-400 transition-all cursor-pointer group"
                  onClick={() => setMode('quick')}>
              <CardHeader>
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-7 h-7 text-gray-600" />
                </div>
                <CardTitle className="text-2xl">Quick Calculator</CardTitle>
                <CardDescription className="text-base">
                  Fast single-step calculation (legacy mode)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-3 h-3 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">Enter all details at once</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-3 h-3 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">System auto-selects package</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Zap className="w-3 h-3 text-gray-600" />
                    </div>
                    <span className="text-sm text-gray-700">Get instant results</span>
                  </li>
                </ul>
                
                <div className="bg-yellow-50 rounded-lg p-3 mb-4 border border-yellow-200">
                  <p className="text-sm text-yellow-900">
                    <span className="font-semibold">Note:</span> Limited package visibility and selection control. Consider using Guided Workflow for better accuracy.
                  </p>
                </div>
                
                <Button variant="outline" className="w-full group/button">
                  Use Quick Calculator
                  <ArrowRight className="w-4 h-4 ml-2 group-hover/button:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Info footer */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              You can switch between modes at any time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

