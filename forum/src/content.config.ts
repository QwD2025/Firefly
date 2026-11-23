import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({ base: "./content/posts", pattern: "**/*.md" }),
  schema: z.object({
    topic: z.string().min(1),
    author: z.string().min(1),
    number: z.number().int().positive(),
    postedAt: z.iso.datetime({ offset: true }),
    editedAt: z.iso.datetime({ offset: true }).optional(),
    replyTo: z.number().int().positive().optional(),
  }),
});

export const collections = { posts };
