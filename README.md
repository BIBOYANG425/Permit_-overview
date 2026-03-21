# SoCal Permit Navigator

> *Tell us what you're building. We'll tell you every permit you need.*

A multi-agent AI system that analyzes environmental permit requirements across **10+ regulatory agencies** in Los Angeles and Ventura Counties. Describe your project in plain English, get a full compliance report with cost estimates, timelines, filing sequences, and agency-specific citations — in under 60 seconds.

[![Built with NVIDIA NIM](https://img.shields.io/badge/NVIDIA-NIM%20API-76B900?logo=nvidia&logoColor=white)](https://build.nvidia.com/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel)](https://la-permit-navigator.vercel.app)

**[Live Demo](https://la-permit-navigator.vercel.app)** · **[Instant Demo (no API key needed)](https://la-permit-navigator.vercel.app/?demo=san-pedro-200-unit-renovation)**

---

## 🌟 Highlights

- **3-agent pipeline** — Classifier, Permit Reasoner, and Synthesizer work in concert, each using the right model for the job
- **2-county coverage** — Los Angeles (SCAQMD) and Ventura (VCAPCD) with city-level permit requirements for 11 municipalities
- **Real-time agent trace** — Watch the AI think through regulations, call tools, and reason about your project via SSE streaming
- **Professional report generation** — Multi-pass report writer produces structured compliance memorandums with regulatory citations
- **Zero external databases** — Entire regulatory knowledge base ships with the app; no vector DB, no API keys beyond NVIDIA NIM
- **Sub-60-second analysis** — Pre-computed tool results + parallel agency analysis + fast model routing

---

## 🚀 How It Works

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Project    │     │  Agent 1:        │     │  Agent 2: Permit │     │  Agent 3:   │
│ Description  │────▶│  Classifier      │────▶│  Reasoner (x3    │────▶│  Synthesizer│
│ + Address    │     │  (Nano 9B)       │     │  parallel)       │     │  (Nano 9B)  │
└─────────────┘     │                  │     │  (Super 49B)     │     └──────┬──────┘
                    │  SIC code, land  │     │                  │            │
                    │  use, proximity  │     │  6+ agencies     │     ┌──────▼──────┐
                    │  flags, hazmat   │     │  per county      │     │  Report     │
                    └──────────────────┘     └──────────────────┘     │  Writer     │
                                                                     │  (Nano 9B)  │
                                                                     └─────────────┘
```

1. **Classifier** — Determines SIC code, land use type, disturbance area, and proximity flags (school, waterway, hazmat) using local tool calls
2. **Pre-computation** — 10+ threshold checks run locally in TypeScript. Zero API calls. Instant results.
3. **Permit Reasoner** — Analyzes all agencies in 3 parallel batches using the reasoning model with full regulatory KB context
4. **Synthesizer** — Computes filing order, parallel tracks, critical path, total cost range, and warnings
5. **Report Writer** — Generates a professional compliance memorandum in multi-pass JSON (header → batched agency sections)

---

## 🏛️ Agencies Covered

### Los Angeles County

| Agency | Code | What It Covers |
|--------|------|----------------|
| South Coast AQMD | `SCAQMD` | Air permits, Rule 403 dust control, RECLAIM, health risk assessments |
| LA Regional Water Board | `RWQCB` | Stormwater (CGP/IGP), SWPPP, 303(d) impaired waterbodies |
| LA County Sanitation | `Sanitation` | Industrial waste permits, pretreatment, 40 CFR categorical standards |
| CEQA Lead Agency | `CEQA` | Environmental review, categorical exemptions, MND/EIR triggers |
| CDFW + Army Corps | `CDFW_USACE` | Streambed alteration (1602), Section 404 wetlands |
| LA County Fire / CUPA | `Fire_CUPA` | HMBP, CalARP, hazardous waste generator, UST/AST |

### Ventura County

| Agency | Code | What It Covers |
|--------|------|----------------|
| Ventura County APCD | `VCAPCD` | Authority to Construct, BACT, Rule 26 NSR, ROC/NOx thresholds |
| Central Coast RWQCB | `RWQCB` | Region 3 stormwater, TMDL compliance, Ventura River watershed |
| Ventura County Wastewater | `Wastewater` | Industrial user permits, sewer connection, FOG compliance |
| CEQA Lead Agency | `CEQA` | County-level environmental review |
| CDFW + Army Corps | `CDFW_USACE` | Calleguas Creek, Santa Clara River protections |
| Ventura County Fire / CUPA | `Fire_CUPA` | HMBP, hazardous waste, fire plan review |

### City-Level Permits (11 Cities)

> Building permits, fire plan review, planning entitlements, and public works encroachment — tailored per municipality.

`Carson` · `Glendale` · `Long Beach` · `Pasadena` · `Torrance` · `Oxnard` · `Ventura` · `Thousand Oaks` · `LA County Unincorporated` · `Ventura County Unincorporated`

---

## ⚡ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | **Next.js 16** (App Router, Turbopack) |
| Language | **TypeScript 5** with Zod schema validation |
| Styling | **Tailwind CSS 4** (dark theme, dot grid background) |
| AI Models | **NVIDIA NIM API** (OpenAI-compatible endpoints) |
| Fast Model | `nvidia/nvidia-nemotron-nano-9b-v2` — classification, synthesis, reports |
| Reasoning Model | `nvidia/llama-3.3-nemotron-super-49b-v1` — permit analysis |
| Streaming | Server-Sent Events (SSE) |
| Geocoding | OpenStreetMap Nominatim |
| PDF/OCR | pdf-parse + NVIDIA OCR API |
| Deployment | Vercel |

---

## 📁 Architecture

```
src/
├── app/
│   ├── page.tsx                         # Main UI — form, agent trace, results, report
│   └── api/
│       ├── analyze/route.ts             # 3-agent SSE pipeline
│       ├── report/route.ts              # Multi-pass report generation
│       ├── demo/route.ts                # Cached demo replay
│       └── upload/route.ts              # PDF/image upload + OCR extraction
│
├── components/
│   ├── AgentTrace.tsx                   # Live reasoning trace panel
│   ├── PermitResults.tsx                # SVG charts (cost bars, Gantt, donut)
│   ├── ReportView.tsx                   # Professional compliance memo renderer
│   ├── AddressInput.tsx                 # Geocoded address with map preview
│   ├── GuidedQuestions.tsx              # Structured project questionnaire
│   ├── DocumentUpload.tsx               # Drag-and-drop file upload
│   ├── ClassificationBanner.tsx         # Project classification summary
│   ├── PermitCard.tsx                   # Individual permit detail cards
│   └── TimelineView.tsx                 # Filing sequence + critical path
│
└── lib/
    ├── nim-client.ts                    # NVIDIA NIM client (dual-model, lazy-init)
    ├── types.ts                         # 345-line type system
    ├── demo-cache.ts                    # Pre-cached demo scenarios
    │
    ├── agents/
    │   ├── classifier.ts                # Agent 1: SIC + land use + proximity
    │   ├── permit-reasoner.ts           # Agent 2: multi-agency regulatory analysis
    │   ├── synthesizer.ts               # Agent 3: timeline + cost synthesis
    │   └── report-writer.ts             # Report: header + agency section prompts
    │
    ├── config/
    │   ├── counties/
    │   │   ├── index.ts                 # County registry + coordinate detection
    │   │   ├── la.ts                    # LA County config + regulationsKB
    │   │   └── ventura.ts               # Ventura County config + regulationsKB
    │   └── cities/
    │       ├── index.ts                 # City registry + address detection
    │       └── *.ts                     # 11 city configurations
    │
    └── tools/
        ├── sic-lookup.ts                # SIC code database (60+ industries)
        ├── threshold-check.ts           # Agency threshold evaluator
        ├── ceqa-exemption-check.ts      # CEQA categorical exemption tree
        ├── waterway-check.ts            # 303(d) impaired waterbody matching
        ├── school-proximity.ts          # SCAQMD Rule 1401.1 school check
        ├── city-permit-check.ts         # City-level building/fire/planning permits
        ├── fire-review-check.ts         # Fire plan review + sprinkler requirements
        └── timeline-calculator.ts       # Permit dependency graph + critical path
```

---

## 🏎️ Performance

> *The fastest permit analysis is one that doesn't wait for the network.*

| Optimization | Impact |
|-------------|--------|
| Pre-compute all tool results after classification | 10+ checks run locally in ~0ms |
| Inject pre-computed results into Agent 2 prompts | Skips entire tool-calling loop |
| Run 3 agency groups via `Promise.all` | 3x faster permit analysis |
| Use Nano 9B for Agents 1, 3, and Report Writer | ~2s per call vs ~30s for reasoning model |
| Batch report sections 3 at a time | Parallel agency section generation |
| Cache demo scenarios with SSE replay | Instant playback at realistic delays |

---

## ⬇️ Getting Started

```bash
npm install
```

Create `.env.local` with your NVIDIA NIM API keys:

```env
NVIDIA_NIM_API_KEY_FAST=nvapi-...
NVIDIA_NIM_API_KEY_REASONING=nvapi-...
```

Get free API keys at [build.nvidia.com](https://build.nvidia.com/).

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000). Try the instant demo with no API keys: append `?demo=san-pedro-200-unit-renovation` to the URL.

---

## 🚢 Deployment

```bash
vercel --prod
```

Set `NVIDIA_NIM_API_KEY_FAST` and `NVIDIA_NIM_API_KEY_REASONING` in your Vercel project environment variables.

---

## 🏗️ Built For

**[NVIDIA Agents for Impact Hackathon](https://impact-agents.devpost.com/)** — NVIDIA + Vercel (March 2026)

---

## 📜 License

MIT
