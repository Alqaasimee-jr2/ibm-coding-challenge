#!/usr/bin/env node
/**
 * PR Pre-Flight Guardian — Task 1: Static Security Scanner
 *
 * Scans .js source files for:
 *   - Hardcoded secrets / high-entropy tokens  (CRITICAL)
 *   - SQL injection via string concatenation    (HIGH)
 *   - Unsafe dynamic evaluation (eval / exec)   (CRITICAL)
 *
 * Usage:
 *   node security-scan.js [--repo <path>] [--suggest-fixes]
 *
 * Outputs:
 *   - ./findings.json   — structured results
 *   - stdout            — colour-coded CLI summary
 *
 * Exit codes:
 *   0 — no findings
 *   1 — one or more vulnerabilities detected
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Rule Definitions ──────────────────────────────────────────────────────
// Each rule exposes:
//   id          – unique camelCase identifier
//   severity    – CRITICAL | HIGH
//   description – human-readable one-liner
//   test(line)  – returns matched snippet string or null
//   remediation – step-by-step fix instructions (always shown)
//   suggestedFix(snippet, line) – returns an exact code patch string
//                                 (shown only when --suggest-fixes is set)

const RULES = [
  // ── 1. Hardcoded live secret key (sk_live_...) ────────────────────────
  {
    id: 'SECRET_HARDCODED_SK_LIVE',
    severity: 'CRITICAL',
    description: 'Hardcoded live secret/API key detected (sk_live_... pattern)',

    test(line) {
      const m = line.match(/["'`](sk_live_[A-Za-z0-9_\-]{6,})["'`]/);
      return m ? m[0] : null;
    },

    remediation:
      '1. Remove the hardcoded secret from source code immediately.\n' +
      '2. Store it as an environment variable (e.g. STRIPE_SECRET_KEY).\n' +
      '3. Rotate the exposed key in your service dashboard.\n' +
      '4. Add the variable name to .env.example but never commit real values.\n' +
      '5. Consider using a secrets manager (Vault, AWS Secrets Manager) for production.',

    suggestedFix(snippet) {
      // Extract just the key name from surrounding property if possible
      return (
        '// BEFORE (insecure):\n' +
        `//   ${snippet}\n` +
        '\n' +
        '// AFTER  (safe) — load from environment:\n' +
        "const secretKey = process.env.STRIPE_SECRET_KEY;\n" +
        'if (!secretKey) throw new Error("STRIPE_SECRET_KEY env var is not set");\n' +
        '\n' +
        '// In .env.example (commit this, NOT the real value):\n' +
        '// STRIPE_SECRET_KEY=sk_live_your_key_here'
      );
    },
  },

  // ── 2. JWT / token secret hardcoded in source ─────────────────────────
  {
    id: 'SECRET_JWT_ASSIGNMENT',
    severity: 'CRITICAL',
    description: 'High-entropy JWT / token secret assigned directly in source code',

    test(line) {
      const m = line.match(
        /(?:jwtSecret|jwt_secret|secret_key|secretKey|apiSecret|api_secret)\s*[:=]\s*["'`]([A-Za-z0-9!@#$%^&*_\-]{16,})["'`]/i
      );
      return m ? m[0] : null;
    },

    remediation:
      '1. Remove the hardcoded secret value from source code.\n' +
      '2. Replace it with process.env.JWT_SECRET (or equivalent).\n' +
      '3. Generate a cryptographically strong secret: `openssl rand -hex 64`.\n' +
      '4. Store the generated value in your environment / secrets manager.\n' +
      '5. Rotate any tokens signed with the exposed secret.',

    suggestedFix(snippet) {
      // Derive property name from snippet (e.g. "jwtSecret: ...")
      const propMatch = snippet.match(/(\w+)\s*[:=]/);
      const prop = propMatch ? propMatch[1] : 'jwtSecret';
      const envVar = prop.replace(/([A-Z])/g, '_$1').toUpperCase(); // camelCase → SNAKE_CASE
      return (
        '// BEFORE (insecure):\n' +
        `//   ${snippet}\n` +
        '\n' +
        '// AFTER  (safe):\n' +
        `const ${prop} = process.env.${envVar};\n` +
        `if (!${prop}) throw new Error("${envVar} env var is not set");\n` +
        '\n' +
        '// Generate a strong secret once, store it securely:\n' +
        '// $ openssl rand -hex 64\n' +
        `// Then add to .env (do NOT commit): ${envVar}=<generated-value>`
      );
    },
  },

  // ── 3. SQL injection via string concatenation ─────────────────────────
  {
    id: 'SQL_INJECTION_CONCAT',
    severity: 'HIGH',
    description: 'SQL query built via string concatenation — potential SQL injection',

    test(line) {
      // Pattern A: double-quoted SQL string concatenated with an identifier
      //   e.g.  "SELECT ... WHERE username = '" + username + ...
      //   [^"]* keeps us inside the double-quoted token (avoids single-quote confusion)
      const concatDQ = line.match(/"[^"]*\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b[^"]*"\s*\+\s*\w/i);
      if (concatDQ) return concatDQ[0].slice(0, 100);

      // Pattern B: single-quoted SQL string concatenated with an identifier
      const concatSQ = line.match(/'[^']*\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b[^']*'\s*\+\s*\w/i);
      if (concatSQ) return concatSQ[0].slice(0, 100);

      // Pattern C: template literal SQL with ${...} interpolation
      const tplMatch = line.match(/`[^`]*\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b[^`]*\$\{[^}]+\}[^`]*`/i);
      if (tplMatch) return tplMatch[0].slice(0, 100);

      return null;
    },

    remediation:
      '1. Never interpolate user-supplied values directly into SQL strings.\n' +
      '2. Use parameterised queries / prepared statements with placeholders ($1, ?, :name).\n' +
      '3. Alternatively, use an ORM (Sequelize, Prisma, Knex) that handles escaping.\n' +
      '4. Apply input allowlisting for column/table names that must be dynamic.\n' +
      '5. Enable a WAF or database query firewall for defence-in-depth.',

    suggestedFix(snippet) {
      return (
        '// BEFORE (vulnerable — SQL injection possible):\n' +
        `//   ${snippet}\n` +
        '\n' +
        '// AFTER  (safe — parameterised query):\n' +
        'function findUserByUsername(username) {\n' +
        '  // pg / node-postgres style ($1 placeholder)\n' +
        '  return {\n' +
        "    text: \"SELECT id, username, email, role FROM users WHERE username = $1 AND active = 1\",\n" +
        '    values: [username],\n' +
        '  };\n' +
        '  // Usage: db.query(queryObj)\n' +
        '  // For mysql2 use ? placeholder:\n' +
        "  // db.execute(\"SELECT ... WHERE username = ?\", [username])\n" +
        '}'
      );
    },
  },

  // ── 4. Unsafe eval() ──────────────────────────────────────────────────
  {
    id: 'UNSAFE_EVAL',
    severity: 'CRITICAL',
    description: 'Unsafe eval() call — arbitrary code execution risk',

    test(line) {
      // Match eval( not preceded by a word char or dot (avoids texteval, .eval)
      const m = line.match(/(?<![.\w])eval\s*\(/);
      return m ? line.trim().slice(0, 100) : null;
    },

    remediation:
      '1. Remove eval() entirely — it executes arbitrary code in the current scope.\n' +
      '2. For mathematical expressions, use a safe parser library (e.g. math.js, expr-eval).\n' +
      '3. For JSON parsing, use JSON.parse() instead of eval().\n' +
      '4. For rule / formula evaluation, define a whitelist-based interpreter.\n' +
      '5. If dynamic execution is unavoidable, sandbox it in a Worker thread or vm.runInNewContext() with strict resource limits and no access to process/require.',

    suggestedFix(snippet) {
      return (
        '// BEFORE (dangerous):\n' +
        `//   ${snippet}\n` +
        '\n' +
        '// AFTER  — Option A: safe math expression parser (install: npm i expr-eval)\n' +
        "const { Parser } = require('expr-eval');\n" +
        'function evaluatePromoFormula(formulaStr, context) {\n' +
        '  const parser = new Parser();\n' +
        '  // Only arithmetic operators and whitelisted variables are allowed\n' +
        '  return parser.evaluate(formulaStr, context);\n' +
        '}\n' +
        '\n' +
        '// AFTER  — Option B: vm sandbox (built-in, no extra deps)\n' +
        "const vm = require('vm');\n" +
        'function evaluatePromoFormula(formulaStr, context) {\n' +
        '  const sandbox = Object.assign(Object.create(null), context);\n' +
        '  // Strict 50 ms timeout prevents infinite loops\n' +
        "  return vm.runInNewContext(formulaStr, sandbox, { timeout: 50 });\n" +
        '}'
      );
    },
  },

  // ── 5. Unsafe child_process.exec() ───────────────────────────────────
  {
    id: 'UNSAFE_CHILD_PROCESS_EXEC',
    severity: 'CRITICAL',
    description: 'child_process.exec() with potentially unsanitised input — command injection risk',

    test(line) {
      // Matches explicit child_process.exec( or a bare .exec( call with a non-literal first arg
      if (/child_process\.exec\s*\(/.test(line)) return line.trim().slice(0, 100);
      // .exec( where the first arg is NOT a plain string literal (indicates dynamic input)
      const m = line.match(/\.exec\s*\(\s*(?!['"` ])/);
      return m ? line.trim().slice(0, 100) : null;
    },

    remediation:
      '1. Replace exec() with execFile() or spawn() and pass arguments as an array — these do NOT invoke a shell.\n' +
      '2. Allowlist every user-supplied value before it reaches a shell command.\n' +
      '3. Never concatenate user input into a command string.\n' +
      '4. Run the child process with the minimum required privileges.\n' +
      '5. Consider using a pure-JS alternative to the shell command entirely.',

    suggestedFix(snippet) {
      return (
        '// BEFORE (vulnerable — shell injection possible):\n' +
        `//   ${snippet}\n` +
        '\n' +
        '// AFTER  (safe — execFile, no shell, args as array):\n' +
        "const { execFile } = require('child_process');\n" +
        '\n' +
        '// Pass the executable and each argument separately — no shell interpolation\n' +
        "execFile('git', ['log', '--oneline', '-n', '10'], (err, stdout) => {\n" +
        '  if (err) throw err;\n' +
        '  console.log(stdout);\n' +
        '});\n' +
        '\n' +
        '// If the command string truly must be dynamic, sanitise first:\n' +
        "// const safeArg = userInput.replace(/[^a-zA-Z0-9_\\-]/g, '');\n" +
        "// execFile('mytool', [safeArg], callback);"
      );
    },
  },
];

// ─── File Walker ────────────────────────────────────────────────────────────

/**
 * Recursively collect all .js file paths under a directory.
 * @param {string} dir
 * @returns {string[]}
 */
