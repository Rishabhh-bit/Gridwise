#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
# CPU PyTorch avoids downloading unnecessary CUDA libraries on Linux.
if [[ "$(uname -s)" == "Linux" ]]; then
  .venv/bin/python -m pip install torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
fi
.venv/bin/python -m pip install -r backend/requirements.txt
npm --prefix frontend ci
echo "Setup complete. Start with: npm run dev"
