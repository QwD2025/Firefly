---
title: 尝试配置Neuro青春版v1.0
published: 2026-05-23
pinned: false
tags: [AI]
category: 学习之路
update: 2026-05-23
draft: false
description: "我用 Claude Code + DeepSeek API + Live2D + ChromaDB，从零搭建了一个拥有长期记忆、自动压缩、多人格切换的 AI。这篇文章记录了完整的开发过程、技术选型、踩坑记录，以及 AI 辅助编程的真实体验"
image: /assets/images/neuro.png
---

# 一、项目缘起

在《命运石之门》里有一个叫 **Amadeus** 的系统 ——它能够将人类的记忆数字化，并在虚拟空间中还原出完整的人格，我小时候就想拥有一个类似Amadeus的程序，进行人机交互，可惜技术力不足。再后来我又接触了Neuro-sama，一个现实世界的AI驱动的虚拟主播，在那个GPT还未崭露头角的时候，Neuro的雏形就已经出现，它的存在很吸引我，这也埋下了我做这个项目的种子。  

在2026年初，我应该就有了做这个项目的能力，但是我觉得麻烦，所以就搁置了，然后到了今天，ds-v4-pro永久降价（感谢deepseek），我想把这个以前的愿望完成，事先声明，我是半吊子水平，项目也用到了大量ai辅助，所以可能有着大量屎山代码，但是对于我来说其实能跑就行（  

我的设想有以下几点：  

- 有记忆并且尽可能节省tokens
- 从对话中学会你的习惯和偏好和可以用微信QQ聊天记录来训练
- 在不同人格之间切换
- 有一个看得见的虚拟形象  

---  

# 二、技术选型与架构

## 整体架构

Frontend                      
  Live2D 面板(PIXI.js)        
  聊天面板   消息列表，输入框，人格选择器，数据导入

Backend                     
 chat.py LLM调用   
 memory.py ChromaDB 
 personality.py 人格管理   
 import_data.py — 聊天记录导入/解析

DeepSeek API (Anthropic 兼容)          
Model: deepseek-v4-pro               

## 为什么选这些？

**选用DeepSeek**：DeepSeek 提供了 Anthropic-compatible 的消息端点，在国内访问稳定，价格友好！！！，且 `deepseek-v4-pro` 的中文理解和对话能力出色。

**ChromaDB + 自建 Embedding**：常规做法是用 OpenAI 的 `text-embedding-ada-002` 或开源的 `all-MiniLM-L6-v2`，但前者费钱、后者要下载模型（国内网络容易失败）。所以用一个纯 Python 的 n-gram 哈希 Embedding，零依赖、零下载。

**PIXI.js + Live2D**：Live2D 官方的 Web SDK 需要注册，但社区有 `pixi-live2d-display` 这个库，可以直接在浏览器里渲染 Live2D。  

---  

# 三、开发流程

## Step 1：后端骨架

FastAPI 服务启动、CORS 配置、DeepSeek API 对接。

```python
# config.py — 配置管理
import os
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/anthropic")
API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")
```

**注意：DeepSeek 的 system prompt 必须放在顶层**

DeepSeek 的 Anthropic 兼容端点对消息格式有严格要求 —— `system` 不能放在 `messages` 数组里，必须作为请求体的顶层字段：

```python
# 正确做法
body = {
    "model": MODEL,
    "max_tokens": 4096,
    "system": system,           # ← 顶层字段
    "messages": messages,      
}
```

如果把 `system` 放进 `messages` 数组，API 会直接甩一个 400 回来，力竭了。

## Step 2：聊天前端

一个暗色主题的聊天界面，左侧放 Live2D，右侧是对话区。

```html
<!-- 核心结构 -->
<div id="live2d-panel"><!-- PIXI.js 渲染 --></div>
<div id="chat-panel">
  <div id="messages"><!-- 对话气泡 --></div>
  <div id="input-area">
    <input id="user-input" placeholder="输入消息...">
    <button onclick="send()">发送</button>
  </div>
</div>
```

## Step 3：Live2D 

