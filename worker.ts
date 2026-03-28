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

    // Only serve SPA fallback for GET requests — let non-GET 404s pass through
    // (browsers always send Accept: text/html for navigation; non-navigation assets
    //  like JS/CSS are typically not GET-less, but we guard on method only to stay
    //  compatible with Cloudflare's asset serving behaviour)
    if (request.method !== 'GET') return asset;

    // SPA fallback: serve index.html with 200
    const indexRequest = new Request(new URL('/', request.url).toString(), request);
    const indexResponse = await env.ASSETS.fetch(indexRequest);
    return new Response(indexResponse.body, {
      status: 200,
      headers: indexResponse.headers,
    });
  },
};
