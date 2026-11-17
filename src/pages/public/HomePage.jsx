import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, IndianRupee, TrendingUp, BadgeCheck, Users, CarFront, Handshake } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CarCard from '../../components/cars/CarCard';
import GroupCard from '../../components/groups/GroupCard';
import CarImage from '../../components/common/CarImage';

export default function HomePage() {
  const { user } = useAuth();
  const [featuredCars, setFeaturedCars] = useState([]);
  const [activeGroups, setActiveGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([api.get('/cars'), api.get('/groups')])
      .then(([carsRes, groupsRes]) => {
        if (!mounted) return;
        setFeaturedCars((carsRes.data.cars || []).filter((c) => c.is_featured).slice(0, 3));
        setActiveGroups((groupsRes.data.groups || []).slice(0, 3));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const findCarLink = user
    ? user.role === 'buyer'
      ? '/dashboard?tab=find-car'
      : '/cars'
    : '/register';

  return (
    <div className="bg-slate-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-sm font-medium text-blue-600">
                AutoCollective · Buy Together. Save Together.
              </p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-display font-bold tracking-tight text-slate-950 leading-[1.12]">
                Your Dream Car. A Better Deal. Together.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Find people who want the same car, join a buying group, and negotiate better offers with dealerships.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={findCarLink}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  <span>Find My Car</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/groups"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-slate-900 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <span>Explore Group Deals</span>
                </Link>
              </div>

              <p className="mt-6 text-xs text-slate-500">
                Free to join a group · Your car is still invoiced in your own name at the dealership
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[280px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <CarImage
                  src="/src/assets/images/hero_automotive_showcase_1794891623899.jpg"
                  alt="Modern SUV in a bright architectural showroom"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simple 3-Step Explanation */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-950">
            How Group Car Buying Works
          </h2>
          <p className="mt-2 text-base text-slate-600">
            When several buyers in the same city buy together, dealerships compete to offer better discounts and lower add-on charges.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <CarFront className="w-5 h-5" />
            </div>
            <p className="mt-4 text-xs font-semibold text-blue-600 tracking-wide">STEP 1</p>
            <h3 className="mt-1 text-lg font-display font-semibold text-slate-950">Choose Your Car</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Select the car, variant, city and budget.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <p className="mt-4 text-xs font-semibold text-blue-600 tracking-wide">STEP 2</p>
            <h3 className="mt-1 text-lg font-display font-semibold text-slate-950">Join Other Buyers</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              We help you find people interested in the same car.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <Handshake className="w-5 h-5" />
            </div>
            <p className="mt-4 text-xs font-semibold text-blue-600 tracking-wide">STEP 3</p>
            <h3 className="mt-1 text-lg font-display font-semibold text-slate-950">Get Better Dealer Offers</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Dealerships can submit group offers for buyers to compare.
            </p>
          </div>
        </div>
      </section>

      {/* Smart Tools to Help You Buy Better */}
      <section className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-950">
                Smart Tools to Help You Buy Better
              </h2>
              <p className="mt-2 text-base text-slate-600 max-w-2xl">
                Simple, helpful checks powered by real data—designed for everyday car buyers with zero technical jargon.
              </p>
            </div>
            <Link
              to="/ai-tools"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Open All AI Smart Tools</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/ai-tools/price"
              className="group bg-slate-50 border border-slate-200 rounded-lg p-6 hover:border-blue-500 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-md bg-white border border-slate-200 text-blue-600 flex items-center justify-center">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-lg font-display font-semibold text-slate-950">
                  Know Your Car's Fair Price.
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Check what a car should actually cost in your city and compare a dealership quote against our estimated price range.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:underline">
                <span>Check Fair Price</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              to="/ai-tools/demand"
              className="group bg-slate-50 border border-slate-200 rounded-lg p-6 hover:border-blue-500 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-md bg-white border border-slate-200 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-lg font-display font-semibold text-slate-950">
                  Discover Which Cars Are in Demand.
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  See which models are becoming popular in your city and where new buying groups are forming fastest.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:underline">
                <span>See Popular Cars</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              to="/ai-tools/offers"
              className="group bg-slate-50 border border-slate-200 rounded-lg p-6 hover:border-blue-500 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-md bg-white border border-slate-200 text-blue-600 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <h3 className="mt-5 text-lg font-display font-semibold text-slate-950">
                  Find the Best Dealer Offer.
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Compare dealership quotes side by side, spot extra insurance or accessory charges, and find the best overall value.
                </p>
              </div>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:underline">
                <span>Compare Dealer Offers</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Active Buying Groups */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-950">Active Buying Groups Near You</h2>
            <p className="mt-1 text-sm text-slate-600">
              Join an open group to reach the 5-buyer target and unlock group dealership offers.
            </p>
          </div>
          <Link
            to="/groups"
            className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>See all groups</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-60 bg-white border border-slate-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeGroups.map((grp) => (
              <GroupCard key={grp.id} group={grp} />
            ))}
          </div>
        )}
      </section>

      {/* Popular Car Models */}
      <section className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-display font-bold text-slate-950">Popular Indian Cars</h2>
              <p className="mt-1 text-sm text-slate-600">
                Browse specs and starting ex-showroom prices across SUVs, sedans, and electric vehicles.
              </p>
            </div>
            <Link
              to="/cars"
              className="text-sm font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span>Browse all cars</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredCars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
