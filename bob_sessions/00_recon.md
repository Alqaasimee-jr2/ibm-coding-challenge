# 00 — Architectural Reconnaissance & Security/Testing Gap Analysis

> **Scope:** `target-repo/` — all source files scanned on initial pass.  
> **Purpose:** Establish the ground truth that the autonomous PR Pre-Flight Guardian pipeline
> will use to gate, verify, and remediate every pull request touching this codebase.

---

## Scanned File Tree

```
target-repo/
├── index.js
├── config/
│   └── auth.js
└── services/
    ├── database.js
    ├── dynamicRuleEvaluator.js
    └── pricingEngine.js
```

---

## Critical Gap 1 — Hardcoded JWT Secret in `config/auth.js`

### Location
`target-repo/config/auth.js` · Line 3

### Evidence
```js
const AUTH_CONFIG = {
  jwtSecret: "sk_live_51M0BobHackathonSecretKey99887766",   // ← LIVE secret in source
  tokenExpiry: "2h",
  provider: "internal-oauth"
};
```

### Risk
| Dimension | Detail |
|-----------|--------|
| **Classification** | CWE-798 · Use of Hard-coded Credentials |
| **OWASP** | A07:2021 – Identification and Authentication Failures |
| **Impact** | Any actor with read access to the repository (contributor, CI runner, or a leaked `git clone`) can forge arbitrary JWTs with full signing authority. Token expiry provides no protection once the secret is known. |
| **Blast radius** | Entire authentication surface — every route guarded by this token is fully bypassable. |

### Guardian Automated Remediation Plan
1. **Static scan rule** — `grep`/`semgrep` pattern matches `sk_live_` or any bare string assigned to `jwtSecret`/`apiKey`/`secret` literals. PR fails pre-flight if the pattern fires.
2. **Auto-fix PR** — Replace the literal with `process.env.JWT_SECRET`. Add a `.env.example` entry `JWT_SECRET=<your-secret>`. Add `.env` to `.gitignore` if absent.
3. **Secret rotation trigger** — Because the value has been committed, the pipeline flags it for immediate rotation in the secrets manager (Vault / AWS Secrets Manager) and notifies the security channel regardless of whether the PR is merged.
4. **Verification test** — Guardian confirms `AUTH_CONFIG.jwtSecret` evaluates to `process.env.JWT_SECRET` at runtime and that the raw string no longer appears anywhere in the diff.

---

## Critical Gap 2 — SQL Injection via String Concatenation in `services/database.js`

### Location
`target-repo/services/database.js` · Lines 8-10

### Evidence
```js
findUserByUsername(username) {
  // Unsafe string concatenation leading to SQL injection risk
  const query = "SELECT id, username, email, role FROM users WHERE username = '"
                + username +                                  // ← unsanitised input
                "' AND active = 1";
  return query;
}
```

Compare with the **safe** pattern already present in the same file (line 14-18):
```js
findOrdersByStatus(status) {
  return {
    text: "SELECT * FROM orders WHERE status = $1",   // ← parameterised ✓
    values: [status]
  };
}
```

### Risk
| Dimension | Detail |
|-----------|--------|
| **Classification** | CWE-89 · Improper Neutralization of Special Elements used in an SQL Command |
| **OWASP** | A03:2021 – Injection |
| **Impact** | Attacker supplies `' OR '1'='1` (auth bypass) or `'; DROP TABLE users; --` (data destruction). Full read/write access to any table the DB user can reach. |
| **Blast radius** | Any endpoint that calls `findUserByUsername` — login, profile lookup, admin search. |

### Guardian Automated Remediation Plan
1. **Static scan rule** — Semgrep rule detects string concatenation where a variable is interpolated directly into a SQL keyword context (`WHERE`, `SET`, `INSERT INTO`, `FROM`).
2. **Auto-fix PR** — Rewrite `findUserByUsername` to the parameterised pattern already used by `findOrdersByStatus`:
   ```js
   findUserByUsername(username) {
     return {
       text: "SELECT id, username, email, role FROM users WHERE username = $1 AND active = 1",
       values: [username]
     };
   }
   ```
3. **Regression test** — Guardian generates a Jest test that passes `"' OR '1'='1"` as `username` and asserts the returned object has a `values` array (parameterised), never a bare concatenated string.
4. **Verification** — PR pre-flight re-runs the semgrep rule on the patched file and asserts zero findings.

---

## Critical Gap 3 — Unsafe `eval()` in `services/dynamicRuleEvaluator.js`

### Location
`target-repo/services/dynamicRuleEvaluator.js` · Line 4

### Evidence
```js
function evaluatePromoFormula(formulaStr, context) {
  // Danger: unsafe eval usage on user-supplied expression
  const result = eval(formulaStr);   // ← arbitrary code execution
  return result;
}
```

### Risk
| Dimension | Detail |
|-----------|--------|
| **Classification** | CWE-95 · Improper Neutralization of Directives in Dynamically Evaluated Code |
| **OWASP** | A03:2021 – Injection |
| **Impact** | `formulaStr` is evaluated in the current scope with full Node.js privileges. A caller can pass `require('child_process').execSync('rm -rf /')` or exfiltrate environment variables. There is no sandbox, no allow-list, no timeout. |
| **Blast radius** | Remote Code Execution on the server process — complete system compromise. |

### Guardian Automated Remediation Plan
1. **Static scan rule** — ESLint `no-eval` rule + Semgrep pattern `eval(...)` where the argument is not a literal string constant.
2. **Auto-fix PR** — Replace `eval` with a safe expression parser. For numeric/boolean promo formulas, `mathjs` `evaluate()` or a hand-rolled recursive-descent parser operating on an explicit AST provides equivalent capability with zero code-execution risk:
   ```js
   const { create, all } = require('mathjs');
   const math = create(all);

   function evaluatePromoFormula(formulaStr, context) {
     // Only arithmetic + comparison operators; no imperative statements
     return math.evaluate(formulaStr, context);
   }
   ```
