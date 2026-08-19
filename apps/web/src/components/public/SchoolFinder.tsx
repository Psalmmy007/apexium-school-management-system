"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, School as SchoolIcon, MapPin, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

interface MatchedSchool {
  id: string;
  name: string;
  slug: string;
  address?: string | null;
  logoUrl?: string | null;
}

export function SchoolFinder() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatchedSchool[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/schools/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.schools || []);
          setIsOpen(true);
          setHasSearched(true);
        }
      } catch (err) {
        console.error("School search error:", err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="w-full max-w-2xl mx-auto relative" ref={containerRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
          ) : (
            <Search className="w-5 h-5 text-indigo-400" />
          )}
        </div>

        <input
          id="school-finder-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Looking for your school? Search by name, city, or state..."
          className="w-full pl-12 pr-4 py-3.5 bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 rounded-2xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-lg backdrop-blur-sm transition-all"
        />
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          id="school-finder-results"
          className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {results.length > 0 ? (
            <div>
              <div className="px-4 py-2 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Matching Schools</span>
                <span>{results.length} found</span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
                {results.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                        <SchoolIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-white text-sm truncate">{sch.name}</h4>
                        {sch.address && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 truncate mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                            <span className="truncate">{sch.address}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/s/${sch.slug}/admissions`}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <span>Apply</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                      <Link
                        href={`/s/${sch.slug}`}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700"
                      >
                        <span>Portal</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : hasSearched && query.trim().length >= 2 ? (
            <div className="p-6 text-center text-slate-400">
              <p className="text-sm">No schools found matching &ldquo;{query}&rdquo;.</p>
              <p className="text-xs text-slate-500 mt-1">
                If your school hasn&apos;t joined Apexium yet, you can register it today.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
