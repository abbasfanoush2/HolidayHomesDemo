#!/usr/bin/env bash
set -euo pipefail
cd /workspace/HolidayHomesDemo
node --eval 'const major=Number(process.versions.node.split(".")[0]); if (![22,24].includes(major)) throw new Error("StayPilot setup requires Node.js 22 or 24");'
npm ci --cache /workspace/.npm-cache --no-audit --no-fund
npm run typecheck
npm run lint
npm test
npm run build
