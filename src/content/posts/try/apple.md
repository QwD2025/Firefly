---
title: iPhone 5 越狱
published: 2026-05-29
pinned: false
tags: [ios]
update: 2026-05-29
draft: false
description: "不知道干什么。"
---
 
**设备：** iPhone 5（MD297CH/A，国行，16GB，黑色，2012年产）  
**系统版本：** iOS 10.3.4（最高版本）  

## 过程

- 下载 3uTools（www.3u.com），自带驱动修复
- 工具箱 → IPA 签名 → 导入 sockH3lix.ipa
- 使用自有 Apple ID 签名
- 签名成功后 → 应用游戏 → 安装应用 → 拖入签名好的 IPA
- 手机上：设置 → 通用 → 描述文件与设备管理 → 信任证书
- 打开 sockH3lix → 点 Jailbreak → 等待重启 → Cydia 出现 

---

## Cydia / 插件现状

iOS 10 的大部分 Cydia 源已失效（HTTPS/TLS 不支持、服务器关闭），以下操作未成功：

| 插件 | 用途 | 状态 |
|---|---|---|
| ReProvision | 自动续签 IPA | 源不可用 |
| AltDaemon | 避免重签 | 需要欧盟/日本区域 |
| OpenSSH / Activator | 远程操作 / 自动化 | 未安装 |
| AppSync Unified | 过期 IPA 仍可打开 | DEB 安装路径不明确 |

### 当前策略
- 每 7 天用 3uTools 重新签名一次
- 越狱本身已完成，核心能力已获取

---

## 可用的越狱能力
- 文件系统访问修改
- 任意 IPA 安装
- 系统配置修改

---

## 用途

不知道用来干什么，就越个狱，插件生态活的不多，3tools里有一些应用，还有在github上能找到一些deb文件，但是我不知道做什么，对于这么一个老旧的机器，好像有些浪费时间。
