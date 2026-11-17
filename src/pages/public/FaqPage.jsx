import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQS = [
  {
    q: 'How does collective car buying reduce on-road prices?',
    a: 'Dealerships allocate monthly volume targets. When 5 buyers commit to the same model and city within a 30-to-45-day window, dealers compete with fleet-style cash discounts, lower insurance margins, and waived handling charges.'
  },
  {
    q: 'Is my car invoiced individually in my name?',
    a: 'Yes. Each member of an AutoCollective group receives an individual tax invoice, RTO registration, and manufacturer warranty directly from the selected authorized dealership.'
  },
  {
    q: 'How is the ML Car Price Prediction calculated?',
    a: 'Our ML pipeline compares Random Forest, Gradient Boosted, and Ridge Regression models trained on Indian vehicle specifications, depreciation age, mileage, and city RTO factors. Predictions include a P10–P90 range and clear development-dataset disclaimers.'
  },
  {
    q: 'What happens if a dealer submits high insurance or mandatory accessories?',
    a: 'The Dealer Offer Analyzer automatically flags insurance above 5.2% of ex-showroom, accessories above 3.0%, missing statutory fields, or handling surcharges so buyers can negotiate line-by-line.'
  },
  {
    q: 'Can any dealership post quotations on AutoCollective?',
    a: 'No. Dealership accounts remain in Pending status after registration until an Admin verifies their GST details and approves their account.'
  }
];

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-display font-bold text-slate-900">Frequently Asked Questions</h1>
      <p className="mt-2 text-sm text-slate-600">
        Details on buyer collectives, dealership verification, and ML model methodology.
      </p>

      <div className="mt-8 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {FAQS.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIdx(open ? -1 : idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-slate-900">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <div className="px-6 pb-5 text-sm text-slate-600 leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
