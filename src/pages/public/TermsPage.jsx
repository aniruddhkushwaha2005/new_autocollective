export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-slate-700 leading-relaxed">
      <h1 className="text-3xl font-display font-bold text-slate-900">Terms and Conditions</h1>
      <p className="text-xs text-slate-500">Effective Date: November 2026</p>
      <p>
        AutoCollective serves as a group-formation and quotation-analytics intermediary between prospective automobile buyers and independent dealerships in India.
      </p>
      <h2 className="text-base font-semibold text-slate-900 pt-2">1. Non-Binding Collective Participation</h2>
      <p>
        Submitting a buyer request or joining a collective does not constitute a vehicle purchase contract. Final vehicle booking, financing, and delivery occur directly between the buyer and the chosen dealership.
      </p>
      <h2 className="text-base font-semibold text-slate-900 pt-2">2. ML Estimates & Sample Quotations</h2>
      <p>
        Car price predictions and city demand forecasts are statistical estimates derived from development datasets and carry confidence intervals. They do not guarantee future showroom pricing or OEM discount availability.
      </p>
    </div>
  );
}
