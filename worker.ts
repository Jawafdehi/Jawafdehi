interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Try to serve pre-rendered static asset
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;

    // Only serve SPA fallback for GET navigation requests (HTML)
    // Let missing JS/CSS/images return 404 as-is
    const isGet = request.method === 'GET';
    const acceptsHtml = request.headers.get('Accept')?.includes('text/html') ?? false;
    if (!isGet || !acceptsHtml) return asset;

    // SPA fallback: serve index.html with 200
    const indexRequest = new Request(new URL('/', request.url).toString(), request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);
    return new Response(indexResponse.body, {
      status: 200,
      headers: indexResponse.headers,
    });
  },
};
