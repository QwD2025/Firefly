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

# 给 AI 虚拟伴侣加上语音交互 —— 30 行 JS 搞定 ASR + TTS

> 这是 Neuro-Youth 系列的第三篇博客。30 行 JavaScript，零后端改动，零 API 费用，给你的 AI 伴侣加上语音输入和语音朗读。

---

## 一、需求

文字聊天已经跑通了，但打字太累、盯着屏幕看回复也太累。理想的交互应该是：

- **我说，它听**（语音输入 → 转文字 → 自动发送）
- **它说，我听**（AI 回复 → 语音朗读 → 我不用看屏幕）

而且这个功能要**够简单** —— 不能引入复杂的后端服务，不能增加 API 费用，不能拖慢项目进度。

浏览器自带的 Web Speech API 完美满足这些条件。

---

## 二、Web Speech API 是什么

这是 W3C 标准，Chrome 和 Edge 完整实现，分为两个部分：

| API | 方向 | 用途 | 隐私 |
|-----|------|------|------|
| `SpeechRecognition` | 语音 → 文字 | 麦克风收音转文本 | 音频发到浏览器厂商服务器（Google/微软）|
| `SpeechSynthesis` | 文字 → 语音 | 文本朗读 | 纯本地合成，不联网 |

关键点：**语音识别需要联网**（和你在浏览器里用谷歌语音搜索一样），**语音合成完全本地**，不需要 API Key、不花钱。

---

## 三、语音识别实现

### 3.1 核心代码

```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const rec = new SpeechRecognition();

rec.lang = 'zh-CN';           // 中文识别
rec.interimResults = true;    // 实时显示临时结果
rec.continuous = true;        // 持续收音

rec.onresult = (e) => {
  let final = '', interim = '';
  for (let i = e.resultIndex; i < e.results.length; i++) {
    if (e.results[i].isFinal) final += e.results[i][0].transcript;
    else interim += e.results[i][0].transcript;
  }
  input.value = final || interim;  // 实时填入输入框
};

rec.onend = () => {
  if (input.value.trim()) send();  // 说完自动发送
};
```

### 3.2 交互设计

我加了一个麦克风按钮，三态切换：

```
🎤 待机（灰色） → 点击 → ⏹ 录音中（红色脉冲动画） → 说完自动回 🎤
```

CSS 脉冲动画让录音状态一眼可见：

```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(238,68,68,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(238,68,68,0); }
}
```

`continuous: true` 让录音持续进行，不会因为短暂停顿就中断 —— 这对于中文口语中自然的断句很重要。

### 3.3 一个坑：浏览器前缀

Chrome 用 `window.SpeechRecognition`，但老版本用 `window.webkitSpeechRecognition`。一行短路取值解决：

```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
```

Firefox 完全不支持 `SpeechRecognition`，所以我加了降级提示：

```javascript
if (!recognition) {
  alert('你的浏览器不支持语音识别，请使用 Chrome 或 Edge。');
  return;
}
```

---

## 四、语音合成实现

### 4.1 核心代码

```javascript
function speak(text) {
  speechSynthesis.cancel();  // 中断当前朗读
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 1.1;              // 稍快一点，更自然

  // 优先选中文语音（Windows 自带 Microsoft Huihui）
  const voices = speechSynthesis.getVoices();
  const zh = voices.find(v => v.lang.startsWith('zh-CN'));
  if (zh) u.voice = zh;

  speechSynthesis.speak(u);
}
```

### 4.2 两种触发方式

**手动朗读**：每条 AI 消息右下角加一个小 🔊 图标：

```javascript
if (role === 'assistant' && text !== '...') {
  const spk = document.createElement('span');
  spk.className = 'msg-speak';
  spk.textContent = '🔊';
  spk.onclick = () => speak(text);
  div.appendChild(spk);
}
```

**自动朗读**：输入栏旁加一个切换按钮，点亮后每条 AI 回复自动播：

