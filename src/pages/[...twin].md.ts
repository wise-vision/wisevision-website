// Markdown twins of every docs page: /docs/<path>/ -> /docs/<path>.md (served as text/markdown via public/_headers).
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { twinPath, twinMarkdown } from '../lib/md-twin.mjs';

export const getStaticPaths = (async () => {
  const entries = await getCollection('docs');
  return entries.map((entry) => ({
    params: { twin: twinPath(entry.id).slice(1, -'.md'.length) },
    props: { entry },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ entry: CollectionEntry<'docs'> }> = ({ props }) => {
  const { title, description } = props.entry.data;
  return new Response(twinMarkdown({ title, description, body: props.entry.body ?? '' }), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
};
