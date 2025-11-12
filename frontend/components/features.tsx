"use client"

import { CheckCircle2, AlertCircle, Zap } from "lucide-react"

export function Features() {
  const features = [
    {
      icon: CheckCircle2,
      title: "Accurate NDC Matching",
      description: "AI-powered normalization using RxNorm API for precise drug matching across all manufacturer NDCs.",
      color: "text-emerald-600",
    },
    {
      icon: AlertCircle,
      title: "Inactive NDC Detection",
      description: "Automatically highlight inactive or mismatched NDCs to prevent claim rejections and errors.",
      color: "text-orange-600",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Get results in under 2 seconds. Handle concurrent users without performance degradation.",
      color: "text-blue-600",
    },
  ]

  return (
    <section id="features" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-balance">
            Powerful Features for Pharmacies
          </h2>
          <p className="text-lg text-gray-600 text-pretty">
            Everything you need to streamline prescription fulfillment and reduce errors
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 border border-gray-200 hover:border-blue-300 hover:shadow-lg transition"
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-white border-2 flex items-center justify-center mb-4 ${feature.color}`}
                >
                  <Icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
