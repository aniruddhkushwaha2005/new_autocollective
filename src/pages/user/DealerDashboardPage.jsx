import { useEffect, useState } from 'react';
import { LayoutDashboard, Building2, Users, FilePlus2, FileText, Bell } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { INDIAN_CITIES, formatDate, formatINR } from '../../utils/format';

export default function DealerDashboardPage() {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(null);
  const [allCars, setAllCars] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const [offerForm, setOfferForm] = useState({
    group_id: '',
    ex_showroom_price: 1845000,
    insurance_charges: 72000,
    registration_charges: 332000,
    accessories_cost: 15000,
    extended_warranty: 22000,
    group_discount: 75000,
    exchange_bonus: 25000,
    corporate_offer: 15000,
    additional_charges: 0,
    delivery_timeline: '21 Days',
    validity_date: '2026-12-31',
    notes: ''
  });

  const [profileForm, setProfileForm] = useState({
    dealership_name: '',
    brand_authorized: '',
    city: 'Bengaluru',
    address: '',
    gst_number: '',
    contact_phone: '',
    managed_car_ids: []
  });

  const loadDealerData = async () => {
    setLoading(true);
    try {
      const [dealerRes, carsRes, ntfRes] = await Promise.all([
        api.get('/dealers/me'),
        api.get('/cars'),
        api.get('/notifications')
      ]);
      setData(dealerRes.data);
      setAllCars(carsRes.data.cars || []);
      setNotifications(ntfRes.data.notifications || []);
      const d = dealerRes.data.dealer;
      setProfileForm({
        dealership_name: d.dealership_name,
        brand_authorized: d.brand_authorized,
        city: d.city,
        address: d.address,
        gst_number: d.gst_number,
        contact_phone: d.contact_phone,
        managed_car_ids: d.managed_car_ids || []
      });
      if (!offerForm.group_id && dealerRes.data.interestedGroups?.length > 0) {
        setOfferForm((prev) => ({ ...prev, group_id: dealerRes.data.interestedGroups[0].id }));
      }
    } catch {
      notify('Unable to load dealership workspace.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDealerData();
  }, []);

  const computedFinalPrice = Math.max(
    0,
    Number(offerForm.ex_showroom_price || 0) +
      Number(offerForm.insurance_charges || 0) +
      Number(offerForm.registration_charges || 0) +
      Number(offerForm.accessories_cost || 0) +
      Number(offerForm.extended_warranty || 0) +
      Number(offerForm.additional_charges || 0) -
      (Number(offerForm.group_discount || 0) +
        Number(offerForm.exchange_bonus || 0) +
        Number(offerForm.corporate_offer || 0))
  );

  const handleSubmitOffer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/offers', offerForm);
      notify('Your group quotation has been published to buyers.', 'success');
      await loadDealerData();
      setActiveTab('manage-offers');
    } catch (err) {
      notify(err.response?.data?.detail || 'Failed to publish quotation.', 'error');
    }
  };

  const handleWithdrawOffer = async (offerId) => {
    try {
      await api.put(`/offers/${offerId}`, { status: 'Withdrawn' });
      notify('Quotation withdrawn.', 'info');
      await loadDealerData();
    } catch {
      notify('Could not withdraw offer.', 'error');
    }
  };

  const handleUpdatePurchaseStatus = async (purchaseId, status) => {
    try {
      await api.patch(`/purchases/${purchaseId}/status`, { status });
      notify(`Customer booking updated to ${status}.`, 'success');
      await loadDealerData();
    } catch (err) {
      notify(err.response?.data?.detail || 'Status update failed.', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await api.put('/dealers/me', profileForm);
      notify('Dealership profile & car models updated.', 'success');
      await loadDealerData();
    } catch {
      notify('Could not update dealership profile.', 'error');
    }
  };

  const toggleManagedCar = (carId) => {
    setProfileForm((prev) => {
      const exists = prev.managed_car_ids.includes(carId);
      return {
        ...prev,
        managed_car_ids: exists
          ? prev.managed_car_ids.filter((id) => id !== carId)
          : [...prev.managed_car_ids, carId]
      };
    });
  };

  const handleMarkRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    await loadDealerData();
  };

  const dealer = data?.dealer;
  const isApproved = dealer?.approval_status === 'Approved';
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: Building2 },
    { id: 'groups', label: 'Interested Groups', icon: Users, badge: data?.interestedGroups?.length || 0 },
    { id: 'submit-offers', label: 'Submit Offers', icon: FilePlus2 },
    { id: 'manage-offers', label: 'Manage Offers', icon: FileText, badge: data?.myOffers?.length || 0 },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount }
  ];

  return (
    <DashboardLayout
      title={dealer?.dealership_name || 'Dealer Portal'}
      subtitle={`Verification: ${dealer?.approval_status || 'Checking...'} · ${dealer?.city || ''}`}
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <div className="space-y-6">
          {!isApproved && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
              <p className="font-semibold">Account Status: {dealer?.approval_status}</p>
              <p className="mt-1">
                An administrator must approve your dealership before you can publish offers to buyer groups.
              </p>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Approval Status</span>
                <p className={`mt-1 text-xl font-display font-bold ${isApproved ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {dealer?.approval_status}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Interested Groups</span>
                <p className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {data?.interestedGroups?.length || 0}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Submitted Offers</span>
                <p className="mt-1 text-2xl font-mono font-bold text-blue-600 tabular-nums">
                  {data?.myOffers?.length || 0}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Customer Bookings</span>
                <p className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">
                  {data?.acceptedPurchases?.length || 0}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <form onSubmit={handleSaveProfile} className="max-w-xl bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                <h2 className="text-base font-display font-semibold text-slate-950">Dealership Profile</h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Dealership Name</label>
                  <input
                    type="text"
                    value={profileForm.dealership_name}
                    onChange={(e) => setProfileForm({ ...profileForm, dealership_name: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">GST Number</label>
                    <input
                      type="text"
                      value={profileForm.gst_number}
                      onChange={(e) => setProfileForm({ ...profileForm, gst_number: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Authorized Brands</label>
                  <input
                    type="text"
                    value={profileForm.brand_authorized}
                    onChange={(e) => setProfileForm({ ...profileForm, brand_authorized: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Showroom Address</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Available Cars at Your Showroom</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {allCars.map((c) => {
                      const checked = profileForm.managed_car_ids.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-start gap-2 p-2.5 border rounded-md cursor-pointer text-xs ${
                            checked ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleManagedCar(c.id)}
                            className="mt-0.5"
                          />
                          <span>{c.brand} {c.model} ({c.variant})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Save Profile & Cars
                </button>
              </form>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Car Model</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4 text-right">Buyers Joined</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(data?.interestedGroups || []).map((g) => (
                    <tr key={g.id}>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{g.group_code}</td>
                      <td className="py-3 px-4 font-medium text-slate-900">{g.brand} {g.model} {g.variant}</td>
                      <td className="py-3 px-4 text-slate-600">{g.city}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{g.current_members} of {g.target_members}</td>
                      <td className="py-3 px-4 text-xs font-medium text-blue-700">{g.status}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={!isApproved}
                          onClick={() => {
                            setOfferForm((prev) => ({ ...prev, group_id: g.id }));
                            setActiveTab('submit-offers');
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-40"
                        >
                          Submit Offer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'submit-offers' && (
            <form onSubmit={handleSubmitOffer} className="max-w-3xl bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-display font-semibold text-slate-950">Submit Clear Group Offer</h2>
                <div className="text-sm font-mono font-semibold text-blue-700 tabular-nums">
                  Final On-Road Price: {formatINR(computedFinalPrice)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Choose Buyer Group</label>
                <select
                  required
                  value={offerForm.group_id}
                  onChange={(e) => setOfferForm({ ...offerForm, group_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                >
                  {(data?.interestedGroups || []).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.brand} {g.model} · {g.city} ({g.current_members} of {g.target_members} buyers)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ex-Showroom (₹)</label>
                  <input
                    type="number"
                    required
                    value={offerForm.ex_showroom_price}
                    onChange={(e) => setOfferForm({ ...offerForm, ex_showroom_price: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Insurance (₹)</label>
                  <input
                    type="number"
                    required
                    value={offerForm.insurance_charges}
                    onChange={(e) => setOfferForm({ ...offerForm, insurance_charges: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Registration / RTO (₹)</label>
                  <input
                    type="number"
                    required
                    value={offerForm.registration_charges}
                    onChange={(e) => setOfferForm({ ...offerForm, registration_charges: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Accessories (₹)</label>
                  <input
                    type="number"
                    value={offerForm.accessories_cost}
                    onChange={(e) => setOfferForm({ ...offerForm, accessories_cost: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Extended Warranty (₹)</label>
                  <input
                    type="number"
                    value={offerForm.extended_warranty}
                    onChange={(e) => setOfferForm({ ...offerForm, extended_warranty: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Extra Charges (₹)</label>
                  <input
                    type="number"
                    value={offerForm.additional_charges}
                    onChange={(e) => setOfferForm({ ...offerForm, additional_charges: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Group Discount (₹)</label>
                  <input
                    type="number"
                    value={offerForm.group_discount}
                    onChange={(e) => setOfferForm({ ...offerForm, group_discount: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Exchange Bonus (₹)</label>
                  <input
                    type="number"
                    value={offerForm.exchange_bonus}
                    onChange={(e) => setOfferForm({ ...offerForm, exchange_bonus: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono text-emerald-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Corporate Offer (₹)</label>
                  <input
                    type="number"
                    value={offerForm.corporate_offer}
                    onChange={(e) => setOfferForm({ ...offerForm, corporate_offer: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Time</label>
                  <input
                    type="text"
                    value={offerForm.delivery_timeline}
                    onChange={(e) => setOfferForm({ ...offerForm, delivery_timeline: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valid Until</label>
                  <input
                    type="date"
                    value={offerForm.validity_date}
                    onChange={(e) => setOfferForm({ ...offerForm, validity_date: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes for Buyers</label>
                <textarea
                  rows={2}
                  value={offerForm.notes}
                  onChange={(e) => setOfferForm({ ...offerForm, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={!isApproved}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-40"
              >
                {isApproved ? 'Publish Group Offer' : 'Awaiting Admin Approval'}
              </button>
            </form>
          )}

          {activeTab === 'manage-offers' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 mb-3">Submitted Quotations</h2>
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                        <th className="py-3 px-4">Car</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4 text-right">Final On-Road</th>
                        <th className="py-3 px-4 text-right">Group Discount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(data?.myOffers || []).map((o) => (
                        <tr key={o.id}>
                          <td className="py-3 px-4 font-medium text-slate-900">{o.brand} {o.model} {o.variant}</td>
                          <td className="py-3 px-4 text-slate-600">{o.city}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">{formatINR(o.final_on_road_price)}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700">{formatINR(o.group_discount)}</td>
                          <td className="py-3 px-4 text-xs">{o.status}</td>
                          <td className="py-3 px-4 text-right">
                            {o.status === 'Active' && (
                              <button
                                type="button"
                                onClick={() => handleWithdrawOffer(o.id)}
                                className="text-xs text-red-600 hover:underline"
                              >
                                Withdraw
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 mb-3">Interested Buyer Bookings</h2>
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                        <th className="py-3 px-4">Buyer</th>
                        <th className="py-3 px-4">Car</th>
                        <th className="py-3 px-4 text-right">Agreed Price</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(data?.acceptedPurchases || []).map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{p.buyer_name}</p>
                            <p className="text-xs text-slate-500">{p.buyer_email} · {formatDate(p.created_at)}</p>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{p.brand} {p.model} {p.variant}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">{formatINR(p.agreed_price)}</td>
                          <td className="py-3 px-4 text-xs font-medium text-blue-700">{p.status}</td>
                          <td className="py-3 px-4 text-right">
                            <select
                              value={p.status}
                              onChange={(e) => handleUpdatePurchaseStatus(p.id, e.target.value)}
                              className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                            >
                              {['Interest Expressed', 'Dealer Contacted', 'Booking Confirmed', 'Completed', 'Cancelled'].map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
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
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
