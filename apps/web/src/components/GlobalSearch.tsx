"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (json.success) {
          setResults(json.data || []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in">
      <div className="bg-slate-900 rounded-3xl shadow-2xl border border-slate-800 w-full max-w-2xl overflow-hidden space-y-0 text-white">
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search students, teachers, classes, books, routes... (Cmd/Ctrl + K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {loading && <div className="p-6 text-xs text-slate-400 text-center font-medium">Searching ERP entities...</div>}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="p-6 text-xs text-slate-500 text-center">No matching entities found for &quot;{query}&quot;.</div>
          )}

          {!loading &&
            results.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  setOpen(false);
                  router.push(item.url);
                }}
                className="p-3 hover:bg-slate-800/60 rounded-2xl cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition">
                    {item.title}
                  </div>
                  {item.subtitle && <div className="text-[11px] text-slate-400">{item.subtitle}</div>}
                </div>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  {item.type}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
