#!/usr/bin/env python3
"""Local HTTP bridge for the Agent Reach CLI. Binds to loopback only."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
import subprocess
import shutil

HOST = "127.0.0.1"
PORT = int(os.environ.get("AGENT_REACH_BRIDGE_PORT", "8765"))
ALLOWED_ORIGINS = {
    "https://ai-novel-studio-1ma.pages.dev",
    "http://localhost:8788",
    "http://127.0.0.1:8788",
}

class Handler(BaseHTTPRequestHandler):
    server_version = "AgentReachLocalBridge/0.1"

    def send_json(self, status, payload, origin=None):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS:
            return self.send_json(403, {"ok": False, "error": "Origin not allowed"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self):
        origin = self.headers.get("Origin", "")
        if self.path != "/health":
            return self.send_json(404, {"ok": False, "error": "Not found"}, origin)
        cli = shutil.which("agent-reach")
        self.send_json(200, {
            "ok": True,
            "service": "agent-reach-local-bridge",
            "cliFound": bool(cli),
            "cliPath": cli,
            "channels": ["github", "web"],
        }, origin)

    def do_POST(self):
        origin = self.headers.get("Origin", "")
        if origin not in ALLOWED_ORIGINS:
            return self.send_json(403, {"ok": False, "error": "Origin not allowed"}, origin)
        if self.path != "/search":
            return self.send_json(404, {"ok": False, "error": "Not found"}, origin)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > 8192:
                raise ValueError("请求内容为空或过大")
            data = json.loads(self.rfile.read(length).decode("utf-8"))
            channel = data.get("channel")
            query = data.get("query")
            limit = int(data.get("limit", 5))
            if channel not in ("github", "web"):
                raise ValueError("channel 只能是 github 或 web")
            if not isinstance(query, str) or not query.strip() or len(query) > 500:
                raise ValueError("请输入 1 到 500 字的搜索主题")
            if limit < 1 or limit > 10:
                raise ValueError("limit 必须在 1 到 10 之间")
        except Exception as exc:
            return self.send_json(400, {"ok": False, "error": str(exc)}, origin)

        if not shutil.which("agent-reach"):
            return self.send_json(503, {
                "ok": False,
                "error": "找不到 agent-reach 命令。请先在 PowerShell 执行 agent-reach version 确认安装。",
            }, origin)
        command = ["agent-reach", channel, "search", query.strip(), "--limit", str(limit)]
        try:
            result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8",
                                    errors="replace", timeout=90, shell=False)
            raw = (result.stdout or "").strip()
            if result.returncode != 0:
                return self.send_json(502, {
                    "ok": False, "error": (result.stderr or raw or "Agent Reach 执行失败")[-3000:],
                    "command": command,
                }, origin)
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                parsed = {"raw": raw}
            self.send_json(200, {"ok": True, "channel": channel, "data": parsed}, origin)
        except subprocess.TimeoutExpired:
            self.send_json(504, {"ok": False, "error": "搜索超过 90 秒，已停止本次请求"}, origin)
        except Exception as exc:
            self.send_json(500, {"ok": False, "error": str(exc)}, origin)

    def log_message(self, fmt, *args):
        print("[Agent Reach Bridge] " + (fmt % args))

if __name__ == "__main__":
    print(f"Agent Reach 本地连接服务：http://{HOST}:{PORT}")
    print("只监听本机回环地址，不会暴露到局域网或公网。按 Ctrl+C 停止。")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
