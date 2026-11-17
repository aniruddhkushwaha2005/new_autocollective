import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users as UsersIcon,
  ShieldCheck,
  Car,
  Layers,
  FileText,
  BarChart3,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Download
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import DemandCharts from '../../components/analytics/DemandCharts';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { CAR_BRANDS, FUEL_TYPES, TRANSMISSIONS, formatINR } from '../../utils/format';

export default function AdminDashboardPage() {
  const { notify } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [overview, setOverview] = useState(null);
  const [cars, setCars] = useState([]);
  const [demandData, setDemandData] = useState(null);
  const [mlStatus, setMlStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const [demandCity, setDemandCity] = useState('All');
  const [demandModel, setDemandModel] = useState('All');
  const [horizon, setHorizon] = useState(4);
  const [retraining, setRetraining] = useState(false);

  const [deleteCarTarget, setDeleteCarTarget] = useState(null);
  const [carForm, setCarForm] = useState({
    brand: 'Hyundai',
    model: '',
    variant: '',
    segment: 'Mid-Size SUV',
    fuel_type: 'Petrol',
    transmission: 'AT',
    ex_showroom_price: 1500000,
    mileage: '18.2 km/l',
    engine_spec: '1.5L BS6 Engine'
  });

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [ovRes, carsRes, mlRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/cars'),
        api.get('/ml/status')
      ]);
      setOverview(ovRes.data);
      setCars(carsRes.data.cars || []);
      setMlStatus(mlRes.data);
    } catch {
      notify('Unable to load admin console data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadDemand = async () => {
    try {
      const { data } = await api.get('/ml/demand-prediction', {
        params: { city: demandCity, model: demandModel, horizonMonths: horizon }
      });
      setDemandData(data);
    } catch {
      notify('Unable to load demand forecast.', 'error');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  useEffect(() => {
    loadDemand();
  }, [demandCity, demandModel, horizon]);

  const handleDealerApproval = async (dealerId, status) => {
    try {
      await api.patch(`/admin/dealers/${dealerId}`, { approval_status: status });
      notify(`Dealer status updated to ${status}.`, 'success');
      await loadAdminData();
    } catch (err) {
      notify(err.response?.data?.detail || 'Update failed.', 'error');
    }
  };

  const handleToggleUser = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle`);
      notify('User account status updated.', 'success');
      await loadAdminData();
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not update user.', 'error');
    }
  };

  const handleGroupStatus = async (groupId, status) => {
    try {
      await api.patch(`/groups/${groupId}/status`, { status });
      notify(`Group status updated to ${status}.`, 'success');
      await loadAdminData();
    } catch {
      notify('Could not update group status.', 'error');
    }
  };

  const handleAddCar = async (e) => {
    e.preventDefault();
    try {
      await api.post('/cars', carForm);
      notify('Car added to catalog.', 'success');
      setCarForm({ ...carForm, model: '', variant: '' });
      await loadAdminData();
    } catch (err) {
      notify(err.response?.data?.detail || 'Failed to add car.', 'error');
    }
  };

  const handleDeleteCar = async () => {
    if (!deleteCarTarget) return;
    try {
      await api.delete(`/cars/${deleteCarTarget}`);
      notify('Car removed from catalog.', 'info');
      setDeleteCarTarget(null);
      await loadAdminData();
    } catch {
      notify('Could not remove car.', 'error');
    }
  };

  const handleRetrain = async () => {
    setRetraining(true);
    try {
      await api.post('/ml/retrain');
      notify('Prediction models refreshed successfully.', 'success');
      await loadAdminData();
      await loadDemand();
    } catch {
      notify('Model refresh failed.', 'error');
    } finally {
      setRetraining(false);
    }
  };

  const handleDownloadCsvReport = () => {
    const groups = overview?.groups || [];
    const header = 'GroupCode,Brand,Model,City,CurrentBuyers,TargetBuyers,Status\n';
    const body = groups
      .map((g) => `${g.group_code},${g.brand},${g.model},${g.city},${g.current_members},${g.target_members},${g.status}`)
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'autocollective_groups_report.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify('Groups report downloaded.', 'success');
  };

  const m = overview?.metrics || {};

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: UsersIcon, badge: m.totalUsers || 0 },
    { id: 'dealers', label: 'Dealers', icon: ShieldCheck, badge: m.pendingDealers || 0 },
    { id: 'cars', label: 'Car Management', icon: Car },
    { id: 'groups', label: 'Buying Groups', icon: Layers, badge: m.activeGroups || 0 },
    { id: 'offers', label: 'Dealer Offers', icon: FileText, badge: m.totalOffers || 0 },
    { id: 'analytics', label: 'AI Analytics', icon: BarChart3 },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <DashboardLayout
      title="Admin Console"
      subtitle="Users, dealership approvals, buying groups, offers, and popularity analytics"
      navItems={navItems}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Users', val: m.totalUsers },
                  { label: 'Buyers', val: m.totalBuyers },
                  { label: 'Dealerships', val: m.totalDealers },
                  { label: 'Dealers Pending Approval', val: m.pendingDealers },
                  { label: 'Active Buying Groups', val: m.activeGroups },
                  { label: 'Completed Groups', val: m.completedGroups },
                  { label: 'Buyer Requests', val: m.totalRequests },
                  { label: 'Offers / Purchases', val: `${m.totalOffers} / ${m.totalPurchases}` }
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white border border-slate-200 rounded-lg p-5">
                    <span className="text-xs text-slate-500">{kpi.label}</span>
                    <p className="mt-1 text-2xl font-mono font-bold text-slate-900 tabular-nums">{kpi.val}</p>
                  </div>
                ))}
              </div>
              {demandData && <DemandCharts demandData={demandData} />}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">City</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(overview?.users || []).map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-medium text-slate-900">{u.name}</td>
                      <td className="py-3 px-4 text-slate-600">{u.email}</td>
                      <td className="py-3 px-4 text-xs capitalize text-slate-700">{u.role}</td>
                      <td className="py-3 px-4 text-slate-600">{u.city}</td>
                      <td className="py-3 px-4 text-xs">{u.is_active ? 'Active' : 'Suspended'}</td>
                      <td className="py-3 px-4 text-right">
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleUser(u.id)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {u.is_active ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'dealers' && (
            <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                    <th className="py-3 px-4">Dealership</th>
                    <th className="py-3 px-4">City · Brands</th>
                    <th className="py-3 px-4">GST Number</th>
                    <th className="py-3 px-4">Approval Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(overview?.dealers || []).map((d) => (
                    <tr key={d.id}>
                      <td className="py-3 px-4 font-medium text-slate-900">{d.dealership_name}</td>
                      <td className="py-3 px-4 text-slate-600">{d.city} · {d.brand_authorized}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700">{d.gst_number}</td>
                      <td className="py-3 px-4 text-xs font-semibold">
                        <span
                          className={
                            d.approval_status === 'Approved'
                              ? 'text-emerald-700'
                              : d.approval_status === 'Rejected'
                                ? 'text-red-700'
                                : 'text-amber-700'
                          }
                        >
                          {d.approval_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {d.approval_status !== 'Approved' && (
                          <button
                            type="button"
                            onClick={() => handleDealerApproval(d.id, 'Approved')}
                            className="px-2.5 py-1 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                        {d.approval_status !== 'Rejected' && (
                          <button
                            type="button"
                            onClick={() => handleDealerApproval(d.id, 'Rejected')}
                            className="px-2.5 py-1 text-xs font-medium text-red-700 border border-red-200 rounded hover:bg-red-50"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'cars' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <form onSubmit={handleAddCar} className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <h2 className="text-base font-display font-semibold text-slate-950">Add New Car</h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Brand</label>
                  <select
                    value={carForm.brand}
                    onChange={(e) => setCarForm({ ...carForm, brand: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                  >
                    {CAR_BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Model</label>
                    <input
                      type="text"
                      required
                      value={carForm.model}
                      onChange={(e) => setCarForm({ ...carForm, model: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Variant</label>
                    <input
                      type="text"
                      required
                      value={carForm.variant}
                      onChange={(e) => setCarForm({ ...carForm, variant: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Body Type</label>
                    <select
                      value={carForm.segment}
                      onChange={(e) => setCarForm({ ...carForm, segment: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {['Mid-Size SUV', 'Compact SUV', 'Executive Sedan', 'Electric SUV', 'Premium MPV'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ex-Showroom (₹)</label>
                    <input
                      type="number"
                      required
                      value={carForm.ex_showroom_price}
                      onChange={(e) => setCarForm({ ...carForm, ex_showroom_price: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Fuel</label>
                    <select
                      value={carForm.fuel_type}
                      onChange={(e) => setCarForm({ ...carForm, fuel_type: e.target.value })}
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
                      value={carForm.transmission}
                      onChange={(e) => setCarForm({ ...carForm, transmission: e.target.value })}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
                    >
                      {TRANSMISSIONS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  Add Car
                </button>
              </form>

              <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <th className="py-3 px-4">Car</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Ex-Showroom</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cars.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3 px-4 font-medium text-slate-900">{c.brand} {c.model} {c.variant}</td>
                        <td className="py-3 px-4 text-xs text-slate-600">{c.segment} · {c.fuel_type}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(c.ex_showroom_price)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setDeleteCarTarget(c.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <th className="py-3 px-4">Group Code</th>
                      <th className="py-3 px-4">Car</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4 text-right">Members</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(overview?.groups || []).map((g) => (
                      <tr key={g.id}>
                        <td className="py-3 px-4 font-mono text-xs">{g.group_code}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{g.brand} {g.model}</td>
                        <td className="py-3 px-4 text-slate-600">{g.city}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{g.current_members}/{g.target_members}</td>
                        <td className="py-3 px-4 text-right">
                          <select
                            value={g.status}
                            onChange={(e) => handleGroupStatus(g.id, e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 text-xs bg-white"
                          >
                            {[
                              'Collecting Buyers',
                              'Ready for Negotiation',
                              'Negotiating',
                              'Offer Received',
                              'Deal Completed',
                              'Expired'
                            ].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 mb-3">Buyer Requests</h2>
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                        <th className="py-3 px-4">Buyer</th>
                        <th className="py-3 px-4">Car</th>
                        <th className="py-3 px-4">City</th>
                        <th className="py-3 px-4 text-right">Budget</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(overview?.requests || []).map((r) => (
                        <tr key={r.id}>
                          <td className="py-3 px-4 font-medium text-slate-900">{r.buyer_name}</td>
                          <td className="py-3 px-4 text-slate-700">{r.brand} {r.model} {r.variant}</td>
                          <td className="py-3 px-4 text-slate-600">{r.city}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(r.preferred_budget)}</td>
                          <td className="py-3 px-4 text-xs font-medium">{r.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'offers' && (
            <div className="space-y-8">
              <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                      <th className="py-3 px-4">Dealership</th>
                      <th className="py-3 px-4">Car & City</th>
                      <th className="py-3 px-4 text-right">On-Road Price</th>
                      <th className="py-3 px-4 text-right">Group Discount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(overview?.offers || []).map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 px-4 font-medium text-slate-900">{o.dealer_name}</td>
                        <td className="py-3 px-4 text-slate-700">{o.brand} {o.model} · {o.city}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">{formatINR(o.final_on_road_price)}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700">{formatINR(o.group_discount)}</td>
                        <td className="py-3 px-4 text-xs">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h2 className="text-base font-display font-semibold text-slate-950 mb-3">Buyer Purchase Selections</h2>
                <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-600">
                        <th className="py-3 px-4">Buyer</th>
                        <th className="py-3 px-4">Dealership</th>
                        <th className="py-3 px-4">Car</th>
                        <th className="py-3 px-4 text-right">Agreed Price</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(overview?.purchases || []).map((p) => (
                        <tr key={p.id}>
                          <td className="py-3 px-4 font-medium text-slate-900">{p.buyer_name}</td>
                          <td className="py-3 px-4 text-slate-700">{p.dealership_name}</td>
                          <td className="py-3 px-4 text-slate-700">{p.brand} {p.model}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums">{formatINR(p.agreed_price)}</td>
                          <td className="py-3 px-4 text-xs font-medium text-blue-700">{p.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                    <select
                      value={demandCity}
                      onChange={(e) => setDemandCity(e.target.value)}
                      className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
                    >
                      <option value="All">All Cities</option>
                      {(demandData?.availableCities || []).map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Car Model</label>
                    <select
                      value={demandModel}
                      onChange={(e) => setDemandModel(e.target.value)}
                      className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
                    >
                      <option value="All">All Models</option>
                      {(demandData?.availableModels || []).map((mod) => (
                        <option key={mod} value={mod}>{mod}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Forecast Window</label>
                    <select
                      value={horizon}
                      onChange={(e) => setHorizon(Number(e.target.value))}
                      className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white"
                    >
                      <option value={3}>Next 3 Months</option>
                      <option value={4}>Next 4 Months</option>
                      <option value={6}>Next 6 Months</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={retraining}
                  onClick={handleRetrain}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
                  <span>{retraining ? 'Refreshing Models...' : 'Refresh Prediction Models'}</span>
                </button>
              </div>

              {demandData && <DemandCharts demandData={demandData} />}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-display font-semibold text-slate-950">Platform Summary Report</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Export active and completed buying group records for offline review.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadCsvReport}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Groups CSV</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Approved Dealerships</span>
                  <span className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                    {(overview?.dealers || []).filter((d) => d.approval_status === 'Approved').length}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Total Active Quotations</span>
                  <span className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                    {(overview?.offers || []).filter((o) => o.status === 'Active').length}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Buyer Interest Conversions</span>
                  <span className="text-lg font-mono font-semibold text-slate-900 tabular-nums">
                    {m.totalPurchases || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <h2 className="text-base font-display font-semibold text-slate-950">Platform Settings & Model Status</h2>
              <div className="text-sm text-slate-700 space-y-2">
                <p>
                  <span className="text-slate-500">Default Group Target:</span> 5 buyers per city collective
                </p>
                <p>
                  <span className="text-slate-500">Fair Price Model Status:</span>{' '}
                  {mlStatus?.priceModelReady ? 'Ready' : 'Not Trained'}
                </p>
                <p>
                  <span className="text-slate-500">Demand Trend Model Status:</span>{' '}
                  {mlStatus?.demandModelReady ? 'Ready' : 'Not Trained'}
                </p>
              </div>
              <button
                type="button"
                disabled={retraining}
                onClick={handleRetrain}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {retraining ? 'Refreshing...' : 'Refresh All AI Models'}
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteCarTarget)}
        title="Remove Car from Catalog?"
        message="This will remove the vehicle listing and any linked buyer groups."
        confirmLabel="Remove Car"
        destructive
        onConfirm={handleDeleteCar}
        onCancel={() => setDeleteCarTarget(null)}
      />
    </DashboardLayout>
  );
}
