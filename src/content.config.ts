import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        // Human review state of a page (e.g. the security model): `pending-adam` until signed off.
        review: z.string().optional(),
        // Provenance of the generated tool reference (scripts/sync-tool-docs.mjs).
        toolDocsTag: z.string().optional(),
        toolDocsSha: z.string().optional(),
      }),
    }),
  }),
};
