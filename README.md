# Caseroom - AI Case Interview Coach

A local React app where an AI plays a strategy-consulting case interviewer
and scores your performance. The frontend (Vite) talks to a tiny Express
proxy that holds your API key, so the key never reaches the browser.

## Run it

1. Open `.env` and paste your Anthropic API key (from https://console.anthropic.com).
2. In a terminal, from this folder:

   ```bash
   npm install
   npm start
   ```

3. Open http://localhost:5173 in your browser.

`npm start` runs two things at once: the proxy on port 3001 and the Vite
dev server on port 5173. Leave the terminal open while using the app.

## Notes

- Requires Node 20 or newer (`node -v` to check).
- API usage is billed to your Anthropic account, separate from any Claude
  Pro/Max plan — a few cents per session on Sonnet.
- To put this online later, deploy the frontend and move `server.js`'s logic
  into a serverless function that holds the key as an environment variable.
