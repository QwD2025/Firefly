# LINELOG

2030 年的虚构世界只读论坛。1998 年创立。首页、版块、历史档案、搜索和主题页共用同一组公开内容。

## 本地运行

在本目录执行 `npm install`，再执行 `npm run dev` 预览或 `npm run build` 生成 `dist/`。`npm run preview` 可以预览构建产物。

## 内容约定

- `src/data/site.ts` 是建站年份、站内年份与版块的配置入口。档案年份从这里生成。
- `content/forum.json` 登记公开账号与主题元数据。账号字段为 `id` 和 `name`，主题字段为 `id`、`board` 和 `title`。
- `content/posts/` 收录已审核的 Markdown。每份文件包含 `topic`、`author`、`number`、`postedAt`，可选 `editedAt` 和 `replyTo`。日期采用带时区的 ISO 8601 格式，主题内楼层从 1 连续编号。
- 世界事实、角色知情记录、未批准草稿和交接上下文留在私有创作区。网站只使用本目录的公开数据。
- 仓库中的构建与发布配置使用本目录的 `dist/`。GitHub Pages 分支发布需手动触发，域名和图床由现有托管服务管理。