免费模型用的是 **日和（Hiyori）**，一个 Cubism 3 的 Live2D 模型，为什么想做Amadeus，不用助手的live2d呢，因为我没找到（悲），希望命运石之门重启上线后，我能用到里面的live2d模型。

```javascript
// Live2D 初始化
const app = new PIXI.Application({
    view: document.createElement('canvas'),
    width: panelWidth,
    height: panelHeight,
    backgroundAlpha: 0,
    antialias: true,
});

model = await PIXI.live2d.Live2DModel.from('/model/hiyori_free_t08.model3.json');
app.stage.addChild(model);

// 缩放和定位
const scale = Math.min(app.view.width / model.width, app.view.height / model.height) * 0.85;
model.scale.set(scale);
model.x = app.view.width * 0.12;
model.y = app.view.height * 0.18;
```

模型文件通过 FastAPI 的 `StaticFiles` 挂载到 `/model` 路径下。
**挂载顺序很重要** —— `/model` 必须挂在 `/` 之前，否则所有请求都会被前端 catch-all 吞掉。

```python
app.mount("/model", StaticFiles(directory=model_dir), name="model")   # 先挂载
app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")  # 后挂载
```

## Step 4：记忆系统（ChromaDB）

这是项目的核心。我需要一个向量数据库来存储对话，并在每次新消息时检索相关历史。

**Embedding 模型下不动**

ChromaDB 的 `DefaultEmbeddingFunction` 会自动下载 `all-MiniLM-L6-v2`（约 90MB），但在国内网络下经常超时或 SSL 错误。

**手写离线 Embedding**

把文本切成 n-gram（单字 + 2-gram + 3-gram），用 MD5 哈希映射到 384 维向量，L2 归一化。

```python
DIM = 384

def _tokenize(text: str) -> list[str]:
    text = text.lower().strip()
    grams = []
    words = re.findall(r'\w+', text)
    grams.extend(words)
    for i in range(len(text) - 1):
        grams.append(text[i:i+2])      # 2-gram
    for i in range(len(text) - 2):
        grams.append(text[i:i+3])      # 3-gram
    return grams

def _hash_ngram(ngram: str, dim: int) -> int:
    return int(hashlib.md5(ngram.encode()).hexdigest(), 16) % dim

def embed_text(text: str) -> list[float]:
    grams = _tokenize(text)
    if not grams:
        return [0.0] * DIM
    vec = [0.0] * DIM
    for g in grams:
        vec[_hash_ngram(g, DIM)] += 1.0
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm > 0 else vec
```

不需要下载模型，不需要 GPU，不需要联网。对于中文聊天文本的相似度检索，或许效果足够用了。

记忆检索的核心逻辑：

```python
def build_memory_prompt(query: str, k: int = 5, session_id: str = "default") -> str:
    memories = memory_store.search(query, k, session_id=session_id)
    if not memories:
        return ""

    lines = ["[以下是系统检索到的相关历史记忆，请自然地在对话中参考它们，但不要逐字复述:]"]
    for m in memories:
        role_label = "用户" if m["role"] == "user" else "AI"
        lines.append(f"- [{role_label} · 相关度{m['score']:.0%}] {m['content'][:200]}")
    return "\n".join(lines)
```

这些检索到的记忆会被注入到 system prompt 中，LLM 就能"记得"之前的对话了。

## Step 5：记忆自动压缩

如果每次对话都原样存储，50 轮就是 100 条记录，500 轮就是 1000 条。不仅是存储问题，token 成本也会飙升。

**通过后台异步压缩来解决**

当某个会话的原始对话轮数超过 50 条阈值时，触发后台压缩 —— 将所有原始对话发给 LLM，让它总结成一份结构化的用户档案。

