import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 py-20 text-white">
        <div 
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}
        >
          <h1 className="text-4xl font-extrabold sm:text-5xl md:text-6xl">
            <span className="block">IntelliApply</span>
            <span className="block text-blue-200">Apply smarter, not harder.</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-blue-100 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Stop wasting time manually searching job boards. Let our AI co-pilot find the most relevant job postings based on your resume and preferences.
          </p>
          <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
            {isAuthenticated ? (
              <div className="rounded-md shadow">
                <Link
                  to="/dashboard"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-gray-100 transition-colors duration-300 md:py-4 md:text-lg md:px-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-md shadow">
                  <Link
                    to="/register"
                    className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-gray-100 transition-colors duration-300 md:py-4 md:text-lg md:px-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Get Started
                  </Link>
                </div>
                <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                  <Link
                    to="/login"
                    className="w-full flex items-center justify-center px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-blue-500 transition-colors duration-300 md:py-4 md:text-lg md:px-10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`lg:text-center transition-all duration-1000 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              A better way to find your next job
            </p>
            <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
              IntelliApply streamlines your job search process with powerful AI-driven tools.
            </p>
          </div>

          <div className="mt-16">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative group">
                <div className="absolute flex items-center justify-center h-16 w-16 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform transition-all duration-500 group-hover:scale-110">
                  <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-20">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">Smart Resume Parsing</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Upload your resume once, and our AI will extract your skills, experience, and preferences automatically.
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute flex items-center justify-center h-16 w-16 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform transition-all duration-500 group-hover:scale-110">
                  <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="ml-20">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">Automated Job Scraping</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Our system continuously scans job boards to find positions that match your profile and preferences.
                  </p>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute flex items-center justify-center h-16 w-16 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform transition-all duration-500 group-hover:scale-110">
                  <svg className="h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-20">
                  <h3 className="text-xl leading-6 font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">AI-Powered Matching</h3>
                  <p className="mt-2 text-base text-gray-500">
                    Advanced machine learning algorithms calculate relevance scores to find the best job matches for you.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* How It Works Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">How It Works</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Three simple steps to your next job
            </p>
          </div>
          
          <div className="mt-16">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className="relative flex flex-col items-center p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="mt-6 text-xl leading-6 font-bold text-gray-900">Create your profile</h3>
                <p className="mt-4 text-base text-gray-500 text-center">
                  Sign up and upload your resume to automatically generate your profile.
                </p>
              </div>
              
              <div className="relative flex flex-col items-center p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="mt-6 text-xl leading-6 font-bold text-gray-900">Set your preferences</h3>
                <p className="mt-4 text-base text-gray-500 text-center">
                  Specify your desired roles, locations, and salary expectations.
                </p>
              </div>
              
              <div className="relative flex flex-col items-center p-8 rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                  <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="mt-6 text-xl leading-6 font-bold text-gray-900">Discover matching jobs</h3>
                <p className="mt-4 text-base text-gray-500 text-center">
                  Review your personalized job matches and apply to the ones you like.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            <span className="block">Ready to streamline your job search?</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-blue-100">
            Join thousands of job seekers who have already found their perfect match with IntelliApply.
          </p>
          <Link
            to="/register"
            className="mt-8 group w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-gray-100 sm:w-auto transition-all duration-300"
          >
            Get Started for Free
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
