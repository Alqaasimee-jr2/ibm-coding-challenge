# Data Compliance & Source Attestation 🛡️

This document certifies compliance with **Criterion 3: Bring Your Own Data & Keep It Clean** for the IBM Bob 2.0 Hackathon.

---

## 📜 Compliance Statement
- **Zero Client Data:** No proprietary, enterprise, or customer data has been used or ingested.
- **Zero Confidential / Non-Public Data:** No company-confidential, NDA-bound, or restricted codebases are included.
- **Zero Personally Identifiable Information (PII):** No names, real emails, phone numbers, or private user credentials are stored.
- **Zero Social Media Data:** No scraped data from social platforms or protected networks.
- **Permissible Open Source & Synthetic Data Only:** All assets are either 100% synthetic or derived from permissive open-source licenses allowing commercial and research use.

---

## 🗂️ Data Inventory & Licensing

| Component / Path | Data Type | Source / Origin | License / Usage Terms |
| :--- | :--- | :--- | :--- |
| `target-repo/` | Synthetic Code & Fixtures | Handcrafted for hackathon security & test demonstrations | MIT / Permissive Synthetic Mock |
| `__tests__/` | Synthetic Test Cases | Handcrafted edge cases for tiered pricing calculations | MIT / Permissive Synthetic Mock |
| `findings.json` | Synthetic Security Audit Output | Generated locally by `security-scan.js` | MIT / Self-Generated |
| `demo-real-repo/` | Public Open-Source Library | Cloned from [expressjs/cors](https://github.com/expressjs/cors.git) | MIT License (Permissive commercial use) |

---

## 🔍 Synthetic Mock Credential Attestation
The mock API key identified in `target-repo/config/auth.js`:
```javascript
jwtSecret: "sk_live_51M0BobHackathonSecretKey99887766"
```
is a **100% synthetic dummy string** intentionally engineered with high entropy to test regex and static security scanner detection capabilities. It does not map to any live service, payment gateway, or account.