```python
COMPRESSION_PROMPT = """你是一个记忆压缩助手。请将以下对话记录提炼成一份简洁的用户档案，保留所有关键信息。

请用中文输出，包含以下三个部分：
1. **用户画像**：名字、年龄、职业、性格特点等基本信息
2. **兴趣爱好与偏好**：用户提到过的喜好、习惯、倾向
3. **重要事件与观点**：用户表达过的重要想法、经历、情感锚点

输出格式要求：纯文本，每个部分用【】标注开头。"""

async def _maybe_compress():
    sid = persona.get_session_id()
    count = memory_store.raw_turn_count(session_id=sid)
    if count <= COMPRESS_THRESHOLD:  # 50
        return

    turns = memory_store.get_raw_turns(session_id=sid)
    transcript = "\n\n".join([f"[{'用户' if t['role']=='user' else 'AI'}] {t['content']}" for t in turns])
    summary = await _llm_call(COMPRESSION_PROMPT, transcript, max_tokens=1024)
    
    memory_store.replace_with_summary(sid, summary, [t["id"] for t in turns])
```

压缩是异步的 —— `asyncio.create_task(_maybe_compress())` 不阻塞聊天响应。

压缩前后的效果对比：

> **压缩前**：50 条原始对话 → ~8000 tokens
> **压缩后**：1 条结构化摘要 → ~500 tokens
> **节省**：约 94% 的 token 消耗

## Step 6：多人格系统 + 聊天数据导入

这是 v1.0 的收尾功能，包含两大块：

### 6.1 人格系统

每个人格是一个 JSON 文件，包含 id、名字、描述和 system prompt：

```json
{
  "id": "kurisu",
  "name": "牧濑红莉栖",
  "description": "《命运石之门》的天才少女，傲娇又理性的神经科学家",
  "system_prompt": "你是牧濑红莉栖（Makise Kurisu）...\n口吻特征：称呼对方为'助手'...生气了会说'バカ！'..."
}
```

**记忆隔离**是关键设计：每个人格有独立的 ChromaDB session，切换人格 = 切换记忆空间。与牧濑红莉栖的对话不会泄露到Neuro-sama的记忆里。

```python
def get_session_id() -> str:
    """Memory isolation: each personality has its own ChromaDB session."""
    return _current_id
```

### 6.2 聊天数据导入

支持三种导出格式的自动检测和解析：

| 格式 | 来源 | 检测方式 |
|------|------|----------|
| 微信 | `2026-01-01 12:00:00 用户名` | 时间戳正则 |
| QQ | `昵称 2026-01-01 12:00:00` | 昵称+时间戳 |
| Telegram | JSON（Desktop 导出） | JSON 结构检测 |

```python
def detect_format(text: str) -> str:
    if text.strip().startswith("{"):
        data = json.loads(text)
        if "messages" in data:
            return "telegram_json"
    if re.match(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}", text):
        return "wechat"
    if re.match(r"^.+?\s+\d{4}[-/]\d{1,2}[-/]\d{1,2}\s+\d{1,2}:\d{2}", text):
        return "qq"
    return "unknown"
```

解析后的消息直接存入 ChromaDB，成为人格记忆的一部分。这是实现"用现实聊天数据进行训练"的关键步骤 ——理想状态下，我把自己和另一个人的聊天记录导入AI的人格，它就能学会我们的互动模式。

---

# 四、启动！（我已启动）

```bash
# 1. 安装依赖
cd D:\Program ai\PET\backend
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 2. 配置 API 密钥（编辑 .env 文件）
DEEPSEEK_API_KEY=your_api_key_here

# 3. 启动
python main.py

# 4. 浏览器打开网址
```

---

# 五、一些想法

## 一、未来目标

- **语音交互**：听说目前的语音交互模型不太好，不过我不太了解，因时间有限我就没有加入这个功能
- **情感识别**：根据对话内容调整 Live2D 表情和动作
- **其他记忆**：不只是文字，还包括图片、链接等
- **QLoRA 微调**：用导入了足够的聊天数据后，微调模型让回复更贴近真实人格

---

## 二、结语

AI真的强大，把设想变成现实，如果没有AI的帮助我或许得需要很长时间才能完成这个项目，不敢想象未来就业局势的变动。但另一方面，也正是这么强大的AI真正地方便了我的生活，真心希望世界越来越好。

