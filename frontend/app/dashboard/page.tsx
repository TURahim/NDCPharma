"use client"

/**
 * Dashboard Page
 * Main calculator interface
 */

import { Calculator } from '@/components/calculator/calculator';

export default function DashboardPage() {
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">NDC Calculator</h1>
          <p className="text-gray-600">
            Calculate optimal NDC packages for prescription fulfillment
          </p>
        </div>

        <Calculator />
      </div>
    </div>
  );
}

