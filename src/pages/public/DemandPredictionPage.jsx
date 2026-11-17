import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import DemandCharts from '../../components/analytics/DemandCharts';

export default function DemandPredictionPage() {
  const [city, setCity] = useState('All');
  const [model, setModel] = useState('All');
  const [horizonMonths, setHorizonMonths] = useState(4);
  const [demandData, setDemandData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    setLoading(true);
    api
      .get('/ml/demand-prediction', { params: { city, model, horizonMonths } })
      .then((res) => setDemandData(res.data))
      .finally(() => setLoading(false));
  }, [city, model, horizonMonths]);

  const topModel = demandData?.popularModels?.[0];
  const topCity = demandData?.cityComparison?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/ai-tools" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-5">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to AI Smart Tools</span>
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <p className="text-sm font-medium text-blue-600">AI Smart Tools · Car Popularity & Demand</p>
          <h1 className="mt-1 text-3xl font-display font-bold text-slate-950">Which Cars Are Becoming Popular?</h1>
          <p className="mt-2 text-base text-slate-600">
            See which car models are attracting more buyer interest and forming groups faster in your city.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
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
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="All">All Cars</option>
              {(demandData?.availableModels || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Look Ahead</label>
            <select
              value={horizonMonths}
              onChange={(e) => setHorizonMonths(Number(e.target.value))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value={3}>Next 3 Months</option>
              <option value={4}>Next 4 Months</option>
              <option value={6}>Next 6 Months</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-72 bg-white border border-slate-200 rounded-lg animate-pulse" />
      ) : !demandData?.modelReady ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 flex items-start gap-3 text-sm text-amber-900">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>Popularity trends are currently unavailable because the demand model has not been prepared yet.</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Plain-English Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {topModel && (
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Top Requested Model</span>
                <p className="mt-1 text-lg font-display font-semibold text-slate-950">
                  {topModel.brand} {topModel.model}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {topModel.brand} {topModel.model} demand is {topModel.demandLevel === 'High Demand' ? 'increasing strongly' : 'staying steady'} {city === 'All' ? 'across major cities' : `in ${city}`}.
                </p>
              </div>
            )}

            {topCity && (
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <span className="text-xs text-slate-500">Most Active City</span>
                <p className="mt-1 text-lg font-display font-semibold text-slate-950">{topCity.city}</p>
                <p className="mt-1 text-xs text-slate-600">
                  Expected {topCity.nextMonthForecast} buyer requests next month ({topCity.growthPct >= 0 ? `+${topCity.growthPct}%` : `${topCity.growthPct}%`} change).
                </p>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <span className="text-xs text-slate-500">Why This Helps Buyers</span>
              <p className="mt-1 text-sm font-medium text-slate-900">Faster Group Completion</p>
              <p className="mt-1 text-xs text-slate-600">
                High-interest models reach the 5-buyer group target quicker so dealer negotiations start sooner.
              </p>
            </div>
          </div>

          <DemandCharts demandData={demandData} />

          <div className="bg-white border border-slate-200 rounded-lg p-5 text-xs text-slate-600">
            <p>
              Note: Historical figures represent recorded sample activity, while dashed future points are estimated projections for planning and demonstration.
            </p>
            <button
              type="button"
              onClick={() => setShowHowItWorks((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 font-medium text-blue-600 hover:text-blue-700"
            >
              <span>How does this work?</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} />
            </button>
            {showHowItWorks && (
              <p className="mt-2 text-slate-600 leading-relaxed">
                AutoCollective reviews 18 months of city-by-city car requests and seasonal Indian buying patterns (such as festive-season peaks) to estimate whether interest in a car model is growing or cooling down.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
