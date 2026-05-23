---
title: 尝试配置Neuro青春版v1.0
published: 2026-05-23
pinned: false
tags: [AI]
category: 学习之路
update: 2026-05-20
draft: true
description: "我用 Claude Code + DeepSeek API + Live2D + ChromaDB，从零搭建了一个拥有长期记忆、自动压缩、多人格切换的 AI。这篇文章记录了完整的开发过程、技术选型、踩坑记录，以及 AI 辅助编程的真实体验"
image: /assets/images/neuro.png
---
# 给 AI 聊天加一个「回复长度」滑块 —— 前后端全链路实现

> 用户反馈 AI 回复太长，于是我花了 15 分钟在网页里加了一个控制回复字数的滑块。这篇文章记录完整的实现过程。

---

## 一、需求

Neuro-Youth 的 AI 回复默认 `max_tokens=4096`，导致每次回复动辄几百字。不同场景下用户对回复长度的需求不同：

- 闲聊时想要短小精悍（50-100 字）
- 深度对话时想要详细展开（300-500 字）
- 讲故事/解释概念时需要更长输出

**目标**：在网页上加一个滑块，用户拖拽即可实时控制 AI 回复长度，无需改配置、无需重启。

---

## 二、技术链路

```
前端滑块 → fetch body → FastAPI ChatRequest → chat() → _chat_full() → DeepSeek API max_tokens
```

一共改了 3 个文件、4 处关键代码。

---

## 三、后端改动

### 3.1 接收参数：`main.py`

在 `ChatRequest` 中加一个字段，默认 300 tokens（约 150 个中文字）：

```python
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []
    max_tokens: int = 300          # ← 新增，默认 300

@app.post("/api/chat", response_model=ChatResponse)
async def api_chat(req: ChatRequest):
    reply = await chat(req.message, req.history, max_tokens=req.max_tokens)
    return ChatResponse(reply=reply)
```

Pydantic 会自动校验类型，前端传什么值都逃不过类型检查。

### 3.2 透传参数：`chat.py`

`chat()` 和 `_chat_full()` 各加一个参数，一路透传到 API 调用：

```python
async def chat(message: str, history: list[dict] | None = None, max_tokens: int = 300) -> str:
    # ... 记忆检索、构建消息 ...
    reply = await _chat_full(messages, enhanced_system, max_tokens)
    return reply

async def _chat_full(messages: list[dict], system: str, max_tokens: int = 300) -> str:
    body = {
        "model": MODEL,
        "max_tokens": max_tokens,    # ← 从硬编码 4096 变为参数
        "system": system,
        "messages": messages,
    }
    # ...
```

改动量极小，但效果显著。`max_tokens` 直接控制 DeepSeek API 的输出上限，LLM 自己会把回复压缩到限制内。

### 3.3 max_tokens 的行为

不同大模型对 `max_tokens` 的处理略有不同，但核心逻辑一致：**它是一个硬上限**。如果 LLM 本来想说 500 字但你设了 200，它会在约 200 字处截断（或自动收尾）。

**实际经验**（DeepSeek v4-pro）：
| max_tokens | 约中文字数 | 适合场景 |
|-----------|-----------|---------|
| 50 | 25-50 字 | 极简回复，"嗯"、"好的" |
| 150 | 75-150 字 | 快速闲聊 |
| 300 | 150-300 字 | 日常对话 |
| 500 | 250-500 字 | 有深度的回答 |
| 800 | 400-800 字 | 讲故事、解释概念 |

---

## 四、前端改动

### 4.1 HTML：加一个 range 滑块

```html
<input id="user-input" type="text" placeholder="输入消息..." autofocus>
<span id="token-label">300 tokens</span>
<input type="range" id="token-slider" min="50" max="800" value="300" step="25"
       oninput="updateTokenLabel()">
<button id="send-btn" onclick="send()">发送</button>
```

参数说明：
- `min="50"` / `max="800"`：50-800 tokens 范围，太长了没必要（有记忆压缩兜底）
- `step="25"`：每格 25 tokens，手感顺滑
- `value="300"`：默认适中

### 4.2 CSS：让滑块融入暗色主题

```css
#token-slider { width: 100px; accent-color: #4a9eff; }
#token-label { font-size: 11px; color: #666; white-space: nowrap; }
```

`accent-color` 一行就把浏览器默认的蓝灰滑块染成了主题色，不需要额外样式。

### 4.3 JS：两处改动

**标签实时更新**：

```javascript
function updateTokenLabel() {
  const v = document.getElementById('token-slider').value;
  document.getElementById('token-label').textContent = v + ' tokens';
}
```

**发送时把值带进请求**：

```javascript
body: JSON.stringify({
  message: text,
  history,
  max_tokens: +document.getElementById('token-slider').value
})
```

`+` 号把字符串转数字，因为 `range` 的 `.value` 始终是字符串，但后端要 int。

---

## 五、为什么不用字数而用 token？

很多产品会显示"回复字数"，但这里直接展示 token：

1. **API 层面是 token**：DeepSeek/Claude API 的限制单位就是 token，用 token 直接对应，不需要在前后端做 token↔字数的近似换算（换算不准反而误导）
2. **用户不需要精确字数**：用户想要的是"长/短"的感觉，不是精确到字数。令牌数已经能传达这个信息
3. **简单**：少一层转换，少一个出 bug 的地方

如果以后想做得更友好，可以在标签上同时显示 `300 tokens ≈ 150字`，但目前够用。

---

## 六、总结

这个功能从提出到实现，总共改了：

| 文件 | 改动 |
|------|------|
| `backend/main.py` | +1 字段，+1 参数透传 |
| `backend/chat.py` | 2 个函数各加 1 个参数 |
| `frontend/index.html` | +1 滑块，+5 行 CSS，+6 行 JS |

**总代码量**：不到 15 行新增/修改。

一个看似"要加个功能"的需求，拆解下来其实就是参数透传 + UI 控件。前端的滑块和后端的 `max_tokens` 是一一对应的，中间没有业务逻辑，没有状态管理，没有数据库操作 —— 这就是**直线型需求**的典型特征：数据从前端控件出发，经过一层透传，直接落到 API 参数上，整条链路清晰透明。

这种需求是最适合快速迭代的，因为它几乎不会引入 bug（整条链路没有分支逻辑）。反过来，如果一个需求需要在前端和后端之间做大量转换、校验、缓存，那就值得先停下来画个架构图了。

---

> 系列博客第 2 篇 | 项目：Neuro-Youth | 开发工具：Claude Code | 2026年5月
