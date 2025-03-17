const AboutPage = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <section className="py-12 sm:py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            About <span className="text-blue-600">TruckSpotter</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your comprehensive solution for efficient trip planning and HOS compliance.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-8 sm:py-12">
        {/* Mission Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">Our Mission</h2>
            </div>
            <p className="text-gray-600 mb-4">
              TruckSpotter is designed to help truck drivers plan their trips efficiently while staying compliant with Hours of Service (HOS) regulations. Our goal is to make trip planning easier and safer for professional drivers.
            </p>
            <p className="text-gray-600">
              We provide tools to calculate optimal routes, required rest periods, and generate Electronic Logging Device (ELD) logs that comply with current regulations.
            </p>
          </div>
        </div>

        {/* How It Works Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">How It Works</h2>
            </div>
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Enter Trip Details</h3>
                  <p className="text-gray-600">
                    Provide your current location, pickup and dropoff points, and your current cycle hours used.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Get Optimized Routes</h3>
                  <p className="text-gray-600">
                    Our system calculates the most efficient route while factoring in required rest periods, fueling stops, and HOS regulations.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Generate ELD Logs</h3>
                  <p className="text-gray-600">
                    Based on your planned route, we automatically generate compliant ELD logs that you can print or save for your records.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* HOS Regulations Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">HOS Regulations We Follow</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600">Property-carrying drivers are limited to 11 hours of driving after 10 consecutive hours off duty</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600">Drivers may not drive beyond the 14th consecutive hour after coming on duty</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600">Drivers may not drive after 60/70 hours on duty in 7/8 consecutive days</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-purple-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-600">Drivers must take a 30-minute break when they have driven for a period of 8 cumulative hours without at least a 30-minute interruption</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage; 