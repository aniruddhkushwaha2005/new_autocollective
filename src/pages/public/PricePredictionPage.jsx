import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronDown, ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import PriceCharts from '../../components/analytics/PriceCharts';
import { CAR_BRANDS, FUEL_TYPES, INDIAN_CITIES, TRANSMISSIONS, formatINR } from '../../utils/format';

const MODEL_DEFAULTS = {
  Creta: { brand: 'Hyundai', variant: 'SX(O) Tech', ex: 18.45, mileage: 17.8 },
  Nexon: { brand: 'Tata', variant: 'Fearless+ S', ex: 14.79, mileage: 18.5 },
  'Grand Vitara': { brand: 'Maruti Suzuki', variant: 'Alpha+ Hybrid', ex: 19.93, mileage: 23.4 },
  XUV700: { brand: 'Mahindra', variant: 'AX7 Luxury', ex: 23.99, mileage: 14.5 },
  Seltos: { brand: 'Kia', variant: 'GTX+ Turbo', ex: 19.82, mileage: 17.6 },
  City: { brand: 'Honda', variant: 'ZX CVT', ex: 16.35, mileage: 19.2 },
  'Nexon EV': { brand: 'Tata', variant: 'Empowered+ LR', ex: 16.99, mileage: 38.0 },
  'Innova Hycross': { brand: 'Toyota', variant: 'ZX(O) Hybrid', ex: 30.98, mileage: 21.1 },
  Brezza: { brand: 'Maruti Suzuki', variant: 'ZXi+ AT', ex: 14.14, mileage: 19.8 },
  'Scorpio-N': { brand: 'Mahindra', variant: 'Z8L AT', ex: 24.54, mileage: 14.8 },
  Slavia: { brand: 'Skoda', variant: 'Prestige TSI', ex: 18.69, mileage: 18.7 },
  'ZS EV': { brand: 'MG', variant: 'Essence Pro', ex: 25.44, mileage: 41.0 }
};

