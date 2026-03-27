/**
 * Pricing Framework based on PYU-GO Flow Chart Analysis.
 * Identifies 4 main Rayons (A, B, C, D) with progressive FAR (Distance in Meters).
 */

export interface ComprehensivePricing {
  transportCost: number;
  accommodationCost: number;
  mealCost: number;
  attractionTicketsCost: number;
  guideFee: number;
  otherCosts: number;
  markupPercentage: number;
  taxPercentage: number;
  paxCount: number;
  minMarginPercentage: number;
}

export interface PricingResult {
  totalCost: number;
  totalBeforeTax: number;
  taxAmount: number;
  totalWithTax: number;
  finalPricePerPax: number;
  profitAmount: number;
  actualMarginPercentage: number;
  isMarginValid: boolean;
}

/**
 * Calculates comprehensive trip pricing including all components and margin validation.
 */
export function calculateComprehensivePricing(params: ComprehensivePricing): PricingResult {
  const {
    transportCost,
    accommodationCost,
    mealCost,
    attractionTicketsCost,
    guideFee,
    otherCosts,
    markupPercentage,
    taxPercentage,
    paxCount,
    minMarginPercentage
  } = params;

  // 1. Total Base Cost (Cost of Goods Sold)
  const totalCost = transportCost + accommodationCost + mealCost + attractionTicketsCost + guideFee + otherCosts;
  
  // 2. Apply Markup
  const profitAmount = totalCost * (markupPercentage / 100);
  const totalBeforeTax = totalCost + profitAmount;
  
  // 3. Apply Tax
  const taxAmount = totalBeforeTax * (taxPercentage / 100);
  const totalWithTax = totalBeforeTax + taxAmount;
  
  // 4. Final Price Per Pax
  const finalPricePerPax = paxCount > 0 ? Math.ceil((totalWithTax / paxCount) / 1000) * 1000 : 0;
  
  // 5. Margin Validation
  const actualMarginPercentage = totalCost > 0 ? (profitAmount / totalCost) * 100 : 0;
  const isMarginValid = actualMarginPercentage >= minMarginPercentage;

  return {
    totalCost,
    totalBeforeTax,
    taxAmount,
    totalWithTax,
    finalPricePerPax,
    profitAmount,
    actualMarginPercentage,
    isMarginValid
  };
}

/**
 * Existing dynamic calculation remains for flexibility
 */
export function calculateTicketPrice(
  distanceKm: number,
  basePrice: number,
  pricePerKm: number,
  roundingMultiple: number = 1000
): number {
  if (distanceKm < 0) {
    throw new Error("Travel distance must be a positive value.");
  }

  const rawPrice = basePrice + (distanceKm * pricePerKm);
  return Math.ceil(rawPrice / roundingMultiple) * roundingMultiple;
}
