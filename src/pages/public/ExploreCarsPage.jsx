import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CarCard from '../../components/cars/CarCard';
import EmptyState from '../../components/common/EmptyState';
import { CAR_BRANDS, FUEL_TYPES, INDIAN_CITIES, TRANSMISSIONS } from '../../utils/format';

export default function ExploreCarsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { notify } = useToast();

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [brand, setBrand] = useState('All');
  const [fuelType, setFuelType] = useState('All');
  const [transmission, setTransmission] = useState('All');
  const [city, setCity] = useState(searchParams.get('city') || 'All');
  const [sort, setSort] = useState('featured');
  const [page, setPage] = useState(1);
  const perPage = 6;

  const fetchCars = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/cars', {
        params: { search, brand, fuel_type: fuelType, transmission, city, sort }
      });
      setCars(data.cars || []);
      setPage(1);
    } catch {
      notify('Unable to load car catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, [brand, fuelType, transmission, city, sort]);

  const handleToggleSave = async (carId) => {
    if (!user) {
      notify('Sign in as a buyer to save cars to your shortlist.', 'info');
      navigate('/login');
      return;
    }
    try {
      const { data } = await api.post(`/users/saved-cars/${carId}`);
      await refreshUser();
      notify(data.saved ? 'Car saved to your shortlist.' : 'Removed from saved cars.', 'success');
    } catch {
      notify('Could not update saved cars.', 'error');
    }
  };

  const handleRequestCar = (car) => {
    if (!user) {
      navigate(`/login?redirect=/dashboard?requestCar=${car.id}`);
      return;
    }
    navigate(`/dashboard?requestCar=${car.id}`);
  };

  const resetFilters = () => {
    setSearch('');
    setBrand('All');
    setFuelType('All');
    setTransmission('All');
    setCity('All');
    setSort('featured');
  };

  const totalPages = Math.max(1, Math.ceil(cars.length / perPage));
  const pagedCars = cars.slice((page - 1) * perPage, page * perPage);
  const savedSet = new Set(user?.saved_cars || []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Explore Indian Car Models</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Filter by brand, fuel type, gearbox, or city to find open buying groups near you.
          </p>
        </div>
        <div className="text-sm font-mono text-slate-500 tabular-nums">{cars.length} vehicles found</div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchCars();
            }}
            className="lg:col-span-2 flex items-center border border-slate-300 rounded-md px-3 bg-white focus-within:border-blue-600"
          >
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, model, variant..."
              className="w-full py-2 px-2 text-sm text-slate-900 focus:outline-none"
            />
            <button type="submit" className="text-xs font-medium text-blue-600 hover:text-blue-700 shrink-0">
              Search
            </button>
          </form>

          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            aria-label="Filter by brand"
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-white"
          >
            <option value="All">All Brands</option>
            {CAR_BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={fuelType}
            onChange={(e) => setFuelType(e.target.value)}
            aria-label="Filter by fuel"
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-white"
          >
            <option value="All">All Fuels</option>
            {FUEL_TYPES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>

          <select
            value={transmission}
            onChange={(e) => setTransmission(e.target.value)}
            aria-label="Filter by transmission"
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-white"
          >
            <option value="All">All Gearboxes</option>
            {TRANSMISSIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort cars"
            className="border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-800 bg-white"
          >
            <option value="featured">Featured First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">City:</span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              aria-label="Filter by city"
              className="border border-slate-200 rounded px-2 py-1 text-slate-700 bg-slate-50"
            >
              <option value="All">All Cities</option>
              {INDIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={resetFilters} className="text-slate-600 hover:text-slate-900 underline">
            Reset all filters
          </button>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="h-80 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : pagedCars.length === 0 ? (
        <EmptyState
          title="No matching vehicles found"
          description="Try broadening your brand, fuel type, or city filter criteria."
          actionLabel="Reset Filters"
          onAction={resetFilters}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pagedCars.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                isSaved={savedSet.has(car.id)}
                onToggleSave={handleToggleSave}
                onRequestCar={handleRequestCar}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm font-mono text-slate-600 px-3 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-md bg-white disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
