# Fourteen Decision Models, One Benchmark
## A 10-minute film — voice-over and scene-by-scene recording plan

**Runtime:** about 10 minutes: ≈1,120 words of voice-over (about 8½ minutes at a calm 135 words a minute), plus the on-screen holds.
**Focus:** what a decision model is, five use cases that show it, and the head-to-head benchmark.
Not every demo. Not every model detail.
**Every number below** comes from the recorded runs committed in this repository and shown on the
local site. If a number on screen and a number in the VO ever disagree, the screen wins — fix the VO.

---

## Before recording

### Start the site

From the project folder:

```bash
npm run serve:static -- web/dist 3010
```

Base URL for every shot: **`http://127.0.0.1:3010`**. Nothing on the site calls an API or spends
money; every answer is a committed recording.

### Capture settings

- 1920×1080, browser at 100% zoom, no bookmarks bar. The site is dark by default — keep it.
- Record each shot as its own clip. Hold still 2 seconds at the start and end of each one.
- Hide the cursor unless the scene says to show it.

### How to read each scene

- **URL** — paste it exactly. The `?model=` part picks the decision model; `&item=` picks the item.
- **RECORD** — the element to frame, named by the label you can see on the page.
- **VO** — read as written. Line breaks are breaths.

### The elements you will use (all on a demo page)

| Name in this script | What it looks like on the page |
|---|---|
| **Model picker** | The **"Decision model"** dropdown just above the green "Recorded run" line. |
| **Run line** | The line starting **"Recorded run"** — model version, date, item count, and "% match ground truth". |
| **Headline strip** | The row of score cards under the run line ("What this run found"). |
| **Item** | The big panel with the item title (e.g. "P-0001 · Beacon Print · $17,326.26") and its data or picture. |
| **Typed answers** | The **"Typed answers"** panel beside the item, one row per question with its probability. |
| **Verdict** | The card under the answers that says what the answers decided, and whether ground truth agreed. |

On the benchmark page (`/benchmark`):

| Name in this script | What it looks like on the page |
|---|---|
| **Text leaderboard** | The table headed **"Text demos"** — rank, model, "Matches ground truth" bar, demos won, latencies, cost. |
| **Image leaderboard** | The table headed **"Image demos"**, directly below. |
| **Matrix** | The grid headed **"Every demo, every model"** — one row per demo, one column per model, best in each row outlined. |

---

## Scene list at a glance

| # | Scene | Time | Main URL |
|---|---|---|---|
| 1 | Cold open | 0:00–0:35 | `/benchmark` |
| 2 | What a decision model is | 0:35–1:45 | `/demos/three-way-match` |
| 3 | Use case 1 — Paying the right invoice | 1:45–3:00 | `/demos/three-way-match` |
| 4 | Use case 2 — Fraud alerts | 3:00–4:05 | `/demos/card-fraud-triage` |
| 5 | Use case 3 — The invoice that changes the bank account | 4:05–5:10 | `/demos/invoice-bank-change` |
| 6 | Use case 4 — Photos | 5:10–5:55 | `/demos/produce-check` |
| 7 | Use case 5 — "Is this a good time to buy?" | 5:55–6:50 | `/demos/buy-timing` |
| 8 | The benchmark — accuracy | 6:50–8:10 | `/benchmark` |
| 9 | The benchmark — speed and cost | 8:10–9:15 | `/benchmark` |
| 10 | Close | 9:15–10:00 | `/benchmark` → `/` |

---

## Scene 1 — Cold open  ·  0:00–0:35

**URL:** `http://127.0.0.1:3010/benchmark`

**RECORD**
1. Open on the **Text leaderboard**, full width. Slow push-in (in the edit) from the whole table to
   the top four rows.
2. Cut to the **Matrix**. Slow vertical pan down the grid, about 6 seconds.

**VO**
> Fourteen AI models.
> The same questions, on the same nine thousand real-world finance tasks.
> Every answer recorded, and every answer checked against the right one.
>
> This is not a chatbot test. Nobody here writes a paragraph.
> These are *decision models* — and by the end of this video
> you will know which ones you can trust, how fast they are, and what they cost.

---

## Scene 2 — What a decision model is  ·  0:35–1:45

