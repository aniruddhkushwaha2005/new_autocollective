import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

const FRIENDLY_FACTOR_NAMES = {
  ex_showroom_lakh: 'Ex-Showroom Price Tier',
  model_avg_ex: 'Car Model Segment',
  city_rto_factor: 'City Road Tax & RTO',
  vehicle_age: 'Manufacturing Year / Age',
  km_driven_k: 'Kilometres Driven',
  fuel_code: 'Fuel Type',
  transmission_code: 'Gearbox Type',
  mileage_kmpl: 'Fuel Efficiency',
  brand_code: 'Car Brand'
};

export default function PriceCharts({ prediction }) {
  if (!prediction || !prediction.modelReady) return null;

  const comparisonData = [
    {
      label: 'Lowest Expected',
      price: prediction.lowerRangeLakh
    },
    {
      label: 'Estimated Fair Price',
      price: prediction.predictedPriceLakh
    },
    {
      label: 'Highest Expected',
      price: prediction.upperRangeLakh
    }
  ];

  if (prediction.dealerQuotationLakh) {
    comparisonData.push({
      label: 'Dealer Quote',
      price: Number(prediction.dealerQuotationLakh)
    });
  }

  const importanceData = (prediction.featureImportance || []).slice(0, 5).map((item) => ({
    feature: FRIENDLY_FACTOR_NAMES[item.feature] || item.feature.replace(/_/g, ' '),
    importance: item.importance
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-900">Price Comparison (₹ Lakh)</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          How our estimated fair price compares with the expected price range and dealer quote.
        </p>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} unit="L" />
              <Tooltip
                formatter={(val) => [`₹${Number(val).toFixed(2)} Lakh`, 'Price']}
                contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#cbd5e1' }}
              />
              <Bar dataKey="price" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-900">What Influenced This Price Most?</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          The biggest vehicle and location factors that shaped this estimate.
        </p>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={importanceData}
              layout="vertical"
              margin={{ top: 8, right: 20, left: 20, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#475569' }} unit="%" />
              <YAxis dataKey="feature" type="category" width={140} tick={{ fontSize: 11, fill: '#334155' }} />
              <Tooltip
                formatter={(val) => [`${val}% influence`, 'Impact']}
                contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#cbd5e1' }}
              />
              <Bar dataKey="importance" fill="#1e293b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
