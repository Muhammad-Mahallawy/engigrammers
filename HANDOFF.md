# HANDOFF — Flame in Freefall
Updated: 2026-11-04 · Milestone: M0 (prep)
Paste this whole file at the start of every session. Edit the "State" block after each milestone.

## For the AI reading this
- We are beginners in combustion physics: explain terms in one line, plain words, short answers.
- One task at a time. Give the smallest working piece of code and why it works, not whole apps.
- Don't invent NASA facts or numbers. If the sources don't say it, say "not in the data".
- Don't change the scope or decisions below without asking. At the end, output an updated State block.

## Project
NASA Space Apps 2026, challenge "Flame in Freefall" (spaceappschallenge.org/2026/challenges/flame-in-freefall).
Cairo local event, hackathon Nov 14–15, 2026. Team of 6. Goal: best project in Egypt via Cairo local judging.
Task: a web dashboard where AI summarizes, ranks and interprets NASA PSI microgravity-combustion investigations for fire safety in Moon/Mars habitats.

## One-sentence goal
A planner picks a habitat scenario (e.g. Moon base, 30%+ O2, up to 10.2 psi). The dashboard shows which PSI experiments apply, how far their tested conditions are from it, what they found, and where no data exists, with every claim linked to its NASA source.

## Scope
- Tier 1 (done by Sat ~18:00): (1) catalogue of PSI investigations; (2) scenario selector (presets + sliders: oxygen, pressure, gravity, airflow); (3) ranked list with a code-computed score and AI "why it matters / limits"; (4) coverage map + "no partial-gravity data" banner.
- Tier 2: cleaned downloadable table, 1–2 simple baseline models, compare view, cited Q&A.
- Tier 3: Earth-applications panel, polish.

## Rules
- Build the real project only on Nov 14–15 (until organizers confirm pre-work is allowed). Before that: learn, plan, practice on toy data.
- Ranking is done by code. The LLM only explains, from source text, with links.
- Use only NASA data (PSI, NTRS). No NASA logos. Disclose all AI use and keep an AI log. Never commit API keys.
- PSI downloads: only metadata + "Experimental table" files + small docs. Never click Download Zip with all files selected (videos are huge).

## Decisions (working — change only by team agreement)
- Python + pandas; scikit-learn for baselines; Streamlit + Plotly on Streamlit Cloud (it sleeps when idle, so keep a demo video and screenshots).
- Gemini API free tier; AI outputs precomputed and cached to JSON; retrieval = TF-IDF/BM25, no vector DB.
- Models: small = bulk extraction; mid = default (code, explanations); strong = rare (design, hard bugs). Effort: low / medium / high to match. Cache every AI call. Gemini quota is per project and resets about 10:00 Cairo time (check AI Studio).

## Roles
Data/ML lead: Mahallawy, Mazen · 
AI/retrieval lead: Mahallawy · 
Science curators: All · 
Story & submission: All · 
Frontend: Mohab, Ziad, Sama, Marina · 

## Submission (2025 rules — verify 2026)
7 slides or ≤30 s video on a public link, project link, AI-use disclosure, submit before 11:59 pm local time, final once submitted.

## Milestones
- [ ] M0 Prep: organizers answered · repo + accounts · toy Streamlit deployed · Gemini key tested · PSI-159 CSVs understood
- [ ] M1 Sat AM: data audit + catalogue schema
- [ ] M2 Catalogue filled, 5 records verified by hand
- [ ] M3 Scoring function + app skeleton connected
- [ ] M4 Coverage chart + AI cards
- [ ] M5 Tier 1 live on Streamlit Cloud (Sat ~18:00)
- [ ] M6 Tier 2 pieces · [ ] M7 Feature freeze (Sun 14:00) · [ ] M8 Submitted

## State (edit after each milestone)
Done: —
Learned about the data: PSI-159 (ACME CFI-G) has Experimental tables "Normal Flames" and "Inverse Flames" (CSV). Column meanings: TBD.
Current task: understand the PSI-159 CSV columns.
Next: finish the M0 checklist.
Open questions: pre-work rule; local judging time; Cairo venue and Wi-Fi.