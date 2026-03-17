"use client";

import { useState, useCallback, useEffect } from "react";
import AgentTrace from "@/components/AgentTrace";
import PermitResults from "@/components/PermitResults";
import AddressInput, { AddressData } from "@/components/AddressInput";
import GuidedQuestions, {
  GuidedAnswers,
  INITIAL_ANSWERS,
  buildGuidedDescription,
} from "@/components/GuidedQuestions";
import DocumentUpload, { UploadedDocument } from "@/components/DocumentUpload";
import { AgentEvent, PermitAnalysis } from "@/lib/types";

// SVG Logo
function Logo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
      <path d="M8 22V12L16 8L24 12V22L16 26L8 22Z" stroke="white" strokeWidth="1.5" fill="none" opacity="0.3" />
      <path d="M10 20V14L16 11L22 14V20L16 23L10 20Z" stroke="white" strokeWidth="1.5" fill="none" opacity="0.6" />
      <path d="M12 18V16L16 14L20 16V18L16 20L12 18Z" fill="white" opacity="0.9" />
      <circle cx="16" cy="16" r="2" fill="white" />
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const EXAMPLE_SCENARIOS: {
  label: string;
  description: string;
  address: AddressData;
  answers: Partial<GuidedAnswers>;
  demoId?: string;
}[] = [
  {
    label: "200-Unit Apartment Renovation",
    description: "renovating a 200-unit apartment complex on a existing apartment complex",
    address: {
      address: "700, West 9th Street, San Pedro, Los Angeles, CA 90731",
      lat: 33.73613,
      lng: -118.29249,
    },
    answers: {
      projectType: "Residential Development",
      locationArea: "Downtown LA",
      siteSize: "2 acres",
      isNewConstruction: "Modification / renovation",
      nearWaterway: "Not sure",
      nearSchool: "Yes",
    },
    demoId: "san-pedro-200-unit-renovation",
  },
  {
    label: "Electronics Assembly Plant",
    description: "Opening a 15,000 sqft electronics assembly plant near Dominguez Channel with soldering stations, VOC-emitting processes, and chemical storage.",
    address: {
      address: "21000 S Wilmington Ave, Carson, CA 90810",
      lat: 33.8289,
      lng: -118.2631,
    },
    answers: {
      projectType: "Manufacturing / Assembly",
      locationArea: "South Bay (Torrance, Carson, Gardena)",
      siteSize: "15,000 sqft",
      isNewConstruction: "New construction",
      nearWaterway: "Yes",
      waterwayDetails: "Adjacent to Dominguez Channel",
      involvesHazmat: "Yes",
      hazmatDetails: "Chemicals, solvents for assembly processes",
      hasEmissions: "Yes",
      emissionsDetails: "Soldering stations, VOC-emitting processes",
    },
  },
  {
    label: "Food Manufacturing in Vernon",
    description: "Starting a food manufacturing facility with industrial wastewater from cleaning processes and cold storage refrigeration.",
    address: {
      address: "2500 S Soto St, Vernon, CA 90058",
      lat: 34.0003,
      lng: -118.2108,
    },
    answers: {
      projectType: "Food Processing / Manufacturing",
      locationArea: "Vernon / Commerce / Bell",
      isNewConstruction: "New construction",
      wastewater: "Yes",
      wastewaterDetails: "Industrial wastewater from cleaning processes",
      hasEmissions: "Yes",
      emissionsDetails: "Cold storage refrigeration equipment",
    },
  },
  {
    label: "EV Battery Recycling (Complex)",
    description: "Converting a warehouse to an EV battery recycling operation next to a concrete drainage channel, within 800ft of an elementary school.",
    address: {
      address: "2100 E Pacific Coast Hwy, Long Beach, CA 90804",
      lat: 33.7866,
      lng: -118.1553,
    },
    answers: {
      projectType: "Recycling / Waste Processing",
      locationArea: "Long Beach / Harbor Area",
      isNewConstruction: "Conversion / change of use",
      nearWaterway: "Yes",
      waterwayDetails: "Next to a concrete drainage channel",
      nearSchool: "Yes",
      schoolDistance: "800",
      involvesHazmat: "Yes",
      hazmatDetails: "Lithium-ion batteries, electrolyte solutions, heavy metals",
      hasEmissions: "Yes",
      emissionsDetails: "Battery processing equipment, potential toxic air contaminants",
    },
  },
];

