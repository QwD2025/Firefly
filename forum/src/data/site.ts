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
    name: "站务",
    boards: [
      { id: "notice", name: "站务公告", description: "本站公告、版务与更新记录。" },
    ],
  },
  {
    name: "城市生活",
    boards: [
      { id: "chat", name: "街坊闲谈", description: "日常琐事、街坊互助与本地闲聊。" },
      { id: "local", name: "城市见闻", description: "街区消息与居民的亲历记录。" },
    ],
  },
  {
    name: "传闻与调查",
    boards: [
      { id: "legends", name: "都市传说", description: "民间传闻、怪谈出处与查证。" },
    ],
  },
] as const;

export const boards = boardGroups.flatMap((group) => [...group.boards]);
export type Board = (typeof boards)[number];
export type BoardId = Board["id"];
