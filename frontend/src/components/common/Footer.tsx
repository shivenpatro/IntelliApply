

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} IntelliApply. Apply smarter, not harder.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
