#!/bin/sh
# Starts a local server for RollSet and opens the sheet calibration page. Needs python3.
cd "$(dirname "$0")" || exit 1
PORT=8080
URL="http://localhost:$PORT/calibrate.html"
echo "RollSet calibration: $URL  (close this window to stop)"
( sleep 1; (open "$URL" 2>/dev/null || xdg-open "$URL" 2>/dev/null) ) &
python3 -m http.server "$PORT"
