"use client";

import { useState, useCallback, useRef, useEffect } from "react";

export interface AddressData {
  address: string;
  lat: number | null;
  lng: number | null;
}

export default function AddressInput({
  value,
  onChange,
  isLoading,
  onCountyDetected,
  onCityDetected,
}: {
  value: AddressData;
  onChange: (data: AddressData) => void;
  isLoading: boolean;
  onCountyDetected?: (county: "la" | "ventura") => void;
  onCityDetected?: (city: string | null) => void;
}) {
  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<
    { display_name: string; lat: string; lon: string }[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const searchAddress = useCallback(async (q: string) => {
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      // Use OpenStreetMap Nominatim (free, no API key)
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
          new URLSearchParams({
            q: q + " Southern California",
            format: "json",
            limit: "5",
            countrycodes: "us",
            addressdetails: "1",
          }),
        {
          headers: { "User-Agent": "LA-Permit-Navigator/1.0" },
        }
      );
      const data = await res.json();
      setSuggestions(data);
      setShowSuggestions(data.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange({ address: val, lat: null, lng: null });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 400);
  };

  const selectSuggestion = (s: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setQuery(s.display_name);
    onChange({ address: s.display_name, lat, lng });
    setShowSuggestions(false);
    setSuggestions([]);

    // Detect county — use word-boundary matching to avoid false positives
    const lower = s.display_name.toLowerCase();
    const venturaKeywords = ["oxnard", "thousand oaks", "simi valley", "camarillo", "moorpark", "ojai", "santa paula", "fillmore", "port hueneme"];
    const isVentura = venturaKeywords.some(kw => new RegExp(`\\b${kw}\\b`, "i").test(lower))
      || /\bventura\s+county\b/i.test(lower)
      || /\bventura\s*,/i.test(lower);
    onCountyDetected?.(isVentura ? "ventura" : "la");

    // Detect city — try structured address fields first, fallback to word-boundary match
    const addrData = s as { address?: Record<string, string> };
    const structuredCity = addrData.address?.city || addrData.address?.town || addrData.address?.village || null;
    const cities = ["torrance", "pasadena", "long beach", "glendale", "carson", "oxnard", "thousand oaks", "ventura"];
    let detectedCity: string | null = null;
    if (structuredCity) {
      const normalizedStructured = structuredCity.toLowerCase();
      detectedCity = cities.find(c => normalizedStructured === c || (c === "ventura" && normalizedStructured === "san buenaventura")) || null;
    }
    if (!detectedCity) {
      detectedCity = cities.find(c => new RegExp(`\\b${c}\\b`, "i").test(lower)) || null;
    }
    onCityDetected?.(detectedCity);
  };

  const mapUrl =
    value.lat && value.lng
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${value.lng - 0.008},${value.lat - 0.005},${value.lng + 0.008},${value.lat + 0.005}&layer=mapnik&marker=${value.lat},${value.lng}`
      : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        Project Address <span className="text-red-400">*</span>
      </label>
      <p className="text-xs text-slate-500">
        Enter the street address or intersection. This determines which agencies have jurisdiction.
      </p>

      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            placeholder="e.g., 1234 S Main St, Carson, CA 90745"
            disabled={isLoading}
            className="w-full bg-[#0F1117] border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 font-mono pr-8"
          />
          {searching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
            </div>
          )}
          {value.lat && !searching && (
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-400 text-sm">
              &#10003;
            </div>
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-[#0F1117] border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors border-b border-slate-800 last:border-b-0"
              >
                {s.display_name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Map preview */}
      {mapUrl && (
        <div className="rounded-lg overflow-hidden border border-slate-700">
          <iframe
            src={mapUrl}
            width="100%"
            height="200"
            style={{ border: 0 }}
            title="Project location map"
          />
          <div className="bg-[#0F1117] px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-mono">
              {value.lat?.toFixed(5)}, {value.lng?.toFixed(5)}
            </span>
            <span className="text-xs text-emerald-400">Location confirmed</span>
          </div>
        </div>
      )}

      {!value.address && (
        <p className="text-xs text-red-400/70">Address is required for permit analysis</p>
      )}
    </div>
  );
}
