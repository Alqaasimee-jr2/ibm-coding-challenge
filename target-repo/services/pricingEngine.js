/**
 * Calculates final order price based on unit price, quantity, loyalty status, and tax rate.
 * @param {number} unitPrice 
 * @param {number} quantity 
 * @param {boolean} [isLoyaltyMember=false] 
 * @param {number} [taxRate=0.0825] 
 * @returns {object} { subtotal, discount, discountRate, discountedSubtotal, tax, total }
 */
function calculateOrderTotal(unitPrice, quantity, isLoyaltyMember = false, taxRate = 0.0825) {
  if (typeof unitPrice !== 'number' || isNaN(unitPrice) || unitPrice < 0) {
    throw new Error('Invalid unit price: must be a non-negative number');
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('Invalid quantity: must be an integer greater than zero');
  }
  if (typeof taxRate !== 'number' || isNaN(taxRate) || taxRate < 0) {
    throw new Error('Invalid tax rate: must be a non-negative number');
  }

  const rawSubtotal = Number((unitPrice * quantity).toFixed(2));
  let discountRate = 0;

  if (quantity >= 50) {
    discountRate = 0.20;
  } else if (quantity >= 10) {
    discountRate = 0.10;
  }

  if (isLoyaltyMember) {
    discountRate += 0.05;
  }

  const discountAmount = Number((rawSubtotal * discountRate).toFixed(2));
  const discountedSubtotal = Number((rawSubtotal - discountAmount).toFixed(2));
  const taxAmount = Number((discountedSubtotal * taxRate).toFixed(2));
  const total = Number((discountedSubtotal + taxAmount).toFixed(2));

  return {
    subtotal: rawSubtotal,
    discount: discountAmount,
    discountRate,
    discountedSubtotal,
    tax: taxAmount,
    total
  };
}

module.exports = { calculateOrderTotal };
