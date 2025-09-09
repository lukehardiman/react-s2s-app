export const Header = () => {
  return (
    <header className="bg-black text-white py-8 px-4 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center md:items-center gap-4 md:gap-8">
          {/* Science to Sport Logo */}
          <div className="flex-shrink-0">
            <img 
              src="https://www.sciencetosport.com/wp-content/uploads/2021/11/cropped-Science-to-Sport-logo.png" 
              alt="Science to Sport Logo"
              className="h-20 md:h-32 w-auto"
              onError={(e) => {
                // Fallback if logo fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling!.style.display = 'block';
              }}
            />
            {/* Fallback text logo */}
            <div className="hidden">
              <h1 className="text-2xl md:text-3xl font-bold text-white">Science to Sport</h1>
            </div>
          </div>
          
          {/* Title and Description */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold">FTP Test Analyzer</h1>
            <p className="mt-2 text-gray-300 text-lg">Power analysis and FTP estimate</p>
          </div>
        </div>
      </div>
    </header>
  );
};