```javascript
let autoSpeak = false;

function toggleAutoSpeak() {
  autoSpeak = !autoSpeak;
  btn.classList.toggle('active');
}

// 在 send() 函数的回复处理中：
if (autoSpeak) speak(data.reply);
```

### 4.3 设计考量

为什么同时做「手动」和「自动」？

- **自动朗读适合**：独自聊天、开车时听回复、想闭眼聊天的场景
- **手动朗读适合**：公共场合（戴耳机）、只想选择性听某几条回复、对音质不满意时跳过

两者互不冲突，各给一个入口即可。

---

## 五、为什么语音合成会卡？

`speechSynthesis.getVoices()` 返回的语音列表是**异步加载**的。如果页面刚打开就调用，可能返回空数组。

这个项目里，用户在第一条 AI 回复到达之前至少需要通过某种方式发出第一条消息（打字或语音），这段时间足够 voices 列表加载完毕。所以实际使用中不会出问题。但如果你想更严谨，可以监听 `voiceschanged` 事件：

```javascript
speechSynthesis.onvoiceschanged = () => {
  // 现在 getVoices() 保证有值了
};
```

---

## 六、语音质量实测

| 系统 | 语音引擎 | 质量评价 |
|------|---------|---------|
| Windows 10/11 | Microsoft Huihui（慧慧）| 可接受，有明显电子音 |
| Windows 10/11 | Microsoft Kangkang（康康）| 同上，男声 |
| macOS | Tingting | 比 Windows 自然一些 |
| Android Chrome | Google 中文语音 | 较好，自然度高 |

对于"先试试水"的目标，浏览器自带 TTS 完全够用。但如果你想要真人级别的语音（比如给静静配上温柔女声），下一步可以考虑 Edge TTS 或 GPT-SoVITS。

---

## 七、体验链路

完整的语音交互流程：

```
用户点击 🎤 → 说话 "亲爱的今天好累" → 识别填入 → 自动发送
  → DeepSeek 生成回复 → 前端渲染气泡 → autoSpeak ? 自动朗读 : 显示🔊等待点击
  → "宝贝辛苦了呀 (｡･ω･｡) 快去休息一下~"
```

从按键到听到回复，全程不用碰键盘。

---

## 八、为什么不选 WebSocket 流式 TTS？

流式 TTS（边说边播）需要：
1. 后端改为 WebSocket 连接
2. 文本分句 + 逐句合成
3. Live2D 口型同步（LipSync）对接

对于"先试试水"的目标，这些是过度设计。当前方案已经能跑通整个语音交互闭环，后续如果要加口型同步，再升级这套管线不迟。

---

## 九、改动量总结

| 文件 | 改动 |
|------|------|
| `frontend/index.html` | +30 行 CSS（mic 按钮动画、speak 图标） |
| `frontend/index.html` | +25 行 JS（语音识别） |
| `frontend/index.html` | +15 行 JS（语音合成 + 自动播） |
| `backend/` | **0 改动** |

前后端唯一的新增依赖是 —— **浏览器本身**。

这也是做 AI 应用开发的一个经验：在动手引入外部库或后端服务之前，先看看浏览器自带什么。Web Speech API、Web Audio API、WebRTC、IndexedDB……浏览器已经内置了很多你需要的基建。

---

## 十、下一步

语音交互闭环跑通后，自然的下一步是：

1. **Edge TTS 升级**：把浏览器自带语音换成 Edge TTS，音质从 60 分拉到 90 分
2. **Live2D 口型同步**：利用模型的 `ParamMouthOpenY` 参数，根据音频驱动嘴巴开合
3. **唤醒词**：类似"Hiyori"或"静静静"触发，不用每次都点按钮

这些是后续优化方向，当前的方案作为一个"能用的语音交互原型"已经完全合格。

---

> 系列博客第 3 篇 | 项目：Neuro-Youth | 开发工具：Claude Code | 2026年5月
