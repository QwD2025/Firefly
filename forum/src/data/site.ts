export const site = {
  name: "LINELOG",
  foundedYear: 1998,
  worldYear: 2030,
} as const;

export const archiveYears = Array.from(
  { length: site.worldYear - site.foundedYear + 1 },
  (_, index) => site.worldYear - index,
);

export const boards = [
  { id: "chat", name: "茶馆" },
  { id: "notice", name: "重要通知" },
  { id: "resources", name: "资源分享" },
] as const;

export type Board = (typeof boards)[number];
export type BoardId = Board["id"];
