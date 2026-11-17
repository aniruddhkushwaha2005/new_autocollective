import { Link } from 'react-router-dom';
import { ArrowRight, IndianRupee, TrendingUp, BadgeCheck } from 'lucide-react';

export default function AiToolsHubPage() {
  const tools = [
    {
      title: 'What Should This Car Cost?',
      subtitle: 'Fair Car Price Checker',
      description:
        'Enter your car brand, model, year, fuel type, and city to see what the car should reasonably cost—and check if a dealership quote is fair.',
      cta: 'Check Car Price',
      to: '/ai-tools/price',
      icon: IndianRupee
    },
    {
      title: 'Which Cars Are Becoming Popular?',
      subtitle: 'City & Model Interest Trends',
      description:
        'See which cars are attracting the most buyer requests in Bengaluru, Delhi NCR, Mumbai, Pune, and other Indian cities.',
      cta: 'Explore Popular Cars',
      to: '/ai-tools/demand',
      icon: TrendingUp
    },
    {
      title: 'Are You Getting the Best Deal?',
      subtitle: 'Dealer Offer Comparison Helper',
      description:
        'Compare dealership quotes line by line—ex-showroom, insurance, RTO, accessories, and discounts—to spot extra charges and find the best overall value.',
      cta: 'Compare Dealer Offers',
      to: '/ai-tools/offers',
      icon: BadgeCheck
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-blue-600">AI Smart Tools</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-display font-bold text-slate-950">
          Smart Tools to Help You Buy Better
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          You don't need to know anything about machine learning or automotive pricing formulas. Pick a tool below to get clear answers before speaking with a showroom.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.to}
              className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between"
            >
              <div>
                <div className="w-11 h-11 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="mt-5 text-xs font-medium text-slate-500">{tool.subtitle}</p>
                <h2 className="mt-1 text-xl font-display font-semibold text-slate-950">{tool.title}</h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{tool.description}</p>
              </div>

              <Link
                to={tool.to}
                className="mt-6 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
              >
                <span>{tool.cta}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
