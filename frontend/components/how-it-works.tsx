"use client"

export function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Input Prescription Data",
      description: "Enter drug name, SIG (frequency), and days' supply information.",
    },
    {
      number: "2",
      title: "AI Normalization",
      description: "System normalizes input to RxCUI using RxNorm API for accuracy.",
    },
    {
      number: "3",
      title: "NDC Retrieval",
      description: "Retrieves all valid NDCs and package sizes from FDA NDC Directory.",
    },
    {
      number: "4",
      title: "Optimal Selection",
      description: "Calculates and selects the best NDC match considering quantity and days' supply.",
    },
  ]

  return (
    <section id="how-it-works" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 text-balance">How It Works</h2>
          <p className="text-lg text-gray-600 text-pretty">Four simple steps to accurate prescription fulfillment</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-1/2 w-full h-1 bg-gradient-to-r from-blue-200 to-transparent -ml-8 -z-10"></div>
              )}

              <div className="bg-white rounded-xl p-6 border border-gray-200 relative">
                {/* Step Number */}
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center mb-4 shadow-md">
                  {step.number}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
