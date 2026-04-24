# BFHL Hierarchy Explorer

REST API and frontend for the SRM Full Stack Engineering Challenge.

## Features

- **POST /bfhl** — Accepts an array of node strings, validates entries, builds hierarchical trees, detects cycles, and returns structured insights.
- **Frontend** — Glassmorphism-styled single-page app with interactive tree visualization, summary cards, and issues panel.

## Getting Started

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`. The frontend is served from the same origin.

## Deployment (Vercel)

```bash
npm i -g vercel
vercel
```

The included `vercel.json` handles routing automatically.

## API Example

**POST** `/bfhl`
```json
{
  "data": ["A->B", "A->C", "B->D", "C->E", "E->F", "X->Y", "Y->Z", "Z->X"]
}
```

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: HTML / CSS / JavaScript (no framework)
- **Styling**: Custom glassmorphism dark theme with Inter & JetBrains Mono fonts
