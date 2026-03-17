"use client";

import { useState } from "react";

const EXAMPLE_SCENARIOS = [
  {
    label: "Electronics Assembly Plant",
    description:
      "Opening a 15,000 sqft electronics assembly plant in unincorporated LA County near Dominguez Channel. Will have soldering stations, VOC-emitting processes, and chemical storage.",
  },
  {
    label: "200-Unit Apartment Complex",
    description:
      "Building a 200-unit apartment complex in Downtown LA on a 2-acre lot near the LA River.",
  },
  {
    label: "Food Manufacturing in Vernon",
    description:
      "Starting a food manufacturing facility in Vernon with industrial wastewater from cleaning processes and cold storage refrigeration.",
  },
  {
    label: "EV Battery Recycling (Complex)",
    description:
      "Converting a warehouse in Long Beach to an EV battery recycling operation. Site is next to a concrete drainage channel and within 800ft of an elementary school.",
  },
];

export default function PermitForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (description: string) => void;
  isLoading: boolean;
}) {
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && !isLoading) {
      onSubmit(description.trim());
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="project-description"
            className="block text-sm font-medium text-slate-300 mb-1.5"
          >
            Describe your project
          </label>
          <textarea
            id="project-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your project location, type, size, activities, and any known environmental features nearby..."
            className="w-full h-32 bg-[#0F1117] border border-slate-700 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 resize-none font-mono"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={!description.trim() || isLoading}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing with Nemotron...
            </>
          ) : (
            <>
              <span>&#9654;</span>
              Analyze Permit Requirements
            </>
          )}
        </button>
      </form>

      <div>
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">
          Example Scenarios
        </p>
        <div className="grid grid-cols-2 gap-2">
          {EXAMPLE_SCENARIOS.map((scenario) => (
            <button
              key={scenario.label}
              onClick={() => setDescription(scenario.description)}
              disabled={isLoading}
              className="text-left bg-[#0F1117] border border-slate-800 hover:border-slate-600 rounded-lg p-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-200 transition-colors">
                {scenario.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
