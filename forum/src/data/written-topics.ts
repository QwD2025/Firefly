import { z } from "astro/zod";
import { boards, site } from "./site";

const files = import.meta.glob<string>("../../帖子/*.txt", {
  eager: true,
  query: "?raw",
  import: "default",
});
const timestamp = z.iso.datetime({ offset: true });

function readTopic(path: string, source: string) {
  const filename = path.split("/").pop()!;
  const id = filename.slice(0, -4);
  function fail(message: string): never {
    throw new Error(`帖子/${filename}：${message}`);
  }
  if (!/^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u.test(id)) {
    fail("文件名请使用中文、字母或数字，词之间可用短横线或下划线。");
  }
  const blocks = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim()
    .split(/^[ \t]*【回帖】[ \t]*$/m);
  let title = "";
  let board = "";
  let previousTime = "";
  const posts = blocks.map((block, index) => {
    const number = index + 1;
    const lines = block.trim().split("\n");
    const separator = lines.findIndex((line) => !line.trim());
    if (separator < 0) fail(`第 ${number} 楼的时间和正文之间需要空一行，并填写正文。`);
    const fields = new Map<string, string>();
    const allowed = index === 0 ? ["标题", "分区", "作者", "时间"] : ["作者", "时间", "引用"];
    for (const line of lines.slice(0, separator)) {
      const match = /^([^：:]+)[：:](.*)$/.exec(line);
      const key = match?.[1].trim() ?? "";
      if (!match || !allowed.includes(key) || fields.has(key)) fail(`第 ${number} 楼的字段有误：${line}`);
      fields.set(key, match[2].trim());
    }
    function required(key: string) {
      return fields.get(key) || fail(`第 ${number} 楼缺少「${key}」。`);
    }
    if (index === 0) {
      title = required("标题");
      const name = required("分区");
      board = boards.find((item) => item.name === name)?.id ?? fail(`没有「${name}」这个分区。`);
    }
    const author = required("作者");
    const time = required("时间");
    const postedAt = time.replace(" ", "T") + ":00+08:00";
    if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(time) || !timestamp.safeParse(postedAt).success) {
      fail(`第 ${number} 楼需要有效日期，格式为 YYYY-MM-DD HH:mm。`);
    }
    const year = Number(time.slice(0, 4));
    if (year < site.foundedYear || year > site.worldYear || time < previousTime) {
      fail(`第 ${number} 楼的时间须在 ${site.foundedYear}–${site.worldYear} 年内，且不早于上一楼。`);
    }
    previousTime = time;
    const quoted = fields.get("引用");
    const replyTo = quoted === undefined ? undefined : Number(quoted);
    if (quoted !== undefined && (!/^[1-9]\d*$/.test(quoted) || Number(quoted) >= number)) {
      fail(`第 ${number} 楼只能引用前面的楼层。`);
    }
    const text = lines.slice(separator + 1).join("\n").trim();
    if (!text) fail(`第 ${number} 楼的正文为空。`);
    return { data: { number, author, postedAt, replyTo, editedAt: undefined }, text };
  });
  return { id, board, title, posts, first: posts[0], last: posts[posts.length - 1] };
}

export function readWrittenTopics() {
  return Object.entries(files).map(([path, source]) => readTopic(path, source));
}
