

const Footer = () => {
  return (
    <footer className="bg-theme-bg text-theme-text-secondary mt-auto">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8"> {/* Increased py-4 to py-6 for a bit more space */}
        <p className="text-center text-sm">
          &copy; {new Date().getFullYear()} IntelliApply. Apply smarter, not harder.
        </p>
        {/* Optional: Add a subtle link or two if needed, styled with theme colors */}
        {/* <div className="mt-2 text-center text-xs">
          <a href="/privacy" className="hover:text-theme-accent-cyan transition-colors">Privacy Policy</a>
          <span className="mx-2">|</span>
          <a href="/terms" className="hover:text-theme-accent-cyan transition-colors">Terms of Service</a>
        </div> */}
      </div>
    </footer>
  );
};

export default Footer;
