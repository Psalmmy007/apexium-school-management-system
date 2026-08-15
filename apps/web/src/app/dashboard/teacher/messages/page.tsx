"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquarePlus } from "lucide-react";
import { BackNavigation } from "@/components/ui/BackNavigation";
import type { MessageThread, Message } from "@apexium/types";

interface StudentItem {
  id: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
}

interface GuardianItem {
  parentId: string;
  firstName: string;
  lastName: string;
  email: string;
  relationship: string;
}

export default function TeacherMessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [activeThread, setActiveThread] = useState<MessageThread | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState<string>("");

  const [loadingThreads, setLoadingThreads] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  // New Thread Modal
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [guardians, setGuardians] = useState<GuardianItem[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [newSubject, setNewSubject] = useState<string>("");
  const [newInitialMessage, setNewInitialMessage] = useState<string>("");

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await fetch("/api/teacher/messages");
      const json = await res.json();
      if (json.success && json.data) {
        setThreads(json.data);
      }
    } catch (e) {
      console.error("Failed fetching message threads", e);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleSelectThread = async (thread: MessageThread) => {
    setActiveThread(thread);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/teacher/messages?threadId=${thread.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        setActiveMessages(json.data.messages || []);
        fetchThreads(); // Refresh unread badges
      }
    } catch (e) {
      console.error("Failed loading thread messages", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendReply = async () => {
    if (!activeThread || !replyText.trim()) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/teacher/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send-message",
          threadId: activeThread.id,
          content: replyText,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setReplyText("");
        handleSelectThread(activeThread);
      } else {
        setMessage({ type: "error", text: json.error || "Failed to send message." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error sending reply." });
    } finally {
      setSending(false);
    }
  };

  // Open New Thread Modal & Fetch Students
  const handleOpenCreateModal = async () => {
    setShowCreateModal(true);
    try {
      const res = await fetch("/api/students");
      const json = await res.json();
      if (json.success) {
        setStudents(json.data || []);
      }
    } catch (e) {
      console.error("Failed fetching students list", e);
    }
  };

  // Fetch Linked Guardians when Student is Selected
  const handleSelectStudent = async (stId: string) => {
    setSelectedStudentId(stId);
    setSelectedParentId("");
    setGuardians([]);
    if (!stId) return;

    try {
      const res = await fetch(`/api/teacher/guardians?studentId=${stId}`);
      const json = await res.json();
      if (json.success) {
        setGuardians(json.data || []);
        if (json.data && json.data.length > 0) {
          setSelectedParentId(json.data[0].parentId);
        }
      }
    } catch (e) {
      console.error("Failed fetching guardians", e);
    }
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newInitialMessage) {
      setMessage({ type: "error", text: "Please fill in all required fields." });
      return;
    }

    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/teacher/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-thread",
          studentId: selectedStudentId || undefined,
          parentId: selectedParentId || undefined,
          subject: newSubject,
          initialMessage: newInitialMessage,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Conversation thread started successfully!" });
        setShowCreateModal(false);
        setNewSubject("");
        setNewInitialMessage("");
        fetchThreads();
      } else {
        setMessage({ type: "error", text: json.error || "Failed to start thread." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Network error starting conversation." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back to Teacher Dashboard Navigation */}
      <BackNavigation href="/dashboard/teacher" label="Back to Teacher Dashboard" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Parent & Admin Messaging</h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure, tenant-isolated message threads tied to verified student guardian relationships.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Conversation Thread</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Main Grid: Inbox Left & Chat Thread Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inbox Column */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3 h-[600px] flex flex-col">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">
            Inbox Threads
          </h2>

          <div className="flex-1 overflow-y-auto space-y-2">
            {loadingThreads ? (
              <div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading threads...</div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No active message threads.</div>
            ) : (
              threads.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectThread(t)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                    activeThread?.id === t.id
                      ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold"
                      : "bg-slate-50 border-slate-200/80 hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold truncate max-w-[180px]">{t.subject}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(t.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block mt-1">Status: {t.status}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conversation Thread Column */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-[600px] flex flex-col justify-between">
          {!activeThread ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">
              Select a message thread from the left to view conversation.
            </div>
          ) : (
            <>
              {/* Thread Header */}
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">{activeThread.subject}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Thread ID: {activeThread.id}</p>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 my-4 bg-slate-50 rounded-xl border border-slate-100">
                {loadingMessages ? (
                  <div className="text-center text-xs text-slate-400 py-8">Loading messages...</div>
                ) : (
                  activeMessages.map((m) => (
                    <div key={m.id} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span className="font-bold text-slate-700">Sender ID: {m.senderId}</span>
                        <span>{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line">{m.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Input */}
              <div className="pt-2 flex gap-3">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  placeholder="Type message reply..."
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-sm disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Thread Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Start Message Thread</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Student (Optional)</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleSelectStudent(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                >
                  <option value="">Select Student...</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              {guardians.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Linked Guardian</label>
                  <select
                    value={selectedParentId}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  >
                    {guardians.map((g) => (
                      <option key={g.parentId} value={g.parentId}>
                        {g.firstName} {g.lastName} ({g.relationship} — {g.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="e.g. Academic Progress Update"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Initial Message *</label>
                <textarea
                  required
                  rows={4}
                  value={newInitialMessage}
                  onChange={(e) => setNewInitialMessage(e.target.value)}
                  placeholder="Type message text..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm disabled:opacity-50"
                >
                  {sending ? "Creating..." : "Start Thread"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
