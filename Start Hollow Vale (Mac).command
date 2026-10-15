#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the free LTS version from https://nodejs.org and run this again."
  open "https://nodejs.org"; read -n 1 -s -r -p "Press any key to close"; exit 1
fi
(sleep 1; open "http://localhost:3000/?lobby") &
node server.js
