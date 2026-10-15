#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null 2>&1 || { echo "Install Node.js from https://nodejs.org first."; exit 1; }
(sleep 1; xdg-open "http://localhost:3000/?lobby" >/dev/null 2>&1) &
node server.js
