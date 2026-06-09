<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5d33ad21-f564-4f8a-a8ed-ae42430c663c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Optional: set `ZAI_API_KEY` in [.env.local](.env.local) to call the official Z.AI model. Without it, the app uses the same local mock response shape.
3. Run the app:
   `npm run dev`

`npm run dev` starts both Vite on `http://localhost:3000` and the local Z.AI bridge API on `http://localhost:8789`.
