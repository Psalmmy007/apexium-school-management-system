"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden space-y-0">
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <span className="text-slate-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search students, teachers, classes, books, routes... (Cmd/Ctrl + K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full text-slate-900 placeholder:text-slate-400 text-sm font-medium focus:outline-none"
            autoFocus
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-2.5 py-1 rounded-lg"
          >
            ESC
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {loading && <div className="p-4 text-xs text-slate-400 text-center font-medium">Searching ERP entities...</div>}

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
                className="p-3 hover:bg-indigo-50/80 rounded-2xl cursor-pointer transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {item.title}
                  </div>
                  {item.subtitle && <div className="text-[11px] text-slate-500">{item.subtitle}</div>}
                </div>
                <span className="badge-indigo text-[10px] font-bold">{item.type}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
