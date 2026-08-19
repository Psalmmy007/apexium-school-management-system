"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  School as SchoolIcon,
  MapPin,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Filter,
  ExternalLink,
  ShieldCheck,
  Building,
} from "lucide-react";

const NIGERIAN_STATES = [
  "All States", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
];

interface PublicDirectorySchool {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  schoolType: string | null;
  state: string | null;
  city: string | null;
  listingStatus: string;
  listingVerified: boolean;
  admissionsConfigured: boolean;
  badgeState: "Apexium Partner (Online Admissions)" | "Apexium Partner (Portal Active)" | "Directory Listing";
  hasApplyAction: boolean;
}

export function SchoolFinder() {
  const [query, setQuery] = useState("");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedType, setSelectedType] = useState("all");
  const [results, setResults] = useState<PublicDirectorySchool[]>([]);
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

  const fetchSchools = async (q: string, state: string, type: string) => {
    const isStateFiltered = state !== "All States";
    const isTypeFiltered = type !== "all";

    if (!q.trim() && !isStateFiltered && !isTypeFiltered) {
      setResults([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.append("q", q.trim());
      if (isStateFiltered) params.append("state", state);
      if (isTypeFiltered) params.append("schoolType", type);

      const res = await fetch(`/api/schools/search?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.schools || []);
        setIsOpen(true);
        setHasSearched(true);
      }
    } catch (err) {
      console.error("School directory search error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSchools(query, selectedState, selectedType);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, selectedState, selectedType]);

  return (
    <div className="w-full max-w-3xl mx-auto relative" ref={containerRef}>
      {/* Search Input Bar + Filter Selectors */}
      <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {/* Text Input */}
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Search className="w-4 h-4 text-indigo-400" />
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
              placeholder="Search schools by name, city, or campus..."
              className="w-full pl-10 pr-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* State Filter */}
          <div className="w-full sm:w-40 shrink-0">
            <select
              id="school-finder-state-filter"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              {NIGERIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="w-full sm:w-36 shrink-0">
            <select
              id="school-finder-type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="nursery">Nursery / Creche</option>
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
              <option value="combined">Combined</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          id="school-finder-results"
          className="absolute left-0 right-0 top-full mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {results.length > 0 ? (
            <div>
              <div className="px-4 py-2.5 bg-slate-950/80 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Verified Schools &amp; Directory Listings</span>
                <span>{results.length} found</span>
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {results.map((sch) => (
                  <div
                    key={sch.id}
                    className="p-4 hover:bg-slate-800/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <SchoolIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-white text-sm truncate">{sch.name}</h4>
                          
                          {/* Exact 3 Badge States */}
                          {sch.badgeState === "Apexium Partner (Online Admissions)" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Apexium Partner (Online Admissions)</span>
                            </span>
                          )}

                          {sch.badgeState === "Apexium Partner (Portal Active)" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 text-[10px] font-semibold">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Apexium Partner (Portal Active)</span>
                            </span>
                          )}

                          {sch.badgeState === "Directory Listing" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium">
                              <Building className="w-3 h-3 text-slate-400" />
                              <span>Directory Listing</span>
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate mt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <span className="truncate">
                            {[sch.address, sch.city, sch.state].filter(Boolean).join(", ") || "Address on profile"}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Action CTAs: Strictly only renders 'Apply' if hasApplyAction is true */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {sch.hasApplyAction && (
                        <Link
                          id={`school-finder-apply-${sch.slug}`}
                          href={`/s/${sch.slug}/admissions`}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <span>Apply</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}

                      <Link
                        id={`school-finder-portal-${sch.slug}`}
                        href={`/s/${sch.slug}`}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors border border-slate-700 flex items-center gap-1"
                      >
                        <span>{sch.listingStatus === "active_tenant" ? "Portal Gateway" : "View Profile"}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : hasSearched ? (
            <div className="p-6 text-center text-slate-400">
              <p className="text-sm">No schools found matching your search filters.</p>
              <div className="mt-3 flex items-center justify-center gap-3">
                <Link
                  href="/list-school"
                  className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 gap-1"
                >
                  <span>List this school for free →</span>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
