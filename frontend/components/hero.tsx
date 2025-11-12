"use client"

export function Hero() {
  return (
    <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight text-balance">
            Precision Prescription Fulfillment
          </h1>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed text-pretty">
            AI-powered NDC matching and quantity calculation for pharmacies. Reduce claim rejections, improve accuracy,
            and enhance patient satisfaction.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition font-semibold text-lg">
              Start Calculating
            </button>
            <button className="border-2 border-gray-300 text-gray-900 px-8 py-4 rounded-lg hover:border-blue-600 hover:text-blue-600 transition font-semibold text-lg">
              Learn More
            </button>
          </div>

          {/* Stats */}
          <div className="flex gap-8 mt-12">
            <div>
              <div className="text-3xl font-bold text-blue-600">95%+</div>
              <div className="text-gray-600">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">50%</div>
              <div className="text-gray-600">Less Rejections</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">&lt;2s</div>
              <div className="text-gray-600">Per Query</div>
            </div>
          </div>
        </div>

        {/* Right Visual - Pharmacy Dashboard */}
        <div className="relative">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>

              <div className="space-y-3">
                <div className="text-sm font-semibold text-gray-700 mb-3">NDC Calculator</div>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Enter drug name or NDC"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 bg-gray-50"
                  />
                  <input
                    type="text"
                    placeholder="SIG (e.g., 1 tablet daily)"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 bg-gray-50"
                  />
                  <input
                    type="number"
                    placeholder="Days supply"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 bg-gray-50"
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 mt-6 border border-blue-200">
                <div className="text-xs font-semibold text-blue-900 mb-2">OPTIMAL MATCH</div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">NDC: 00069-0320-30</span>
                    <span className="text-green-600 font-semibold">✓ Valid</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">Qty: 30 tablets</span>
                    <span className="text-blue-600 font-semibold">Perfect match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Badge */}
          <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg p-4 border border-gray-200 max-w-xs">
            <div className="text-xs font-semibold text-blue-600 mb-1">POWERED BY AI</div>
            <p className="text-sm text-gray-700">Integrates RxNorm & FDA NDC Directory APIs</p>
          </div>
        </div>
      </div>
    </section>
  )
}
