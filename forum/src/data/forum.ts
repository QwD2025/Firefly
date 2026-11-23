import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { z } from "astro/zod";
import data from "../../content/forum.json";
import { archiveYears, boards } from "./site";
import { readWrittenTopics } from "./written-topics";

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const manifest = z.object({
  members: z.array(z.object({ id, name: z.string().min(1) })),
  topics: z.array(z.object({ id, board: id, title: z.string().min(1) })),
}).parse(data);

type Post = CollectionEntry<"posts">;
type Topic = (typeof manifest.topics)[number];

const members = uniqueById(manifest.members);
const metadata = uniqueById(manifest.topics);

function uniqueById<T extends { id: string }>(entries: T[]) {
  const index = new Map(entries.map((entry) => [entry.id, entry]));
  if (index.size !== entries.length) throw new Error("Duplicate public forum ID");
  return index;
}

export function formatTime(value: string) {
  return value.slice(0, 16).replace("T", " ");
}

export function yearOf(value: string) {
  return Number(value.slice(0, 4));
}

function memberName(id: string) {
  const member = members.get(id);
  if (!member) throw new Error(`Unknown member: ${id}`);
  return member.name;
}

export function topicBoard(id: string) {
  const board = boards.find((entry) => entry.id === id);
  if (!board) throw new Error(`Unknown board: ${id}`);
  return board;
}

type Floor = { data: Pick<Post["data"], "author" | "number" | "postedAt" | "replyTo" | "editedAt"> } &
  ({ entry: Post } | { text: string });
interface Thread extends Topic {
  posts: Floor[];
  first: Floor;
  last: Floor;
}

let threadCollection: Promise<Thread[]> | undefined;

export function getThreads() {
  threadCollection ??= loadThreads();
  return threadCollection;
}

async function loadThreads() {
  const grouped = new Map<string, Post[]>();

  for (const post of await getCollection("posts")) {
    const { author, topic, postedAt, editedAt, number } = post.data;
    memberName(author);
    if (!metadata.has(topic)) throw new Error(`Unknown topic: ${topic}`);
    if (!archiveYears.includes(yearOf(postedAt))) {
      throw new Error(`Post #${number} in ${topic} is outside the forum calendar`);
    }
    if (editedAt && Date.parse(editedAt) < Date.parse(postedAt)) {
      throw new Error(`Invalid edit time in ${topic} #${number}`);
    }
    const related = grouped.get(topic) ?? [];
    related.push(post);
    grouped.set(topic, related);
  }

  const threads: Thread[] = manifest.topics.map((topic) => {
    topicBoard(topic.board);
    const posts = grouped.get(topic.id)?.sort((a, b) => a.data.number - b.data.number);
    if (!posts?.length) throw new Error(`Topic ${topic.id} has no opening post`);
    for (const [index, post] of posts.entries()) {
      const { number, replyTo, postedAt } = post.data;
      const previous = posts[index - 1];
      if (number !== index + 1 || (replyTo !== undefined && replyTo >= number)) {
        throw new Error(`Invalid post sequence or reply in ${topic.id} #${number}`);
      }
      if (previous && Date.parse(previous.data.postedAt) > Date.parse(postedAt)) {
        throw new Error(`Posts are out of chronological order in ${topic.id}`);
      }
    }
    const floors = posts.map((entry) => ({
      entry, data: { ...entry.data, author: memberName(entry.data.author) },
    }));
    return { ...topic, posts: floors, first: floors[0], last: floors[floors.length - 1] };
  });
  for (const topic of readWrittenTopics()) {
    if (metadata.has(topic.id)) throw new Error(`帖子/${topic.id}.txt 与已有帖子的网址重复，请更换文件名。`);
    threads.push(topic);
  }
  return threads.sort((a, b) => Date.parse(b.last.data.postedAt) - Date.parse(a.last.data.postedAt));
}
