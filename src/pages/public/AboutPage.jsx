export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900">About AutoCollective</h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          AutoCollective is an Indian automotive procurement technology platform built around a straightforward insight: individual car buyers negotiate alone against opaque on-road pricing sheets, whereas five verified buyers purchasing the same model in the same city represent a high-value batch order for dealerships.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-display font-semibold text-slate-900">Our Engineering Philosophy</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            We strictly separate deterministic database group matching from predictive Machine Learning modules. Group formation follows verifiable rules; price prediction, city demand forecasting, and offer scoring rely on documented statistical and tree-based models with transparent limitations.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-display font-semibold text-slate-900">Balanced Marketplace</h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Dealerships benefit from reduced customer acquisition cost and confirmed multi-unit monthly volume, while buyers receive itemized ex-showroom, RTO, insurance, and discount visibility before visiting a showroom.
          </p>
        </div>
      </div>
    </div>
  );
}
