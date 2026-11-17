import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function HowItWorksPage() {
  const stages = [
    {
      num: 'STEP 1: Choose Your Car',
      body: 'Tell us which brand, model, variant, fuel type, city, and budget you have in mind. We prevent accidental duplicate requests so your shortlist stays clean.'
    },
    {
      num: 'STEP 2: Find People Who Want the Same Car',
      body: 'We match you with other verified buyers in your city looking for the same car and budget range, building a group of up to 5 buyers.'
    },
    {
      num: 'STEP 3: Compare Clear Dealer Offers',
      body: 'Once your group gains momentum, verified dealerships submit itemized quotes covering ex-showroom price, insurance, registration, accessories, and group discounts.'
    },
    {
      num: 'STEP 4: Use AI Smart Tools Before You Decide',
      body: 'Check what the car should actually cost, see which cars are becoming popular in your city, and inspect our Deal Checker to pick the best overall value.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-display font-bold text-slate-950">How AutoCollective Works</h1>
      <p className="mt-2 text-base text-slate-600 max-w-2xl">
        Buying a car with other buyers is simple, transparent, and puts negotiating power on your side.
      </p>

      <div className="mt-10 space-y-5">
        {stages.map((s) => (
          <div key={s.num} className="bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-lg font-display font-semibold text-slate-950">{s.num}</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white border border-slate-200 rounded-lg p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-display font-semibold text-slate-950">Ready to get started?</h3>
          <p className="mt-1 text-sm text-slate-600">Explore active buying groups or check a car's fair price first.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link to="/ai-tools" className="px-4 py-2.5 text-sm font-medium text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50">
            Try AI Smart Tools
          </Link>
          <Link to="/groups" className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 inline-flex items-center gap-1.5">
            <span>Explore Group Deals</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
