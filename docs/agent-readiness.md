# Agent readiness

What this site publishes for machines — AI assistants, crawlers, and anything else
reading it without running JavaScript — where each piece lives, and how to check it
still works.

## The one thing to understand first

**Case and entity pages are not pre-rendered.** Cases never were (see the long note
in `scripts/pre-render.ts` explaining why: SSR fetched nothing, so every file was an
empty shell that shadowed the working edge path). Entities are meant to be, but
`pre-render.ts` collects entity ids from `case.entities[].id`, a field the case
serializer stopped returning when binds moved to `nes_id` — so that loop renders
nothing, silently.

The consequence: for both page types, **the head that `worker.ts` injects is the only
one a machine ever reads.** A `<link>`, a `<script type="application/ld+json">` or a
meta tag added in a React component reaches client-side navigation and nothing else.
This is not a detail — it is the reason the code is shaped the way it is.

## What is published

| Surface | Where | Notes |
|---|---|---|
| `llms.txt` | `public/llms.txt` | Endpoints, identifiers, licence, pagination, contribution path |
| `robots.txt` | `public/robots.txt` | **The CDN prepends managed rules — see the open question below** |
| Case JSON-LD | `src/utils/record-head.ts` → `caseHeadInput` | schema.org `Report`, `about` bound to entity IRIs |
| Entity JSON-LD | `src/utils/record-head.ts` → `entityHeadInput` | `WebPage` + `mainEntity` |
| `rel=alternate` | same | Points at the JSON record and the oEmbed endpoint |
| Head tag list | `src/utils/seo.ts` → `buildHeadTags` | Rendered by `<Seo>` AND by `worker.ts` |

### One record in, one head out

`src/utils/record-head.ts` turns an API record into a complete head input. **Both the
page and the Worker call it.** They used to build that input separately, and the two
had drifted four ways — including a `rel=alternate` href built from `API_BASE_URL`,
which resolves to the site origin in production and so advertised
`https://jawafdehi.org/api/cases/<slug>/`, a path nothing serves.

If you need a new head field, add it to the shared mapper. Adding it to a page only
means crawlers never see it; adding it to the Worker only means the app disagrees
with the edge.

### Identity is the point

A case is identified by `public_iri`, an entity by its NES `@id`. The case graph's
`about` carries those entity IRIs, and the entity graph's `mainEntity['@id']` is the
same string — that is what lets an agent answer "which cases involve this official"
by joining on an identifier instead of string-matching a name that is transliterated
several ways. Do not replace those with names or numeric ids.

## How to check it

| Check | Command | Needs network |
|---|---|---|
| schema.org validity | `bun run test tests/seo/schema-org-validity.test.ts` | no |
| Head byte budget | `bun run test tests/seo/head-budget.test.ts` | no |
| llms.txt route drift | `bun run test tests/seo/llms-txt-routes.test.ts` | no |
| App-vs-edge head drift | `bun run test tests/ssr/worker.head-drift.test.ts` | no |
| Malformed / hostile input | `bun run test tests/ssr/worker.hostile-input.test.ts` | no |
| **llms.txt claims, for real** | `node scripts/audit-llms-txt.mjs` | **yes** |

Run `scripts/audit-llms-txt.mjs` before editing `llms.txt` and after the API changes
shape. It calls every URL the file asserts and exits non-zero when one does not hold;
it is not part of `bun run test` because the only thing worth checking is whether the
live services answer.

`tests/seo/schema-org-vocabulary.json` is a 5 KB slice of
`schemaorg-current-https.jsonld` — the domain and range of every property this repo
emits. **Adding a property means regenerating it**, which is deliberate: a new
property should be looked up, not assumed. The validity test fails loudly on a
property it does not know rather than skipping it.

## Open questions for maintainers

Two, and they are the same conversation.

### 1. Is the data licence really CC0?

`llms.txt` declares the data **CC0 1.0** with the licence URL, and the JSON-LD emits
that as `license` on every case and entity. That is the machine-readable form of a
claim the site already made — the previous `llms.txt` said "All data is in the public
domain and free to use" — but nothing has ever *formally* adopted CC0. `LICENSING.md`
covers the repositories only (Hippocratic License 3.0) and never mentions the dataset.

