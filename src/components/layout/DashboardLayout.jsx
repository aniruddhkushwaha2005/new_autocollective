import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout({ title, subtitle, navItems, activeTab, onTabChange, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-slate-950 text-slate-200 border-b lg:border-b-0 lg:border-r border-slate-800 shrink-0 flex flex-col">
        <div className="px-5 h-16 flex items-center justify-between border-b border-slate-800">
          <Link to="/" className="text-base font-display font-bold text-white tracking-tight">
            AutoCollective
          </Link>
          <Link
            to="/"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            title="Public Website"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Site</span>
          </Link>
        </div>

        <div className="px-5 py-4 border-b border-slate-800/80">
          <p className="text-sm font-medium text-white truncate">{user?.name}</p>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {user?.role === 'admin' ? 'Administrator' : user?.role === 'dealer' ? 'Dealer Partner' : 'Verified Buyer'} · {user?.city}
          </p>
        </div>

        <nav className="flex-1 px-3 py-4 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 text-left ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {Icon && <Icon className="w-4 h-4 shrink-0" />}
                <span>{item.label}</span>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="ml-auto text-xs font-mono tabular-nums opacity-90">{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-800 hidden lg:block">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-display font-semibold text-slate-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/cars"
              className="px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
            >
              Catalog
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="lg:hidden px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
