#!/usr/bin/env bash
# 启动本地静态服务器并打开演示页
cd "$(dirname "$0")"
PORT="${1:-8777}"
URL="http://127.0.0.1:$PORT/index.html"
echo "水滴·末日之战  →  $URL"
( sleep 1; command -v open >/dev/null && open "$URL" ) &
exec python3 -m http.server "$PORT"
