---
title: Firefly 第一篇博客
published: 2026-05-17
pinned: true
description: "测试网站"
tags: ["测试"]
category: 测试
draft: false
---



这个博客用来测试。

## 文章的 Front-matter

```yaml
---
title: 我的第一篇博客文章
published: 2026-05-17
description: 这是我新 Astro 博客的第一篇文章。
image: ./cover.jpg
tags: [前端, 开发]
category: 前端开发
draft: false
---
```




| 属性          | 描述                                                                                                                                                                                                 |
|---------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `title`       | 文章标题。                                                                                                                                                                                          |
| `published`   | 文章发布日期。                                                                                                                                                                                      |
| `updated`     | 文章更新日期。如果未设置，将默认使用发布日期。                                                                                                                                                      |
| `pinned`      | 是否将此文章置顶在文章列表顶部。                                                                                                                                                                    |
| `description` | 文章的简短描述。显示在首页上。                                                                                                                                                                      |
| `image`       | 文章封面图片路径。<br/>1. 以 `http://` 或 `https://` 开头：使用网络图片<br/>2. 以 `/` 开头：`public` 目录中的图片<br/>3. 不带任何前缀：相对于 markdown 文件的路径 |
| `tags`        | 文章标签。                                                                                                                                                                                          |
| `category`    | 文章分类。                                                                                                                                                                                          |
| `lang`        | 文章语言代码（如 `zh-CN`）。仅当文章语言与站点默认语言不同时设置。                                                                                                                                    |
| `licenseName` | 文章内容的许可证名称。                                                                                                                                                                              |
| `licenseUrl`  | 文章内容的许可证链接。                                                                                                                                                                              |
| `author`      | 文章作者。                                                                                                                                                                                          |
| `sourceLink`  | 文章内容的来源链接或参考。                                                                                                                                                                          |
| `draft`       | 如果这篇文章仍是草稿，则不会显示。                                                                                                                                                                  |
| `comment`     | 是否启用此文章的评论功能。默认为 `true`。                                                                                                                                                           |
| `slug`        | 自定义文章 URL 路径。如果不设置，将使用文件名作为 URL。                                                                                                                                              |
| `password`    | 文章密码。设置后文章内容将被 AES-256-GCM 加密，访客需输入密码才能查看。                                                                                                                              |
| `passwordHint`| 密码提示。显示在密码输入框上方，帮助访客回忆密码，也可以不加。                                                                                                                                                    |

## 文章文件的放置位置

文章文件应放置在 `src/content/posts/` 目录中，可以使用子目录。

```
src/content/posts/
├── post-1.md
└── post-2/
    ├── cover.png
    └── index.md
```

