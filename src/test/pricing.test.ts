import { describe, it, expect } from 'vitest';
import { calculateTicketPrice, calculateComprehensivePricing } from '../lib/pricing';

describe('Pricing Management Logic', () => {
  describe('calculateTicketPrice', () => {
    it('should calculate base price correctly for local distance (10km)', () => {
      // Regular: Base 25000 + (10 * 1500) = 40000
      const price = calculateTicketPrice(10, 25000, 1500, 1000);
      expect(price).toBe(40000);
    });

    it('should round up to nearest 1000', () => {
      // Base 25000 + (10.5 * 1500) = 25000 + 15750 = 40750 -> Round to 41000
      const price = calculateTicketPrice(10.5, 25000, 1500, 1000);
      expect(price).toBe(41000);
    });

    it('should throw error for negative distance', () => {
      expect(() => calculateTicketPrice(-5, 25000, 1500)).toThrow('Travel distance must be a positive value.');
    });

    it('should handle zero distance', () => {
      const price = calculateTicketPrice(0, 25000, 1500);
      expect(price).toBe(25000);
    });

    it('should calculate luxury price for long distance', () => {
      // Luxury: Base 100000 + (300 * 5000) = 100000 + 1500000 = 1600000
      const price = calculateTicketPrice(300, 100000, 5000, 1000);
      expect(price).toBe(1600000);
    });
  });

  describe('calculateComprehensivePricing', () => {
    it('should calculate total cost and margin correctly', () => {
      const params = {
        transportCost: 1000000,
        accommodationCost: 500000,
        mealCost: 200000,
        attractionTicketsCost: 100000,
        guideFee: 200000,
        otherCosts: 0,
        markupPercentage: 20, // Profit = 20% of 2,000,000 = 400,000
        taxPercentage: 11, // Tax = 11% of 2,400,000 = 264,000
        paxCount: 10,
        minMarginPercentage: 15
      };

      const result = calculateComprehensivePricing(params);

      expect(result.totalCost).toBe(2000000);
      expect(result.profitAmount).toBe(400000);
      expect(result.totalBeforeTax).toBe(2400000);
      expect(result.totalWithTax).toBe(2664000);
      expect(result.finalPricePerPax).toBe(267000); // 266,400 rounded up to 267,000
      expect(result.actualMarginPercentage).toBe(20);
      expect(result.isMarginValid).toBe(true);
    });

    it('should invalidate if margin is below minimum', () => {
      const params = {
        transportCost: 1000000,
        accommodationCost: 0,
        mealCost: 0,
        attractionTicketsCost: 0,
        guideFee: 0,
        otherCosts: 0,
        markupPercentage: 5,
        taxPercentage: 0,
        paxCount: 1,
        minMarginPercentage: 10
      };

      const result = calculateComprehensivePricing(params);
      expect(result.isMarginValid).toBe(false);
    });
  });
});
