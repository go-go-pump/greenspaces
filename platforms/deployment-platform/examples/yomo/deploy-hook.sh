#!/bin/bash
# YOMO deploy hook — sources the Greenspaces deploy-hook template
# Usage: source this at the end of your deploy.sh

set -euo pipefail

DEPLOY_PROJECT_ID="yomo"
DEPLOY_ENV="${DEPLOY_ENV:-production}"

# Source the Greenspaces deploy hook template
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../../templates/deploy-hook.template.sh"

# Emit the event (called from deploy.sh with status argument)
# Example: source ./scripts/deploy-hook.sh && emit_deploy_event "success"
