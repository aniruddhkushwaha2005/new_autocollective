def score_single_offer(offer: dict, mean_price: float, std_price: float, min_price: float, max_price: float, max_discount: float) -> dict:
    ex = float(offer.get("ex_showroom_price", 0))
    ins = float(offer.get("insurance_charges", 0))
    reg = float(offer.get("registration_charges", 0))
    acc = float(offer.get("accessories_cost", 0))
    war = float(offer.get("extended_warranty", 0))
    addl = float(offer.get("additional_charges", 0))
    total_discount = (
        float(offer.get("group_discount", 0))
        + float(offer.get("exchange_bonus", 0))
        + float(offer.get("corporate_offer", 0))
    )
    final_price = float(offer.get("final_on_road_price", ex + ins + reg + acc + war + addl - total_discount))

    ins_ratio = (ins / ex) * 100 if ex > 0 else 0
    acc_ratio = (acc / ex) * 100 if ex > 0 else 0
    score = 70.0
    warnings = []
    strengths = []

    if max_price > min_price:
        score += ((max_price - final_price) / (max_price - min_price)) * 20
    else:
        score += 15

    if max_discount > 0:
        score += (total_discount / max_discount) * 12

    if ins_ratio > 5.2:
        score -= 8
        warnings.append(f"Insurance quote is {ins_ratio:.2f}% of ex-showroom (typical 3.2%–4.8%).")
    elif ins > 0 and ins_ratio <= 4.3:
        score += 4
        strengths.append(f"Competitive insurance rate ({ins_ratio:.2f}% of ex-showroom)")

    if acc_ratio > 3.0:
        score -= 6
        warnings.append(f"Accessories represent {acc_ratio:.2f}% of ex-showroom; verify optionality.")

    if ins == 0 or reg == 0:
        score -= 10
        warnings.append("Incomplete breakdown: insurance or registration fee is omitted.")

    if addl > 15000:
        score -= 6
        warnings.append(f"Contains Rs. {int(addl):,} handling/additional charges.")
    elif addl == 0:
        score += 4
        strengths.append("Zero hidden handling charges")

    if std_price > 0:
        z_score = (final_price - mean_price) / std_price
        if z_score < -1.35:
            warnings.append("Quoted price is noticeably below peer offers; verify stock model year and trim.")

    return {
        **offer,
        "totalDiscount": total_discount,
        "offerScore": max(15, min(99, round(score))),
        "warnings": warnings,
        "strengths": strengths,
        "explanation": ". ".join(strengths) if strengths else "Balanced quotation relative to peer offers.",
    }
