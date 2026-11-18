# Agent Reach 本地连接服务（测试版）

此目录提供一个 Windows 本地 HTTP 桥接程序，让 AI 小说工作室网页可以调用本机已安装的 Agent Reach CLI。

## 安全边界
- 仅绑定到 `127.0.0.1`，不会监听局域网或公网。
- 仅允许已配置的小说工作室网页来源访问。
- 不接收或保存 API Key。
- 只开放 GitHub 和 Web 搜索，不提供任意命令执行接口。
- 搜索请求最多 500 字、结果数量最多 10、单次超时 90 秒。

## 前置条件
1. Windows 已安装 Agent Reach，并且 PowerShell 中执行 `agent-reach version` 能显示版本。
2. 安装 Python 3.10 或更新版本（或可通过 `uv run --python 3.12` 启动）。
3. 当前网页来源需在 `bridge.py` 的 `ALLOWED_ORIGINS` 中。

## 启动
在 PowerShell 进入此目录后执行：

```powershell
python bridge.py
```

如果电脑使用 uv 管理 Python，也可以执行：

```powershell
uv run --python 3.12 python bridge.py
```

保持这个 PowerShell 窗口开启。看到“Agent Reach 本地连接服务”即代表服务已启动。

## 本机检查
浏览器打开：

```
http://127.0.0.1:8765/health
```

应返回 JSON，且 `cliFound` 为 `true`。

## 搜索接口（供小说工作室调用）
POST `http://127.0.0.1:8765/search`，JSON 示例：

```json
{
  "channel": "github",
  "query": "AI novel writing",
  "limit": 3
}
```

支持 `channel` 为 `github` 或 `web`。

## 重要说明
这是本地桥接层的第一阶段，不会自动修改或清空小说工作室的浏览器资料。网页端的“资料研究”界面尚未接入；需要先在 Windows 上验证本地服务能稳定调用 Agent Reach，再接入网页，避免把未经测试的功能发布到线上。
