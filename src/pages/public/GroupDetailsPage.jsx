import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CarImage from '../../components/common/CarImage';
import OfferComparisonTable from '../../components/offers/OfferComparisonTable';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { formatDate, formatLakhs } from '../../utils/format';

export default function GroupDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();

  const [data, setData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const loadGroupDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/groups/${id}`);
      setData(res.data);
      if (res.data.offers && res.data.offers.length > 0) {
        const analRes = await api.post('/ml/offer-analysis', { group_id: id });
        setAnalysis(analRes.data);
      } else {
        setAnalysis(null);
      }
    } catch {
      notify('Unable to load group details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroupDetails();
  }, [id]);

  const handleJoin = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/groups/${id}/join`);
      notify('You joined this buying group.', 'success');
      await loadGroupDetails();
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not join group.', 'error');
    }
  };

  const handleLeave = async () => {
    setConfirmLeaveOpen(false);
    try {
      await api.post(`/groups/${id}/leave`);
      notify('You left the buying group.', 'info');
      await loadGroupDetails();
    } catch (err) {
      notify(err.response?.data?.detail || 'Could not leave group.', 'error');
    }
  };

  const handleExpressInterest = async (offer) => {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post('/purchases', { offer_id: offer.id });
      notify(`Purchase interest sent to ${offer.dealer_name}.`, 'success');
      navigate('/dashboard?tab=purchases');
    } catch (err) {
      notify(err.response?.data?.detail || 'Unable to record purchase interest.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!data?.group) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-slate-600">Group not found.</p>
      </div>
    );
  }

  const { group, members, offers } = data;
  const displayOffers = analysis?.analyzedOffers || offers;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/groups" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Group Deals</span>
      </Link>

      {/* Group Header */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 bg-slate-100 min-h-[240px]">
          <CarImage
            src={group.image_url}
            alt={`${group.brand} ${group.model}`}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono text-slate-500">{group.group_code}</span>
              <span className="font-semibold text-blue-700">{group.status}</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-display font-bold text-slate-900">
              {group.brand} {group.model} {group.variant}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {group.city} · {group.fuel_type} · {group.transmission} · {group.timeline}
            </p>
            {group.negotiation_notes && (
              <p className="mt-4 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3">
                {group.negotiation_notes}
              </p>
            )}

            <div className="mt-5 grid grid-cols-3 gap-4 pt-4 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-500 block">Buyers Joined</span>
                <span className="text-base font-mono font-semibold text-slate-900 tabular-nums">
                  {group.current_members} of {group.target_members} buyers
                </span>
                <span className="block text-[11px] text-blue-700 mt-0.5">
                  {group.current_members < group.target_members
                    ? `${group.target_members - group.current_members} more buyer${group.target_members - group.current_members > 1 ? 's' : ''} needed!`
                    : 'Group ready for dealer offers!'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Budget Band</span>
                <span className="text-sm font-mono font-medium text-slate-900 tabular-nums">
                  {formatLakhs(group.min_budget)} – {formatLakhs(group.max_budget)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Created On</span>
                <span className="text-sm text-slate-900">{formatDate(group.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {group.is_member ? (
              <button
                type="button"
                onClick={() => setConfirmLeaveOpen(true)}
                className="px-4 py-2 text-sm font-medium text-red-700 border border-red-200 rounded-md hover:bg-red-50"
              >
                Leave Group
              </button>
            ) : (
              group.current_members < group.target_members &&
              !['Deal Completed', 'Expired'].includes(group.status) && (
                <button
                  type="button"
                  onClick={handleJoin}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Join This Group
                </button>
              )
            )}
            <Link
              to="/ai-tools/price"
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Check Fair Price
            </Link>
          </div>
        </div>
      </div>

      {/* Group Members */}
      <section className="mt-10">
        <h2 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <span>Buyers in This Group ({members.length})</span>
        </h2>
        <div className="mt-4 bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          {members.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">No buyers have joined yet.</div>
          ) : (
            members.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-slate-900">{m.display_name}</span>
                  <span className="text-slate-500 ml-2 text-xs">· {m.city}</span>
                </div>
                <span className="text-xs text-slate-500">Joined {formatDate(m.joined_at)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Dealer Quotations & Smart Offer Check */}
      <section className="mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Dealer Offers & Deal Check</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare showroom price, insurance, registration, extras, and discounts side by side.
            </p>
          </div>
          {analysis?.summary && (
            <div className="text-xs text-emerald-700 font-medium">
              Best Value Offer Found: {analysis.summary.bestValueDealer} (Deal Rating {analysis.summary.bestValueScore}/100)
            </div>
          )}
        </div>

        <OfferComparisonTable
          offers={displayOffers}
          bestValueOfferId={analysis?.summary?.bestValueOfferId}
          onExpressInterest={user?.role === 'buyer' || !user ? handleExpressInterest : undefined}
        />
      </section>

      <ConfirmDialog
        open={confirmLeaveOpen}
        title="Leave This Buying Group?"
        message={`Are you sure you want to leave ${group.group_code}? Another buyer in ${group.city} may take your spot.`}
        confirmLabel="Leave Group"
        destructive
        onConfirm={handleLeave}
        onCancel={() => setConfirmLeaveOpen(false)}
      />
    </div>
  );
}