function collectJsFiles(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    console.error(`[ERROR] Cannot read directory: ${dir} — ${err.message}`);
    process.exit(1);
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip common noise directories
      if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) continue;
      results.push(...collectJsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── Scanner ────────────────────────────────────────────────────────────────

/**
 * Scan a single file; return an array of finding objects.
 * @param {string} filePath
 * @param {boolean} suggestFixes
 * @returns {Array<object>}
 */
function scanFile(filePath, suggestFixes) {
  const findings = [];
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`[WARN] Could not read ${filePath}: ${err.message}`);
    return findings;
  }

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    for (const rule of RULES) {
      const snippet = rule.test(lineText);
      if (snippet !== null) {
        const finding = {
          file:        filePath,
          line:        i + 1,          // 1-based
          severity:    rule.severity,
          ruleId:      rule.id,
          description: rule.description,
          snippet:     snippet.trim(),
          remediation: rule.remediation,
        };
        if (suggestFixes) {
          finding.suggestedFix = rule.suggestedFix(snippet.trim(), lineText);
        }
        findings.push(finding);
      }
    }
  }
  return findings;
}

// ─── CLI Renderer ───────────────────────────────────────────────────────────

const COLOR = {
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  reset:  '\x1b[0m',
};

function badge(severity) {
  const c = severity === 'CRITICAL' ? COLOR.red : COLOR.yellow;
  return `${c}${COLOR.bold}${severity}${COLOR.reset}`;
}

