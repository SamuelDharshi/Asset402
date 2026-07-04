/**
 * Idempotently patches contract-address env vars into agents/.env and
 * backend/.env after a deploy, without touching unrelated lines.
 *
 * Usage:
 *   node sync-env.js scripts/deployment-results-v3.json
 *   node sync-env.js scripts/deployment-results-v2b.json
 */
"use strict";

const fs = require("fs");
const path = require("path");

const RESULTS_PATH = process.argv[2];
if (!RESULTS_PATH) {
  console.error("Usage: node sync-env.js <deployment-results.json>");
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(path.resolve(RESULTS_PATH), "utf8"));

const CONTRACT_TO_ENV_VAR = {
  LendingPool:         "LENDING_POOL_ADDR",
  RentalEscrow:        "RENTAL_ESCROW_ADDR",
  CarbonCredit:        "CARBON_CREDIT_ADDR",
  FractionalRegistry:  "FRACTIONAL_REGISTRY_ADDR",
  AssetRegistry:       "ASSET_REGISTRY_ADDR",
};

const updates = {};
for (const [name, info] of Object.entries(results.contracts || {})) {
  const envVar = CONTRACT_TO_ENV_VAR[name];
  if (envVar && info.contractHash) {
    updates[envVar] = info.contractHash;
  }
}

if (Object.keys(updates).length === 0) {
  console.error("No known contract names found in results file.");
  process.exit(1);
}

const targets = [
  path.join(__dirname, "..", "agents", ".env"),
  path.join(__dirname, "..", "backend", ".env"),
];

for (const envPath of targets) {
  if (!fs.existsSync(envPath)) {
    console.warn(`Skipping missing file: ${envPath}`);
    continue;
  }
  let content = fs.readFileSync(envPath, "utf8");
  let changedLines = [];
  for (const [key, value] of Object.entries(updates)) {
    const re = new RegExp(`^${key}=.*$`, "m");
    if (re.test(content)) {
      content = content.replace(re, `${key}=${value}`);
      changedLines.push(key);
    } else {
      content += `\n${key}=${value}\n`;
      changedLines.push(`${key} (appended)`);
    }
  }
  fs.writeFileSync(envPath, content);
  console.log(`✓ ${envPath}: ${changedLines.join(", ")}`);
}