export default function PricePredictionPage() {
  const [mlStatus, setMlStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const [form, setForm] = useState({
    brand: 'Hyundai',
    model: 'Creta',
    variant: 'SX(O) Tech',
    year: 2026,
    fuelType: 'Petrol',
    transmission: 'DCT',
    mileageKmpl: 18.4,
    kmDriven: 0,
    city: 'Bengaluru',
    exShowroomLakh: 18.45,
    dealerQuotationLakh: 20.1
  });

  useEffect(() => {
    api.get('/ml/status').then((res) => setMlStatus(res.data)).catch(() => {});
  }, []);

  const handleModelSelect = (modelName) => {
    const def = MODEL_DEFAULTS[modelName];
    setForm((prev) => ({
      ...prev,
      model: modelName,
      brand: def ? def.brand : prev.brand,
      variant: def ? def.variant : prev.variant,
      exShowroomLakh: def ? def.ex : prev.exShowroomLakh,
      mileageKmpl: def ? def.mileage : prev.mileageKmpl
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/ml/price-prediction', form);
      setPrediction(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction is currently unavailable. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const getDealerComparisonCopy = () => {
    if (!prediction || prediction.priceDifferenceLakh === null) return null;
    const diffRupees = Math.abs(Math.round(prediction.priceDifferenceLakh * 100000));
    if (prediction.priceDifferenceLakh <= -0.25) {
      return {
        badge: `${formatINR(diffRupees)} below estimated price`,
        tone: 'text-emerald-700',
        explanation:
          'Based on the car details and available training data, this dealer offer appears slightly lower than the estimated market price.'
      };
    }
    if (prediction.priceDifferenceLakh >= 0.35) {
      return {
        badge: `${formatINR(diffRupees)} above estimated price`,
        tone: 'text-amber-700',
        explanation:
          'Based on the car details and available training data, this dealer quote is higher than our estimated price. Check insurance, accessories, or handling charges.'
      };
    }
    return {
      badge: `Within ${formatINR(diffRupees)} of estimated price`,
      tone: 'text-blue-700',
      explanation:
        'Based on the car details and available training data, this dealer quotation sits close to our estimated market price.'
    };
  };

  const comparison = getDealerComparisonCopy();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/ai-tools" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 mb-5">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to AI Smart Tools</span>
      </Link>

      <div className="max-w-3xl mb-8">
        <p className="text-sm font-medium text-blue-600">AI Smart Tools · Fair Price Check</p>
        <h1 className="mt-1 text-3xl font-display font-bold text-slate-950">What Should This Car Cost?</h1>
        <p className="mt-2 text-base text-slate-600">
          Enter your car details and city below to get an estimated fair price and see whether a showroom quote is lower, near, or higher than expected.
        </p>
      </div>

      {mlStatus && !mlStatus.priceModelReady && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-sm text-amber-900">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Price Prediction Currently Unavailable</p>
            <p className="mt-0.5">Our pricing model is currently not trained yet. Please ask an administrator to prepare the model.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-display font-semibold text-slate-950">Tell Us About the Car</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Car Model</label>
              <select
                value={form.model}
                onChange={(e) => handleModelSelect(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {Object.keys(MODEL_DEFAULTS).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Brand</label>
              <select
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {CAR_BRANDS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Variant</label>
              <input
                type="text"
                value={form.variant}
                onChange={(e) => setForm({ ...form, variant: e.target.value })}
                placeholder="e.g. SX(O) Tech"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Your City</label>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Fuel Type</label>
              <select
                value={form.fuelType}
                onChange={(e) => setForm({ ...form, fuelType: e.target.value })}
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
                value={form.transmission}
                onChange={(e) => setForm({ ...form, transmission: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
              >
                {TRANSMISSIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mfg. Year</label>
              <input
                type="number"
                min="2019"
                max="2026"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mileage (km/l)</label>
              <input
                type="number"
                step="0.1"
                value={form.mileageKmpl}
                onChange={(e) => setForm({ ...form, mileageKmpl: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Km Driven</label>
              <input
                type="number"
                min="0"
                step="500"
                value={form.kmDriven}
                onChange={(e) => setForm({ ...form, kmDriven: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Ex-Showroom (₹ Lakh)</label>
              <input
                type="number"
                step="0.05"
                min="4"
                value={form.exShowroomLakh}
                onChange={(e) => setForm({ ...form, exShowroomLakh: Number(e.target.value) })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Dealer Quote (₹ Lakh)</label>
              <input
                type="number"
                step="0.05"
                placeholder="Optional"
                value={form.dealerQuotationLakh}
                onChange={(e) => setForm({ ...form, dealerQuotationLakh: e.target.value })}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? 'Checking Fair Price...' : 'Check Fair Car Price'}
          </button>
        </form>

        {/* Results */}
        <div className="lg:col-span-7 space-y-6">
          {!prediction ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
              <h2 className="text-base font-semibold text-slate-950">Enter Your Car Details to See a Fair Price</h2>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                Fill in the car brand, model, year, city, and an optional dealer quotation on the left to see our estimated market price and comparison.
              </p>
            </div>
          ) : !prediction.modelReady ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-sm text-amber-900">
              Price prediction is currently unavailable because the pricing model has not been prepared yet.
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-6">
                <h2 className="text-lg font-display font-semibold text-slate-950">Your Estimated Car Price</h2>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5 pb-5 border-b border-slate-100">
                  <div>
                    <span className="text-xs text-slate-500 block">Estimated Price</span>
                    <span className="mt-1 text-3xl font-mono font-bold text-slate-950 tabular-nums block">
                      ₹{prediction.predictedPriceLakh.toFixed(2)} Lakh
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Typical Price Range</span>
                    <span className="mt-1 text-lg font-mono font-semibold text-slate-800 tabular-nums block">
                      ₹{prediction.lowerRangeLakh.toFixed(2)}L – ₹{prediction.upperRangeLakh.toFixed(2)}L
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Dealer Offer</span>
                    {prediction.dealerQuotationLakh ? (
                      <span className="mt-1 text-lg font-mono font-semibold text-slate-900 tabular-nums block">
                        ₹{Number(prediction.dealerQuotationLakh).toFixed(2)} Lakh
                      </span>
                    ) : (
                      <span className="mt-1 text-sm text-slate-400 block">Not entered</span>
                    )}
                  </div>
                </div>

                {comparison && (
                  <div className="mt-5 bg-slate-50 border border-slate-200 rounded-md p-4">
                    <p className={`text-sm font-semibold ${comparison.tone}`}>
                      Difference: {comparison.badge}
                    </p>
                    <p className="mt-1 text-sm text-slate-700 leading-relaxed">{comparison.explanation}</p>
                  </div>
                )}

                <p className="mt-4 text-xs text-slate-500">
                  Note: Estimates are generated from historical sample pricing data for reference only and do not guarantee exact showroom billing.
                </p>

                {/* Optional How does this work? */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowHowItWorks((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    <span>How does this work?</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHowItWorks ? 'rotate-180' : ''}`} />
                  </button>
                  {showHowItWorks && (
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      Our price checker compares your vehicle's brand, model, ex-showroom tier, manufacturing year, fuel type, gearbox, and city road-tax profile against hundreds of Indian vehicle records using trained pricing models to calculate a fair value and expected range.
                    </p>
                  )}
                </div>
              </div>

              <PriceCharts prediction={prediction} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
