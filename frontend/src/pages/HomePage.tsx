import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import SplineScene from '../components/common/SplineScene'; // Import SplineScene
import { Spotlight } from '../components/common/Spotlight'; // Import Spotlight

// Placeholder Icons (Ideally, import from @heroicons/react or similar)
const DocumentTextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
const MagnifyingGlassIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75M18.25 12L17 10.25m1.25 1.75L19.5 13.75M18.25 12L19.5 10.25M12 18.75L10.75 17M12 18.75L13.25 17M12 5.25L10.75 7M12 5.25L13.25 7" /></svg>;
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 ml-2 transition-transform duration-300 group-hover:translate-x-1"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;


const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Trigger fade-in animation for sections
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const sectionBaseClass = "py-16 lg:py-24 transition-all duration-1000 ease-out transform";
  const sectionVisibleClass = "translate-y-0 opacity-100";
  const sectionHiddenClass = "translate-y-10 opacity-0";

  return (
    <div className="flex flex-col min-h-screen bg-theme-bg text-theme-text-primary">
      {/* Hero Section */}
      <section className={`relative min-h-screen flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 overflow-hidden ${sectionBaseClass} ${isVisible ? sectionVisibleClass : sectionHiddenClass}`}>
        <Spotlight
          className="absolute -top-1/2 left-1/2 transform -translate-x-1/2 md:-top-1/3" // Adjusted positioning
          fill="rgba(100, 255, 218, 0.1)" // theme-accent-cyan (#64FFDA) with low opacity
          size={1000} // Larger spotlight for a broader effect
          opacity={0.1} // Subtle opacity
          blurAmount="blur-3xl" // Generous blur
        />
        
        {/* Spline Scene as a dynamic background */}
        <div className="absolute inset-0 z-[-1]"> {/* Ensure Spline is behind text but above solid bg */}
          <SplineScene
            sceneUrl="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode" // Placeholder - replace with your themed scene
            className="w-full h-full opacity-20 md:opacity-30" // Keep it subtle
          />
          {/* Optional: A very subtle gradient overlay on top of Spline for text legibility */}
          <div className="absolute inset-0 bg-gradient-to-b from-theme-bg/30 via-transparent to-theme-bg/70"></div>
        </div>

        <div className="relative z-10 max-w-4xl"> {/* Ensure text content is above Spline/Spotlight */}
          {/* Optional: Integrate your FloatingLogo.tsx here if it fits the new theme */}
          {/* <div className="mb-8"> <FloatingLogo /> </div> */}
          <h1 className="font-display text-5xl font-extrabold sm:text-6xl md:text-7xl text-theme-text-primary">
            <span className="block">IntelliApply</span>
            <span className="block text-theme-accent-cyan mt-2 sm:mt-4">Apply Smarter, Not Harder.</span>
          </h1>
          <p className="mt-6 max-w-md mx-auto text-lg text-theme-text-secondary sm:text-xl md:mt-8 md:max-w-3xl">
            Stop wasting time manually searching job boards. Let our AI co-pilot find the most relevant job postings based on your resume and preferences.
          </p>
          <div className="mt-8 max-w-md mx-auto sm:flex sm:justify-center md:mt-10 space-y-4 sm:space-y-0 sm:space-x-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="group w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker transition-colors duration-300 shadow-lg hover:shadow-xl md:py-4 md:text-lg md:px-10"
              >
                Go to Dashboard <ArrowRightIcon />
              </Link>
            ) : (
              <>
                <Link
                  to="/register"
                  className="group w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-transparent text-base font-semibold rounded-lg text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker transition-colors duration-300 shadow-lg hover:shadow-xl md:py-4 md:text-lg md:px-10"
                >
                  Get Started <ArrowRightIcon />
                </Link>
                <Link
                  to="/login"
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-3 border border-theme-accent-cyan text-base font-semibold rounded-lg text-theme-accent-cyan bg-transparent hover:bg-theme-accent-cyan/10 transition-colors duration-300 md:py-4 md:text-lg md:px-10"
                >
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className={`bg-theme-surface ${sectionBaseClass} ${isVisible ? sectionVisibleClass : sectionHiddenClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-theme-accent-cyan font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 font-display text-3xl leading-8 font-extrabold tracking-tight text-theme-text-primary sm:text-4xl">
              A Better Way to Find Your Next Job
            </p>
            <p className="mt-4 max-w-2xl text-xl text-theme-text-secondary lg:mx-auto">
              IntelliApply streamlines your job search process with powerful AI-driven tools.
            </p>
          </div>

          <div className="mt-16">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {[
                { title: "Smart Resume Parsing", description: "Upload your resume once, and our AI will extract your skills, experience, and preferences automatically.", Icon: DocumentTextIcon },
                { title: "Automated Job Scraping", description: "Our system continuously scans job boards to find positions that match your profile and preferences.", Icon: MagnifyingGlassIcon },
                { title: "AI-Powered Matching", description: "Advanced machine learning algorithms calculate relevance scores to find the best job matches for you.", Icon: SparklesIcon },
              ].map((feature) => (
                <div key={feature.title} className="relative group bg-theme-bg p-6 rounded-lg shadow-xl hover:shadow-theme-accent-cyan/20 transition-shadow duration-300 transform hover:-translate-y-1">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 md:left-6 md:-translate-x-0 flex items-center justify-center h-12 w-12 rounded-lg bg-theme-accent-cyan text-theme-bg shadow-lg">
                    <feature.Icon />
                  </div>
                  <div className="mt-8 md:mt-0 md:ml-0 text-center md:text-left"> {/* Adjusted for icon position */}
                     <h3 className="text-xl leading-6 font-display font-semibold text-theme-text-primary group-hover:text-theme-accent-cyan transition-colors duration-300">{feature.title}</h3>
                    <p className="mt-2 text-base text-theme-text-secondary">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section className={`bg-theme-bg ${sectionBaseClass} ${isVisible ? sectionVisibleClass : sectionHiddenClass}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className="text-base text-theme-accent-cyan font-semibold tracking-wide uppercase">How It Works</h2>
            <p className="mt-2 font-display text-3xl leading-8 font-extrabold tracking-tight text-theme-text-primary sm:text-4xl">
              Three Simple Steps to Your Next Job
            </p>
          </div>
          
          <div className="mt-16">
            <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              {[
                { step: "1", title: "Create Your Profile", description: "Sign up and upload your resume to automatically generate your profile." },
                { step: "2", title: "Set Your Preferences", description: "Specify your desired roles, locations, and salary expectations." },
                { step: "3", title: "Discover Matching Jobs", description: "Review your personalized job matches and apply to the ones you like." },
              ].map((item) => (
                <div key={item.step} className="relative flex flex-col items-center p-8 rounded-xl bg-theme-surface shadow-xl hover:shadow-theme-accent-cyan/20 transition-all duration-300 transform hover:-translate-y-1">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-theme-accent-cyan text-theme-bg text-2xl font-bold shadow-lg">
                    {item.step}
                  </div>
                  <h3 className="mt-6 text-xl leading-6 font-display font-semibold text-theme-text-primary">{item.title}</h3>
                  <p className="mt-4 text-base text-theme-text-secondary text-center">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className={`bg-theme-surface ${sectionBaseClass} ${isVisible ? sectionVisibleClass : sectionHiddenClass}`}>
        <div className="max-w-3xl mx-auto text-center py-12 px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-extrabold text-theme-text-primary sm:text-4xl">
            <span className="block">Ready to Streamline Your Job Search?</span>
          </h2>
          <p className="mt-4 text-lg leading-6 text-theme-text-secondary">
            Join thousands of job seekers who have already found their perfect match with IntelliApply.
          </p>
          <Link
            to="/register"
            className="group mt-8 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-semibold rounded-lg text-theme-bg bg-theme-accent-cyan hover:bg-theme-accent-cyan-darker sm:w-auto transition-colors duration-300 shadow-lg hover:shadow-xl"
          >
            Get Started for Free
            <ArrowRightIcon />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
