const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceDir = __dirname;
const screenshotsDir = path.join(workspaceDir, 'bob_sessions', 'screenshots');

function getBase64Image(filename) {
  const filePath = path.join(screenshotsDir, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return '';
  }
  const ext = path.extname(filename).slice(1);
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:image/${ext};base64,${data}`;
}

const imgSummary = getBase64Image('01_repo_init_and_task_consumption_summary.png');
const imgDashboard = getBase64Image('08_bob_tasks_coin_consumption_dashboard.png');
const imgDiff = getBase64Image('16_bob_agent_diff_code_editing.png');
const imgCors = getBase64Image('05_real_world_validation_cors_comparison.png');
const imgHtml = getBase64Image('10_guardian_html_dashboard_in_bob_ide.png');
const imgScanner = getBase64Image('03_task1_security_scanner_findings.png');
const imgConsumption = getBase64Image('15_task_html_report_consumption_summary.png');
const imgCliTargetVuln = getBase64Image('19_guardian_cli_target_repo_vulnerabilities.png');
const imgCliTargetVerdict = getBase64Image('20_guardian_cli_target_repo_blocked_verdict.png');
const imgCliCorsZero = getBase64Image('21_guardian_cli_cors_zero_vulnerabilities.png');
const imgCliCorsApproved = getBase64Image('22_guardian_cli_cors_approved_verdict.png');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PR Pre-Flight Guardian — Slide Presentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

    @page {
      size: 16in 9in;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f8fafc;
      background: #090d16;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .slide {
      width: 16in;
      height: 9in;
      page-break-after: always;
      position: relative;
      padding: 0.8in 1in 0.7in 1in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(135deg, #090d16 0%, #0f172a 100%);
      overflow: hidden;
    }

    .slide:last-child {
      page-break-after: avoid;
    }

    /* Ambient glow elements */
    .glow-top-right {
      position: absolute;
      top: -150px;
      right: -150px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(15, 98, 254, 0.18) 0%, rgba(15, 98, 254, 0) 70%);
      pointer-events: none;
      border-radius: 50%;
    }

    .glow-bottom-left {
      position: absolute;
      bottom: -150px;
      left: -150px;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(138, 63, 252, 0.15) 0%, rgba(138, 63, 252, 0) 70%);
      pointer-events: none;
      border-radius: 50%;
    }

    /* Header & Navigation */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.3in;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.2in;
      z-index: 2;
    }

    .slide-title-group h2 {
      font-size: 28pt;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .slide-title-group .category {
      font-size: 11pt;
      font-weight: 700;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 4px;
    }

    .header-badges {
      display: flex;
      gap: 8px;
    }

    .badge {
      padding: 6px 14px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 10pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-blue { background: rgba(15, 98, 254, 0.2); color: #78a9ff; border: 1px solid rgba(15, 98, 254, 0.4); }
    .badge-purple { background: rgba(138, 63, 252, 0.2); color: #be95ff; border: 1px solid rgba(138, 63, 252, 0.4); }
    .badge-green { background: rgba(36, 161, 72, 0.2); color: #6fdc8c; border: 1px solid rgba(36, 161, 72, 0.4); }
    .badge-red { background: rgba(218, 30, 40, 0.2); color: #fa4d56; border: 1px solid rgba(218, 30, 40, 0.4); }

    /* Content Area */
    .slide-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      z-index: 2;
    }

    /* Footer */
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 0.15in;
      font-size: 10pt;
      color: #64748b;
      font-weight: 500;
      z-index: 2;
    }

    .slide-footer .brand {
      color: #94a3b8;
      font-weight: 600;
    }

    /* Grids & Cards */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.4in;
      align-items: center;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.3in;
    }

    .card {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 0.3in;
      backdrop-filter: blur(10px);
    }

    .card h3 {
      font-size: 15pt;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 10px;
    }

    .card p {
      font-size: 11pt;
      color: #94a3b8;
      line-height: 1.6;
    }

    .card ul {
      margin-left: 20px;
      color: #cbd5e1;
      font-size: 11pt;
      line-height: 1.6;
    }

    .card li {
      margin-bottom: 8px;
    }

    /* Hero Slide */
    .hero-slide {
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 1.2in;
    }

    .hero-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 18px;
      background: rgba(15, 98, 254, 0.15);
      border: 1px solid rgba(15, 98, 254, 0.35);
      border-radius: 30px;
      color: #78a9ff;
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 24px;
    }

    .hero-title {
      font-size: 46pt;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.15;
      letter-spacing: -1.5px;
      margin-bottom: 18px;
    }

    .hero-title span {
      background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .hero-subtitle {
      font-size: 16pt;
      color: #94a3b8;
      max-width: 900px;
      margin: 0 auto 36px auto;
      line-height: 1.6;
    }

    .hero-meta-box {
      display: flex;
      justify-content: center;
      gap: 30px;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px 36px;
    }

    .meta-col {
      text-align: left;
    }

    .meta-col .label {
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 700;
    }

    .meta-col .val {
      font-size: 11pt;
      color: #f1f5f9;
      font-weight: 600;
      font-family: 'JetBrains Mono', monospace;
    }

    /* Before vs After */
    .compare-card {
      border-radius: 12px;
      padding: 0.32in;
      height: 100%;
    }

    .compare-card.before {
      background: rgba(220, 38, 38, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-top: 5px solid #ef4444;
    }

    .compare-card.after {
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-top: 5px solid #10b981;
    }

    .compare-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .compare-tag {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .time-badge {
      font-size: 13pt;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      padding: 4px 12px;
      border-radius: 6px;
    }

    .before .compare-tag { color: #f87171; }
    .before .time-badge { background: rgba(239, 68, 68, 0.2); color: #fca5a5; }

    .after .compare-tag { color: #34d399; }
    .after .time-badge { background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }

    /* Image Containers */
    .image-showcase {
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      background: #000;
      max-height: 4.8in;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .image-showcase img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .image-label {
      font-size: 9pt;
      color: #94a3b8;
      text-align: center;
      margin-top: 8px;
      font-weight: 500;
    }

    /* Metric stats */
    .stat-row {
      display: flex;
      gap: 20px;
      margin-top: 18px;
    }

    .stat-pill {
      flex: 1;
      background: rgba(15, 98, 254, 0.12);
      border: 1px solid rgba(15, 98, 254, 0.3);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
    }

    .stat-pill .num {
      font-size: 20pt;
      font-weight: 800;
      color: #38bdf8;
      font-family: 'JetBrains Mono', monospace;
    }

    .stat-pill .desc {
      font-size: 8.5pt;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>

  <!-- SLIDE 1: COVER -->
  <div class="slide hero-slide">
    <div class="glow-top-right"></div>
    <div class="glow-bottom-left"></div>
    <div>
      <div class="hero-pill">
        🛡️ IBM Bob 2.0 Hackathon Submission • Developer Tools Track
      </div>
      <h1 class="hero-title">PR Pre-Flight <span>Guardian</span></h1>
      <p class="hero-subtitle">
        An autonomous Node.js CLI that chains static security auditing, automated unit test verification, and PR documentation generation into a single unified pre-flight command before code merges.
      </p>
      <div class="hero-meta-box">
        <div class="meta-col">
          <div class="label">Developer / Team</div>
          <div class="val">Qaasim-Falade Abdullah</div>
        </div>
        <div class="meta-col">
          <div class="label">AI Platform</div>
          <div class="val">IBM Bob IDE (Agent Mode 2.0)</div>
        </div>
        <div class="meta-col">
          <div class="label">GitHub Repository</div>
          <div class="val">Alqaasimee-jr2/ibm-coding-challenge</div>
        </div>
        <div class="meta-col">
          <div class="label">Bobcoin Efficiency</div>
          <div class="val">40 / 40 Bobcoins Allocation</div>
        </div>
      </div>
    </div>
    <div class="slide-footer" style="width: 100%;">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>IBM Bob 2.0 Hackathon • Project Slide Deck</span>
      <span>Slide 1 of 9</span>
    </div>
  </div>

  <!-- SLIDE 2: THE PROBLEM -->
  <div class="slide">
    <div class="glow-top-right"></div>
    <div class="slide-header">
      <div class="slide-title-group">
        <div class="category">The Challenge</div>
        <h2>The 45-Minute Pull Request Bottleneck</h2>
      </div>
      <div class="header-badges">
        <span class="badge badge-blue">Developer Friction</span>
        <span class="badge badge-purple">Quality Gaps</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="card" style="border-left: 4px solid #f87171;">
          <h3>⚠️ Where Developer Hours Disappear</h3>
          <p style="margin-bottom: 16px;">
            The pull request boundary is the most critical quality gate in software delivery, yet it remains manual, error-prone, and heavily fragmented:
          </p>
          <ul>
            <li><strong>Manual Code Reviews:</strong> Developers spend 15 minutes eyeballing files for leaked keys, dynamic eval(), or SQL strings.</li>
            <li><strong>Rushed Boilerplate Tests:</strong> Under sprint deadlines, developers spend 20 minutes authoring tests, skipping boundary cases.</li>
            <li><strong>Manual PR Documentation:</strong> Copy-pasting terminal logs and guessing at security risk profiles takes 10+ minutes.</li>
            <li><strong>Costly Context Switching:</strong> Developers juggle linters, test runners, git diffs, and web portals simultaneously.</li>
          </ul>
        </div>

        <div class="card" style="border-left: 4px solid #ef4444;">
          <h3>🚨 The High Cost of Unchecked PRs</h3>
          <p style="margin-bottom: 16px;">
            When manual auditing fails under pressure, critical vulnerabilities escape directly into production branches:
          </p>
          <ul>
            <li><strong>Leaked High-Entropy Secrets:</strong> Hardcoded Stripe live keys and JWT secrets committed into Git history.</li>
            <li><strong>Dangerous Dynamic Code:</strong> Unescaped <code>eval()</code> calls and SQL string concatenations open remote execution vectors.</li>
            <li><strong>Untested Edge Cases:</strong> Untested business logic (e.g. stacked volume discounts) leads to revenue loss.</li>
            <li><strong>Reviewer Fatigue:</strong> Sparse PR summaries force reviewers to guess intent, delaying merges for days.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Problem Statement</span>
      <span>Slide 2 of 9</span>
    </div>
  </div>

  <!-- SLIDE 3: BEFORE VS AFTER -->
  <div class="slide">
    <div class="glow-top-right"></div>
    <div class="slide-header">
      <div class="slide-title-group">
        <div class="category">Transformation</div>
        <h2>Before vs. After Guardian</h2>
      </div>
      <div class="header-badges">
        <span class="badge badge-blue">90x Faster</span>
        <span class="badge badge-green">Zero-Friction</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="compare-card before">
          <div class="compare-header">
            <div class="compare-tag">🛑 Before Guardian</div>
            <div class="time-badge">45 MINUTES</div>
          </div>
          <ul>
            <li><strong>15 Min Security Check:</strong> Eyeballing code diffs, searching for secrets.</li>
            <li><strong>20 Min Unit Testing:</strong> Manually writing Jest tests for new methods.</li>
            <li><strong>10 Min PR Summary:</strong> Manually typing pull request notes and checklist.</li>
            <li><strong>High Cognitive Load:</strong> Juggling multiple tools and terminals.</li>
            <li><strong>Human Error:</strong> Silent leaks, missed boundary tests, broken builds.</li>
          </ul>
        </div>

        <div class="compare-card after">
          <div class="compare-header">
            <div class="compare-tag">🚀 After Guardian</div>
            <div class="time-badge">30 SECONDS</div>
          </div>
          <ul>
            <li><strong>Autonomous Static Scan:</strong> AST pattern matching with CVSS 3.1 scores.</li>
            <li><strong>Automated Test Execution:</strong> Regression suites assert 100% green pass rate.</li>
            <li><strong>Instant PR Markdown:</strong> Complete risk matrix & reviewer checklist generated.</li>
            <li><strong>Interactive HTML Report:</strong> Standalone dashboard with readiness scorecard.</li>
            <li><strong>CI/CD Gate Ready:</strong> Exit code 1 blocker verdict stops unsafe merges.</li>
          </ul>
        </div>
      </div>

      <div class="stat-row">
        <div class="stat-pill">
          <div class="num">45m ➔ 30s</div>
          <div class="desc">Time Saved per PR</div>
        </div>
        <div class="stat-pill">
          <div class="num">100%</div>
          <div class="desc">Automated Coverage</div>
        </div>
        <div class="stat-pill">
          <div class="num">0</div>
          <div class="desc">Runtime Dependencies</div>
        </div>
        <div class="stat-pill">
          <div class="num">1 Command</div>
          <div class="desc">node guardian.js</div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Developer Experience Paradigm</span>
      <span>Slide 3 of 9</span>
    </div>
  </div>

  <!-- SLIDE 4: THE 4-PHASE ARCHITECTURE -->
  <div class="slide">
    <div class="glow-top-right"></div>
    <div class="slide-header">
      <div class="slide-title-group">
        <div class="category">System Design</div>
        <h2>Chained 4-Phase Pre-Flight Architecture</h2>
      </div>
      <div class="header-badges">
        <span class="badge badge-blue">Deterministic</span>
        <span class="badge badge-purple">Chained Tasks</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div class="card" style="border-left: 4px solid #ef4444; padding: 16px;">
            <h3 style="font-size: 13pt;">Phase 1: Static Security Scanner (AST & Regex)</h3>
            <p style="font-size: 10pt;">Scans target files for hardcoded API keys, JWT secrets, SQL injection concatenations, and unsafe dynamic <code>eval()</code>. Generates <code>findings.json</code> with CVSS 3.1 base scores & suggested patches.</p>
          </div>
          <div class="card" style="border-left: 4px solid #10b981; padding: 16px;">
            <h3 style="font-size: 13pt;">Phase 2: Automated Test Execution</h3>
            <p style="font-size: 10pt;">Executes Jest regression suites across complex pricing logic (tiered volume discounts, loyalty bonus stacking, boundary validation), verifying 100% green pass rates.</p>
          </div>
          <div class="card" style="border-left: 4px solid #38bdf8; padding: 16px;">
            <h3 style="font-size: 13pt;">Phase 3: PR Markdown Documentation Synthesis</h3>
            <p style="font-size: 10pt;">Merges security findings and test output into GitHub/GitLab-ready pull request summaries (<code>pr-description.md</code> & <code>pr-comment-preview.md</code>) with a risk matrix & sign-off checklist.</p>
          </div>
          <div class="card" style="border-left: 4px solid #a855f7; padding: 16px;">
            <h3 style="font-size: 13pt;">Phase 4: Interactive HTML Dashboard</h3>
            <p style="font-size: 10pt;">Renders self-contained dark-mode report (<code>guardian-report.html</code>) with filterable findings, interactive tabs, and visual pre-flight readiness scorecards.</p>
          </div>
        </div>

        <div class="image-showcase">
          <img src="${imgHtml}" alt="Interactive HTML Dashboard in Bob IDE">
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Architectural Pipeline</span>
      <span>Slide 4 of 9</span>
    </div>
  </div>

  <!-- SLIDE 5: IBM BOB INTEGRATION -->
  <div class="slide">
    <div class="glow-top-right"></div>
    <div class="slide-header">
      <div class="slide-title-group">
        <div class="category">IBM Bob 2.0 Core Component</div>
        <h2>Engineered with Bob Agent Mode 2.0</h2>
      </div>
      <div class="header-badges">
        <span class="badge badge-blue">Bob IDE</span>
        <span class="badge badge-purple">Agent Mode 2.0</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="image-showcase">
          <img src="${imgDiff}" alt="Bob Agent Mode Live Code Diff Editing">
        </div>

        <div class="card">
          <h3>🧠 Autonomous Agent Task Orchestration</h3>
          <p style="margin-bottom: 14px;">
            IBM Bob IDE was the central intelligence engine. Instead of using AI as a simple text generator, we leveraged <strong>Bob Agent Mode 2.0</strong> to decompose and build the system across discrete chained tasks:
          </p>
          <ul>
            <li><strong>Reconnaissance Agent:</strong> Bob explored target codebase AST structures, diagnosing security and test gaps (<code>bob_sessions/00_recon.md</code>).</li>
            <li><strong>Security Engineer Agent:</strong> Bob constructed <code>security-scan.js</code> with precise AST regex patterns and line-mapping logic.</li>
            <li><strong>Test Automation Agent:</strong> Bob authored boundary test cases in <code>__tests__/pricingEngine.test.js</code> and validated green execution.</li>
            <li><strong>Full-Stack CLI Agent:</strong> Bob wired <code>guardian.js</code>, built the ANSI terminal renderer, and implemented the HTML dashboard.</li>
            <li><strong>Live Split-Screen Diff Editing:</strong> Bob actively reviewed, refined, and applied code changes directly in the workspace.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Bob IDE Integration</span>
      <span>Slide 5 of 9</span>
    </div>
  </div>

  <!-- SLIDE 6: BOBCOIN EFFICIENCY & EVIDENCE -->
  <div class="slide">
    <div class="glow-top-right"></div>
    <div class="slide-header">
      <div class="slide-title-group">
        <div class="category">Resource Governance</div>
        <h2>Bobcoin Budget Awareness & Telemetry</h2>
      </div>
      <div class="header-badges">
        <span class="badge badge-blue">40 Coin Budget</span>
        <span class="badge badge-green">40/40 Coins Managed</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="card">
          <h3>🪙 Strategic Resource Optimization</h3>
          <p style="margin-bottom: 14px;">
            Under the hackathon's strict <strong>40-Bobcoin constraint</strong>, we maintained rigorous token and coin discipline through prompt orchestration:
          </p>
          <ul>
            <li><strong>High-Leverage AI Invocations:</strong> Bob AI interactions were focused strictly on architecture design, scanner rules, and test generation.</li>
            <li><strong>Zero-Coin Local Terminal Cycles:</strong> Repetitive CLI runs, Jest test executions, and git operations ran locally in Bob IDE's terminal at <strong>0 Bobcoins</strong>.</li>
            <li><strong>Continuous Monitoring:</strong> Watched token context (150k–203k tokens) and Bobcoin gauges (44% to 45%) across all 8 tasks.</li>
            <li><strong>18 Verified Screenshots:</strong> Every task session consumption summary was captured and cataloged in <code>bob_sessions/screenshots/</code>.</li>
          </ul>
          <div class="stat-row" style="margin-top: 20px;">
            <div class="stat-pill">
              <div class="num">8 Tasks</div>
              <div class="desc">Orchestrated</div>
            </div>
            <div class="stat-pill">
              <div class="num">40 Coins</div>
              <div class="desc">Account Allocation</div>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          <div class="image-showcase" style="max-height: 2.2in;">
            <img src="${imgSummary}" alt="Session Consumption Summary Header">
          </div>
          <div class="image-showcase" style="max-height: 2.2in;">
            <img src="${imgDashboard}" alt="Master Tasks Consumption Dashboard">
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Bobcoin Efficiency & Evidence</span>
      <span>Slide 6 of 9</span>
    </div>
  </div>


  <!-- SLIDE 7: LIVE CLI EXECUTION IN BOB IDE -->
  <div class="slide">
    <div class="glow-top-right"></div>
    <div class="slide-header">
      <div class="slide-title-group">
        <div class="category">Live Execution Proof</div>
        <h2>PR Guardian in Action: Bob IDE Terminal Runs</h2>
      </div>
      <div class="header-badges">
        <span class="badge badge-red">Target: BLOCKED (Exit 1)</span>
        <span class="badge badge-green">CORS: APPROVED (Exit 0)</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div>
          <div class="image-showcase" style="max-height: 3.5in; margin-bottom: 12px;">
            <img src="${imgCliTargetVerdict}" alt="Target Repo Blocked Verdict">
          </div>
          <div class="card" style="padding: 14px; border-left: 4px solid #ef4444;">
            <h4 style="color: #f87171; font-size: 11pt; margin-bottom: 4px;">🛑 Vulnerable Target Repo (Exit Code 1)</h4>
            <p style="font-size: 9.5pt; color: #94a3b8; line-height: 1.4;">
              Scans target repo with 3 critical security flaws (Stripe secret, SQLi, dynamic eval). Halts PR merge, scores security health at <strong>30%</strong>, and auto-generates remediation diff patches in <code>pr-comment-preview.md</code>.
            </p>
          </div>
        </div>

        <div>
          <div class="image-showcase" style="max-height: 3.5in; margin-bottom: 12px;">
            <img src="${imgCliCorsApproved}" alt="CORS Repo Approved Verdict">
          </div>
          <div class="card" style="padding: 14px; border-left: 4px solid #10b981;">
            <h4 style="color: #34d399; font-size: 11pt; margin-bottom: 4px;">✅ Clean Production Repo (Exit Code 0)</h4>
            <p style="font-size: 9.5pt; color: #94a3b8; line-height: 1.4;">
              Scans imported <code>expressjs/cors</code> codebase. Detects 0 vulnerabilities, verifies 100% test pass rate, scores readiness at <strong>100%</strong>, and authorizes clean merge into production branch.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Live CLI Execution Evidence</span>
      <span>Slide 7 of 9</span>
    </div>
  </div>

  <!-- SLIDE 8: REAL-WORLD VALIDATION -->
  <div class="slide">
    <div class="glow-top-right"></div>
    <div class="slide-header">
      <div class="slide-title-group">
        <div class="category">Real-World Verification</div>
        <h2>Enterprise-Grade Precision: 0 False Positives</h2>
      </div>
      <div class="header-badges">
        <span class="badge badge-green">expressjs/cors</span>
        <span class="badge badge-blue">Clean Data</span>
      </div>
    </div>

    <div class="slide-body">
      <div class="grid-2">
        <div class="image-showcase">
          <img src="${imgCors}" alt="Target vs CORS Validation Comparison">
        </div>

        <div class="card">
          <h3>🔬 Synthetic vs. Production Verification</h3>
          <p style="margin-bottom: 14px;">
            To prove production reliability, Guardian was benchmarked side-by-side against an imported real-world repository (<code>expressjs/cors</code>):
          </p>
          <ul>
            <li><strong>Target Repo (Synthetic):</strong> Correctly flagged all 3 critical vulnerabilities (hardcoded Stripe secret, SQL injection, dynamic eval). Exited with code <code>1</code> (BLOCKED).</li>
            <li><strong>expressjs/cors (Production Open Source):</strong> Guardian walked 238 lines of middleware across 5 security rules and yielded <strong>0 findings and 0 false positives</strong>. Exited with code <code>0</code> (CLEAN).</li>
            <li><strong>Clean Data Compliance (Rule #3):</strong> Zero customer data, zero PII, and full compliance with permissive MIT open-source terms attested in <code>DATA_COMPLIANCE.md</code>.</li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Real-World Validation</span>
      <span>Slide 8 of 9</span>
    </div>
  </div>

  <!-- SLIDE 9: SUMMARY & LINKS -->
  <div class="slide hero-slide" style="text-align: center; padding: 0.8in 1.2in;">
    <div class="glow-top-right"></div>
    <div class="glow-bottom-left"></div>
    <div>
      <div class="hero-pill">
        🏆 100% Hackathon Deliverables Satisfied
      </div>
      <h2 style="font-size: 34pt; font-weight: 800; color: #ffffff; margin-bottom: 16px;">
        Empowering Developers with Autonomous Pre-Flight Certainty
      </h2>
      <p style="font-size: 13pt; color: #94a3b8; max-width: 850px; margin: 0 auto 28px auto; line-height: 1.6;">
        PR Pre-Flight Guardian combines static security rigor, automated test verification, and automated PR documentation into a single CLI tool — built with IBM Bob IDE Agent Mode 2.0.
      </p>

      <div class="grid-3" style="max-width: 1000px; margin: 0 auto 30px auto; text-align: left;">
        <div class="card" style="padding: 16px;">
          <h4 style="color: #38bdf8; font-size: 11pt; margin-bottom: 6px;">Rule #1: Bob IDE Core</h4>
          <p style="font-size: 9.5pt; color: #cbd5e1;">Agent Mode 2.0 chained tasks, prompt orchestration, and Bob Shell compatibility.</p>
        </div>
        <div class="card" style="padding: 16px;">
          <h4 style="color: #34d399; font-size: 11pt; margin-bottom: 6px;">Rule #2: bob_sessions</h4>
          <p style="font-size: 9.5pt; color: #cbd5e1;">22 curated PNG screenshots capturing consumption headers, token telemetry, and live CLI runs.</p>
        </div>
        <div class="card" style="padding: 16px;">
          <h4 style="color: #a78bfa; font-size: 11pt; margin-bottom: 6px;">Rule #3: Clean Data</h4>
          <p style="font-size: 9.5pt; color: #cbd5e1;">100% synthetic fixtures & MIT open source verified in DATA_COMPLIANCE.md.</p>
        </div>
      </div>

      <div style="font-family: 'JetBrains Mono', monospace; font-size: 11pt; color: #78a9ff; background: rgba(15, 98, 254, 0.15); border: 1px solid rgba(15, 98, 254, 0.4); padding: 12px 24px; border-radius: 8px; display: inline-block;">
        🔗 GitHub: https://github.com/Alqaasimee-jr2/ibm-coding-challenge
      </div>
    </div>

    <div class="slide-footer" style="width: 100%;">
      <span class="brand">PR Pre-Flight Guardian</span>
      <span>Thank You • IBM Bob 2.0 Hackathon Submission</span>
      <span>Slide 9 of 9</span>
    </div>
  </div>

</body>
</html>
`;

const htmlPath = path.join(workspaceDir, 'presentation_slides.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Generated presentation_slides.html successfully.');

const pdfPath = path.join(workspaceDir, 'PR_PreFlight_Guardian_Pitch_Deck.pdf');
const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

if (fs.existsSync(edgePath)) {
  console.log('Rendering 16:9 Slide Presentation PDF using Microsoft Edge...');
  const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf-no-header --print-to-pdf="${pdfPath}" "${htmlPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log(`Slide Presentation PDF generated at: ${pdfPath}`);
} else {
  console.error('Edge executable not found.');
}
