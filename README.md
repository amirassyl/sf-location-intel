# SF Location Intel

A hackathon prototype that pulls San Francisco open data about a street into one view, so a local reporter can see building permits, police incident reports and registered businesses without querying each dataset separately.

Built at **Hack for Social Impact 2025** (November 2025) for a challenge from [Mission Local](https://missionlocal.org/), a nonprofit newsroom.

## What is in here

| Folder | What it does | Stack |
| :--- | :--- | :--- |
| [`email-worker/`](email-worker) | Runs on a daily schedule, fetches businesses newly registered in San Francisco and emails a digest with map links | Cloudflare Workers (cron trigger), SendGrid |
| [`backend/`](backend) | API that takes an address and returns permits, incidents and businesses for that street, with simple volume alerts | Python, FastAPI, httpx |
| [`frontend/`](frontend) | Single-page search UI for the backend | React (via CDN), Tailwind |
| [`map-app/`](map-app) | Map-based version of the search with cached lookups | TypeScript, React, Mapbox, Supabase |

Data comes from the city's open data portal ([data.sf.gov](https://data.sf.gov)) through its Socrata API: building permits (`i98e-djp9`), police incident reports (`wg3w-h783`) and registered business locations (`g8m3-pdis`).

## Who built what

This was a team project. My main part was the scheduled email worker; the other pieces were team efforts. AI tools were used heavily throughout: the map app was generated in [Lovable](https://lovable.dev), and AI coding assistants helped with the rest. That is how four working pieces came together during one hackathon, and it is why the code reads the way it does.

## Run it

**Email worker**

```sh
cd email-worker
npm install
npm run local:scheduled   # prints the digest; sends only if SENDGRID_API_KEY is set
```

Set `SENDGRID_API_KEY`, `SENDER_EMAIL` and `RECIPIENT_EMAIL` as environment variables locally (see `.dev.vars.example`) and as Wrangler secrets when deployed.

**Backend and front end**

```sh
cd backend
pip install -r requirements.txt
python main.py            # http://localhost:8000, try /search?address=500 Valencia Street
```

Then open `frontend/index.html` in a browser.

**Map app**

```sh
cd map-app
npm install
cp .env.example .env      # Supabase project values
npm run dev
```

## Changes made when publishing

The original hackathon code was tidied before going public:

- API keys and personal email addresses removed and replaced with environment variables.
- The city moved its data portal from `data.sfgov.org` to `data.sf.gov`; URLs updated.
- Backend search fixed so that street names match the way the datasets store them, and the business query uses the dataset's current column names.
- Worker schedule changed from every minute (used for the demo) to once a day.

## Known limitations

- Search is by street, not by exact address, and each dataset is capped at 1,000 rows, so busy streets are truncated.
- The alert thresholds are fixed numbers chosen during the hackathon, not statistically derived.
- The worker's test file does not currently run: the SendGrid client fails to load in the Workers test pool.
- A hackathon prototype, not a production tool.
