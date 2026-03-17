# LA County Permit Navigator

A multi-agent agentic RAG application that determines which environmental permits are required across 6+ LA County regulatory agencies for any construction or development project. Enter a plain-English project description and get a full permit analysis with cost estimates, timelines, and filing sequences.

**Live Demo:** [la-permit-navigator.vercel.app](https://la-permit-navigator.vercel.app)

**Instant Demo:** [Try the cached demo](https://la-permit-navigator.vercel.app/?demo=san-pedro-200-unit-renovation) (200-unit apartment renovation in San Pedro)

## How It Works

The app uses a **3-agent pipeline** powered by NVIDIA Nemotron models that processes your project through classification, permit reasoning, and synthesis:

```
User Input → Agent 1: Classifier → Agent 2: Permit Reasoner → Agent 3: Synthesizer → Results
```

1. **Project Classifier** (Nemotron Nano 9B) — Determines SIC code, land use type, and flags (school proximity, waterway, hazmat) using local tool calls
2. **Permit Reasoning Agent** (Nemotron Super 49B) — Analyzes regulations across all 6 agencies in parallel, determining which permits are required with confidence levels
3. **Synthesis Agent** (Nemotron Nano 9B) — Computes filing sequences, parallel tracks, critical path, cost estimates, and warnings

All agent reasoning is streamed in real-time via SSE so users can watch the AI think through the analysis.

## Agencies Covered

| Agency | Code | Scope |
|--------|------|-------|
| South Coast AQMD | SCAQMD | Air quality permits, dust control, health risk assessments |
| LA Regional Water Quality Control Board | RWQCB | Stormwater permits (CGP/IGP), SWPPP |
| LA County Sanitation Districts | Sanitation | Industrial waste permits, pretreatment |
| CEQA Lead Agency | CEQA | Environmental review, categorical exemptions |
| CDFW + US Army Corps | CDFW_USACE | Streambed alteration, Section 404 wetlands |
| LA County Fire / CUPA | Fire_CUPA | Hazardous materials, waste generator permits |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| AI Models | NVIDIA NIM API (OpenAI-compatible) |
| Fast Model | `nvidia/nvidia-nemotron-nano-9b-v2` (classification + synthesis) |
| Reasoning Model | `nvidia/llama-3.3-nemotron-super-49b-v1` (permit analysis) |
| Streaming | Server-Sent Events (SSE) |
| Geocoding | OpenStreetMap Nominatim API |
| PDF Parsing | pdf-parse |
| Deployment | Vercel |

## Architecture

```
src/
├── app/
│   ├── page.tsx                    # Main UI with form, agent trace, results
│   ├── api/
│   │   ├── analyze/route.ts        # Main SSE streaming endpoint (3-agent pipeline)
│   │   ├── demo/route.ts           # Cached demo replay endpoint
│   │   └── upload/route.ts         # PDF/document upload + text extraction
│   └── globals.css                 # Dark theme with dot grid background
├── components/
│   ├── AddressInput.tsx            # Geocoding with map preview
│   ├── AgentTrace.tsx              # Live agent reasoning trace panel
│   ├── PermitResults.tsx           # Results with SVG charts (cost, Gantt, donut)
│   ├── PermitCard.tsx              # Individual permit cards
│   ├── ClassificationBanner.tsx    # Project classification summary
│   ├── TimelineView.tsx            # Filing sequence + critical path
│   ├── GuidedQuestions.tsx         # Structured questionnaire
│   └── DocumentUpload.tsx          # Drag-and-drop file upload
└── lib/
    ├── nim-client.ts               # NVIDIA NIM API client (lazy-init, dual keys)
    ├── regulations.ts              # 6-agency regulatory knowledge base (~3K tokens)
    ├── types.ts                    # TypeScript interfaces
    ├── demo-cache.ts               # Pre-cached demo scenarios
    ├── agents/
    │   ├── classifier.ts           # Agent 1 system prompt + tools
    │   ├── permit-reasoner.ts      # Agent 2 system prompt + regulations KB
    │   └── synthesizer.ts          # Agent 3 system prompt
    └── tools/
        ├── sic-lookup.ts           # SIC code classification (30+ industries)
        ├── waterway-check.ts       # LA County 303(d) impaired waterbodies
        ├── school-proximity.ts     # SCAQMD Rule 1401.1 school check
        ├── ceqa-exemption-check.ts # CEQA categorical exemption tree
        ├── threshold-check.ts      # Agency threshold evaluator (all 6 agencies)
        └── timeline-calculator.ts  # Dependency + timeline computation
```

## Key Features

- **ReAct Pattern** — Agents reason, call tools, observe results, and iterate (visible in real-time)
- **Multi-Model Strategy** — Fast nano-9b for classification/synthesis, powerful super-49b for complex reasoning
- **Parallel Agency Analysis** — Agent 2 splits into 3 concurrent API calls (Air+Water, Sanitation+CEQA, Waterways+HazMat)
- **Pre-computed Tools** — All 11 tool results computed locally after classification (zero extra API calls)
- **SVG Visualizations** — Cost breakdown bars, Gantt timeline chart, agency distribution donut (no charting library)
- **Geocoded Address Input** — OpenStreetMap integration with interactive map preview
- **Document Upload** — PDF, TXT, CSV, JSON, DOC parsing to augment project context
- **Guided Questionnaire** — Structured fields for project type, site size, proximity flags
- **Demo Caching** — Pre-recorded SSE event sequences for instant demo playback

## Speed Optimizations

1. Pre-compute all tool results after classification (instant, no API round-trips)
2. Inject pre-computed results directly into Agent 2 prompts (skip tool-calling loop)
3. Run 3 agency groups in parallel via `Promise.all`
4. Use fast nano-9b model for Agents 1 & 3 (classification + synthesis)
5. Cache demo scenarios with SSE replay at realistic delays

## Getting Started

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Add your NVIDIA NIM API keys:
# NVIDIA_NIM_API_KEY_FAST=nvapi-...
# NVIDIA_NIM_API_KEY_REASONING=nvapi-...

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Deployment

Deployed on Vercel with environment variables configured for both NVIDIA API keys.

```bash
vercel --prod
```

## Built For

**Agents for Impact Hackathon** — NVIDIA + Vercel (March 2026)