function printSummary(findings, repoPath, outputFile, suggestFixes) {
  const total     = findings.length;
  const criticals = findings.filter(f => f.severity === 'CRITICAL').length;
  const highs     = findings.filter(f => f.severity === 'HIGH').length;

  console.log('');
  console.log(`${COLOR.bold}╔══════════════════════════════════════════════════════════╗${COLOR.reset}`);
  console.log(`${COLOR.bold}║      PR Pre-Flight Guardian — Security Scan Report       ║${COLOR.reset}`);
  console.log(`${COLOR.bold}╚══════════════════════════════════════════════════════════╝${COLOR.reset}`);
  console.log(`  Repository : ${path.resolve(repoPath)}`);
  console.log(
    `  Findings   : ${COLOR.bold}${total}${COLOR.reset} total  ` +
    `(${COLOR.red}${COLOR.bold}${criticals} CRITICAL${COLOR.reset}, ` +
    `${COLOR.yellow}${COLOR.bold}${highs} HIGH${COLOR.reset})`
  );
  if (suggestFixes) {
    console.log(`  Mode       : ${COLOR.cyan}--suggest-fixes enabled${COLOR.reset}`);
  }
  console.log('');

  if (total === 0) {
    console.log(`  ${COLOR.green}✅  No vulnerabilities detected.${COLOR.reset}\n`);
    return;
  }

  findings.forEach((f, idx) => {
    const relFile = path.relative(process.cwd(), f.file);
    const num     = String(idx + 1).padStart(2, ' ');

    console.log(`  ${COLOR.bold}[${num}] ${badge(f.severity)}  ${f.ruleId}${COLOR.reset}`);
    console.log(`       ${COLOR.bold}File   :${COLOR.reset} ${relFile}:${f.line}`);
    console.log(`       ${COLOR.bold}Issue  :${COLOR.reset} ${f.description}`);
    console.log(`       ${COLOR.bold}Snippet:${COLOR.reset} ${COLOR.dim}${f.snippet}${COLOR.reset}`);

    // Remediation (always shown)
    console.log(`       ${COLOR.bold}Fix    :${COLOR.reset}`);
    f.remediation.split('\n').forEach(step => {
      console.log(`         ${step}`);
    });

    // Suggested code patch (only when --suggest-fixes)
    if (suggestFixes && f.suggestedFix) {
      console.log(`       ${COLOR.bold}Patch  :${COLOR.reset}`);
      f.suggestedFix.split('\n').forEach(patchLine => {
        console.log(`         ${COLOR.dim}${patchLine}${COLOR.reset}`);
      });
    }

    console.log('');
  });

  console.log(`  ${COLOR.bold}Results written to:${COLOR.reset} ${outputFile}`);
  console.log('');
}

