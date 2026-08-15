"use client";

import { useEffect, useState, useCallback } from "react";
import { BackNavigation } from "@/components/ui/BackNavigation";

interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  shelfLocation?: string;
  totalCopies: number;
  availableCopies: number;
}

interface AuditSummary {
  totalBooks: number;
  totalCopies: number;
  availableCopies: number;
  borrowedCopies: number;
  reservedCopies: number;
  damagedCopies: number;
  activeLoans: number;
  overdueLoans: number;
  totalFinesCalculated: number;
}

export default function LibraryDashboardPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [audit, setAudit] = useState<AuditSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // New Book Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [shelfLocation, setShelfLocation] = useState("");
  const [copyCount, setCopyCount] = useState(1);
  const [creating, setCreating] = useState(false);

  const loadLibraryData = useCallback(async () => {
    try {
      setLoading(true);
      const [booksRes, reportsRes] = await Promise.all([
        fetch(`/api/library/books?query=${encodeURIComponent(searchQuery)}`),
        fetch(`/api/library/reports`),
      ]);

      const booksJson = await booksRes.json();
      const reportsJson = await reportsRes.json();

      if (booksJson.success) setBooks(booksJson.data);
      if (reportsJson.success) setAudit(reportsJson.data.audit);
    } catch (err) {
      console.error("Failed loading library data", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadLibraryData();
  }, [loadLibraryData]);

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author) return;
    setCreating(true);

    try {
      const res = await fetch("/api/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          isbn,
          shelfLocation,
          copyCount,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTitle("");
        setAuthor("");
        setIsbn("");
        setShelfLocation("");
        setCopyCount(1);
        setShowAddModal(false);
        loadLibraryData();
      }
    } catch (err) {
      console.error("Error adding book", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back to Dashboard Navigation */}
      <BackNavigation href="/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Library Management System</h1>
          <p className="text-sm text-slate-400">Catalogue books, track physical copies, issue loans, manage returns & overdue fines</p>
        </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition"
          >
            + Add New Book Title
          </button>
        </div>

        {/* Audit Stats */}
        {audit && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Titles</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{audit.totalBooks}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Copies</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{audit.totalCopies}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Available Copies</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{audit.availableCopies}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
              <p className="text-xs text-gray-500 font-semibold uppercase">Active Loans</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{audit.activeLoans}</p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3">
          <input
            type="text"
            placeholder="Search catalogue by title, author, ISBN, or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Book Catalogue Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="font-bold text-gray-900">Book Catalogue</h2>
            <span className="text-xs text-gray-500">{books.length} items found</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading library catalogue...</div>
          ) : books.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No books found in library catalogue.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase text-[11px] font-bold">
                  <tr>
                    <th className="px-6 py-3">Book Title</th>
                    <th className="px-6 py-3">Author</th>
                    <th className="px-6 py-3">ISBN</th>
                    <th className="px-6 py-3">Shelf</th>
                    <th className="px-6 py-3">Total Stock</th>
                    <th className="px-6 py-3">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {books.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/80 transition">
                      <td className="px-6 py-4 font-semibold text-gray-900">{b.title}</td>
                      <td className="px-6 py-4">{b.author}</td>
                      <td className="px-6 py-4 font-mono text-xs">{b.isbn ?? "—"}</td>
                      <td className="px-6 py-4">{b.shelfLocation ?? "Unassigned"}</td>
                      <td className="px-6 py-4 font-bold">{b.totalCopies}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${b.availableCopies > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {b.availableCopies} available
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Book Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="font-bold text-gray-900">Add Book Title & Physical Copies</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>

              <form onSubmit={handleCreateBook} className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-700">Book Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-700">Author *</label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-700">ISBN</label>
                    <input
                      type="text"
                      value={isbn}
                      onChange={(e) => setIsbn(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-gray-700">Shelf Location</label>
                    <input
                      type="text"
                      value={shelfLocation}
                      onChange={(e) => setShelfLocation(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-700">Number of Physical Copies</label>
                  <input
                    type="number"
                    min={1}
                    value={copyCount}
                    onChange={(e) => setCopyCount(parseInt(e.target.value) || 1)}
                    className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm mt-1"
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
                  >
                    {creating ? "Adding..." : "Add Book Title"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );
}
