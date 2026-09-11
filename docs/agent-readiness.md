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

## Open question for maintainers

**The CDN is telling the AI crawlers to go away.** `public/robots.txt` explicitly
allows GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot and PerplexityBot. The file as
**served** has a `# BEGIN Cloudflare Managed content` block prepended, which is not in
this repo, setting:

```
Content-Signal: search=yes,ai-train=no,use=reference
User-agent: ClaudeBot
Disallow: /
User-agent: GPTBot
Disallow: /
```

…and the same for CCBot, Google-Extended, Amazonbot, Applebot-Extended, Bytespider
and meta-externalagent.

Per RFC 9309 a crawler merges matching groups and the least restrictive rule wins at
equal specificity, so a strict reader may still allow — but that is a thin thing to
stake the goal on, and `ai-train=no` may be a deliberate choice. It is a Cloudflare
dashboard setting (AI Crawl Control / Managed robots.txt), not a file here, so it
cannot be resolved in a pull request. Decide it deliberately either way; `llms.txt`
currently tells agents to honour the served file and to tell us if that looks wrong.

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
