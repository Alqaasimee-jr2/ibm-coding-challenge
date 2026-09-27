# PR Pre-Flight Guardian 🛡️

> **IBM Bob 2.0 Hackathon Submission**  
> An autonomous Node.js CLI that chains static security scanning, automated test generation, and PR documentation generation into a single unified pre-flight command.  
> 🔗 **GitHub Repository:** [https://github.com/Alqaasimee-jr2/ibm-coding-challenge](https://github.com/Alqaasimee-jr2/ibm-coding-challenge)

---

## ⚡ The Developer Experience: Before vs. After

### 🛑 Before Guardian (45 Minutes of Manual Friction)
- **Manual Audit:** Developers spend 15 minutes manually reviewing code changes for leaked secrets, unsafe string concatenations, or unintended eval/exec statements.
- **Manual Test Authoring:** Developers spend 20 minutes writing boilerplate unit tests, often skipping boundary edge cases under deadline pressure.
- **Manual PR Descriptions:** Developers spend 10 minutes writing pull request summaries, copy-pasting test runs, and guessing at security risk profiles.
- **Result:** Vulnerabilities sneak into main branches, PR reviews are delayed, and documentation quality is inconsistent.

### 🚀 After Guardian (30 Seconds of Automated Certainty)
- **Autonomous Multi-Stage Pipeline:** A single command triggers the entire verification lifecycle.
- **Zero-Friction Auditing:** Static security vulnerabilities are flagged with file paths, line numbers, and actionable remediation steps.
- **Instant Test Verification:** Regression test suites run and confirm green execution before code is pushed.
- **PR-Ready Markdown:** Complete, reviewer-ready PR descriptions and sign-off checklists are automatically generated.
- **Result:** High code quality, zero leaked secrets, verified test coverage, and instant PR documentation in under 30 seconds.

---

## 🧠 How It Works: The 3 Chained Tasks

PR Pre-Flight Guardian explicitly chains three autonomous agentic tasks into a single orchestrated execution loop:

```
+-------------------------------------------------------------------------------+
|                        PR PRE-FLIGHT GUARDIAN                                 |
+-------------------------------------------------------------------------------+
       |
       v
 [Task 1: Security Scan]
   * Analyzes target repo source files (AST / pattern matching)
   * Flags hardcoded secrets, SQL injection, unsafe eval/exec
   * Generates findings.json
       |
       v
 [Task 2: Test Generation & Execution]
   * Targets untested core logic and identified gaps
   * Runs Jest unit tests (core logic + boundary edge cases)
   * Captures pass/fail status and assertion metrics
       |
       v
 [Task 3: Doc & PR Summary Generation]
   * Synthesizes findings.json + test runner output
   * Produces pr-description.md with risk matrix & reviewer checklist
       |
       v
 [Unified Console Report & Pre-Flight Verdict]
   * Delivers single-screen merged executive summary
```

1. **Security Scan (`security-scan.js`):**
   Scans every source file in the target repository for critical vulnerabilities:
   - High-entropy API tokens and private keys (`sk_live_...`, JWT secrets).
   - SQL-injection-prone string concatenations.
   - Dangerous dynamic code execution (`eval()`, `child_process.exec()`).
   Outputs structured issues to `findings.json`.

2. **Test Generation & Verification (`__tests__/`):**
   Analyzes untested business logic in the target codebase (e.g. `pricingEngine.js`) and validates core calculations, stacked discounts, and validation boundaries with Jest assertions. Confirms 100% green test pass rate.

3. **PR Documentation Generation (`pr-description.md`):**
   Merges security audit findings and test execution metrics into a standardized GitHub/GitLab-ready pull request summary, complete with a risk assessment matrix and a reviewer sign-off checklist.

---

## 💻 How to Run

### Prerequisites
- Node.js (v18+)
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/Alqaasimee-jr2/ibm-coding-challenge.git
cd ibm-coding-challenge
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run the Full Pre-Flight Guardian Pipeline (Exact Command)
```bash
node guardian.js --repo ./target-repo
```

*Or run via npm script:*
```bash
npm run guardian
```

### 4. Run Individual Components
- **Run Security Scan Only:**
  ```bash
  node security-scan.js --repo ./target-repo
  # or: npm run scan
  ```
- **Run Unit Test Suite Only:**
  ```bash
  npx jest --verbose
  # or: npm test
  ```

---

## 📂 Repository Structure

```
├── .gitignore                      # Git ignore rules (node_modules, target-repo)
├── CHANGELOG.md                    # Real-time timestamped step-by-step audit log
├── MILESTONES.md                   # Hackathon milestone progress tracker
├── README.md                       # Project overview, before/after, architecture
├── findings.json                   # Structured JSON findings from security scanner
├── guardian.js                     # Main CLI orchestrator (Node built-ins only)
├── package.json                    # Project metadata & Jest devDependencies
├── pr-description.md               # Auto-generated PR summary & reviewer checklist
├── security-scan.js                # Static security analysis engine
├── __tests__/                      # Automated test suite directory
│   └── pricingEngine.test.js       # Generated Jest unit tests for target logic
├── bob_sessions/                   # Audit trail, PNG consumption screenshots & task logs
│   ├── README.md                   # Screenshot capture guide & naming conventions
│   ├── 00_recon.md                 # Target codebase reconnaissance & gap analysis
│   ├── 01_security_agent_run.md    # Security scanner run log and findings breakdown
│   ├── 02_test_agent_run.md        # Test suite run output and coverage verification
│   ├── 03_docs_agent_run.md        # PR documentation synthesis run record
│   └── 04_real_world_import_run.md # Real-world validation on expressjs/cors
├── DATA_COMPLIANCE.md              # Hackathon data compliance attestation
└── target-repo/                    # Sourced target codebase (billing service)
    ├── index.js                    # Module exports
    ├── config/
    │   └── auth.js                 # Authentication config (hardcoded secret gap)
    └── services/
        ├── database.js             # User data access (SQL injection gap)
        ├── dynamicRuleEvaluator.js # Formula evaluator (unsafe eval gap)
        └── pricingEngine.js        # Volume & loyalty pricing logic (untested gap)
```

---

## 🏆 Hackathon Eligibility & IBM Bob Integration

This project is built and optimized specifically for the **IBM Bob 2.0 Hackathon**, adhering strictly to the three core eligibility requirements:

### 1️⃣ IBM Bob IDE as a Core Component
- **Agentic Task Architecture:** PR Pre-Flight Guardian was engineered using IBM Bob IDE's AI Task system to decompose development into discrete, chained agentic stages:
  1. *Security Audit Agent:* Configured pattern recognition and AST vulnerability detection.
  2. *Test Engineering Agent:* Generated Jest boundary test suites covering complex business logic.
  3. *PR Documentation Agent:* Synthesized audit logs into actionable GitHub-ready pull request digests.
- **Bob Shell & CLI Portability:** Designed to execute seamlessly inside the Bob IDE built-in terminal or Bob Shell, providing real-time pre-flight feedback directly to developers before pushing commits.

### 2️⃣ The `bob_sessions` Evidence Directory 📸
- Verified evidence of Bob IDE task execution and Bobcoin consumption is maintained in [`bob_sessions/`](bob_sessions/).
- Contains **22 curated PNG screenshots** from Bob IDE's **Tasks → Consumption Summary** panel verifying task completions, token counts, live terminal runs, diff edits, and Bobcoin balances.
- See the complete gallery and breakdown in [`bob_sessions/README.md`](bob_sessions/README.md).

![Bob IDE Session Summary](bob_sessions/screenshots/01_repo_init_and_task_consumption_summary.png)

### 3️⃣ Clean Data & Strict Compliance
- **Zero Confidential / Client / Social Data:** All data processed and demonstrated is strictly synthetic or permissible open source.
- **Source Attestation:** Verified in [`DATA_COMPLIANCE.md`](file:///c:/Users/DELL/Desktop/ibm%20practice/DATA_COMPLIANCE.md), covering:
  - Synthetic billing service logic (`target-repo/`).
  - Synthetic high-entropy test keys for security scanner verification.
  - Permissive MIT open-source validation via `expressjs/cors` (`demo-real-repo/`).

### 🪙 Bobcoin Resource Optimization Strategy
- **40 Bobcoins Allocation (40/40):** All local testing, CLI runs (`node guardian.js`), and test executions (`npm test`) run locally on zero Bobcoins to protect the 40-coin allocation.
- **High-Leverage AI Invocations:** Bob AI interactions were focused exclusively on high-leverage architectural orchestration and test generation.
- **Usage Monitoring:** Monitored in Bob IDE under **Settings → General** to ensure sustainable execution throughout the hackathon lifecycle.