**URL:** `http://127.0.0.1:3010/demos/three-way-match?model=jev&item=P-0001`

**RECORD**
1. The **Item** panel: the purchase order, the goods receipt and the supplier invoice. 5 seconds.
2. The **Typed answers** panel. Show the cursor and hover over each of the four rows in turn,
   top to bottom, about 2 seconds each.
3. The **Verdict** card. Hold 3 seconds.

**On-screen text (add in edit)** over shot 2:
`choice → a probability for every option` · `score → a position on a scale` · `yes / no → a probability of yes`

**VO**
> Here is the idea.
> You give the model a situation — here, a purchase order, a delivery note and a supplier's invoice —
> and a few typed questions.
>
> It answers each one with a number, not a sentence.
> Which problem is this? A probability for every option.
> How serious is it? A position on a scale.
> Should we hold the payment? A probability of yes.
>
> Code can act on a number.
> Hold the invoice above ninety percent. Send it to a person in between. Pay it below.
>
> Jev, from TypeSafe, did this first. Now OpenAI has a decisions API,
> and through OpenRouter there are a dozen more.
> So we asked all of them the same questions.

---

## Scene 3 — Use case 1: Paying the right invoice  ·  1:45–3:00

**URL A:** `http://127.0.0.1:3010/demos/three-way-match?model=jev&item=P-0001`
**URL B:** `http://127.0.0.1:3010/demos/three-way-match?model=solar-decide-flash&item=P-0001`
**URL C:** `http://127.0.0.1:3010/benchmark` (Matrix)

**RECORD**
1. URL A: the **Typed answers** — first row reads "Mismatch · Partial delivery · 100%". 4 seconds.
2. Show the cursor. Open the **Model picker** and choose **"Solar Decide Flash · Upstage"**.
   Record the answers changing: the first row now reads "None · 74%". Hold 4 seconds.
3. Still on URL B: frame the **Run line** — it reads "2.0% match ground truth · 3 of 150". 3 seconds.
4. URL C: scroll the **Matrix** to the row **"Three-way match"** and hold on it. Five cells read 89;
   the Solar Decide Flash cell reads 2.

**VO**
> First job: accounts payable.
> Before an invoice is paid, someone checks it against what was ordered and what actually arrived.
> This supplier billed for the full order — but only part of it was delivered.
>
> Jev sees it. Partial delivery, a hundred percent. Hold the payment.
>
> Same item, same questions — now Solar Decide Flash.
> "No problem," it says. Seventy-four percent sure.
> And then, a line later, it says to hold the payment anyway.
> Across all a hundred and fifty invoices, it gets three right.
>
> Five models tie at the top here, at eighty-nine percent:
> Jev, PPLX Decider, Liquid's D1, Drex, and Kev.
> The same question can separate these models by almost ninety points.

---

## Scene 4 — Use case 2: Fraud alerts  ·  3:00–4:05

**URL A:** `http://127.0.0.1:3010/demos/card-fraud-triage?model=solar-decide&item=ALT-0002`
**URL B:** `http://127.0.0.1:3010/demos/card-fraud-triage?model=tev1-4b&item=ALT-0002`
**URL C:** `http://127.0.0.1:3010/benchmark` (Matrix)

**RECORD**
1. URL A: the **Item** — one card alert. 3 seconds. Then the **Typed answers**: fraud type reads
   "None", action reads "Watch". 4 seconds.
2. URL B (or switch with the **Model picker** to **"TEV1 4B (experimental) · Together"**, cursor
   visible): fraud type now reads "Stolen card". Hold 4 seconds.
3. URL B: the **Run line** — "10.3% match ground truth". 3 seconds.
4. URL C: the **Matrix**, row **"Card fraud triage"**. The outlined best cell is Solar Decide (92).

**VO**
> Second job: a fraud team's alert queue.
> Four hundred card alerts. Most are ordinary customers. A few are real fraud.
> The model decides which deserve an analyst's hour.
>
> This one is an ordinary customer.
> Solar Decide says: no fraud, keep an eye on it. Right.
> TEV1 says: stolen card. That is a customer about to have their card blocked for nothing.
>
> Here is the surprise.
> Solar Decide is near the bottom of the overall table — and it wins this job outright,
> ninety-two percent, ahead of every other model.
>
> No model wins everything.
> Which is exactly why you test on *your* job, not on a leaderboard.

---

## Scene 5 — Use case 3: The invoice that changes the bank account  ·  4:05–5:10

**URL A:** `http://127.0.0.1:3010/demos/invoice-bank-change?model=clef&item=IV-001`
**URL B:** `http://127.0.0.1:3010/demos/invoice-bank-change?model=openai`

**RECORD**
1. URL A: the **Item** — the invoice *picture* on the left, the **"Vendor master"** box on the right.
   Push in (in edit) on the bottom of the invoice: **"Remit payment to — Summit Bank IBAN DE44…"**,
   then on the vendor master's **"Union Bank"**. 6 seconds.
2. URL A: the **Typed answers** — "Problem · Bank changed · 98%", "Pay · 5%". 4 seconds.
3. URL B: the **Headline strip** — show the cards "Bad invoices caught" (96%) and "False alarms" (8 of 8). 4 seconds.

**VO**
> Third job, and now the input is a picture.
> Some decision models read images. Seven of the fourteen here do.
>
> This is the most expensive fraud in accounts payable.
> The invoice looks right — right supplier, right amount —
> but at the bottom it asks you to pay a new bank account.
> The model reads the picture, compares it with the account on file,
> and says: bank details changed. Ninety-eight percent. Do not pay.
>
> Every model caught the changed account on this one.
> The difference is the clean invoices.
> GPT-6 Luna names them correctly — then refuses to pay them anyway.
> Eight clean invoices, eight held.
> Safe, yes. But a supplier waiting a month to be paid is a cost too.

---

## Scene 6 — Use case 4: Photos  ·  5:10–5:55

**URL A:** `http://127.0.0.1:3010/demos/produce-check?model=mercury-decide&item=PR-03`
**URL B:** `http://127.0.0.1:3010/demos/package-check?model=clef&item=PK-01`

**RECORD**
1. URL A: the **Item** — the photo of the black banana, with the credit line under it. 3 seconds.
2. URL A: the **Typed answers** — "Condition · Rotten · 100%", "Reject · 100%". 3 seconds.
3. URL A: the **Run line** — "100% match ground truth · 11 of 11". 2 seconds.
4. URL B: the crushed **"FRAGILE"** parcel photo. 3 seconds.

**VO**
> Real photographs, too.
> Is this stock fresh or spoiled? Is this parcel crushed, or just old?
> A warehouse, an insurer or a delivery claims desk asks this a thousand times a day.
>
> Mercury Decide — a free model — gets all eleven produce photos right.
> These are small sets, so treat them as a demonstration, not a verdict.
> But the shape is the same as every other job:
> a picture in, a typed decision out.

---

## Scene 7 — Use case 5: "Is this a good time to buy?"  ·  5:55–6:50

**URL A:** `http://127.0.0.1:3010/demos/buy-timing?model=openai&item=BT-001`
**URL B:** `http://127.0.0.1:3010/benchmark` (Matrix)

**RECORD**
1. URL A: the **Item** — the unnamed candlestick chart. 4 seconds.
2. URL A: the yellow caveat box ("Not investment advice. Half the charts rose afterwards…"). 3 seconds.
3. URL A: the **Run line** — "50.0% match ground truth · 24 of 48". 3 seconds.
4. URL B: the **Matrix**, row **"Is this a good time to buy?"** — every cell is 50 or below. Hold 4 seconds.

**VO**
> The question everyone asks a chart.
> Ninety days of real prices, no name, no dates — is this a good time to buy?
> Then we checked what the price actually did over the next twenty days.
>
> Half of these charts went up afterwards. Half went down.
> So a coin scores fifty percent.
>
> The best model here scores… fifty percent.
> Most score less.
>
> We kept this demo in on purpose.
> A decision model is very good at reading what is *on* the page.
> It cannot read what is not there yet.

---

## Scene 8 — The benchmark: accuracy  ·  6:50–8:10

**URL:** `http://127.0.0.1:3010/benchmark`

**RECORD**
1. The page title **"14 decision models, 60 jobs, head to head"** and the intro paragraph. 3 seconds.
2. The **Text leaderboard**. Hold on the whole table 4 seconds, then push in on rows 1–4
   (PPLX Decider 86.0%, Mercury Decide 85.2%, D1 84.6%, Jev 83.7%). 5 seconds.
3. Push in on the bottom rows (Solar Decide 67.8%, Clef Omni 62.4%, Solar Decide Flash 52.9%). 4 seconds.
4. The **Image leaderboard**. Push in on row 1 (Clef 72.3%). 4 seconds.
5. Under the image table, the line **"Not in this table: Span 01 …"**. 3 seconds.

**On-screen text (add in edit)** over shot 2: `Same 8,852 items for every model`

**VO**
> So, the whole thing.
> Fifty text jobs — ledgers, payments, fraud, crypto, portfolios, trades, filings —
> and ten image jobs. Every model got the same items, word for word.
> And we only count the items *every* model answered,
> so no model looks better by skipping the hard ones.
>
> At the top, four models within about two points of each other:
> PPLX Decider from Perplexity, eighty-six percent.
> Mercury Decide, a free model. Liquid's D1. And Jev.
>
> At the bottom: the two Solar models and Clef Omni.
>
> On pictures, the order changes again.
> Clef leads at seventy-two percent — Liquid's D1 next, then PPLX Decider and GPT-6 Luna.
>
> One model is missing.
> Respan's Span 01 only answers yes-or-no questions, so it could not sit this test.

---

## Scene 9 — The benchmark: speed and cost  ·  8:10–9:15

**URL:** `http://127.0.0.1:3010/benchmark`

**RECORD**
1. The **Text leaderboard**, columns **"Median latency"** and **"95th percentile"** only (crop or
   push in). Hold on Jev's row: 270 ms / 333 ms. 4 seconds.
2. Same columns, Solar Decide's row: 17 s / 23 s. 3 seconds.
3. The column **"Cost per 1,000 items"**. Push in on Microsoft's Decision 1 ($0.058) and Clef ($0.421). 4 seconds.
4. The note under the table starting **"Latency is wall-clock time…"**. 3 seconds.

**VO**
> Accuracy is half the story.
> If a decision sits in front of a payment, or a checkout, it has to be fast — every time.
>
> Jev is the fastest and the steadiest here:
> a quarter of a second typically, and a third of a second even on its slow requests.
> At the other end, Solar Decide takes seventeen seconds. Per decision.
>
> One honest caveat: we timed most models while sending several requests at once,
> so their slowest times include some queueing.
> The accuracy numbers are not affected.
>
> And cost. These are cheap.
> A thousand decisions costs between nothing — Mercury is free — and about forty cents.
> The whole benchmark, every model, nine thousand items each, cost about twenty dollars.

---

## Scene 10 — Close  ·  9:15–10:00

**URL A:** `http://127.0.0.1:3010/benchmark` (Matrix)
**URL B:** `http://127.0.0.1:3010/`

**RECORD**
1. URL A: the **Matrix**, slow pan down to the bottom. 8 seconds.
2. URL B: the home page hero ("… finance jobs. Every decision model, head to head."). Hold 5 seconds to end.

**VO**
> Three things to take away.
>
> One: decision models turn judgement into numbers your code can act on.
> Two: the best few are close — but every job has its own winner,
> and a model near the bottom can top the one you care about.
> Three: test on your own data. Accuracy, speed and cost, together.
>
> Everything you saw is in the project:
> every question, every recorded answer, and the benchmark that scores them.
> Run it on your own work — and see which model earns the job.

---

## Editor checklist

- [ ] Site served on `http://127.0.0.1:3010` before recording.
- [ ] Every scene opened from its URL, not by clicking around — the `?model=` and `&item=` parts matter.
- [ ] Scene 3 shot 2 and Scene 4 shot 2 show the **Model picker** being changed, cursor visible. Every other shot: cursor hidden.
- [ ] Numbers in the VO match the screen (scenes 3, 4, 5, 8 and 9).
- [ ] Photos in scene 6 keep their credit line visible (it is a licence condition).
- [ ] Total runtime 9:30–10:30.
