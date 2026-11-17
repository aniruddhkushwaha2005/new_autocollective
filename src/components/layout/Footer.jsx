import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="text-lg font-display font-bold text-white tracking-tight">
              AutoCollective
            </Link>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-xs">
              Buy Together. Save Together. Helping Indian car buyers team up and compare clear dealership offers.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/cars" className="hover:text-white transition-colors">Explore Cars</Link></li>
              <li><Link to="/groups" className="hover:text-white transition-colors">Group Deals</Link></li>
              <li><Link to="/how-it-works" className="hover:text-white transition-colors">How It Works</Link></li>
              <li><Link to="/ai-tools" className="hover:text-white transition-colors">AI Smart Tools</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">AI Smart Tools</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/ai-tools/price" className="hover:text-white transition-colors">What Should This Car Cost?</Link></li>
              <li><Link to="/ai-tools/demand" className="hover:text-white transition-colors">Which Cars Are Popular?</Link></li>
              <li><Link to="/ai-tools/offers" className="hover:text-white transition-colors">Are You Getting the Best Deal?</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">Common Questions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Company & Support</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AutoCollective India. Buy Together. Save Together.</p>
          <p>Sample dealer quotes and smart estimates are clearly labelled to support informed decisions.</p>
        </div>
      </div>
    </footer>
  );
}
