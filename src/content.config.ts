import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const encEnvelope = z
  .object({ iv: z.string(), data: z.string() })
  .optional();

const tasks = defineCollection({
  loader: glob({ pattern: '**/*.enc.md', base: './src/content/tasks' }),
  schema: z.object({
    id: z.string(),
    stage: z.enum(['planned', 'started', 'done']),
    started_at: z.string(),
    last_activity_at: z.string(),
    enc_body: encEnvelope,
  }),
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.enc.md', base: './src/content/posts' }),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    project_id: z.string(),
    published_at: z.string(),
    updated_at: z.string().optional(),
    tags: z
      .array(
        z.string().regex(
          /^[a-z0-9][a-z0-9-]*$/,
          'Tags must be lowercase alphanumeric, optionally with hyphens'
        )
      )
      .default([]),
    enc_body: encEnvelope,
  }),
});

const descriptions = defineCollection({
  loader: glob({ pattern: '**/*.enc.md', base: './src/content/descriptions' }),
  schema: z.object({ enc_body: encEnvelope }).optional(),
});

export const collections = { tasks, posts, descriptions };
