# LINELOG 论坛

论坛的源码、内容和 npm 锁文件均在 [forum/](forum/README.md)。在该目录执行 `npm ci` 和 `npm run build`，即可生成完整静态站点 `forum/dist/`。

GitHub Actions 会在推送和拉取请求时检查构建。手动运行 **Deploy forum to Pages branch** 会把论坛产物发布到 `pages` 分支。正式切站前请核对主域名对应的托管项目和图床来源。
