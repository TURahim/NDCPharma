import Link from "next/link"

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                <span className="text-white font-bold text-lg">Φ</span>
              </div>
              <span className="font-bold text-lg text-gray-900">PharmaDirect</span>
            </Link>
            <nav className="hidden md:flex gap-8">
              <Link href="/" className="text-gray-600 hover:text-blue-600 transition">
                Home
              </Link>
              <Link href="/about" className="text-blue-600 font-medium">
                About
              </Link>
            </nav>
            <Link href="/auth/signin" className="hidden md:block text-blue-600 hover:text-blue-700 font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* About Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6">About PharmaDirect</h1>
            <p className="text-lg text-gray-600 mb-4">
              PharmaDirect is transforming pharmacy operations through intelligent automation and precision. We're
              dedicated to helping pharmacies reduce claim rejections, improve accuracy, and enhance patient
              satisfaction.
            </p>
            <p className="text-lg text-gray-600">
              Our NDC Packaging & Quantity Calculator leverages cutting-edge APIs to ensure every prescription is filled
              with the right medication, right dose, and right quantity.
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl p-12 h-96 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center mx-auto mb-6">
                <span className="text-white font-bold text-4xl">Φ</span>
              </div>
              <p className="text-gray-600">Precision Pharmacy Solutions</p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Our Mission & Vision</h2>
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-blue-50 rounded-xl p-8 border border-blue-100">
              <h3 className="text-2xl font-bold text-blue-600 mb-4">Mission</h3>
              <p className="text-gray-700 leading-relaxed">
                To empower pharmacies with intelligent tools that eliminate medication dispensing errors, streamline
                operations, and ultimately improve patient health outcomes. We believe precision in pharmacy is not just
                a goal—it's a responsibility.
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-8 border border-blue-100">
              <h3 className="text-2xl font-bold text-blue-600 mb-4">Vision</h3>
              <p className="text-gray-700 leading-relaxed">
                A future where every pharmacy, regardless of size, has access to enterprise-grade automation technology.
                We envision a healthcare system where prescription errors are virtually eliminated and pharmacists can
                focus on patient care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team/Values */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Our Values</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Accuracy</h3>
            <p className="text-gray-600">
              Precision in every prescription, every time. We're committed to eliminating errors.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Innovation</h3>
            <p className="text-gray-600">
              Continuously advancing technology to solve pharmacy's most pressing challenges.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">❤️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Patient Care</h3>
            <p className="text-gray-600">Everything we build is centered on improving patient health and safety.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center">
                  <span className="text-white font-bold">Φ</span>
                </div>
                <span className="font-bold">PharmaDirect</span>
              </div>
              <p className="text-gray-400 text-sm">Precision pharmacy solutions powered by intelligent automation.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/" className="hover:text-white transition">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/about" className="hover:text-white transition">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex justify-between items-center text-sm text-gray-400">
            <p>&copy; 2025 PharmaDirect. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white transition">
                Twitter
              </Link>
              <Link href="#" className="hover:text-white transition">
                LinkedIn
              </Link>
              <Link href="#" className="hover:text-white transition">
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
