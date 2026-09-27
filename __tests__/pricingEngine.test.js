const { calculateOrderTotal } = require('../target-repo/services/pricingEngine');

describe('PricingEngine - calculateOrderTotal', () => {
  // Test 1: Core logic - Volume tier discount calculation (Tier 2: 10 items)
  test('calculates correct order total with Tier 2 (10%) volume discount and custom tax rate', () => {
    const unitPrice = 20.0;
    const quantity = 10;
    const isLoyaltyMember = false;
    const taxRate = 0.10; // 10% tax for clear arithmetic verification

    const result = calculateOrderTotal(unitPrice, quantity, isLoyaltyMember, taxRate);

    expect(result.subtotal).toBe(200.0);
    expect(result.discountRate).toBe(0.10);
    expect(result.discount).toBe(20.0);
    expect(result.discountedSubtotal).toBe(180.0);
    expect(result.tax).toBe(18.0);
    expect(result.total).toBe(198.0);
  });

  // Test 2: Core logic + Loyalty member stacked discount (Tier 3: 50 items + 5% loyalty)
  test('correctly stacks Tier 3 (20%) volume discount with loyalty member discount (5%)', () => {
    const unitPrice = 50.0;
    const quantity = 50;
    const isLoyaltyMember = true;
    const taxRate = 0.08;

    const result = calculateOrderTotal(unitPrice, quantity, isLoyaltyMember, taxRate);

    expect(result.subtotal).toBe(2500.0);
    expect(result.discountRate).toBeCloseTo(0.25, 4); // 20% + 5%
    expect(result.discount).toBe(625.0);
    expect(result.discountedSubtotal).toBe(1875.0);
    expect(result.tax).toBe(150.0);
    expect(result.total).toBe(2025.0);
  });

  // Test 3: Edge cases - zero/negative quantities, negative prices, and boundary conditions
  test('enforces validation boundaries and rejects invalid quantity and price inputs', () => {
    // Edge case 1: Zero quantity
    expect(() => calculateOrderTotal(10, 0)).toThrow('Invalid quantity: must be an integer greater than zero');

    // Edge case 2: Negative quantity
    expect(() => calculateOrderTotal(10, -5)).toThrow('Invalid quantity: must be an integer greater than zero');

    // Edge case 3: Fractional / non-integer quantity
    expect(() => calculateOrderTotal(10, 2.5)).toThrow('Invalid quantity: must be an integer greater than zero');

    // Edge case 4: Negative price
    expect(() => calculateOrderTotal(-15.5, 2)).toThrow('Invalid unit price: must be a non-negative number');

    // Edge case 5: Boundary check: quantity 9 receives 0% discount, quantity 10 receives 10%
    const boundaryResult9 = calculateOrderTotal(10, 9, false, 0);
    expect(boundaryResult9.discountRate).toBe(0);
    expect(boundaryResult9.total).toBe(90.0);

    const boundaryResult10 = calculateOrderTotal(10, 10, false, 0);
    expect(boundaryResult10.discountRate).toBe(0.10);
    expect(boundaryResult10.total).toBe(90.0); // 100 - 10 = 90
  });
});
