# YouTube RSS

Clean RSS feeds for YouTube channels — no Shorts, your filters.

Paste any YouTube link (channel, @handle, or video) and get a personal RSS feed URL for that channel. Shorts are stripped by default (toggleable per feed), and per-feed keyword rules can exclude or require substrings in titles and/or descriptions. Feed items carry the video thumbnail and full description.

New videos arrive by push: the service subscribes to YouTube's WebSub hub per channel, and an hourly scheduler backstops with polling (anything not fetched in 12h) plus lease renewal. Filter changes apply to new videos only — published feed items are never back-edited (the settings screen shows a live preview of what current settings _would_ match).

## Stack

SvelteKit (Svelte 5, remote functions) on Bun · Postgres via Drizzle (`bun-sql`) · better-auth (email OTP) · Resend + react-email · Tailwind v4 · bits-ui · Railway (IaC in `.railway/railway.ts`)

## Development

```sh
bun install
bun run docker:start   # local Postgres (writes DB_URL to .env.local)
bun run db:migrate
bun run dev
```

Login codes are printed to the dev server console instead of emailed. Useful scripts:

| Script                                        | What it does                                                      |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `bun run check`                               | oxfmt + eslint + svelte-check + tests + build                     |
| `bun test`                                    | unit + integration tests (needs docker Postgres)                  |
| `bun run db:gen` / `db:migrate` / `db:studio` | drizzle-kit                                                       |
| `bun run update:env`                          | pull env vars from the Railway `dev` environment (`vars` service) |
| `bun run dev:emails`                          | react-email preview server                                        |
| `bun scripts/dev-add-feed.ts <url> [email]`   | add a feed through the real pipeline from the CLI                 |

## Deployment

Railway, configured as code in `.railway/railway.ts` (`bun run railway:plan` / `railway:apply`). The `prod` environment runs the app service (Railpack builder, `preDeploy` migrations, `/health` healthcheck) plus Postgres; the `dev` environment holds a `vars` service with development env vars. Secrets (`RESEND_AUTH`, `BETTER_AUTH_SECRET`, …) are set in the Railway dashboard and referenced with `preserve()`.

## How it works

- `src/lib/server/youtube/` — resolve pasted URLs to channel ids, parse channel feeds (`media:group` carries thumbnails + descriptions), detect Shorts (feed `/shorts/` links, HEAD-probe fallback)
- `src/lib/server/ingest/` — one pipeline for both WebSub pings and polling: upsert videos, evaluate each feed's rules, materialize `feed_items`
- `src/lib/server/websub/` — subscribe/renew/unsubscribe against `pubsubhubbub.appspot.com`, HMAC-SHA1 notification verification
- `src/lib/server/rss/` — RSS 2.0 rendering with `media:thumbnail` + `content:encoded`
- `src/routes/f/[token].xml` — the public feed; `src/routes/api/websub/[channelId]` — hub callback
