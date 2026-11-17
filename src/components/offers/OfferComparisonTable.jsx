import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../../utils/format';

export default function OfferComparisonTable({ offers, bestValueOfferId, onExpressInterest, selectedOfferIds = [] }) {
  if (!offers || offers.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
        No dealer quotations available for comparison yet.
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-600">
              <th className="py-3 px-4">Dealership</th>
              <th className="py-3 px-4 text-right">Ex-Showroom</th>
              <th className="py-3 px-4 text-right">Insurance</th>
              <th className="py-3 px-4 text-right">Registration</th>
              <th className="py-3 px-4 text-right">Accessories</th>
              <th className="py-3 px-4 text-right">Discounts</th>
              <th className="py-3 px-4 text-right">Extra Charges</th>
              <th className="py-3 px-4 text-right">Final On-Road</th>
              <th className="py-3 px-4 text-right">Deal Rating</th>
              {onExpressInterest && <th className="py-3 px-4 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {offers.map((offer) => {
              const totalDiscount =
                Number(offer.group_discount || 0) +
                Number(offer.exchange_bonus || 0) +
                Number(offer.corporate_offer || 0);
              const isBest = bestValueOfferId && offer.id === bestValueOfferId;
              const isSelected = selectedOfferIds.includes(offer.id);

              return (
                <tr key={offer.id} className="hover:bg-slate-50/70 transition-colors align-top">
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{offer.dealer_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {offer.brand} {offer.model} · {offer.delivery_timeline}
                      {offer.is_sample ? ' · Sample Quote' : ''}
                    </div>
                    {isBest && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Best Overall Value</span>
                      </div>
                    )}
                    {offer.explanation && (
                      <p className="mt-1 text-xs text-slate-600 max-w-xs">{offer.explanation}</p>
                    )}
                    {offer.warnings && offer.warnings.length > 0 && (
                      <div className="mt-1.5 flex items-start gap-1 text-xs text-amber-700 max-w-xs">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{offer.warnings[0]}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(offer.ex_showroom_price)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(offer.insurance_charges)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(offer.registration_charges)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(offer.accessories_cost)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-700 font-medium">
                    -{formatINR(totalDiscount)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                    {formatINR(offer.additional_charges)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {formatINR(offer.final_on_road_price)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums">
                    {offer.offerScore ? (
                      <span
                        className={`font-semibold ${
                          offer.offerScore >= 80
                            ? 'text-emerald-700'
                            : offer.offerScore >= 65
                              ? 'text-blue-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {offer.offerScore}/100
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  {onExpressInterest && (
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        disabled={isSelected}
                        onClick={() => onExpressInterest(offer)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Choose Offer'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