export default function Home() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PermitAnalysis | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [freeText, setFreeText] = useState("");
  const [address, setAddress] = useState<AddressData>({ address: "", lat: null, lng: null });
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedAnswers>(INITIAL_ANSWERS);

  // Check for ?demo= URL param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoId = params.get("demo");
    if (demoId) {
      runDemo(demoId);
    }
  }, []);

  const runDemo = async (demoId: string) => {
    // Load the scenario form data
    const scenario = EXAMPLE_SCENARIOS.find((s) => s.demoId === demoId);
    if (scenario) {
      setFreeText(scenario.description);
      setAddress(scenario.address);
      setGuidedAnswers({ ...INITIAL_ANSWERS, ...scenario.answers });
    }

    setEvents([]);
    setResults(null);
    setIsRunning(true);
    setShowTrace(true);

    try {
      const response = await fetch(`/api/demo?id=${demoId}`);
      if (!response.ok) {
        // Fallback to live analysis
        setIsRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const event: AgentEvent = JSON.parse(trimmed.slice(6));
            setEvents((prev) => [...prev, event]);
            if (event.type === "final_result" && event.data) {
              setResults(event.data);
            }
          } catch { /* skip */ }
        }
      }
    } catch { /* ignore */ } finally {
      setIsRunning(false);
    }
  };

  const handleDocsProcessed = useCallback((docs: UploadedDocument[]) => {
    setUploadedDocs(docs);
  }, []);

  const loadExample = (scenario: (typeof EXAMPLE_SCENARIOS)[number]) => {
    setFreeText(scenario.description);
    setAddress(scenario.address);
    setGuidedAnswers({ ...INITIAL_ANSWERS, ...scenario.answers });
  };

  const guidedText = buildGuidedDescription(guidedAnswers);
  const hasAddress = address.address.trim().length > 0;
  const hasContent = freeText.trim() || guidedText;
  const canSubmit = hasAddress && hasContent;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || isRunning) return;

      // Check if this matches a cached demo scenario
      const matchedDemo = EXAMPLE_SCENARIOS.find(
        (s) => s.demoId && s.description === freeText && s.address.address === address.address
      );
      if (matchedDemo?.demoId) {
        runDemo(matchedDemo.demoId);
        return;
      }

      setEvents([]);
      setResults(null);
      setIsRunning(true);
      setShowTrace(true);

      const parts: string[] = [];
      parts.push(`Project address: ${address.address}`);
      if (address.lat && address.lng) {
        parts.push(`GPS coordinates: ${address.lat.toFixed(5)}, ${address.lng.toFixed(5)}`);
      }
      if (freeText.trim()) parts.push(`\n${freeText.trim()}`);
      if (guidedText) parts.push(`\nProject details:\n${guidedText}`);

      if (uploadedDocs.length > 0) {
        const docContext = uploadedDocs
          .filter((d) => !d.text.startsWith("["))
          .map((d) => `--- Document: ${d.name} ---\n${d.text}`)
          .join("\n\n");
        if (docContext) parts.push(`\nExtracted from uploaded documents:\n${docContext}`);
      }

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectDescription: parts.join("\n") }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const event: AgentEvent = JSON.parse(trimmed.slice(6));
              setEvents((prev) => [...prev, event]);
              if (event.type === "final_result" && event.data) setResults(event.data);
            } catch { /* skip */ }
          }
        }
      } catch (error) {
        setEvents((prev) => [
          ...prev,
          { type: "error", error: error instanceof Error ? error.message : "Unknown error" },
        ]);
      } finally {
        setIsRunning(false);
      }
    },
    [freeText, address, guidedText, uploadedDocs, canSubmit, isRunning]
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800/60 px-4 py-3 bg-[#080A0F]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <div>
              <h1 className="text-sm font-bold text-white">LA County Permit Navigator</h1>
              <p className="text-xs text-slate-500">Multi-Agent Environmental Permit Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Demo quick link */}
            <button
              onClick={() => runDemo("san-pedro-200-unit-renovation")}
              disabled={isRunning}
              className="hidden md:inline-flex items-center gap-1.5 bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 px-3 py-1 rounded-lg text-xs font-mono hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
            >
              <span>&#9889;</span> Instant Demo
            </button>
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              Powered by NVIDIA Nemotron
            </div>
            <button
              onClick={() => setShowTrace(!showTrace)}
              className="md:hidden bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono"
            >
              {showTrace ? "Results" : "Trace"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Left Panel */}
        <div
          className={`w-full md:w-[60%] md:border-r border-slate-800/60 overflow-y-auto p-4 ${
            showTrace && events.length > 0 ? "hidden md:block" : ""
          }`}
          style={{ maxHeight: "calc(100vh - 57px)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <AddressInput value={address} onChange={setAddress} isLoading={isRunning} />

            <div className="border-t border-slate-800/60" />

            <div>
              <label htmlFor="project-description" className="block text-sm font-medium text-slate-300 mb-1.5">
                Describe your project
              </label>
              <textarea
                id="project-description"
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Describe your project in plain English..."
                className="w-full h-24 bg-[#0F1117] border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 resize-none font-mono"
                disabled={isRunning}
              />
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Quick-fill Examples</p>
              <div className="grid grid-cols-2 gap-2">
                {EXAMPLE_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.label}
                    type="button"
                    onClick={() => loadExample(scenario)}
                    disabled={isRunning}
                    className="text-left bg-[#0F1117] border border-slate-800 hover:border-slate-600 rounded-lg p-2.5 transition-colors disabled:opacity-50 group"
                  >
                    <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                      {scenario.label}
                    </span>
                    {scenario.demoId && (
                      <span className="ml-1.5 text-xs text-emerald-500/60">&#9889;</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-800/60" />
            <GuidedQuestions answers={guidedAnswers} onChange={setGuidedAnswers} isLoading={isRunning} />
            <div className="border-t border-slate-800/60" />
            <DocumentUpload onDocumentsProcessed={handleDocsProcessed} isLoading={isRunning} />

            <button
              type="submit"
              disabled={!canSubmit || isRunning}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing with Nemotron...
                </>
              ) : !hasAddress ? (
                <span className="text-slate-400">Enter an address to continue</span>
              ) : (
                <>
                  <span>&#9654;</span>
                  Analyze Permit Requirements
                </>
              )}
            </button>

            {canSubmit && !isRunning && (
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded font-mono">Address set</span>
                {freeText.trim() && <span className="bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded font-mono">Description</span>}
                {guidedText && (
                  <span className="bg-purple-900/30 text-purple-400 px-2 py-0.5 rounded font-mono">
                    {Object.values(guidedAnswers).filter((v) => v.trim()).length} fields
                  </span>
                )}
                {uploadedDocs.length > 0 && (
                  <span className="bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded font-mono">
                    {uploadedDocs.length} doc{uploadedDocs.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </form>

          {results && (
            <div className="mt-6">
              <PermitResults data={results} />
            </div>
          )}
        </div>

        {/* Right Panel — Agent Trace */}
        <div
          className={`w-full md:w-[40%] bg-[#0B0D12] ${
            !showTrace && events.length > 0 ? "hidden md:block" : ""
          }`}
          style={{ maxHeight: "calc(100vh - 57px)" }}
        >
          <AgentTrace events={events} isRunning={isRunning} />
        </div>
      </div>
    </div>
  );
}
