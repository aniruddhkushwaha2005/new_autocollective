// Intelligent Dealer Offer Analysis Engine
// Evaluates pricing transparency, effective discounts, unusual fee ratios, and missing line items.
// Never labels a dealer dishonest or fraudulent solely based on price variation.

export function analyzeDealerOffers(offers) {
  if (!offers || offers.length === 0) {
    return {
      analyzedOffers: [],
      summary: null
    };
  }

  const enriched = offers.map((o) => {
    const exShowroom = Number(o.ex_showroom_price || 0);
    const insurance = Number(o.insurance_charges || 0);
    const registration = Number(o.registration_charges || 0);
    const accessories = Number(o.accessories_cost || 0);
    const extendedWarranty = Number(o.extended_warranty || 0);
    const additionalCharges = Number(o.additional_charges || 0);
    const baseDiscount = Number(o.group_discount || 0);
    const exchangeBonus = Number(o.exchange_bonus || 0);
    const corporateOffer = Number(o.corporate_offer || 0);

    const totalDiscount = baseDiscount + exchangeBonus + corporateOffer;
    const computedOnRoad =
      exShowroom + insurance + registration + accessories + extendedWarranty + additionalCharges - totalDiscount;
    const finalOnRoad = Number(o.final_on_road_price || computedOnRoad);

    const insuranceRatio = exShowroom > 0 ? (insurance / exShowroom) * 100 : 0;
    const rtoRatio = exShowroom > 0 ? (registration / exShowroom) * 100 : 0;
    const accessoriesRatio = exShowroom > 0 ? (accessories / exShowroom) * 100 : 0;
    const effectiveDiscountPct = exShowroom > 0 ? (totalDiscount / exShowroom) * 100 : 0;

    return {
      ...o,
      ex_showroom_price: exShowroom,
      insurance_charges: insurance,
      registration_charges: registration,
      accessories_cost: accessories,
      extended_warranty: extendedWarranty,
      additional_charges: additionalCharges,
      totalDiscount,
      final_on_road_price: finalOnRoad,
      insuranceRatio: Number(insuranceRatio.toFixed(2)),
      rtoRatio: Number(rtoRatio.toFixed(2)),
      accessoriesRatio: Number(accessoriesRatio.toFixed(2)),
      effectiveDiscountPct: Number(effectiveDiscountPct.toFixed(2)),
      computedMismatch: Math.abs(finalOnRoad - computedOnRoad)
    };
  });

  const prices = enriched.map((e) => e.final_on_road_price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const stdDev =
    prices.length > 1
      ? Math.sqrt(prices.reduce((s, p) => s + (p - meanPrice) ** 2, 0) / prices.length)
      : 0;
  const maxDiscount = Math.max(...enriched.map((e) => e.totalDiscount));

  const analyzedOffers = enriched
    .map((item) => {
      let score = 70;
      const warnings = [];
      const strengths = [];

      // 1. Price competitiveness (up to +20 pts)
      if (maxPrice > minPrice) {
        const priceNorm = (maxPrice - item.final_on_road_price) / (maxPrice - minPrice);
        score += priceNorm * 20;
      } else {
        score += 15;
      }

      // 2. Effective discount value (up to +12 pts)
      if (maxDiscount > 0) {
        score += (item.totalDiscount / maxDiscount) * 12;
      }
      if (item.effectiveDiscountPct >= 4.5) {
        strengths.push(`Strong collective discount (${item.effectiveDiscountPct}% of ex-showroom)`);
      }

      // 3. Check for unusually high insurance (> 5.2% of ex-showroom)
      if (item.insuranceRatio > 5.2) {
        score -= 8;
        warnings.push(
          `Insurance quote is ${item.insuranceRatio}% of ex-showroom (typical range is 3.2%–4.8%); verify add-ons or request own-insurance quote.`
        );
      } else if (item.insurance > 0 && item.insuranceRatio <= 4.3) {
        score += 4;
        strengths.push(`Competitive insurance premium (${item.insuranceRatio}% of ex-showroom)`);
      }

      // 4. Check accessories bundling (> 3.0% of ex-showroom)
      if (item.accessoriesRatio > 3.0) {
        score -= 6;
        warnings.push(
          `Mandatory/bundled accessories represent ${item.accessoriesRatio}% of ex-showroom; confirm whether optional.`
        );
      }

      // 5. Missing cost breakdown information
      if (item.insurance === 0 || item.registration === 0) {
        score -= 10;
        warnings.push('Incomplete cost breakdown: insurance or registration amount is ₹0 / omitted.');
      }

      // 6. Handling / additional charges check
      if (item.additional_charges > 15000) {
        score -= 6;
        warnings.push(
          `Includes ₹${item.additional_charges.toLocaleString('en-IN')} in logistics/handling charges; review line items.`
        );
      } else if (item.additional_charges === 0) {
        score += 4;
        strengths.push('Zero hidden handling or logistics surcharges');
      }

      // 7. Arithmetic discrepancy check
      if (item.computedMismatch > 2500) {
        score -= 8;
        warnings.push(
          `Reported final price differs from itemized sum by ₹${Math.round(item.computedMismatch).toLocaleString('en-IN')}.`
        );
      }

      // 8. Statistical outlier check (Z-score on peer quotes)
      if (stdDev > 0) {
        const z = (item.final_on_road_price - meanPrice) / stdDev;
        if (z < -1.35) {
          warnings.push(
            'Quoted on-road price is noticeably lower than peer dealer quotes; confirm stock year (MY25 vs MY26) and variant match.'
          );
        } else if (z > 1.35) {
          warnings.push('Quoted on-road price sits well above the peer dealer average for this configuration.');
        }
      }

      const finalScore = Math.max(15, Math.min(99, Math.round(score)));
      const explanation =
        strengths.length > 0
          ? strengths.join('. ') + '.'
          : 'Balanced pricing structure compared against peer dealership quotations.';

      return {
        ...item,
        offerScore: finalScore,
        warnings,
        strengths,
        explanation
      };
    })
    .sort((a, b) => b.offerScore - a.offerScore);

  const bestValue = analyzedOffers[0];
  const lowestPriceOffer = [...analyzedOffers].sort((a, b) => a.final_on_road_price - b.final_on_road_price)[0];
  const highestDiscountOffer = [...analyzedOffers].sort((a, b) => b.totalDiscount - a.totalDiscount)[0];

  return {
    analyzedOffers,
    summary: {
      totalQuotesAnalyzed: analyzedOffers.length,
      bestValueOfferId: bestValue.id,
      bestValueDealer: bestValue.dealer_name,
      bestValueScore: bestValue.offerScore,
      lowestOnRoadPrice: lowestPriceOffer.final_on_road_price,
      lowestPriceDealer: lowestPriceOffer.dealer_name,
      highestDiscount: highestDiscountOffer.totalDiscount,
      highestDiscountDealer: highestDiscountOffer.dealer_name,
      averageOnRoadPrice: Math.round(meanPrice)
    }
  };
}