// ─── CLI Argument Parser ────────────────────────────────────────────────────

function parseArgs() {
  const args        = process.argv.slice(2);
  let repoPath      = './target-repo';
  let suggestFixes  = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' && args[i + 1]) {
      repoPath = args[i + 1];
      i++;
    } else if (args[i] === '--suggest-fixes') {
      suggestFixes = true;
    }
  }
  return { repoPath, suggestFixes };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  const { repoPath, suggestFixes } = parseArgs();

  const absRepo = path.resolve(repoPath);
  if (!fs.existsSync(absRepo)) {
    console.error(`[ERROR] Repo path does not exist: ${absRepo}`);
    process.exit(1);
  }

  const jsFiles = collectJsFiles(absRepo);
  if (jsFiles.length === 0) {
    console.log('[INFO] No .js files found under', absRepo);
    process.exit(0);
  }

  const allFindings = [];
  for (const file of jsFiles) {
    allFindings.push(...scanFile(file, suggestFixes));
  }

  // ── Write structured JSON output ──────────────────────────────────────
  const outputFile = path.resolve('./findings.json');
  const report = {
    scannedRepo:   absRepo,
    scannedFiles:  jsFiles.length,
    totalFindings: allFindings.length,
    summary: {
      CRITICAL: allFindings.filter(f => f.severity === 'CRITICAL').length,
      HIGH:     allFindings.filter(f => f.severity === 'HIGH').length,
    },
    suggestFixesEnabled: suggestFixes,
    findings: allFindings,
  };
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf8');

  // ── Print CLI summary ─────────────────────────────────────────────────
  printSummary(allFindings, repoPath, outputFile, suggestFixes);

  // Exit 1 when vulnerabilities are found (useful in CI pipelines)
  process.exit(allFindings.length > 0 ? 1 : 0);
}

main();
