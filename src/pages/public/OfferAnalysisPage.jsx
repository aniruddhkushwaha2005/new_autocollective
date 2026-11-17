import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import api from '../../services/api';
import OfferComparisonTable from '../../components/offers/OfferComparisonTable';
import { formatINR } from '../../utils/format';

export default function OfferAnalysisPage() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('all');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    api.get('/groups').then((res) => {
      setGroups(res.data.groups || []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    const payload = selectedGroupId === 'all' ? {} : { group_id: selectedGroupId };
    api
      .post('/ml/offer-analysis', payload)
      .then((res) => setAnalysis(res.data))
      .finally(() => setLoading(false));
  }, [selectedGroupId]);

  const chartData = (analysis?.analyzedOffers || []).map((o) => ({
    dealer: o.dealer_name.split(' ').slice(0, 2).join(' '),
    ExShowroom: Math.round(o.ex_showroom_price / 1000),
    InsuranceRTO: Math.round((o.insurance_charges + o.registration_charges) / 1000),
    Addons: Math.round((o.accessories_cost + o.extended_warranty + o.additional_charges) / 1000),
    Discount: Math.round(o.totalDiscount / 1000)
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/ai-tools" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-5">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to AI Smart Tools</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-blue-600">AI Smart Tools · Deal Checker</p>
          <h1 className="mt-1 text-3xl font-display font-bold text-slate-950">Are You Getting the Best Deal?</h1>
          <p className="mt-2 text-base text-slate-600 max-w-2xl">
            Compare real dealership quotations side by side, check for unusually high insurance or accessory charges, and see which offer gives the best overall value.
          </p>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-xs font-medium text-slate-700 mb-1">Choose a Buying Group</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="all">All Active Quotations</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.brand} {g.model} · {g.city}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : !analysis?.summary ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-500">
          No dealer quotations have been submitted for this buying group yet.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Plain-English Best Value Callout */}
          <div className="bg-white border border-emerald-200 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-display font-semibold text-slate-950">
                  Best Value Offer Found: {analysis.summary.bestValueDealer}
                </h2>
                <p className="mt-1 text-sm text-slate-700">
                  {analysis.summary.bestValueDealer === analysis.summary.lowestPriceDealer
                    ? 'This offer has the lowest total cost among the available complete quotations, with clear pricing and zero surprise handling fees.'
                    : `This quotation offers strong transparent pricing (${analysis.summary.bestValueScore}/100 value rating) across insurance, accessories, and collective discounts.`}
                </p>
              </div>
            </div>
          </div>

          {/* 3 Simple Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="text-xs text-slate-500">Best Overall Value</span>
              <p className="mt-1 text-lg font-display font-bold text-slate-950">{analysis.summary.bestValueDealer}</p>
              <p className="mt-1 text-sm font-mono text-emerald-700 font-semibold tabular-nums">
                Value Rating: {analysis.summary.bestValueScore}/100
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="text-xs text-slate-500">Lowest Total On-Road Cost</span>
              <p className="mt-1 text-lg font-display font-bold text-slate-950">{analysis.summary.lowestPriceDealer}</p>
              <p className="mt-1 text-sm font-mono text-blue-700 font-semibold tabular-nums">
                {formatINR(analysis.summary.lowestOnRoadPrice)}
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="text-xs text-slate-500">Highest Total Discounts</span>
              <p className="mt-1 text-lg font-display font-bold text-slate-950">{analysis.summary.highestDiscountDealer}</p>
              <p className="mt-1 text-sm font-mono text-slate-900 font-semibold tabular-nums">
                {formatINR(analysis.summary.highestDiscount)} saved
              </p>
            </div>
          </div>

          {/* Cost Breakdown Chart */}
          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-sm font-semibold text-slate-950">What Makes Up Each Dealer's Price (₹ Thousands)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare base car price, insurance & road tax, dealer add-ons, and discounts side by side.
            </p>
            <div className="h-72 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dealer" tick={{ fontSize: 12, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="k" />
                  <Tooltip formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}k`, '']} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="ExShowroom" name="Ex-Showroom" fill="#0f172a" />
                  <Bar dataKey="InsuranceRTO" name="Insurance + Registration" fill="#2563eb" />
                  <Bar dataKey="Addons" name="Accessories + Extras" fill="#d97706" />
                  <Bar dataKey="Discount" name="Total Discounts" fill="#16a34a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <OfferComparisonTable
            offers={analysis.analyzedOffers}
            bestValueOfferId={analysis.summary.bestValueOfferId}
          />

          <div className="bg-white border border-slate-200 rounded-lg p-5 text-xs text-slate-600">
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              className="inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
            >
              <span>How does this work?</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} />
            </button>
            {showHowItWorks && (
              <p className="mt-2 leading-relaxed">
                AutoCollective checks every dealer quote stored in our database—comparing total on-road cost, discount percentage, whether insurance or accessories look higher than normal, and whether any mandatory cost fields were left out. Price differences alone do not mean a dealer is unfair; we highlight items worth double-checking before you book.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
