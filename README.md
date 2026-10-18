# Rocky Road Hub — Concept (route map lab)

Standalone experiment from the wiki **Create a Journey** idea: explore how the same GPX can feel different on screen.

## What this is

- **Front page** (`index.html`) — tagline, country and region filters, **See catalogue** and **See all**, plus a basket
- **Dorset ride** — two days. **Buy the bundle** packs The Mayfair, Weymouth (Booking.com) and a Portland Bill lighthouse ticket
- **Map lab** (`ride.html`) — the map page. The Dorset ride story links the same Mayfair stay and Portland Bill ticket.
- **Map exploration + Add a journey** (GPX upload in the browser; no accounts)
- Three demo rides (Dorset, Dartmoor, Snake Pass) with synthetic dense tracks + elevation + sight annotations
- **Add a journey**: choose a `.gpx` file — it appears as a new route with start/mid/end icons and simple road segments
- Four map styles as tabs:
  1. **Cartoon poster** — named road ribbons + click a pin for story / key roads / turn guide (right panel)
  2. **Story ribbon** — bold path on a muted basemap + icon markers
  3. **Elevation drama** — grade-coloured segments + linked profile scrubber
  4. **Fly-along** — play/scrub the bike along the route; sights pop as you pass

Not wired to the Ionic/Supabase hub in `~/rocky-road-hub/`.

## Run locally

```bash
cd ~/rocky-road-hub-concept
python3 -m http.server 8770 --bind 0.0.0.0
```

Open `http://<pi-ip>:8770/` (or `http://127.0.0.1:8770/`). Needs HTTP so `fetch('data/routes.json')` works.

Try **Add a journey** with any `.gpx`, or a sample under `data/gpx/`.

## Deploy to Netlify

Static site — no Node build. Config: `netlify.toml` (publish `.`).

**CLI (from this Pi):**

```bash
cd ~/rocky-road-hub-concept
npx --yes netlify-cli login          # once — opens browser / auth URL
npx --yes netlify-cli sites:create --name rocky-road-hub-concept   # optional name
npx --yes netlify-cli deploy --dir=. --prod
```

Or in the [Netlify UI](https://app.netlify.com): **Add new site → Deploy manually** and drag this folder; later connect a git repo if you want continuous deploys.

Publish directory must be the concept root (where `index.html` lives). Leave build command empty / `true`.

## Files

| Path | Role |
|------|------|
| `index.html` | Front page and catalogue |
| `ride.html` | Map lab (cartoon, story, elevation, fly-along) |
| `js/front.js` | Country, region, See catalogue, See all |
| `data/catalogue.json` | Countries, regions, and which ride opens the map |
| `css/styles.css` | Map lab styling |
| `css/front.css` | Front page, catalogue cards, back link |
| `js/app.js` | Route load, upload wire-up, four renderers |
| `js/gpx.js` | Browser GPX → route object |
| `js/icons.js` | Cartoon SVG icons |
| `data/routes.json` | Demo tracks, elevation, annotations |
| `data/gpx/*.gpx` | Matching GPX exports |

## Wiki link

- `Rocky-Road-Hub/create-a-journey/create-journey` — **02.01.01 Create a Journey**
- Hub overview persona: draw routes in a more interesting way than a plain GPS line
