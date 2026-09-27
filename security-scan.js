const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  let repoPath = './target-repo';
  let suggestFixes = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' && args[i + 1]) {
      repoPath = args[i + 1];
      i++;
    } else if (args[i].startsWith('--repo=')) {
      repoPath = args[i].split('=')[1];
    } else if (args[i] === '--suggest-fixes') {
      suggestFixes = true;
    }
  }
  return { repoPath, suggestFixes };
}

const RULES = [
  {
    id: 'HARDCODED_SECRET',
    name: 'Hardcoded Secret / API Token',
    severity: 'HIGH',
    test: (line) => {
      // Exclude standard HTTP headers or MIME types
      if (/Access-Control-[A-Za-z\-]+/i.test(line) || /Content-Type|Authorization-Header/i.test(line)) {
        return false;
      }
      const patterns = [
        /sk_live_[0-9a-zA-Z]+/i,
        /AIza[0-9A-Za-z\-_]{35}/,
        /gh[pousr]_[A-Za-z0-9_]{36,}/, // GitHub tokens
        /xox[baprs]-[0-9a-zA-Z]{10,48}/, // Slack tokens
        /(jwtSecret|apiKey|apiSecret|api_key|secretKey|privateKey|password|secretToken|authToken)\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{8,}['"]/i,
        /(secret|token|password|credential)\w*\s*[:=]\s*['"][a-zA-Z0-9_\-\.]{16,}['"]/i,
        /['"][a-f0-9]{32,64}['"]/i // Hex tokens / MD5 / SHA hashes
      ];
      return patterns.some((p) => p.test(line));
    },
    message: 'Potential hardcoded credential or secret token detected in source code.',
    remediation: 'Rotate token immediately. Extract credential to environment variables (e.g. process.env.JWT_SECRET) or a secret manager.',
    fixSuggestion: (snippet) => {
      return snippet.replace(/['"][a-zA-Z0-9_\-\.]{8,}['"]/, 'process.env.JWT_SECRET || ""');
    }
  },
  {
    id: 'SQL_INJECTION',
    name: 'SQL Injection via String Concatenation',
    severity: 'HIGH',
    test: (line) => {
      const patterns = [
        /(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*?['"]\s*\+\s*[a-zA-Z0-9_.]+/i,
        /[a-zA-Z0-9_.]+\s*\+\s*['"].*?(AND|OR|WHERE|SELECT|FROM)/i,
        /`\s*(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE).*?\$\{.*?\}\s*`/i
      ];
      return patterns.some((p) => p.test(line));
    },
    message: 'Dynamic query construction with direct string concatenation detected.',
    remediation: 'Use parameterized queries or prepared statements (e.g., db.query("... WHERE username = ?", [username])) to safely escape inputs.',
    fixSuggestion: () => {
      return 'const query = "SELECT id, username, email, role FROM users WHERE username = ? AND active = 1"; // Pass param via db.execute(query, [username])';
    }
  },
  {
    id: 'UNSAFE_EVAL_EXEC',
    name: 'Unsafe Dynamic Code Execution (eval/exec)',
    severity: 'CRITICAL',
    test: (line) => {
      const patterns = [
        /\beval\s*\(/,
        /\bexec\s*\(/,
        /child_process\.exec\s*\(/,
        /new\s+Function\s*\(/
      ];
      return patterns.some((p) => p.test(line));
    },
    message: 'Dangerous dynamic evaluation or shell command execution detected.',
    remediation: 'Eliminate eval() / exec(). Parse and evaluate mathematical expressions using a sandboxed AST parser or safe arithmetic tokenizer.',
    fixSuggestion: (snippet) => {
      return snippet.replace(/eval\((.*?)\)/, 'safeEvaluateFormula($1) /* Use AST parser */');
    }
  }
];

function getSourceFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        getSourceFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      if (/\.(js|jsx|ts|tsx|json|mjs|cjs)$/i.test(entry.name)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function scanRepository(targetDir) {
  const resolvedDir = path.resolve(targetDir);
  const files = getSourceFiles(resolvedDir);
  const findings = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split(/\r?\n/);
    const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      // Skip empty lines or pure single-line comment lines
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) {
        return;
      }

      for (const rule of RULES) {
        if (rule.test(line)) {
          const suggestedPatch = typeof rule.fixSuggestion === 'function' ? rule.fixSuggestion(trimmed) : null;
          findings.push({
            file: relPath,
            line: lineNum,
            issue: rule.name,
            severity: rule.severity,
            ruleId: rule.id,
            description: rule.message,
            remediation: rule.remediation,
            suggestedPatch: suggestedPatch,
            snippet: trimmed
          });
        }
      }
    });
  }

  return findings;
}

function run() {
  const { repoPath, suggestFixes } = parseArgs();
  console.log(`[Security Scanner] Analyzing target directory: ${repoPath}`);
  const findings = scanRepository(repoPath);

  const outputPath = path.resolve(process.cwd(), 'findings.json');
  fs.writeFileSync(outputPath, JSON.stringify(findings, null, 2), 'utf-8');

  console.log(`[Security Scanner] Scan complete. Found ${findings.length} security issue(s).`);
  console.log(`[Security Scanner] Findings saved to ./findings.json`);
  
  if (findings.length > 0) {
    console.log('\n--- SECURITY FINDINGS SUMMARY ---');
    findings.forEach((f, idx) => {
      console.log(`[${idx + 1}] [${f.severity}] ${f.issue}`);
      console.log(`    Location:    ${f.file}:${f.line}`);
      console.log(`    Snippet:     ${f.snippet}`);
      console.log(`    Remediation: ${f.remediation}`);
      if (suggestFixes && f.suggestedPatch) {
        console.log(`    Suggested:   ${f.suggestedPatch}`);
      }
    });
    console.log('--------------------------------\n');
  }

  return findings;
}

if (require.main === module) {
  run();
}

module.exports = { scanRepository, run, RULES };
