const Footer = () => {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-white shadow-inner py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <span className="text-primary font-bold">TruckSpotter</span>
            <span className="text-secondary ml-2">© {currentYear}</span>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-secondary hover:text-primary transition-colors duration-200">
              Terms
            </a>
            <a href="#" className="text-secondary hover:text-primary transition-colors duration-200">
              Privacy
            </a>
            <a href="#" className="text-secondary hover:text-primary transition-colors duration-200">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer 