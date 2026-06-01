import { useState, useRef, useEffect } from "react";

// ---- AI helper -------------------------------------------------------------
async function callClaude({ system, messages }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  const data = await res.json();

  // --- "limits over" detection: rate limit (429) or out of credits ---
  const apiErr = data?.error;
  const errType = apiErr?.type || "";
  const errMsg = (apiErr?.message ?? apiErr ?? "").toString().toLowerCase();
  if (res.status === 429 || errType === "rate_limit_error"
      || errMsg.includes("credit") || errMsg.includes("quota")) {
    window.alert(
      "API limit reached.\n\n" +
      "You've hit your Anthropic rate limit or run out of credits.\n" +
      "Wait a minute and try again, or top up at console.anthropic.com."
    );
    const e = new Error("limit");
    e.isLimit = true;
    throw e;
  }
  // -------------------------------------------------------------------

  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  if (!text) throw new Error("Empty response");
  return text;
}

const INDUSTRIES = [
  "Retail & Consumer",
  "Tech / SaaS",
  "Healthcare & Pharma",
  "Financial Services",
  "Industrials / Mfg",
  "Energy",
];
const CASE_TYPES = [
  "Profitability",
  "Market Entry",
  "Growth Strategy",
  "M&A / Investment",
  "Market Sizing",
  "Operations",
];
const LEVELS = ["Warm-up", "Standard", "Tough"];

