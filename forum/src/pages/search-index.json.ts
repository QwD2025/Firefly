import type { APIRoute } from "astro";
import { getThreads, topicBoard } from "../data/forum";

export const GET: APIRoute = async () => {
  const index = (await getThreads()).map((topic) => ({
    id: topic.id,
    title: topic.title,
    board: topicBoard(topic.board).name,
  }));
  return new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json; charset=utf-8" } });
};
