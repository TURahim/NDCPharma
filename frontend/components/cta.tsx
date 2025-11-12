"use client"

export function CTA() {
  return (
    <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-12 md:p-16 text-center shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-balance">
          Ready to Transform Your Pharmacy?
        </h2>
        <p className="text-lg text-blue-50 mb-8 text-pretty">
          Join leading pharmacies improving accuracy and reducing claim rejections
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition font-semibold text-lg">
            Start Free Trial
          </button>
          <button className="border-2 border-white text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition font-semibold text-lg">
            Schedule Demo
          </button>
        </div>
      </div>
    </section>
  )
}
