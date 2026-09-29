// Starlight route middleware: advertise each docs page's Markdown twin in <head>.
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { twinPath } from './md-twin.mjs';

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  route.head.push({
    tag: 'link',
    attrs: { rel: 'alternate', type: 'text/markdown', href: twinPath(route.entry.id) },
  });
});
