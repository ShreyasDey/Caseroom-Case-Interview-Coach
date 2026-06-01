import express from "express";
import "dotenv/config";

const app = express();
app.use(express.json({ limit: "1mb" }));

// The browser calls /api/chat. This server attaches your secret key
// (kept out of the frontend) and forwards the request to Anthropic.
app.post("/api/chat", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Missing ANTHROPIC_API_KEY. Paste your key into the .env file and restart.",
    });
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Caseroom proxy running on http://localhost:${PORT}`));
