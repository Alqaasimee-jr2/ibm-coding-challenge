# PR Pre-Flight Guardian

A Node.js CLI tool that runs a full pre-flight check on a repository before a pull request is merged. It chains four phases — static security scanning, test execution, PR documentation generation, and an HTML dashboard — into a single command.

Built as part of the IBM Coding Challenge.

---

## Features

- **Static security scanner** — detects hardcoded secrets, SQL injection, unsafe `eval()`, and `child_process.exec()` misuse in `.js` files
- **Test runner integration** — executes Jest and captures pass/fail counts and duration
- **PR documentation generator** — writes a `pr-description.md` and a `pr-comment-preview.md` summarising findings
- **HTML dashboard** — generates a self-contained `guardian-report.html` with a dark-mode readiness scorecard
- **Actionable remediation** — every finding includes step-by-step fix instructions and optional code patches (`--suggest-fixes`)
- **CI-friendly exit codes** — exits `1` when vulnerabilities are found so pipelines fail fast

---

## Project Structure

```
ibm-coding-challenge/
├── guardian.js              # Master CLI — chains all four phases
├── security-scan.js         # Phase 1: static security scanner
├── __tests__/
│   └── pricingEngine.test.js  # Jest test suite (Task 2)
├── target-repo/             # Sample vulnerable repository used as scan target
│   ├── config/
│   │   └── auth.js          # Contains hardcoded secret (intentional for demo)
│   └── services/
│       ├── database.js       # Contains SQL injection (intentional for demo)
│       ├── dynamicRuleEvaluator.js  # Contains unsafe eval() (intentional for demo)
│       └── pricingEngine.js  # Pricing logic under test
├── findings.json            # Latest scan output (auto-generated)
├── guardian-report.html     # Latest HTML dashboard (auto-generated)
├── pr-description.md        # Latest PR description (auto-generated)
├── pr-comment-preview.md    # Latest PR comment preview (auto-generated)
└── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm

### Install dependencies

```bash
npm install
```

---

## Usage

### Full pre-flight check (recommended)

Run all four phases against the default `./target-repo` directory:

```bash
node guardian.js
```

Run against a custom repository path:

```bash
node guardian.js --repo ./path/to/your/repo
```

Enable suggested code patches for every finding:

```bash
node guardian.js --repo ./target-repo --suggest-fixes
```

Fail on any HIGH or CRITICAL finding (CI mode):

```bash
node guardian.js --repo ./target-repo --strict
# or
node guardian.js --repo ./target-repo --ci
```

### Security scanner only

```bash
node security-scan.js --repo ./target-repo
node security-scan.js --repo ./target-repo --suggest-fixes
```

Writes results to `./findings.json` and prints a colour-coded CLI summary.

### Test suite

```bash
npm test
```

---

## Security Rules

The scanner detects the following vulnerability classes:

| Rule ID | Severity | Description |
|---|---|---|
| `SECRET_HARDCODED_SK_LIVE` | CRITICAL | Hardcoded live secret / API key (`sk_live_...`) |
| `SECRET_JWT_ASSIGNMENT` | CRITICAL | High-entropy JWT or token secret assigned in source |
| `SQL_INJECTION_CONCAT` | HIGH | SQL query built via string concatenation or template literals |
| `UNSAFE_EVAL` | CRITICAL | Unsafe `eval()` call — arbitrary code execution risk |
| `UNSAFE_CHILD_PROCESS_EXEC` | CRITICAL | `child_process.exec()` with unsanitised input |

Each finding includes:
- File path and line number
- Matched code snippet
- Remediation steps
- Optional suggested code patch (`--suggest-fixes`)

---

## Output Files

| File | Description |
|---|---|
| `findings.json` | Structured JSON report of all security findings |
| `guardian-report.html` | Self-contained HTML dashboard with readiness scorecard |
| `pr-description.md` | Markdown PR description summarising scan and test results |
| `pr-comment-preview.md` | Inline PR comment preview with severity badges |

---

## CLI Flags

| Flag | Description |
|---|---|
| `--repo <path>` | Path to the repository to scan (default: `./target-repo`) |
| `--suggest-fixes` | Include exact code patches in the output for each finding |
| `--strict` / `--ci` | Exit with code `1` on any HIGH or CRITICAL finding |

---

## Exit Codes

| Code | Meaning |
|---|---|
| `0` | No vulnerabilities detected, all tests passed |
| `1` | One or more vulnerabilities found (or test failures in `--strict` mode) |

---

## Demo Target Repository

The `target-repo/` directory is an intentionally vulnerable Node.js application used to demonstrate the scanner. It contains:

- A hardcoded Stripe live secret key (`auth.js`)
- A hardcoded JWT secret (`auth.js`)
- A SQL injection via string concatenation (`database.js`)
- An unsafe `eval()` call (`dynamicRuleEvaluator.js`)

**Do not use any code from `target-repo/` in production.**

---

## Running the Tests

The test suite covers the `pricingEngine` module across three task areas:

- **Tier 2 volume discount** — 10% off for quantities ≥ 10
- **Tier 3 volume discount** — 20% off for quantities ≥ 50, stackable with a 5% loyalty member bonus
- **Input validation** — rejects negative prices, zero/float quantities, invalid tax rates

```bash
npm test
```

---

## License

MIT