So a prose sentence has become a specific licence URL that reusers will rely on.
**That needs the board to confirm or correct it**, and two things follow from it:

- **CC0 waives attribution.** If credit matters, CC0 is the wrong instrument and
  **CC BY 4.0** is the one that requires it. The archive currently *asks* for credit
  (see `creditText` and the "How to cite" section of `llms.txt`) because asking is all
  CC0 permits.
- Much of the underlying material is CIAA filings and court orders. It is worth
  confirming the org has any copyright in it to waive or license, and that bare facts
  — which are not copyrightable — are not being over-claimed in either direction.

### 2. The CDN's managed robots.txt

`public/robots.txt` allows GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot and
PerplexityBot. The file as **served** has a `# BEGIN Cloudflare Managed content` block
prepended, which is not in this repo, setting:

```
Content-Signal: search=yes,ai-train=no,use=reference
User-agent: ClaudeBot
Disallow: /
User-agent: GPTBot
Disallow: /
```

…and the same for CCBot, Google-Extended, Amazonbot, Applebot-Extended, Bytespider,
meta-externalagent and CloudflareBrowserRenderingCrawler.

What it actually costs, checked bot by bot: the list is **almost entirely training
crawlers**. Google-Extended is not a Google Search ranking signal (Google says so),
and Apple documents that Applebot-Extended rules are not considered in Search ranking.
The retrieval crawlers that decide whether this archive gets **cited** in an AI answer
— OAI-SearchBot, ChatGPT-User, PerplexityBot, Googlebot, Bingbot, Anthropic's
retrieval agents — are all still allowed. `ClaudeBot` is the one genuinely dual-purpose
entry.

It is also only a *preference*: Cloudflare states robots.txt "does not prevent
crawlers from accessing your content at a technical level", and every one of those
user-agents currently gets HTTP 200 from a real case page. (That rules out UA-based
blocking; verified-bot enforcement can only be confirmed in AI Crawl Control →
Crawlers.)

Three things to decide, and they are separable:

1. **Training.** `ai-train=no` is an express reservation of copyright under EU DSM
   Article 4, which directly contradicts CC0. Pick one.
2. **`ai-input` is absent**, and per the Content Signals policy's own clause (c) an
   omitted signal grants nothing and restricts nothing. `ai-input` is defined as
   grounding and RAG — the single use this whole surface exists to serve. Saying
   `ai-input=yes` is the clearest way to invite it.
3. **The duplicate groups.** For GPTBot and ClaudeBot the served file now contains
   both `Disallow: /` and `Allow: /`. RFC 9309 says merge and let the least
   restrictive win, so it probably resolves to allow, but the file should not say two
   things.

The toggle is **Cloudflare dashboard → Security → Settings → filter "Bot traffic" →
"Set your preference to block training in robots.txt"**, plus a "Display Content
Signals Policy" checkbox under Control AI Crawlers on the zone Overview. Not a repo
file, so it cannot be resolved in a pull request.

## Known gaps, in rough order of value

1. **Entity pages are not pre-rendered and no entity URL is in `sitemap.xml`** (113
   entries, 82 cases, zero entities). The Worker gives them a correct head, but
   nothing helps anyone discover them. Fixing `pre-render.ts` to collect entity IRIs
   from `nes_id` would address both.
2. **No markdown or plain-text rendering of a record.** An agent parsing React HTML
   pays roughly an order of magnitude more tokens than it would for markdown. The
   backend already has a cases-to-markdown converter in its eval pipeline.
3. **No feed.** `/feed.xml` and `/rss.xml` 404, so "what changed since yesterday"
   means diffing the sitemap.
4. **No MCP server.** Cloudflare Workers support remote MCP over Streamable HTTP, so
   it could live in `worker.ts` at `/mcp` on this origin with no new infrastructure.
5. **No per-field language in the API.** `title` can be either language with no way
   to tell; the entity head works around it by inferring from the record, which is a
   heuristic, not a contract.
