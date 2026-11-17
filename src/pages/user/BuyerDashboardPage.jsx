import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  FileText,
  Sparkles,
  Activity,
  Bell,
  UserCheck,
  Settings,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import GroupCard from '../../components/groups/GroupCard';
import CarCard from '../../components/cars/CarCard';
import OfferComparisonTable from '../../components/offers/OfferComparisonTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import EmptyState from '../../components/common/EmptyState';
import {
  CAR_BRANDS,
  FUEL_TYPES,
  INDIAN_CITIES,
  TIMELINES,
  TRANSMISSIONS,
  formatDate,
  formatINR
} from '../../utils/format';

export default function BuyerDashboardPage() {
  const { user, refreshUser, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawTab = searchParams.get('tab');
  const initialTab = searchParams.get('requestCar')
    ? 'find-car'
    : rawTab === 'create-request'
      ? 'find-car'
      : rawTab || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [cars, setCars] = useState([]);
  const [requests, setRequests] = useState([]);
  const [groups, setGroups] = useState([]);
  const [offersAnalysis, setOffersAnalysis] = useState({ analyzedOffers: [], summary: null });
  const [purchases, setPurchases] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [offerSort, setOfferSort] = useState('score');
  const [offerCityFilter, setOfferCityFilter] = useState('All');

  const [reqForm, setReqForm] = useState({
    car_id: '',
    brand: 'Hyundai',
    model: 'Creta',
    variant: 'SX(O) Tech',
    fuel_type: 'Petrol',
    transmission: 'DCT',
    city: user?.city || 'Bengaluru',
    preferred_budget: 2150000,
    timeline: 'Within 30 Days',
    quantity: 1,
    additional_requirements: ''
  });
  const [submittingReq, setSubmittingReq] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || 'Bengaluru'
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [carsRes, reqRes, grpRes, purRes, ntfRes, analRes] = await Promise.all([
        api.get('/cars'),
        api.get('/requests'),
        api.get('/groups'),
        api.get('/purchases'),
        api.get('/notifications'),
        api.post('/ml/offer-analysis', {})
      ]);
      const carList = carsRes.data.cars || [];
      setCars(carList);
      setRequests(reqRes.data.requests || []);
      setGroups(grpRes.data.groups || []);
      setPurchases(purRes.data.purchases || []);
      setNotifications(ntfRes.data.notifications || []);
      setOffersAnalysis(analRes.data || { analyzedOffers: [], summary: null });

      const preselectId = searchParams.get('requestCar');
      if (preselectId) {
        const found = carList.find((c) => c.id === preselectId);
        if (found) {
          setReqForm((prev) => ({
            ...prev,
            car_id: found.id,
            brand: found.brand,
            model: found.model,
            variant: found.variant,
            fuel_type: found.fuel_type,
            transmission: found.transmission,
            preferred_budget: Math.round(found.ex_showroom_price * 1.16)
          }));
        }
      }
    } catch {
      notify('Unable to load your dashboard details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (user) {
      setProfileForm({ name: user.name, phone: user.phone || '', city: user.city || 'Bengaluru' });
    }
  }, [user]);

  const handleSelectCatalogCar = (carId) => {
    const found = cars.find((c) => c.id === carId);
    if (!found) return;
    setReqForm((prev) => ({
      ...prev,
      car_id: found.id,
      brand: found.brand,
      model: found.model,
      variant: found.variant,
      fuel_type: found.fuel_type,
      transmission: found.transmission,
      preferred_budget: Math.round(found.ex_showroom_price * 1.16)
    }));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setSubmittingReq(true);
    try {
      const { data } = await api.post('/requests', reqForm);
      notify(
        `Great! We matched your car request with buying group ${data.matched_group.group_code}.`,
        'success'
      );
      await loadAll();
      setActiveTab('my-group');
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not submit your car request.', 'error');
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!cancelTarget) return;
    try {
      await api.delete(`/requests/${cancelTarget}`);
      notify('Car request cancelled.', 'info');
      setCancelTarget(null);
      await loadAll();
    } catch (err) {
      notify(err.response?.data?.detail || 'Unable to cancel request.', 'error');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await api.post(`/groups/${groupId}/join`);
      notify('You joined the buying group!', 'success');
      await loadAll();
    } catch (err) {
      notify(err.response?.data?.detail || 'Unable to join group.', 'error');
    }
  };

  const handleLeaveGroup = async (groupId) => {
    try {
      await api.post(`/groups/${groupId}/leave`);
      notify('You left the buying group.', 'info');
      await loadAll();
    } catch (err) {
      notify(err.response?.data?.detail || 'Unable to leave group.', 'error');
    }
  };

  const handleExpressInterest = async (offer) => {
    try {
      await api.post('/purchases', { offer_id: offer.id });
      notify(`Your interest has been shared with ${offer.dealer_name}.`, 'success');
      await loadAll();
      setActiveTab('activity');
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not record your offer selection.', 'error');
    }
  };

  const handleToggleSave = async (carId) => {
    try {
      await api.post(`/users/saved-cars/${carId}`);
      await refreshUser();
      notify('Saved cars updated.', 'success');
    } catch {
      notify('Unable to update saved cars.', 'error');
    }
  };

  const handleMarkRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    await loadAll();
  };

  const handleMarkAllRead = async () => {
    await api.patch('/notifications/read-all');
    await loadAll();
    notify('All notifications marked as read.', 'info');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/users/profile', profileForm);
      await refreshUser();
      notify('Profile updated.', 'success');
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not update profile.', 'error');
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const myGroups = groups.filter((g) => g.is_member);
  const primaryGroup = myGroups[0] || null;
  const activeRequest = requests.find((r) => r.status !== 'Cancelled') || null;
  const savedCarObjects = cars.filter((c) => (user?.saved_cars || []).includes(c.id));
  const selectedOfferIds = purchases.filter((p) => p.status !== 'Cancelled').map((p) => p.offer_id);

  let filteredOffers = [...(offersAnalysis.analyzedOffers || [])];
  if (offerCityFilter !== 'All') {
    filteredOffers = filteredOffers.filter((o) => o.city === offerCityFilter);
  }
  if (offerSort === 'price_asc') {
    filteredOffers.sort((a, b) => a.final_on_road_price - b.final_on_road_price);
  } else if (offerSort === 'discount_desc') {
    filteredOffers.sort((a, b) => b.totalDiscount - a.totalDiscount);
  } else {
    filteredOffers.sort((a, b) => b.offerScore - a.offerScore);
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'find-car', label: 'Find My Car', icon: Search },
    { id: 'my-group', label: 'My Buying Group', icon: Users, badge: myGroups.length },
    { id: 'offers', label: 'Dealer Offers', icon: FileText, badge: filteredOffers.length },
    { id: 'ai-tools', label: 'AI Smart Tools', icon: Sparkles },
    { id: 'activity', label: 'My Activity', icon: Activity },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications.length },
    { id: 'profile', label: 'Profile', icon: UserCheck },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.name?.split(' ')[0] || 'Buyer'}`}
      subtitle={`Your personal car-buying workspace · ${user?.city || 'India'}`}
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-display font-semibold text-slate-950">
                    Welcome, {user?.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Track your car request, see how many buyers have joined your group, and compare dealer offers in one place.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('find-car')}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 whitespace-nowrap shrink-0"
                >
                  Find My Car
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">My Car Request</span>
                  <p className="mt-1 text-base font-semibold text-slate-950 truncate">
                    {activeRequest ? `${activeRequest.brand} ${activeRequest.model}` : 'No active request'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {activeRequest ? `${activeRequest.city} · ${activeRequest.status}` : 'Start in Find My Car'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">My Active Buying Group</span>
                  <p className="mt-1 text-base font-semibold text-slate-950 truncate">
                    {primaryGroup ? `${primaryGroup.brand} ${primaryGroup.model}` : 'Not in a group yet'}
                  </p>
                  <p className="mt-1 text-xs text-blue-600 font-medium">
                    {primaryGroup ? primaryGroup.status : 'Join an open group'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">Buyers in My Group</span>
                  <p className="mt-1 text-2xl font-mono font-bold text-slate-950 tabular-nums">
                    {primaryGroup ? `${primaryGroup.current_members} of ${primaryGroup.target_members}` : '0 of 5'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {primaryGroup
                      ? Math.max(0, primaryGroup.target_members - primaryGroup.current_members) > 0
                        ? `${primaryGroup.target_members - primaryGroup.current_members} more buyers needed`
                        : 'Ready for dealer offers'
                      : 'Submit a request to match'}
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <span className="text-xs text-slate-500">Available Dealer Offers</span>
                  <p className="mt-1 text-2xl font-mono font-bold text-emerald-700 tabular-nums">
                    {offersAnalysis.analyzedOffers?.length || 0}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('offers')}
                    className="mt-1 text-xs text-blue-600 hover:underline font-medium"
                  >
                    Compare all offers
                  </button>
                </div>
              </div>

              {/* Important Notifications */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-950">Important Updates</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('notifications')}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    See all
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">No updates yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {notifications.slice(0, 3).map((n) => (
                      <div key={n.id} className="py-2.5 flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{formatDate(n.created_at)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* FIND MY CAR */}
          {activeTab === 'find-car' && (
            <div className="max-w-2xl bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-xl font-display font-semibold text-slate-950">Find My Car & Match with Buyers</h2>
              <p className="mt-1 text-sm text-slate-600">
                Tell us which car you want to buy. We will connect you with people looking for the same car in your city.
              </p>

              <div className="mt-5">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Want a shortcut? Pick a popular car to auto-fill:
                </label>
                <select
                  value={reqForm.car_id}
                  onChange={(e) => handleSelectCatalogCar(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-slate-50"
                >
                  <option value="">-- Choose a car model from our catalog (optional) --</option>
                  {cars.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand} {c.model} {c.variant} ({c.fuel_type} · {c.transmission})
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleCreateRequest} className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Which brand do you want?</label>
                    <select
                      value={reqForm.brand}
                      onChange={(e) => setReqForm({ ...reqForm, brand: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {CAR_BRANDS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Which model?</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Creta, Nexon EV, City"
                      value={reqForm.model}
                      onChange={(e) => setReqForm({ ...reqForm, model: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Which variant?</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SX(O), Empowered+, ZX"
                      value={reqForm.variant}
                      onChange={(e) => setReqForm({ ...reqForm, variant: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Which city?</label>
                    <select
                      value={reqForm.city}
                      onChange={(e) => setReqForm({ ...reqForm, city: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {INDIAN_CITIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">What is your budget? (₹)</label>
                    <input
                      type="number"
                      required
                      min="400000"
                      step="10000"
                      value={reqForm.preferred_budget}
                      onChange={(e) => setReqForm({ ...reqForm, preferred_budget: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">When do you plan to buy?</label>
                    <select
                      value={reqForm.timeline}
                      onChange={(e) => setReqForm({ ...reqForm, timeline: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {TIMELINES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fuel Type</label>
                    <select
                      value={reqForm.fuel_type}
                      onChange={(e) => setReqForm({ ...reqForm, fuel_type: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {FUEL_TYPES.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Transmission</label>
                    <select
                      value={reqForm.transmission}
                      onChange={(e) => setReqForm({ ...reqForm, transmission: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {TRANSMISSIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Any special preference? (Optional)</label>
                  <textarea
                    rows={2}
                    value={reqForm.additional_requirements}
                    onChange={(e) => setReqForm({ ...reqForm, additional_requirements: e.target.value })}
                    placeholder="Preferred color, trade-in car, or corporate registration..."
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReq}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-60"
                >
                  {submittingReq ? 'Finding Matching Buyers...' : 'Find People & Join a Group'}
                </button>
              </form>
            </div>
          )}

          {/* MY BUYING GROUP */}
          {activeTab === 'my-group' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-display font-semibold text-slate-950 mb-4">My Buying Groups</h2>
                {myGroups.length === 0 ? (
                  <EmptyState
                    title="You have not joined a buying group yet"
                    description="Use Find My Car to match with other buyers, or join an open group below."
                    actionLabel="Find My Car"
                    onAction={() => setActiveTab('find-car')}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myGroups.map((g) => (
                      <GroupCard key={g.id} group={g} onLeave={handleLeaveGroup} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-lg font-display font-semibold text-slate-950 mb-4">Other Open Groups You Can Join</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {groups
                    .filter((g) => !g.is_member)
                    .map((g) => (
                      <GroupCard key={g.id} group={g} onJoin={handleJoinGroup} />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* DEALER OFFERS */}
          {activeTab === 'offers' && (
            <div className="space-y-6">
              {offersAnalysis.summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-emerald-200 rounded-lg p-5">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Best Overall Value</span>
                    </div>
                    <p className="mt-1.5 text-base font-display font-semibold text-slate-950">
                      {offersAnalysis.summary.bestValueDealer}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Recommended for balanced pricing, clear fee breakdown, and zero hidden charges.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <span className="text-xs text-slate-500">Lowest On-Road Price</span>
                    <p className="mt-1.5 text-base font-display font-semibold text-slate-950">
                      {offersAnalysis.summary.lowestPriceDealer}
                    </p>
                    <p className="mt-1 text-sm font-mono font-semibold text-blue-700 tabular-nums">
                      {formatINR(offersAnalysis.summary.lowestOnRoadPrice)}
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <span className="text-xs text-slate-500">Highest Discount</span>
                    <p className="mt-1.5 text-base font-display font-semibold text-slate-950">
                      {offersAnalysis.summary.highestDiscountDealer}
                    </p>
                    <p className="mt-1 text-sm font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatINR(offersAnalysis.summary.highestDiscount)} total savings
                    </p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <select
                    value={offerCityFilter}
                    onChange={(e) => setOfferCityFilter(e.target.value)}
                    className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="All">All Cities</option>
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={offerSort}
                    onChange={(e) => setOfferSort(e.target.value)}
                    className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="score">Best Overall Value First</option>
                    <option value="price_asc">Lowest Final Price First</option>
                    <option value="discount_desc">Highest Discount First</option>
                  </select>
                </div>
                <Link to="/ai-tools/offers" className="text-xs font-medium text-blue-600 hover:underline">
                  Open Detailed Deal Breakdown
                </Link>
              </div>

              <OfferComparisonTable
                offers={filteredOffers}
                bestValueOfferId={offersAnalysis.summary?.bestValueOfferId}
                onExpressInterest={handleExpressInterest}
                selectedOfferIds={selectedOfferIds}
              />
            </div>
          )}

          {/* AI SMART TOOLS */}
          {activeTab === 'ai-tools' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'What Should This Car Cost?',
                  desc: 'Check the estimated fair price for any car in your city and compare it with a dealer quotation.',
                  to: '/ai-tools/price',
                  cta: 'Check Fair Price'
                },
                {
                  title: 'Which Cars Are Becoming Popular?',
                  desc: 'See which cars are trending in your city and attracting faster buying groups.',
                  to: '/ai-tools/demand',
                  cta: 'See Popular Cars'
                },
                {
                  title: 'Are You Getting the Best Deal?',
                  desc: 'Audit dealership offers side by side to spot high insurance or add-on costs.',
                  to: '/ai-tools/offers',
                  cta: 'Compare Deals'
                }
              ].map((tool) => (
                <div key={tool.to} className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-display font-semibold text-slate-950">{tool.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{tool.desc}</p>
                  </div>
                  <Link
                    to={tool.to}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  >
                    <span>{tool.cta}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* MY ACTIVITY (Requests + Purchases + Saved Cars) */}
          {activeTab === 'activity' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 mb-3">My Car Requests</h2>
                {requests.length === 0 ? (
                  <EmptyState
                    title="No requests yet"
                    description="Submit a car request to find buyers in your city."
                    actionLabel="Find My Car"
                    onAction={() => setActiveTab('find-car')}
                  />
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                          <th className="py-3 px-4">Car</th>
                          <th className="py-3 px-4">City</th>
                          <th className="py-3 px-4 text-right">Budget</th>
                          <th className="py-3 px-4">Buying Group</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {requests.map((r) => (
                          <tr key={r.id}>
                            <td className="py-3 px-4 font-medium text-slate-900">{r.brand} {r.model} {r.variant}</td>
                            <td className="py-3 px-4 text-slate-700">{r.city}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(r.preferred_budget)}</td>
                            <td className="py-3 px-4">
                              {r.group_id ? (
                                <Link to={`/groups/${r.group_id}`} className="text-xs font-medium text-blue-600 hover:underline">
                                  View Group ({r.current_members}/{r.target_members})
                                </Link>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-slate-800">{r.status}</td>
                            <td className="py-3 px-4 text-right">
                              {r.status !== 'Cancelled' && (
                                <button
                                  type="button"
                                  onClick={() => setCancelTarget(r.id)}
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 mb-3">Purchase Progress</h2>
                {purchases.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-5">
                    You have not selected a dealer offer yet.
                  </p>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                          <th className="py-3 px-4">Car</th>
                          <th className="py-3 px-4">Dealership</th>
                          <th className="py-3 px-4 text-right">Agreed Price</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {purchases.map((p) => (
                          <tr key={p.id}>
                            <td className="py-3 px-4 font-medium text-slate-900">{p.brand} {p.model} {p.variant}</td>
                            <td className="py-3 px-4 text-slate-700">{p.dealership_name}</td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">{formatINR(p.agreed_price)}</td>
                            <td className="py-3 px-4 text-xs font-semibold text-blue-700">{p.status}</td>
                            <td className="py-3 px-4 text-right text-xs text-slate-500">{formatDate(p.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 mb-3">Saved Cars</h2>
                {savedCarObjects.length === 0 ? (
                  <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-lg p-5">
                    No saved cars yet. Bookmark any vehicle in Explore Cars to save it here.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {savedCarObjects.map((c) => (
                      <CarCard
                        key={c.id}
                        car={c}
                        isSaved
                        onToggleSave={handleToggleSave}
                        onRequestCar={(car) => {
                          handleSelectCatalogCar(car.id);
                          setActiveTab('find-car');
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3">
              {unreadNotifications.length > 0 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Mark all as read
                  </button>
                </div>
              )}
              <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`p-4 flex items-start justify-between gap-4 ${n.is_read ? '' : 'bg-blue-50/40'}`}>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDate(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="text-xs font-medium text-blue-600 hover:underline shrink-0"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="max-w-lg bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <h2 className="text-base font-display font-semibold text-slate-950">Your Profile Details</h2>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <select
                  value={profileForm.city}
                  onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                Save Profile
              </button>
            </form>
          )}

          {/* SETTINGS */}
          {activeTab === 'settings' && (
            <div className="max-w-lg bg-white border border-slate-200 rounded-lg p-6 space-y-5">
              <h2 className="text-base font-display font-semibold text-slate-950">Account Settings</h2>
              <div className="text-sm text-slate-700 space-y-1">
                <p><span className="text-slate-500">Signed-in Email:</span> {user?.email}</p>
                <p><span className="text-slate-500">Account Type:</span> Car Buyer</p>
              </div>
              <div className="pt-4 border-t border-slate-200 flex flex-wrap gap-3">
                <Link
                  to="/forgot-password"
                  className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Reset Password
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-700 border border-red-200 rounded-md hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Car Request?"
        message="Cancelling this request will also free your spot in the matched buying group."
        confirmLabel="Cancel Request"
        destructive
        onConfirm={handleCancelRequest}
        onCancel={() => setCancelTarget(null)}
      />
    </DashboardLayout>
  );
}
