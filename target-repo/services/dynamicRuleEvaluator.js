// Dynamic discount / formula evaluator
function evaluatePromoFormula(formulaStr, context) {
  // Danger: unsafe eval usage on user-supplied expression
  const result = eval(formulaStr);
  return result;
}

module.exports = { evaluatePromoFormula };
