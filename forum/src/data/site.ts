export const site = {
  name: "LINELOG",
  foundedYear: 1998,
  worldYear: 2030,
} as const;

export const archiveYears = Array.from(
  { length: site.worldYear - site.foundedYear + 1 },
  (_, index) => site.worldYear - index,
);

export const boardGroups = [
  {
    name: "同城生活",
    boards: [
      { id: "chat", name: "同城闲聊吧", description: "问路、找店，聊聊今天在街上碰见的事。" },
      { id: "local", name: "老街吧", description: "贴张老照片，找找当年的街坊和店面。" },
    ],
  },
  {
    name: "兴趣同好",
    boards: [
      { id: "legends", name: "都市怪谈吧", description: "那些讲了很多年的怪事，你听过哪个版本？" },
    ],
  },
  {
    name: "社区事务",
    boards: [
      { id: "notice", name: "吧务吧", description: "看公告，提建议，遇到坏链接也来这里说一声。" },
    ],
  },
] as const;

export const boards = boardGroups.flatMap((group) => [...group.boards]);
export type Board = (typeof boards)[number];
export type BoardId = Board["id"];
