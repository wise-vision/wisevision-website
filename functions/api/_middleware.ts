export const onRequest = async (ctx: { next: () => Promise<Response> }) => ctx.next();