const DIMENSIONS = [
  ["structure", "Structure & MECE"],
  ["framework", "Framework fit"],
  ["quant", "Quant & math"],
  ["communication", "Communication"],
  ["judgment", "Business judgment"],
];

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.cr { 
  --paper:#F1EADB; --card:#FBF7EE; --ink:#1B1C22; --soft:#5E5A4F;
  --line:#DCD0B8; --accent:#A2331E; --accent2:#C5532B; --gold:#9A741C; --good:#3F6B4C;
  font-family:'IBM Plex Sans',-apple-system,sans-serif; color:var(--ink);
  background-color:var(--paper);
  background-image:
    radial-gradient(120% 80% at 50% -10%, rgba(255,250,240,.7), transparent 60%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  min-height:100vh; padding:34px 18px 56px;
}
.cr * { box-sizing:border-box; }
.wrap { max-width:840px; margin:0 auto; }

.kicker { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.28em;
  text-transform:uppercase; color:var(--accent); margin:0 0 6px; }
.brand { font-family:'Fraunces',Georgia,serif; font-weight:900; font-size:46px;
  line-height:.95; margin:0; letter-spacing:-.01em; }
.brand small { font-weight:400; font-style:italic; font-size:21px; color:var(--soft); display:block; margin-top:8px; letter-spacing:0; }
.rule { height:2px; background:var(--ink); margin:20px 0 26px; }

.card { background:var(--card); border:1px solid var(--line); border-radius:3px;
  box-shadow:0 1px 0 rgba(0,0,0,.03), 0 18px 38px -28px rgba(40,30,10,.5); }

.label { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.18em;
  text-transform:uppercase; color:var(--soft); margin:0 0 10px; }
.grp { margin-bottom:22px; }
.opts { display:flex; flex-wrap:wrap; gap:9px; }
.pill { font-family:'IBM Plex Sans'; font-size:14px; padding:9px 14px; border:1px solid var(--line);
  background:transparent; color:var(--ink); border-radius:2px; cursor:pointer;
  transition:all .15s ease; }
.pill:hover { border-color:var(--ink); }
.pill.on { background:var(--ink); color:var(--paper); border-color:var(--ink); }

.btn { font-family:'IBM Plex Mono',monospace; font-size:13px; letter-spacing:.14em;
  text-transform:uppercase; cursor:pointer; border-radius:2px; transition:all .15s ease;
  border:1px solid var(--ink); }
.btn:disabled { opacity:.4; cursor:default; }
.btn-primary { background:var(--accent); color:#FBF7EE; border-color:var(--accent);
  padding:15px 26px; font-weight:500; }
.btn-primary:hover:not(:disabled) { background:var(--accent2); }
.btn-ghost { background:transparent; color:var(--ink); padding:13px 18px; }
.btn-ghost:hover:not(:disabled) { background:var(--ink); color:var(--paper); }

.meta { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.12em;
  text-transform:uppercase; color:var(--soft); display:flex; gap:8px; flex-wrap:wrap;
  align-items:center; margin-bottom:14px; }
.meta b { color:var(--accent); font-weight:500; }

.prompt { padding:22px 24px; }
.prompt .label { color:var(--accent); }
.prompt p { font-family:'Fraunces',Georgia,serif; font-size:19px; line-height:1.5;
  margin:6px 0 0; }

.thread { display:flex; flex-direction:column; gap:14px; margin:22px 0; }
.row { display:flex; }
.row.me { justify-content:flex-end; }
.bubble { max-width:82%; padding:13px 16px; border-radius:3px; font-size:15px; line-height:1.5;
  animation:fadeUp .35s ease both; white-space:pre-wrap; }
.bubble.them { background:var(--card); border:1px solid var(--line); border-left:3px solid var(--ink); }
.bubble.me { background:var(--ink); color:var(--paper); }
.who { font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.16em;
  text-transform:uppercase; opacity:.6; margin-bottom:5px; }

.dock { position:sticky; bottom:0; padding-top:8px; }
.composer { background:var(--card); border:1px solid var(--ink); border-radius:3px; padding:10px; }
.composer textarea { width:100%; border:0; background:transparent; resize:none;
  font-family:'IBM Plex Sans'; font-size:15px; color:var(--ink); outline:none; line-height:1.45;
  min-height:46px; }
.composer textarea::placeholder { color:#A99F86; }
.composer .bar { display:flex; justify-content:space-between; gap:10px; margin-top:6px; }

.dots span { display:inline-block; width:5px; height:5px; border-radius:50%; background:var(--accent);
  margin-right:4px; animation:blink 1.2s infinite both; }
.dots span:nth-child(2){ animation-delay:.2s } .dots span:nth-child(3){ animation-delay:.4s }

.score-hero { text-align:center; padding:28px 20px 22px; }
.score-hero .big { font-family:'Fraunces',serif; font-weight:900; font-size:84px; line-height:1;
  color:var(--accent); }
.score-hero .out { font-family:'IBM Plex Mono',monospace; color:var(--soft); font-size:14px; }
.verdict { font-family:'Fraunces',serif; font-style:italic; font-size:18px; line-height:1.5;
  max-width:560px; margin:14px auto 0; }

.dim { margin:0 24px 16px; }
.dim .top { display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px; }
.dim .top b { font-family:'IBM Plex Mono',monospace; }
.track { height:8px; background:#E4DAC4; border-radius:99px; overflow:hidden; }
.fill { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2));
  border-radius:99px; width:0; transition:width .9s cubic-bezier(.2,.8,.2,1); }

.col2 { display:grid; grid-template-columns:1fr 1fr; gap:0; border-top:1px solid var(--line); }
.col2 > div { padding:20px 24px; }
.col2 > div:first-child { border-right:1px solid var(--line); }
.col2 h4 { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.16em;
  text-transform:uppercase; margin:0 0 12px; }
.col2 li { font-size:14px; line-height:1.5; margin-bottom:9px; list-style:none;
  padding-left:16px; position:relative; }
.col2 li:before { content:"—"; position:absolute; left:0; color:var(--accent); }
.model-box { padding:20px 24px; border-top:1px solid var(--line); }
.model-box h4 { font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.16em;
  text-transform:uppercase; margin:0 0 10px; color:var(--gold); }
.model-box p { font-size:14.5px; line-height:1.6; margin:0; white-space:pre-wrap; }

.err { background:#F6E2DC; border:1px solid var(--accent); color:var(--accent);
  padding:10px 14px; font-size:13px; border-radius:2px; margin-bottom:14px; }
.foot { text-align:center; font-family:'IBM Plex Mono',monospace; font-size:10px;
  letter-spacing:.14em; color:#A99F86; margin-top:28px; text-transform:uppercase; }

@keyframes fadeUp { from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:none} }
@keyframes blink { 0%,80%,100%{opacity:.25} 40%{opacity:1} }
@media(max-width:560px){ .brand{font-size:34px} .col2{grid-template-columns:1fr}
  .col2 > div:first-child{border-right:0;border-bottom:1px solid var(--line)} .score-hero .big{font-size:64px} }
`;

export default function CaseroomCoach() {
  const [phase, setPhase] = useState("setup"); // setup | interview | feedback
  const [industry, setIndustry] = useState(INDUSTRIES[0]);
  const [caseType, setCaseType] = useState(CASE_TYPES[0]);
  const [level, setLevel] = useState("Standard");

  const [casePrompt, setCasePrompt] = useState("");
  const [thread, setThread] = useState([]); // {role:'them'|'me', text}
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(null); // 'start'|'reply'|'score'
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [barsIn, setBarsIn] = useState(false);

  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread, busy]);
  useEffect(() => { if (feedback) { const t = setTimeout(() => setBarsIn(true), 120); return () => clearTimeout(t); } }, [feedback]);

  const interviewerSystem = () => `You are a sharp but encouraging case interviewer at a top strategy consulting firm (McKinsey / BCG / Bain style). You are running a ${level} ${caseType} case in the ${industry} sector.

The case you have already posed to the candidate is:
"${casePrompt}"

Behave as follows:
- Reply ONLY as the interviewer, in 2 to 5 sentences. Never narrate or break character.
- When the candidate asks a sensible clarifying question or requests data, give realistic, specific numbers or a short exhibit, kept internally consistent across the case.
- Push them to structure (MECE), state a hypothesis, and quantify. Ask "what's driving that?" or "how would you size it?" when useful.
- If they're vague or stuck, give a small nudge, never the full answer or framework.
- Do not solve the case for them.`;

  async function startCase() {
    setError(""); setBusy("start");
    try {
      const prompt = await callClaude({
        system: "You write realistic strategy-consulting case prompts.",
        messages: [{
          role: "user",
          content: `Write ONE ${level} ${caseType} case prompt in the ${industry} sector. Output only what the interviewer would say aloud: 2-4 sentences of company/context plus the core question. No framework, no hints, no answer.`,
        }],
      });
      setCasePrompt(prompt);
      setThread([{ role: "them", text: prompt }]);
      setPhase("interview");
    } catch (err) { if (!err?.isLimit) setError("Couldn't reach the interviewer. Try again."); }
    setBusy(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...thread, { role: "me", text }];
    setThread(next); setInput(""); setBusy("reply"); setError("");
    try {
      const apiMessages = next.slice(1).map((m) => ({
        role: m.role === "me" ? "user" : "assistant", content: m.text,
      }));
      const reply = await callClaude({ system: interviewerSystem(), messages: apiMessages });
      setThread([...next, { role: "them", text: reply }]);
    } catch (err) {
      if (!err?.isLimit) setError("The interviewer didn't respond. Try resending.");
      setThread(next);
    }
    setBusy(null);
  }

  async function score() {
    if (busy) return;
    setBusy("score"); setError("");
    const transcript = [`INTERVIEWER (case): ${casePrompt}`,
      ...thread.slice(1).map((m) => `${m.role === "me" ? "CANDIDATE" : "INTERVIEWER"}: ${m.text}`)
    ].join("\n");
    try {
      const raw = await callClaude({
        system: `You are an expert case-interview coach evaluating a mock ${caseType} case (${industry}). Be specific and honest; reference what the candidate actually said. Keep every string concise.`,
        messages: [{
          role: "user",
          content: `Evaluate this candidate. Respond with ONLY valid JSON, no markdown, no backticks:
{"scores":{"structure":<1-10>,"framework":<1-10>,"quant":<1-10>,"communication":<1-10>,"judgment":<1-10>},"overall":<number 1 decimal>,"strengths":["..","..",".."],"improvements":["..","..",".."],"modelStructure":"a tight MECE structure a strong candidate would use here","verdict":"1-2 sentence overall verdict"}

CASE & TRANSCRIPT:
${transcript}`,
        }],
      });
      const clean = raw.replace(/```json|```/g, "").trim();
      setFeedback(JSON.parse(clean));
      setBarsIn(false); setPhase("feedback");
    } catch (err) { if (!err?.isLimit) setError("Couldn't generate the scorecard. Add a bit more dialogue and retry."); }
    setBusy(null);
  }

  function reset() {
    setPhase("setup"); setThread([]); setCasePrompt(""); setFeedback(null);
    setInput(""); setError(""); setBarsIn(false);
  }

  function exitCase() {
    if (thread.length > 1 && !window.confirm("Exit this case? Your progress will be lost.")) return;
    reset();
  }

  return (
    <div className="cr">
      <style>{STYLES}</style>
      <div className="wrap">
        <p className="kicker">Mock Interview · Top-Firm Style</p>
        <h1 className="brand">Caseroom<small>An AI coach for consulting case interviews</small></h1>
        <div className="rule" />

        {error && <div className="err">{error}</div>}

        {phase === "setup" && (
          <div className="card" style={{ padding: "26px 26px 28px" }}>
            <div className="grp">
              <p className="label">01 · Industry</p>
              <div className="opts">
                {INDUSTRIES.map((x) => (
                  <button key={x} className={"pill" + (industry === x ? " on" : "")} onClick={() => setIndustry(x)}>{x}</button>
                ))}
              </div>
            </div>
            <div className="grp">
              <p className="label">02 · Case type</p>
              <div className="opts">
                {CASE_TYPES.map((x) => (
                  <button key={x} className={"pill" + (caseType === x ? " on" : "")} onClick={() => setCaseType(x)}>{x}</button>
                ))}
              </div>
            </div>
            <div className="grp">
              <p className="label">03 · Difficulty</p>
              <div className="opts">
                {LEVELS.map((x) => (
                  <button key={x} className={"pill" + (level === x ? " on" : "")} onClick={() => setLevel(x)}>{x}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" disabled={busy} onClick={startCase} style={{ marginTop: 6 }}>
              {busy === "start" ? "Briefing the interviewer…" : "Begin interview →"}
            </button>
          </div>
        )}

        {phase === "interview" && (
          <>
            <div className="meta">
              <span>Live case</span>·<b>{industry}</b>·<b>{caseType}</b>·<b>{level}</b>
              <button onClick={exitCase} style={{ marginLeft: "auto", background: "none",
                border: "1px solid var(--line)", color: "var(--soft)", fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", padding: "5px 10px",
                borderRadius: 2, cursor: "pointer" }}>✕ Exit</button>
            </div>
            <div className="card prompt">
              <p className="label">The prompt</p>
              <p>{casePrompt}</p>
            </div>

            <div className="thread">
              {thread.slice(1).map((m, i) => (
                <div key={i} className={"row " + (m.role === "me" ? "me" : "")}>
                  <div className={"bubble " + (m.role === "me" ? "me" : "them")}>
                    <div className="who">{m.role === "me" ? "You" : "Interviewer"}</div>
                    {m.text}
                  </div>
                </div>
              ))}
              {busy === "reply" && (
                <div className="row"><div className="bubble them">
                  <div className="who">Interviewer</div>
                  <span className="dots"><span></span><span></span><span></span></span>
                </div></div>
              )}
              <div ref={endRef} />
            </div>

            <div className="dock">
              <div className="composer">
                <textarea
                  value={input}
                  placeholder="Lay out your structure, ask for data, or state a hypothesis…  (Enter to send)"
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                />
                <div className="bar">
                  <button className="btn btn-ghost" disabled={busy || thread.length < 2} onClick={score}>
                    {busy === "score" ? "Scoring…" : "End & get scored"}
                  </button>
                  <button className="btn btn-primary" style={{ padding: "13px 22px" }} disabled={busy || !input.trim()} onClick={send}>Send</button>
                </div>
              </div>
            </div>
          </>
        )}

        {phase === "feedback" && feedback && (
          <div className="card">
            <div className="score-hero">
              <p className="label" style={{ color: "var(--accent)" }}>Scorecard</p>
              <div className="big">{feedback.overall}</div>
              <div className="out">out of 10</div>
              {feedback.verdict && <p className="verdict">“{feedback.verdict}”</p>}
            </div>

            <div style={{ paddingTop: 6 }}>
              {DIMENSIONS.map(([key, name]) => {
                const v = feedback.scores?.[key] ?? 0;
                return (
                  <div className="dim" key={key}>
                    <div className="top"><span>{name}</span><b>{v}/10</b></div>
                    <div className="track"><div className="fill" style={{ width: barsIn ? `${v * 10}%` : 0 }} /></div>
                  </div>
                );
              })}
            </div>

            <div className="col2">
              <div>
                <h4 style={{ color: "var(--good)" }}>What worked</h4>
                <ul>{(feedback.strengths || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
              <div>
                <h4 style={{ color: "var(--accent)" }}>To sharpen</h4>
                <ul>{(feedback.improvements || []).map((s, i) => <li key={i}>{s}</li>)}</ul>
              </div>
            </div>

            {feedback.modelStructure && (
              <div className="model-box">
                <h4>A strong structure for this case</h4>
                <p>{feedback.modelStructure}</p>
              </div>
            )}

            <div style={{ padding: "20px 24px", borderTop: "1px solid var(--line)", display: "flex", gap: 10 }}>
              <button className="btn btn-primary" onClick={reset} style={{ padding: "13px 22px" }}>New case →</button>
            </div>
          </div>
        )}

        <p className="foot">Caseroom</p>
      </div>
    </div>
  );
}