3. **Verification test** — Guardian asserts that passing `"process.env.SECRET"` as `formulaStr` throws a `SyntaxError` or returns `undefined` rather than leaking secrets.
4. **Dependency audit** — Guardian adds `mathjs` to `package.json` and runs `npm audit` to confirm no new vulnerabilities are introduced.

---

## Testing Gap — Untested Business Logic in `services/pricingEngine.js`

### Location
`target-repo/services/pricingEngine.js` · Full file (49 lines)

### Current State
Zero test files exist for this module. The logic is entirely untested despite containing
several non-trivial, revenue-critical branches.

### Business Logic Inventory

| Branch | Lines | Description | Risk if Wrong |
|--------|-------|-------------|---------------|
| Tier 1 — no discount | 21-27 | `quantity < 10` → `discountRate = 0` | Undercharge or overcharge on small orders |
| Tier 2 — 10% discount | 25-26 | `10 ≤ quantity < 50` → `discountRate = 0.10` | Revenue leakage at common B2B volumes |
| Tier 3 — 20% discount | 23-24 | `quantity ≥ 50` → `discountRate = 0.20` | Largest financial exposure; bulk orders |
| Loyalty stacking | 29-31 | `isLoyaltyMember` adds `+0.05` to any tier | Double-discounting or loyalty benefit loss |
| Combined max discount | — | Tier 3 + loyalty = 0.25 (25%) | Cap behaviour undocumented; no test verifies ceiling |
| Tax application | 35 | Tax applied **after** discount, not on gross | Incorrect tax base if order changes |
| Input validation — `unitPrice` | 10-12 | Rejects non-number, NaN, negative | Guard may be insufficient for `Infinity` |
| Input validation — `quantity` | 13-15 | Rejects non-integer and zero | Float like `9.9` would pass `isInteger` check — confirmed safe |
| Input validation — `taxRate` | 16-18 | Rejects non-number, NaN, negative | `taxRate = 0` is valid (tax-exempt orders) — needs explicit test |
| Floating-point rounding | 20,33-36 | `.toFixed(2)` at each step | Rounding accumulation across four operations untested |

### Missing Test Cases (to be generated by Guardian)

```
calculateOrderTotal — required test matrix
──────────────────────────────────────────
Happy-path
  ✗ quantity < 10  → 0% discount applied
  ✗ quantity = 10  → exactly 10% discount (boundary)
  ✗ quantity = 49  → 10% discount (upper boundary of tier 2)
  ✗ quantity = 50  → exactly 20% discount (boundary)
  ✗ isLoyaltyMember=true, quantity=1   → 5% only
  ✗ isLoyaltyMember=true, quantity=10  → 15% stacked
  ✗ isLoyaltyMember=true, quantity=50  → 25% stacked (max)
  ✗ taxRate=0      → tax-exempt order, total equals discountedSubtotal
  ✗ default taxRate used when omitted

Error / edge
  ✗ unitPrice = -1       → throws 'Invalid unit price'
  ✗ unitPrice = NaN      → throws 'Invalid unit price'
  ✗ unitPrice = Infinity → should throw (currently may not — needs verification)
  ✗ quantity = 0         → throws 'Invalid quantity'
  ✗ quantity = 1.5       → throws 'Invalid quantity'
  ✗ quantity = -5        → throws 'Invalid quantity'
  ✗ taxRate = -0.01      → throws 'Invalid tax rate'
  ✗ taxRate = NaN        → throws 'Invalid tax rate'

Floating-point precision
  ✗ unitPrice=0.1, quantity=3 → total is deterministic (no floating drift)
  ✗ verify each field in returned object sums correctly end-to-end
```

### Guardian Automated Test Generation Plan
1. **Coverage audit** — Guardian runs Jest with `--coverage` and asserts `pricingEngine.js` has 0% coverage, triggering test-generation mode.
2. **Auto-generated test file** — Guardian writes `__tests__/pricingEngine.test.js` covering every row in the matrix above.
3. **Boundary verification** — Tests explicitly probe `quantity = 9`, `10`, `49`, `50` to lock the tier thresholds against future regression.
4. **`Infinity` guard patch** — If `unitPrice = Infinity` does not throw, Guardian opens a second micro-PR adding `|| !isFinite(unitPrice)` to the existing guard on line 10.
5. **CI gate** — Pre-flight rejects any PR that reduces `pricingEngine.js` branch coverage below 100%.

---

## Summary — Guardian Pipeline Automation Map

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   PR PRE-FLIGHT GUARDIAN — EXECUTION ORDER               │
├───┬──────────────────────────────┬────────────────────┬──────────────────┤
│ # │ Gap                          │ Detection Tool     │ Remediation      │
├───┼──────────────────────────────┼────────────────────┼──────────────────┤
│ 1 │ Hardcoded JWT secret         │ Semgrep / grep     │ env-var PR       │
│ 2 │ SQL injection (concat)       │ Semgrep            │ parameterise PR  │
│ 3 │ eval() RCE                   │ ESLint no-eval     │ mathjs swap PR   │
│ 4 │ pricingEngine untested       │ Jest --coverage    │ generated tests  │
└───┴──────────────────────────────┴────────────────────┴──────────────────┘

Every remediation PR must:
  • Re-run the detection tool and assert zero findings on patched code.
  • Pass the generated regression/unit tests.
  • Receive a Guardian sign-off comment before merge is unblocked.
```

---

*Generated by IBM Bob — PR Pre-Flight Guardian · Session 00 · Reconnaissance Phase*
