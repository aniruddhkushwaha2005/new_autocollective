import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export default function DemandCharts({ demandData }) {
  if (!demandData || !demandData.modelReady) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 lg:col-span-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Monthly Car Buyer Interest: Past Activity vs. Expected Trend
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dark solid line shows actual past monthly requests. Dashed blue line shows estimated upcoming interest.
          </p>
        </div>

        <div className="h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={demandData.timeline} margin={{ top: 10, right: 20, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#cbd5e1' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="actualDemand"
                name="Past Buyer Requests (Actual)"
                stroke="#0f172a"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecastDemand"
                name="Expected Buyer Interest (Predicted)"
                stroke="#2563eb"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-900">City-Wise Buyer Interest</h3>
        <p className="text-xs text-slate-500 mt-0.5">Recent monthly buyer requests compared with next-month outlook.</p>
        <div className="h-64 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demandData.cityComparison} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="city" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px', borderColor: '#cbd5e1' }} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="currentMonthRequests" name="Recent Month" fill="#334155" radius={[3, 3, 0, 0]} />
              <Bar dataKey="nextMonthForecast" name="Expected Next Month" fill="#2563eb" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-900">Most Popular Cars Right Now</h3>
        <p className="text-xs text-slate-500 mt-0.5">Cars attracting the highest number of group-buying requests.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">Car Model</th>
                <th className="py-2 text-right">Recent Requests</th>
                <th className="py-2 text-right">Expected Next Month</th>
                <th className="py-2 text-right">Popularity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(demandData.popularModels || []).slice(0, 8).map((m) => (
                <tr key={m.model}>
                  <td className="py-2.5 font-medium text-slate-900">
                    {m.brand} {m.model}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">{m.recentRequests}</td>
                  <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {m.nextForecast}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`font-medium ${
                        m.demandLevel === 'High Demand'
                          ? 'text-emerald-700'
                          : m.demandLevel === 'Moderate'
                            ? 'text-blue-700'
                            : 'text-amber-700'
                      }`}
                    >
                      {m.demandLevel === 'High Demand'
                        ? 'Rising Fast'
                        : m.demandLevel === 'Moderate'
                          ? 'Steady Interest'
                          : 'Lower Interest'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
