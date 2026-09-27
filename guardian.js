#!/usr/bin/env node
/**
 * PR Pre-Flight Guardian — Task 3: Master CLI
 *
 * Chains four phases into one unified pre-flight check:
 *   Phase 1 — Static security scan  (security-scan.js → findings.json)
 *   Phase 2 — Test suite            (Jest via child_process, duration + pass/fail)
 *   Phase 3 — PR documentation      (pr-description.md + pr-comment-preview.md)
 *   Phase 4 — HTML dashboard        (guardian-report.html, dark-mode, self-contained)
 *
 * Then renders a rich ANSI console report with:
 *   • Color-coded severity badges
 *   • Actionable suggested code patches (--suggest-fixes)
 *   • ASCII Pre-Flight Readiness Scorecard gauge
 *   • Pre-Flight Verdict: [CLEAN] vs [ACTION REQUIRED]
 *
 * Usage:
 *   node guardian.js --repo <path> [--strict | --ci] [--suggest-fixes]
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const { spawnSync } = require('child_process');

// ─── ANSI colour helpers ───────────────────────────────────────────────────────

const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  green:   '\x1b[32m',
  cyan:    '\x1b[36m',
  magenta: '\x1b[35m',
  white:   '\x1b[97m',
  bgRed:   '\x1b[41m',
  bgGreen: '\x1b[42m',
};

const clr  = (code, text) => `${code}${text}${C.reset}`;
const bold  = t => clr(C.bold,   t);
const dim   = t => clr(C.dim,    t);
const red   = t => clr(C.red,    t);
const yel   = t => clr(C.yellow, t);
const grn   = t => clr(C.green,  t);
const cyan  = t => clr(C.cyan,   t);
const mag   = t => clr(C.magenta, t);

// ─── Argument parser ──────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let repoPath     = './target-repo';
  let suggestFixes = false;
  let strict       = false;   // --strict or --ci: fail on any HIGH+ finding

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--repo') && args[i + 1]) {
      repoPath = args[++i];
    } else if (args[i] === '--suggest-fixes') {
      suggestFixes = true;
    } else if (args[i] === '--strict' || args[i] === '--ci') {
      strict = true;
    }
  }
  return { repoPath, suggestFixes, strict };
}

// ─── Banner / phase helpers ───────────────────────────────────────────────────

function banner(title) {
  const width = 62;
  const bar   = '═'.repeat(width);
  const pad   = Math.max(0, Math.floor((width - title.length) / 2));
  const rpad  = Math.max(0, width - pad - title.length);
  console.log(`\n${bold(cyan('╔' + bar + '╗'))}`);
  console.log(`${bold(cyan('║'))}${' '.repeat(pad)}${bold(title)}${' '.repeat(rpad)}${bold(cyan('║'))}`);
  console.log(`${bold(cyan('╚' + bar + '╝'))}`);
}

function phase(num, label) {
  console.log(`\n${bold(cyan(`▶ Phase ${num}:`))} ${bold(label)}`);
  console.log(dim('─'.repeat(64)));
}

// ─── Phase 1: Security Scan ───────────────────────────────────────────────────

function runSecurityScan(repoPath, suggestFixes) {
  const scannerPath  = path.resolve(__dirname, 'security-scan.js');
  const findingsPath = path.resolve(__dirname, 'findings.json');

  const extraArgs = suggestFixes ? ['--suggest-fixes'] : [];

  const result = spawnSync(
    process.execPath,
    [scannerPath, '--repo', repoPath, ...extraArgs],
    { stdio: 'inherit', encoding: 'utf8' }
  );

  // 0 = clean, 1 = findings found — both expected
  if (result.status !== 0 && result.status !== 1) {
    console.error(red(`[guardian] security-scan.js exited with unexpected code: ${result.status}`));
    if (result.error) console.error(red(result.error.message));
    process.exit(2);
  }

  if (!fs.existsSync(findingsPath)) {
    console.error(red('[guardian] findings.json not produced by security-scan.js'));
    process.exit(2);
  }

  try {
    return JSON.parse(fs.readFileSync(findingsPath, 'utf8'));
  } catch (err) {
    console.error(red(`[guardian] Failed to parse findings.json: ${err.message}`));
    process.exit(2);
  }
}

// ─── Phase 2: Jest Test Suite ─────────────────────────────────────────────────

function runTests() {
  const isWindows = process.platform === 'win32';
  const jestBin   = path.resolve(
    __dirname, 'node_modules', '.bin', isWindows ? 'jest.cmd' : 'jest'
  );
  const jestArgs = [
    '--json',
    '--no-coverage',
    '--forceExit',
    '--testPathPattern', '__tests__',
  ];

  const spawnCmd  = isWindows ? 'cmd'             : process.execPath;
  const spawnArgs = isWindows ? ['/c', jestBin, ...jestArgs] : [jestBin, ...jestArgs];

  console.log(dim('  Running Jest test suite…'));

  const t0 = Date.now();
  const result = spawnSync(spawnCmd, spawnArgs, {
    encoding:  'utf8',
    maxBuffer: 10 * 1024 * 1024,
    shell:     false,
  });
  const durationMs = Date.now() - t0;

  if (result.stderr) process.stderr.write(result.stderr);

  let jestJson;
  try {
    jestJson = JSON.parse(result.stdout);
  } catch {
    console.error(red('[guardian] Could not parse Jest JSON output.'));
    if (result.stdout) console.error(dim(result.stdout.slice(0, 500)));
    process.exit(2);
  }

  const passed     = jestJson.numPassedTests      ?? 0;
  const failed     = jestJson.numFailedTests      ?? 0;
  const total      = jestJson.numTotalTests       ?? 0;
  const suites     = jestJson.numTotalTestSuites  ?? 0;
  // Jest reports its own duration in ms in the JSON output
  const jestMs     = jestJson.testResults?.reduce((a, s) => a + (s.perfStats?.runtime ?? 0), 0) ?? durationMs;

  const testResults = [];
  for (const suite of (jestJson.testResults ?? [])) {
    const suiteFile = suite.name ?? suite.testFilePath ?? '';
    const suiteName = suiteFile ? path.relative(process.cwd(), suiteFile) : '(unknown suite)';
    for (const t of (suite.assertionResults ?? suite.testResults ?? [])) {
      testResults.push({
        suite:    suiteName,
        name:     t.fullName ?? t.title ?? '(unnamed)',
        status:   t.status,
        duration: t.duration ?? null,
      });
    }
  }

  const passLabel = grn(`${passed} passed`);
  const failLabel = failed > 0 ? red(`${failed} failed`) : dim('0 failed');
  console.log(`\n  Tests: ${passLabel}, ${failLabel}, ${total} total  |  Suites: ${suites}  |  Duration: ${(jestMs / 1000).toFixed(2)}s`);

  return { passed, failed, total, suites, durationMs: jestMs, testResults, allPassed: failed === 0 };
}

// ─── Helpers shared by Phase 3 & ANSI renderer ───────────────────────────────

function remediationFor(ruleId) {
  const MAP = {
    SECRET_HARDCODED_SK_LIVE:
      'Move key to an environment variable or secrets manager (e.g., `.env` + `dotenv`). Rotate the exposed key immediately.',
    SECRET_JWT_ASSIGNMENT:
      'Load JWT secret from `process.env.JWT_SECRET`. Never commit plaintext secrets to source control.',
    SQL_INJECTION_CONCAT:
      'Replace string-concatenated queries with parameterised statements (e.g., `db.query("… WHERE id = ?", [id])`).',
    UNSAFE_EVAL:
      'Remove `eval()`. Use a safe expression parser (e.g., `mathjs`, `expr-eval`) or restructure the logic.',
    UNSAFE_CHILD_PROCESS_EXEC:
      'Replace `exec()` with `execFile()` or `spawnSync()` with a whitelist of allowed arguments.',
  };
  return MAP[ruleId] ?? 'Review and remediate according to OWASP Top-10 guidelines.';
}

function riskLabel(severity) {
  return severity === 'CRITICAL' ? '🔴 Critical' : '🟡 High';
}

function severityBadgeMd(severity) {
  return severity === 'CRITICAL'
    ? '![CRITICAL](https://img.shields.io/badge/CRITICAL-red)'
    : '![HIGH](https://img.shields.io/badge/HIGH-orange)';
}

// ─── Phase 3a: pr-description.md ─────────────────────────────────────────────

function generatePRDescription(repoPath, securityData, testData, now) {
  const findings  = securityData.findings ?? [];
  const criticals = findings.filter(f => f.severity === 'CRITICAL');
  const highs     = findings.filter(f => f.severity === 'HIGH');
  const absRepo   = path.resolve(repoPath);

  const affectedFiles = [...new Set(findings.map(f => path.relative(process.cwd(), f.file)))];
  const suiteFiles    = [...new Set(testData.testResults.map(t => t.suite))];

  const hasBlockers  = criticals.length > 0;
  const testsFailing = testData.failed > 0;

  // Status badge
  const statusBadge = (!hasBlockers && !testsFailing)
    ? '![Pre-Flight](https://img.shields.io/badge/Pre--Flight-CLEAN-brightgreen)'
    : '![Pre-Flight](https://img.shields.io/badge/Pre--Flight-ACTION%20REQUIRED-critical)';

  let md = '';
  md += `# PR Pre-Flight Report\n\n`;
  md += `${statusBadge}\n\n`;
  md += `> Generated by **PR Pre-Flight Guardian** on \`${now}\`  \n`;
  md += `> Repository: \`${absRepo}\`\n\n`;
  md += `---\n\n`;

  // Section 1: What Changed
  md += `## 1. What Changed\n\n`;
  if (affectedFiles.length > 0) {
    md += `Files flagged during the pre-flight scan:\n\n`;
    affectedFiles.forEach(f => { md += `- \`${f}\`\n`; });
  } else {
    md += `- *(No files flagged by the security scanner)*\n`;
  }
  if (suiteFiles.length > 0) {
    md += `\nFiles covered by the test suite:\n\n`;
    suiteFiles.forEach(s => { md += `- \`${s}\`\n`; });
  }
  md += `\n---\n\n`;

  // Section 2: Security Risk Matrix
  md += `## 2. Security Risk Matrix\n\n`;
  if (findings.length === 0) {
    md += `✅ **No security vulnerabilities detected.**\n\n`;
  } else {
    md += `| # | Badge | Risk Level | Rule ID | Location | Remediation | Suggested Fix |\n`;
    md += `|---|-------|-----------|---------|----------|-------------|---------------|\n`;
    findings.forEach((f, i) => {
      const loc    = `\`${path.relative(process.cwd(), f.file)}:${f.line}\``;
      const remedy = remediationFor(f.ruleId);
      const badge  = severityBadgeMd(f.severity);
      const fix    = f.suggestedFix
        ? `<details><summary>View patch</summary>\n\n\`\`\`js\n${f.suggestedFix}\n\`\`\`\n</details>`
        : '—';
      md += `| ${i + 1} | ${badge} | ${riskLabel(f.severity)} | \`${f.ruleId}\` | ${loc} | ${remedy} | ${fix} |\n`;
    });
    md += `\n> **Summary:** ${criticals.length} critical issue(s), ${highs.length} high issue(s) detected.  \n`;
    md += `> All items marked 🔴 Critical **must** be resolved before merge.\n`;
  }
  md += `\n---\n\n`;

  // Section 3: Test Execution Metrics
  const passRate = testData.total > 0 ? ((testData.passed / testData.total) * 100).toFixed(1) : 'N/A';
  md += `## 3. Test Execution Metrics\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Test suites | ${testData.suites} |\n`;
  md += `| Total tests | ${testData.total} |\n`;
  md += `| ✅ Passed    | ${testData.passed} |\n`;
  md += `| ❌ Failed    | ${testData.failed} |\n`;
  md += `| Pass rate   | ${passRate}% |\n`;
  md += `| Duration    | ${(testData.durationMs / 1000).toFixed(2)}s |\n\n`;

  md += `### Individual Test Checklist\n\n`;
  if (testData.testResults.length > 0) {
    testData.testResults.forEach(t => {
      const icon = t.status === 'passed' ? '- [x]' : t.status === 'failed' ? '- [ ] ❌' : '- [ ] ⏭';
      const dur  = t.duration != null ? ` *(${t.duration}ms)*` : '';
      md += `${icon} \`${t.name}\`${dur}\n`;
    });
  } else {
    md += `*(No individual test results available)*\n`;
  }
  md += `\n---\n\n`;

  // Section 4: Automated Reviewer Sign-off Checklist
  md += `## 4. Automated Reviewer Sign-off Checklist\n\n`;
  md += `### Security\n\n`;
  md += `- [${findings.length === 0 ? 'x' : ' '}] No critical or high vulnerabilities present\n`;
  md += `- [${criticals.length === 0 ? 'x' : ' '}] All CRITICAL findings resolved or risk-accepted with justification\n`;
  md += `- [${highs.length === 0 ? 'x' : ' '}] All HIGH findings resolved or mitigated\n`;
  md += `- [ ] Secrets confirmed absent from diff (manual review)\n`;
  md += `- [ ] No new \`eval()\` or unchecked \`exec()\` calls introduced\n\n`;

  md += `### Testing\n\n`;
  md += `- [${testData.allPassed ? 'x' : ' '}] All automated tests pass\n`;
  md += `- [ ] New code paths are covered by tests\n`;
  md += `- [ ] Edge cases and negative paths exercised\n\n`;

  md += `### General\n\n`;
  md += `- [ ] Code follows project style guide\n`;
  md += `- [ ] Documentation updated where applicable\n`;
  md += `- [ ] Dependent services / environment variables updated\n\n`;

  md += `---\n\n`;

  // Pre-Flight Verdict
  md += `## Pre-Flight Verdict\n\n`;
  if (!hasBlockers && !testsFailing) {
    md += `### ✅ \`[CLEAN]\` — Ready to merge\n\n`;
    md += `No blocker security issues and all tests pass. This PR may proceed through normal code review.\n`;
  } else {
    md += `### 🚨 \`[ACTION REQUIRED]\` — Merge blocked\n\n`;
    if (hasBlockers)   md += `- ❌ **${criticals.length} CRITICAL** security finding(s) must be remediated before merge.\n`;
    if (testsFailing)  md += `- ❌ **${testData.failed} test(s) failing** — the test suite must be green before merge.\n`;
  }

  md += `\n---\n`;
  md += `*Report produced by PR Pre-Flight Guardian — IBM Coding Challenge*\n`;
  return md;
}

// ─── Phase 3b: pr-comment-preview.md ─────────────────────────────────────────

function generatePRComment(securityData, testData, now) {
  const findings  = securityData.findings ?? [];
  const criticals = findings.filter(f => f.severity === 'CRITICAL');
  const hasBlockers  = criticals.length > 0;
  const testsFailing = testData.failed > 0;
  const secHealth    = findings.length === 0 ? 100 : Math.max(0, Math.round(100 - (criticals.length * 30 + (findings.length - criticals.length) * 15)));
  const passRate     = testData.total > 0 ? Math.round((testData.passed / testData.total) * 100) : 100;

  const verdictBadge = (!hasBlockers && !testsFailing)
    ? '🟢 **CLEAN — Ready for Review**'
    : '🔴 **ACTION REQUIRED — Merge Blocked**';

  let md = `## 🛡️ PR Pre-Flight Guardian Report\n\n`;
  md += `> *Auto-generated · ${now}*\n\n`;
  md += `${verdictBadge}\n\n`;

  md += `| Dimension | Score | Status |\n`;
  md += `|-----------|-------|--------|\n`;
  md += `| 🔐 Security Health | ${secHealth}% | ${secHealth === 100 ? '✅ Clean' : criticals.length > 0 ? '🔴 Blockers' : '🟡 Warnings'} |\n`;
  md += `| 🧪 Test Pass Rate  | ${passRate}% | ${passRate === 100 ? '✅ All green' : '❌ Failures'} |\n`;
  md += `| 🔍 Findings        | ${findings.length} total | ${findings.length === 0 ? '✅ None' : `${criticals.length} critical, ${findings.length - criticals.length} high`} |\n\n`;

  if (findings.length > 0) {
    md += `### Security Findings\n\n`;
    findings.forEach((f, i) => {
      const loc = `${path.basename(f.file)}:${f.line}`;
      md += `${i + 1}. ${f.severity === 'CRITICAL' ? '🔴' : '🟡'} **${f.ruleId}** — \`${loc}\`: ${f.description}\n`;
    });
    md += '\n';
  }

  md += `### Test Summary\n`;
  md += `- ✅ ${testData.passed} passed  ❌ ${testData.failed} failed  📊 ${testData.total} total  ⏱ ${(testData.durationMs / 1000).toFixed(2)}s\n\n`;

  md += `---\n`;
  md += `<sub>Generated by PR Pre-Flight Guardian</sub>\n`;
  return md;
}

// ─── Phase 4: HTML Dashboard ──────────────────────────────────────────────────

function generateHTML(repoPath, securityData, testData, now) {
  const findings   = securityData.findings ?? [];
  const criticals  = findings.filter(f => f.severity === 'CRITICAL');
  const highs      = findings.filter(f => f.severity === 'HIGH');
  const hasBlockers   = criticals.length > 0;
  const testsFailing  = testData.failed > 0;
  const isClean       = !hasBlockers && !testsFailing;

  const secHealth  = findings.length === 0 ? 100 : Math.max(0, Math.round(100 - (criticals.length * 30 + highs.length * 15)));
  const passRate   = testData.total > 0 ? Math.round((testData.passed / testData.total) * 100) : 100;
  const overallScore = Math.round((secHealth + passRate) / 2);

  const verdictColor = isClean ? '#22c55e' : '#ef4444';
  const verdictText  = isClean ? '✅ CLEAN — Ready to Merge' : '🚨 ACTION REQUIRED — Merge Blocked';

  // Build findings rows
  const findingRows = findings.map((f, i) => {
    const loc     = `${path.relative(process.cwd(), f.file)}:${f.line}`;
    const sevCls  = f.severity === 'CRITICAL' ? 'badge-critical' : 'badge-high';
    const remedy  = remediationFor(f.ruleId);
    const fixHtml = f.suggestedFix
      ? `<details><summary>View suggested patch</summary><pre class="patch">${escHtml(f.suggestedFix)}</pre></details>`
      : '—';
    return `
      <tr>
        <td>${i + 1}</td>
        <td><span class="badge ${sevCls}">${f.severity}</span></td>
        <td><code>${escHtml(f.ruleId)}</code></td>
        <td><code>${escHtml(loc)}</code></td>
        <td>${escHtml(f.description)}</td>
        <td>${escHtml(remedy)}</td>
        <td>${fixHtml}</td>
      </tr>`;
  }).join('\n');

  // Build test rows
  const testRows = testData.testResults.map(t => {
    const icon = t.status === 'passed' ? '✅' : t.status === 'failed' ? '❌' : '⏭️';
    const cls  = t.status === 'passed' ? 'test-pass' : t.status === 'failed' ? 'test-fail' : 'test-skip';
    const dur  = t.duration != null ? `${t.duration}ms` : '—';
    return `
      <tr class="${cls}">
        <td>${icon}</td>
        <td>${escHtml(t.name)}</td>
        <td>${escHtml(t.suite)}</td>
        <td>${dur}</td>
      </tr>`;
  }).join('\n');

  function gaugeBar(pct, color) {
    const filled = Math.round(pct / 5);  // 20-segment gauge
    const empty  = 20 - filled;
    return `<span style="color:${color}">${'█'.repeat(filled)}</span><span style="color:#374151">${'░'.repeat(empty)}</span> <strong style="color:${color}">${pct}%</strong>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PR Pre-Flight Guardian — Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
      --green: #3fb950; --red: #f85149; --yellow: #d29922;
      --critical: #f85149; --high: #d29922;
    }
    body { background: var(--bg); color: var(--text); font-family: -apple-system, "Segoe UI", system-ui, sans-serif; font-size: 14px; line-height: 1.6; padding: 24px; }
    h1 { font-size: 1.6rem; margin-bottom: 4px; }
    h2 { font-size: 1.15rem; margin: 28px 0 12px; color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 6px; }
    h3 { font-size: 1rem; margin: 16px 0 8px; color: var(--muted); }
    .meta { color: var(--muted); font-size: 0.85rem; margin-bottom: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }

    /* Verdict banner */
    .verdict {
      border: 2px solid ${verdictColor};
      border-radius: 8px;
      padding: 16px 24px;
      margin-bottom: 28px;
      background: ${isClean ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'};
    }
    .verdict h2 { color: ${verdictColor}; border: none; margin: 0; font-size: 1.3rem; }

    /* Score cards */
    .scorecards { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 28px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px 24px; flex: 1; min-width: 180px; }
    .card .label { color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
    .card .value { font-size: 2.2rem; font-weight: 700; line-height: 1.1; }
    .card .sub   { color: var(--muted); font-size: 0.78rem; margin-top: 4px; }
    .c-green  { color: var(--green); }
    .c-red    { color: var(--red); }
    .c-yellow { color: var(--yellow); }
    .c-accent { color: var(--accent); }

    /* Gauge section */
    .gauge-section { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 20px 24px; margin-bottom: 28px; font-family: monospace; }
    .gauge-row { margin-bottom: 10px; display: flex; align-items: center; gap: 12px; }
    .gauge-label { width: 180px; color: var(--muted); font-size: 0.85rem; }

    /* Severity badges */
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .badge-critical { background: rgba(248,81,73,0.18); color: var(--critical); border: 1px solid var(--critical); }
    .badge-high     { background: rgba(210,153,34,0.18); color: var(--yellow); border: 1px solid var(--yellow); }

    /* Tables */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 0.85rem; }
    th { background: var(--surface); color: var(--muted); text-align: left; padding: 8px 12px; border-bottom: 1px solid var(--border); font-weight: 600; }
    td { padding: 8px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
    tr:hover td { background: rgba(255,255,255,0.025); }
    code { background: rgba(255,255,255,0.08); padding: 1px 5px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, monospace; font-size: 0.82em; }
    pre.patch { background: #0d1117; border: 1px solid var(--border); border-radius: 6px; padding: 12px; overflow-x: auto; font-size: 0.78rem; margin-top: 8px; color: #79c0ff; white-space: pre-wrap; }
    details summary { cursor: pointer; color: var(--accent); font-size: 0.82rem; }

    /* Test rows */
    .test-fail td { color: var(--red); }
    .test-skip td { color: var(--muted); }

    /* Checklist */
    .checklist { list-style: none; padding: 0; }
    .checklist li { padding: 4px 0; display: flex; align-items: center; gap: 8px; }
    .chk-pass::before { content: "✅"; }
    .chk-fail::before { content: "☐"; color: var(--red); }
    .chk-manual::before { content: "☐"; color: var(--muted); }

    footer { margin-top: 40px; padding-top: 12px; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.78rem; text-align: center; }
    @media (max-width: 640px) { .scorecards { flex-direction: column; } }
  </style>
</head>
<body>
<div class="container">

  <h1>🛡️ PR Pre-Flight Guardian</h1>
  <p class="meta">Repository: <code>${escHtml(path.resolve(repoPath))}</code> &nbsp;|&nbsp; Generated: ${escHtml(now)}</p>

  <!-- Verdict Banner -->
  <div class="verdict">
    <h2>${verdictText}</h2>
  </div>

  <!-- Score Cards -->
  <div class="scorecards">
    <div class="card">
      <div class="label">Overall Score</div>
      <div class="value ${overallScore >= 80 ? 'c-green' : overallScore >= 50 ? 'c-yellow' : 'c-red'}">${overallScore}%</div>
      <div class="sub">Security + Test average</div>
    </div>
    <div class="card">
      <div class="label">Security Health</div>
      <div class="value ${secHealth === 100 ? 'c-green' : secHealth >= 60 ? 'c-yellow' : 'c-red'}">${secHealth}%</div>
      <div class="sub">${findings.length} finding(s): ${criticals.length} critical, ${highs.length} high</div>
    </div>
    <div class="card">
      <div class="label">Test Pass Rate</div>
      <div class="value ${passRate === 100 ? 'c-green' : passRate >= 70 ? 'c-yellow' : 'c-red'}">${passRate}%</div>
      <div class="sub">${testData.passed}/${testData.total} tests · ${(testData.durationMs / 1000).toFixed(2)}s</div>
    </div>
    <div class="card">
      <div class="label">Critical Findings</div>
      <div class="value ${criticals.length === 0 ? 'c-green' : 'c-red'}">${criticals.length}</div>
      <div class="sub">Must fix before merge</div>
    </div>
    <div class="card">
      <div class="label">Test Suites</div>
      <div class="value c-accent">${testData.suites}</div>
      <div class="sub">${testData.total} total test cases</div>
    </div>
  </div>

  <!-- Gauge -->
  <div class="gauge-section">
    <h3 style="color:var(--text);margin-top:0;margin-bottom:14px;">📊 Pre-Flight Readiness Scorecard</h3>
    <div class="gauge-row">
      <span class="gauge-label">Security Health</span>
      <span>${gaugeBar(secHealth, secHealth === 100 ? '#3fb950' : secHealth >= 60 ? '#d29922' : '#f85149')}</span>
    </div>
    <div class="gauge-row">
      <span class="gauge-label">Test Pass Rate</span>
      <span>${gaugeBar(passRate, passRate === 100 ? '#3fb950' : passRate >= 70 ? '#d29922' : '#f85149')}</span>
    </div>
    <div class="gauge-row">
      <span class="gauge-label">Overall Score</span>
      <span>${gaugeBar(overallScore, overallScore >= 80 ? '#3fb950' : overallScore >= 50 ? '#d29922' : '#f85149')}</span>
    </div>
  </div>

  <!-- Security Risk Matrix -->
  <h2>🔐 Security Risk Matrix</h2>
  ${findings.length === 0
    ? '<p style="color:var(--green)">✅ No security vulnerabilities detected.</p>'
    : `<div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Severity</th><th>Rule ID</th><th>Location</th><th>Description</th><th>Remediation</th><th>Suggested Fix</th></tr></thead>
    <tbody>${findingRows}</tbody>
  </table></div>`}

  <!-- Test Execution Metrics -->
  <h2>🧪 Test Execution Metrics</h2>
  <div class="table-wrap">
    <table style="max-width:500px">
      <thead><tr><th>Metric</th><th>Value</th></tr></thead>
      <tbody>
        <tr><td>Test Suites</td><td>${testData.suites}</td></tr>
        <tr><td>Total Tests</td><td>${testData.total}</td></tr>
        <tr><td>✅ Passed</td><td style="color:var(--green)">${testData.passed}</td></tr>
        <tr><td>❌ Failed</td><td style="color:${testData.failed > 0 ? 'var(--red)' : 'var(--muted)'}">${testData.failed}</td></tr>
        <tr><td>Pass Rate</td><td>${passRate}%</td></tr>
        <tr><td>Duration</td><td>${(testData.durationMs / 1000).toFixed(2)}s</td></tr>
      </tbody>
    </table>
  </div>

  <h3>Individual Test Results</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Status</th><th>Test Name</th><th>Suite</th><th>Duration</th></tr></thead>
      <tbody>${testRows || '<tr><td colspan="4" style="color:var(--muted)">No test results available</td></tr>'}</tbody>
    </table>
  </div>

  <!-- Reviewer Sign-off Checklist -->
  <h2>📋 Automated Reviewer Sign-off Checklist</h2>
  <h3>Security</h3>
  <ul class="checklist">
    <li class="${findings.length === 0 ? 'chk-pass' : 'chk-fail'}">No critical or high vulnerabilities present</li>
    <li class="${criticals.length === 0 ? 'chk-pass' : 'chk-fail'}">All CRITICAL findings resolved or risk-accepted</li>
    <li class="${highs.length === 0 ? 'chk-pass' : 'chk-fail'}">All HIGH findings resolved or mitigated</li>
    <li class="chk-manual">Secrets confirmed absent from diff (manual review)</li>
    <li class="chk-manual">No new <code>eval()</code> or unchecked <code>exec()</code> calls introduced</li>
  </ul>
  <h3>Testing</h3>
  <ul class="checklist">
    <li class="${testData.allPassed ? 'chk-pass' : 'chk-fail'}">All automated tests pass</li>
    <li class="chk-manual">New code paths are covered by tests</li>
    <li class="chk-manual">Edge cases and negative paths exercised</li>
  </ul>
  <h3>General</h3>
  <ul class="checklist">
    <li class="chk-manual">Code follows project style guide</li>
    <li class="chk-manual">Documentation updated where applicable</li>
    <li class="chk-manual">Dependent environment variables updated</li>
  </ul>

  <footer>PR Pre-Flight Guardian &mdash; IBM Coding Challenge &mdash; <a href="https://github.com" style="color:var(--accent)">View on GitHub</a></footer>
</div>
</body>
</html>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── ANSI Console Report ──────────────────────────────────────────────────────

function printAnsiReport(securityData, testData, suggestFixes) {
  const findings  = securityData.findings ?? [];
  const criticals = findings.filter(f => f.severity === 'CRITICAL');
  const highs     = findings.filter(f => f.severity === 'HIGH');

  // Color-coded severity badges
  function sevBadge(sev) {
    return sev === 'CRITICAL'
      ? `${C.bold}${C.red}[CRITICAL]${C.reset}`
      : `${C.bold}${C.yellow}[HIGH]${C.reset}`;
  }

  banner('SECURITY FINDINGS DETAIL');

  if (findings.length === 0) {
    console.log(`\n  ${grn('✅  No vulnerabilities detected.')}\n`);
  } else {
    findings.forEach((f, idx) => {
      const relFile = path.relative(process.cwd(), f.file);
      const num     = String(idx + 1).padStart(2, ' ');
      console.log(`\n  ${bold(`[${num}]`)} ${sevBadge(f.severity)}  ${bold(f.ruleId)}`);
      console.log(`       ${bold('File   :')} ${relFile}:${f.line}`);
      console.log(`       ${bold('Issue  :')} ${f.description}`);
      console.log(`       ${bold('Snippet:')} ${dim(f.snippet)}`);
      console.log(`       ${bold('Fix    :')}`);
      f.remediation.split('\n').forEach(step => console.log(`         ${step}`));

      if (suggestFixes && f.suggestedFix) {
        console.log(`       ${bold(cyan('Patch  :'))}`);
        f.suggestedFix.split('\n').forEach(line => console.log(`         ${dim(line)}`));
      }
    });
  }

  // ASCII Scorecard Gauge
  banner('PRE-FLIGHT READINESS SCORECARD');

  const secHealth = findings.length === 0 ? 100
    : Math.max(0, Math.round(100 - (criticals.length * 30 + highs.length * 15)));
  const passRate  = testData.total > 0 ? Math.round((testData.passed / testData.total) * 100) : 100;
  const overall   = Math.round((secHealth + passRate) / 2);

  function asciiGauge(label, pct) {
    const BARS    = 30;
    const filled  = Math.round((pct / 100) * BARS);
    const empty   = BARS - filled;
    const color   = pct === 100 ? C.green : pct >= 60 ? C.yellow : C.red;
    const bar     = `${color}${'█'.repeat(filled)}${C.reset}${C.dim}${'░'.repeat(empty)}${C.reset}`;
    const pctStr  = String(pct).padStart(3) + '%';
    const coloredPct = pct === 100 ? grn(pctStr) : pct >= 60 ? yel(pctStr) : red(pctStr);
    console.log(`  ${label.padEnd(22)} [${bar}] ${coloredPct}`);
  }

  console.log('');
  asciiGauge('Security Health', secHealth);
  asciiGauge('Test Pass Rate ', passRate);
  console.log(`  ${'─'.repeat(58)}`);
  asciiGauge('Overall Score  ', overall);
  console.log('');

  console.log(`  ${bold('Security:')} ${findings.length} finding(s)  (${red(criticals.length + ' CRITICAL')}, ${yel(highs.length + ' HIGH')})`);
  console.log(`  ${bold('Tests   :')} ${grn(testData.passed + ' passed')}, ${testData.failed > 0 ? red(testData.failed + ' failed') : dim('0 failed')}, ${testData.total} total  |  ${dim((testData.durationMs / 1000).toFixed(2) + 's')}\n`);
}

function printVerdict(securityData, testData) {
  const findings  = securityData.findings ?? [];
  const criticals = findings.filter(f => f.severity === 'CRITICAL').length;
  const hasBlockers  = criticals > 0;
  const testsFailing = testData.failed > 0;

  banner('PR PRE-FLIGHT VERDICT');

  if (!hasBlockers && !testsFailing) {
    console.log(`\n  ${bold(grn('┌─────────────────────────────────────────────────────────────┐'))}`);
    console.log(`  ${bold(grn('│'))}   ${bold(grn('✅  [CLEAN]'))}  — Zero blockers. Tests pass. Ready to merge.   ${bold(grn('│'))}`);
    console.log(`  ${bold(grn('└─────────────────────────────────────────────────────────────┘'))}\n`);
  } else {
    console.log(`\n  ${bold(red('┌─────────────────────────────────────────────────────────────┐'))}`);
    console.log(`  ${bold(red('│'))}   ${bold(red('🚨  [ACTION REQUIRED]'))}  — Merge is BLOCKED.                  ${bold(red('│'))}`);
    console.log(`  ${bold(red('└─────────────────────────────────────────────────────────────┘'))}`);
    if (hasBlockers)  console.log(`\n  ${red('●')} ${criticals} CRITICAL security finding(s) must be fixed before merge.`);
    if (testsFailing) console.log(`  ${red('●')} ${testData.failed} test(s) are failing — the suite must be green.`);
    console.log('');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const { repoPath, suggestFixes, strict } = parseArgs();

  const absRepo = path.resolve(repoPath);
  if (!fs.existsSync(absRepo)) {
    console.error(red(`[guardian] Repository path does not exist: ${absRepo}`));
    process.exit(1);
  }

  banner('PR PRE-FLIGHT GUARDIAN');
  console.log(`\n  ${bold('Repository  :')} ${absRepo}`);
  console.log(`  ${bold('Strict mode :')} ${strict ? yel('ON (--strict / --ci)') : dim('OFF')}`);
  console.log(`  ${bold('Suggest fixes:')} ${suggestFixes ? cyan('ON (--suggest-fixes)') : dim('OFF')}\n`);

  const now = new Date().toISOString();

  // ── Phase 1 ───────────────────────────────────────────────────────────────
  phase(1, 'Static Security Scan');
  const securityData = runSecurityScan(repoPath, suggestFixes);
  const findings     = securityData.findings ?? [];
  console.log(`\n  ${bold('Result:')} ${findings.length} finding(s) loaded from findings.json`);

  // ── Phase 2 ───────────────────────────────────────────────────────────────
  phase(2, 'Test Suite Execution');
  const testData = runTests();

  // ── Phase 3 ───────────────────────────────────────────────────────────────
  phase(3, 'PR Documentation Synthesis');

  const prDescPath    = path.resolve(__dirname, 'pr-description.md');
  const prCommentPath = path.resolve(__dirname, 'pr-comment-preview.md');

  const prDesc    = generatePRDescription(repoPath, securityData, testData, now);
  const prComment = generatePRComment(securityData, testData, now);

  fs.writeFileSync(prDescPath, prDesc, 'utf8');
  fs.writeFileSync(prCommentPath, prComment, 'utf8');

  console.log(`\n  ${grn('✔')} ${bold('pr-description.md')}      → ${prDescPath}`);
  console.log(`  ${grn('✔')} ${bold('pr-comment-preview.md')} → ${prCommentPath}`);

  // ── Phase 4 ───────────────────────────────────────────────────────────────
  phase(4, 'HTML Dashboard Generation');

  const htmlPath = path.resolve(__dirname, 'guardian-report.html');
  const html     = generateHTML(repoPath, securityData, testData, now);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`\n  ${grn('✔')} ${bold('guardian-report.html')}  → ${htmlPath}`);

  // ── ANSI Report + Scorecard ───────────────────────────────────────────────
  printAnsiReport(securityData, testData, suggestFixes);

  // ── Verdict ───────────────────────────────────────────────────────────────
  printVerdict(securityData, testData);

  // ── Artifacts Summary ─────────────────────────────────────────────────────
  console.log(`  ${bold(cyan('Output artefacts:'))}`);
  console.log(`  ${cyan('·')} findings.json           — structured security scan data`);
  console.log(`  ${cyan('·')} pr-description.md       — full PR body with risk matrix + sign-off`);
  console.log(`  ${cyan('·')} pr-comment-preview.md   — compact inline PR comment`);
  console.log(`  ${cyan('·')} guardian-report.html    — self-contained dark-mode HTML dashboard\n`);

  // ── CI exit code ──────────────────────────────────────────────────────────
  const criticals    = findings.filter(f => f.severity === 'CRITICAL').length;
  const hasBlockers  = criticals > 0;
  const testsFailing = testData.failed > 0;

  // --strict also fails on HIGH findings
  const highBlocking = strict && findings.some(f => f.severity === 'HIGH');
  const shouldFail   = hasBlockers || testsFailing || highBlocking;

  process.exit(shouldFail ? 1 : 0);
}

main();
