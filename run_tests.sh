#!/usr/bin/env bash
set -euo pipefail

THRESHOLD=90
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo " Running all test suites in containers"
echo "========================================"
echo ""

# Build the test image
echo -e "${YELLOW}Building test container...${NC}"
docker compose build test 2>&1 | tail -3

check_coverage() {
  local suite_name="$1"
  local json_file="$2"

  if [ ! -f "$json_file" ]; then
    echo -e "${RED}FAIL: Coverage report not found: ${json_file}${NC}"
    return 1
  fi

  local stmts branches funcs lines
  stmts=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$json_file','utf8')).total.statements.pct)")
  branches=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$json_file','utf8')).total.branches.pct)")
  funcs=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$json_file','utf8')).total.functions.pct)")
  lines=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$json_file','utf8')).total.lines.pct)")

  echo ""
  echo "  ${suite_name} Coverage:"
  echo "    Statements : ${stmts}%"
  echo "    Branches   : ${branches}%"
  echo "    Functions  : ${funcs}%"
  echo "    Lines      : ${lines}%"

  local failed=0
  for metric in "$stmts" "$branches" "$funcs" "$lines"; do
    if [ "$(echo "$metric < $THRESHOLD" | bc -l)" -eq 1 ]; then
      failed=1
    fi
  done

  if [ $failed -eq 1 ]; then
    echo -e "  ${RED}FAIL: ${suite_name} coverage below ${THRESHOLD}% threshold${NC}"
    return 1
  else
    echo -e "  ${GREEN}PASS: ${suite_name} coverage meets ${THRESHOLD}% threshold${NC}"
    return 0
  fi
}

# ── Unit Tests ───────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[1/2] Running unit tests...${NC}"
echo "----------------------------------------"

docker compose run --rm test sh -c "npm run test:unit:coverage 2>&1"
unit_exit=$?

if [ $unit_exit -ne 0 ]; then
  echo -e "${RED}Unit tests failed (exit code $unit_exit)${NC}"
  # Don't exit yet — still try API tests for full report
fi

# ── API Tests ────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/2] Running API tests...${NC}"
echo "----------------------------------------"

docker compose run --rm test sh -c "npm run test:api:coverage 2>&1"
api_exit=$?

if [ $api_exit -ne 0 ]; then
  echo -e "${RED}API tests failed (exit code $api_exit)${NC}"
fi

# ── Coverage Gate ────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Coverage Gate (threshold: ${THRESHOLD}%)"
echo "========================================"

gate_failed=0

if [ -f "coverage/unit/coverage-summary.json" ]; then
  check_coverage "Unit Tests" "coverage/unit/coverage-summary.json" || gate_failed=1
else
  echo -e "${YELLOW}Unit coverage report not found locally — checking container output above${NC}"
  if [ $unit_exit -ne 0 ]; then gate_failed=1; fi
fi

if [ -f "coverage/api/coverage-summary.json" ]; then
  check_coverage "API Tests" "coverage/api/coverage-summary.json" || gate_failed=1
else
  echo -e "${YELLOW}API coverage report not found locally — checking container output above${NC}"
  if [ $api_exit -ne 0 ]; then gate_failed=1; fi
fi

# ── Final Verdict ────────────────────────────────────────────────
echo ""
echo "========================================"
if [ $unit_exit -ne 0 ] || [ $api_exit -ne 0 ] || [ $gate_failed -ne 0 ]; then
  echo -e "${RED} PIPELINE FAILED${NC}"
  echo "========================================"
  exit 1
else
  echo -e "${GREEN} ALL TESTS PASSED — PIPELINE OK${NC}"
  echo "========================================"
  exit 0
fi
