import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import GroupCard from '../../components/groups/GroupCard';
import EmptyState from '../../components/common/EmptyState';
import { CAR_BRANDS, INDIAN_CITIES } from '../../utils/format';

const GROUP_STATUSES = [
  'All',
  'Collecting Buyers',
  'Ready for Negotiation',
  'Negotiating',
  'Offer Received',
  'Deal Completed'
];

export default function BrowseGroupsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [city, setCity] = useState(searchParams.get('city') || 'All');
  const [brand, setBrand] = useState(searchParams.get('brand') || 'All');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/groups', { params: { city, brand, status, search } });
      setGroups(data.groups || []);
    } catch {
      notify('Unable to load buyer collectives.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [city, brand, status]);

  const handleJoin = async (groupId) => {
    if (!user) {
      notify('Please sign in as a buyer to join a collective.', 'info');
      navigate('/login');
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/groups/${groupId}/join`);
      notify('Successfully joined buyer collective.', 'success');
      await loadGroups();
    } catch (err) {
      notify(err.response?.data?.detail || 'Unable to join group.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async (groupId) => {
    setActionLoading(true);
    try {
      await api.post(`/groups/${groupId}/leave`);
      notify('You left the buyer collective.', 'info');
      await loadGroups();
    } catch (err) {
      notify(err.response?.data?.detail || 'Unable to leave group.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Browse Active Group Deals</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Find buyers near you who want the same car, join a group, and compare offers from approved dealerships.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(user ? '/dashboard?tab=find-car' : '/login')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors whitespace-nowrap"
        >
          Start My Car Request
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadGroups();
          }}
          className="flex border border-slate-300 rounded-md px-3 bg-white"
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search code, model, city..."
            className="w-full py-2 text-sm focus:outline-none"
          />
          <button type="submit" className="text-xs font-medium text-blue-600">
            Go
          </button>
        </form>

        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="All">All Cities</option>
          {INDIAN_CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="All">All Brands</option>
          {CAR_BRANDS.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          {GROUP_STATUSES.map((s) => (
            <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No buying groups match these filters"
          description="Tell us which car you want in your city and we will match you with other buyers or start a new group."
          actionLabel="Reset Filters"
          onAction={() => {
            setCity('All');
            setBrand('All');
            setStatus('All');
            setSearch('');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {groups.map((grp) => (
            <GroupCard
              key={grp.id}
              group={grp}
              onJoin={handleJoin}
              onLeave={handleLeave}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}
    </div>
  );
}
