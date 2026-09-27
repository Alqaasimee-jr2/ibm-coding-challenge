'use strict';

const { calculateOrderTotal } = require('../target-repo/services/pricingEngine');

// ---------------------------------------------------------------------------
// Helper: round to 2 decimal places the same way the implementation does,
// so expected values stay in sync with toFixed(2) arithmetic.
// ---------------------------------------------------------------------------

describe('calculateOrderTotal', () => {

  // =========================================================================
  // TASK 2.1 — Tier 2 volume discount (10% off for 10+ items) with custom tax
  // =========================================================================
  describe('Tier 2 volume discount — 10 % for qty >= 10', () => {
    test('applies 10 % discount and a custom 8 % tax rate correctly', () => {
      // qty=10, price=$20, no loyalty, taxRate=0.08
      // subtotal      = 10 * 20       = 200.00
      // discount      = 200 * 0.10    = 20.00
      // discounted    = 200 - 20      = 180.00
      // tax           = 180 * 0.08    = 14.40
      // total         = 180 + 14.40   = 194.40
      const result = calculateOrderTotal(20, 10, false, 0.08);

      expect(result.subtotal).toBe(200.00);
      expect(result.discountRate).toBe(0.10);
      expect(result.discount).toBe(20.00);
      expect(result.discountedSubtotal).toBe(180.00);
      expect(result.tax).toBe(14.40);
      expect(result.total).toBe(194.40);
    });

    test('applies 10 % discount at exactly qty=10 boundary', () => {
      const result = calculateOrderTotal(5, 10, false, 0.0);
      // no tax, just verify discount tier kicks in at qty=10
      expect(result.discountRate).toBe(0.10);
      expect(result.subtotal).toBe(50.00);
      expect(result.discount).toBe(5.00);
      expect(result.discountedSubtotal).toBe(45.00);
      expect(result.total).toBe(45.00);
    });

    test('does NOT apply Tier 2 discount for qty=9 (boundary below threshold)', () => {
      const result = calculateOrderTotal(10, 9, false, 0.0);
      expect(result.discountRate).toBe(0);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(90.00);
    });

    test('includes a custom 12 % tax rate in the final total', () => {
      // qty=15, price=$8, taxRate=0.12
      // subtotal   = 120.00, discount = 12.00, discounted = 108.00
      // tax        = 108 * 0.12 = 12.96, total = 120.96
      const result = calculateOrderTotal(8, 15, false, 0.12);
      expect(result.discountRate).toBe(0.10);
      expect(result.tax).toBe(12.96);
      expect(result.total).toBe(120.96);
    });
  });

  // =========================================================================
  // TASK 2.2 — Tier 3 volume discount (20% off for 50+ items) stacked with
  //            loyalty member discount (+5%)
  // =========================================================================
  describe('Tier 3 volume discount — 20 % for qty >= 50, stacked with loyalty (+5 %)', () => {
    test('stacks 20 % volume + 5 % loyalty = 25 % total discount with custom 5 % tax', () => {
      // qty=50, price=$10, loyalty=true, taxRate=0.05
      // subtotal      = 500.00
      // discountRate  = 0.20 + 0.05 = 0.25
      // discount      = 500 * 0.25  = 125.00
      // discounted    = 375.00
      // tax           = 375 * 0.05  = 18.75
      // total         = 393.75
      const result = calculateOrderTotal(10, 50, true, 0.05);

      expect(result.subtotal).toBe(500.00);
      expect(result.discountRate).toBe(0.25);
      expect(result.discount).toBe(125.00);
      expect(result.discountedSubtotal).toBe(375.00);
      expect(result.tax).toBe(18.75);
      expect(result.total).toBe(393.75);
    });

    test('applies only 20 % when qty >= 50 and loyalty is false', () => {
      const result = calculateOrderTotal(10, 50, false, 0.0);
      expect(result.discountRate).toBe(0.20);
      expect(result.discount).toBe(100.00);
      expect(result.discountedSubtotal).toBe(400.00);
      expect(result.total).toBe(400.00);
    });

    test('applies 25 % combined discount at qty=100 (well above tier 3 threshold)', () => {
      // qty=100, price=$4, loyalty=true, taxRate=0.10
      // subtotal   = 400.00, discount = 100.00, discounted = 300.00
      // tax        = 30.00, total = 330.00
      const result = calculateOrderTotal(4, 100, true, 0.10);
      expect(result.discountRate).toBe(0.25);
      expect(result.discount).toBe(100.00);
      expect(result.discountedSubtotal).toBe(300.00);
      expect(result.tax).toBe(30.00);
      expect(result.total).toBe(330.00);
    });

    test('loyalty bonus alone adds 5 % when qty < 10 (no volume tier active)', () => {
      const result = calculateOrderTotal(100, 1, true, 0.0);
      expect(result.discountRate).toBe(0.05);
      expect(result.discount).toBe(5.00);
      expect(result.discountedSubtotal).toBe(95.00);
      expect(result.total).toBe(95.00);
    });
  });

  // =========================================================================
  // TASK 2.3 — Validation boundaries: negative prices, bad quantities, bad
  //            tax rates should all throw descriptive errors
  // =========================================================================
  describe('Input validation — throws on invalid arguments', () => {

    // --- unit price ----------------------------------------------------------
    test('throws on negative unit price', () => {
      expect(() => calculateOrderTotal(-1, 5)).toThrow(
        'Invalid unit price: must be a non-negative number'
      );
    });

    test('throws when unit price is NaN', () => {
      expect(() => calculateOrderTotal(NaN, 5)).toThrow(
        'Invalid unit price: must be a non-negative number'
      );
    });

    test('throws when unit price is a string', () => {
      expect(() => calculateOrderTotal('10', 5)).toThrow(
        'Invalid unit price: must be a non-negative number'
      );
    });

    // --- quantity ------------------------------------------------------------
    test('throws on quantity of zero', () => {
      expect(() => calculateOrderTotal(10, 0)).toThrow(
        'Invalid quantity: must be an integer greater than zero'
      );
    });

    test('throws on negative quantity', () => {
      expect(() => calculateOrderTotal(10, -3)).toThrow(
        'Invalid quantity: must be an integer greater than zero'
      );
    });

    test('throws on non-integer quantity (float)', () => {
      expect(() => calculateOrderTotal(10, 2.5)).toThrow(
        'Invalid quantity: must be an integer greater than zero'
      );
    });

    test('throws when quantity is a string', () => {
      expect(() => calculateOrderTotal(10, '5')).toThrow(
        'Invalid quantity: must be an integer greater than zero'
      );
    });

    // --- tax rate ------------------------------------------------------------
    test('throws on negative tax rate', () => {
      expect(() => calculateOrderTotal(10, 1, false, -0.01)).toThrow(
        'Invalid tax rate: must be a non-negative number'
      );
    });

    test('throws when tax rate is NaN', () => {
      expect(() => calculateOrderTotal(10, 1, false, NaN)).toThrow(
        'Invalid tax rate: must be a non-negative number'
      );
    });

    test('throws when tax rate is a string', () => {
      expect(() => calculateOrderTotal(10, 1, false, '0.1')).toThrow(
        'Invalid tax rate: must be a non-negative number'
      );
    });

    // --- zero-value edge cases that should NOT throw -------------------------
    test('accepts unitPrice = 0 (free item) without throwing', () => {
      expect(() => calculateOrderTotal(0, 1)).not.toThrow();
      const result = calculateOrderTotal(0, 1);
      expect(result.total).toBe(0);
    });

    test('accepts taxRate = 0 (tax-exempt) without throwing', () => {
      expect(() => calculateOrderTotal(10, 1, false, 0)).not.toThrow();
      const result = calculateOrderTotal(10, 1, false, 0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(10);
    });
  });
});
