"use client";

import { useState } from "react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  audienceType: string;
  status: string;
  createdAt: string;
}

interface NotificationTemplate {
  id: string;
  name: string;
  code: string;
  channel: string;
  subjectTemplate: string;
  bodyTemplate: string;
  active: boolean;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  channel: string;
  recipientRole: string;
  status: string;
  sentAt: string;
  readAt?: string;
}

interface Analytics {
  totalSent: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  deliveryRate: number;
  readRate: number;
  channelBreakdown: { in_app: number; email: number; sms: number; push: number };
  totalAnnouncements: number;
}

interface Props {
  initialAnnouncements: Announcement[];
  initialTemplates: NotificationTemplate[];
  initialNotifications: NotificationItem[];
  initialAnalytics: Analytics;
  userRole: string;
}

const defaultAnalytics = {
  totalSent: 0,
  deliveredCount: 0,
  readCount: 0,
  failedCount: 0,
  deliveryRate: 100,
  readRate: 0,
  channelBreakdown: { in_app: 0, email: 0, sms: 0, push: 0 },
  totalAnnouncements: 0,
};

export function CommunicationClient({
  initialAnnouncements,
  initialTemplates,
  initialNotifications,
  initialAnalytics,
  userRole,
}: Props) {
  const [activeTab, setActiveTab] = useState<"announcements" | "queue" | "templates" | "eventbus" | "analytics">("announcements");

  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [templates, setTemplates] = useState<NotificationTemplate[]>(initialTemplates);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [analytics] = useState<Analytics>(initialAnalytics || defaultAnalytics);

  // Modals
  const [showAnnModal, setShowAnnModal] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annAudience, setAnnAudience] = useState("all");

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventType, setEventType] = useState("FEE_REMINDER");
  const [studentName, setStudentName] = useState("David Okafor");
  const [feeAmount, setFeeAmount] = useState("120000");

  const [loading, setLoading] = useState(false);

  const handlePublishAnnouncement = async () => {
    if (!annTitle.trim() || !annContent.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/communication/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          audienceType: annAudience,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAnnouncements((prev) => [json.data, ...prev]);
        setShowAnnModal(false);
        setAnnTitle("");
        setAnnContent("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFireDomainEvent = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/communication/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType,
          payload: {
            student_name: studentName,
            fee_amount: feeAmount,
            due_date: "15th August 2026",
            date: "Today",
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowEventModal(false);
        // Refresh notifications
        const notifRes = await fetch("/api/communication/notifications");
        const notifJson = await notifRes.json();
        if (notifJson.success) setNotifications(notifJson.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const res = await fetch("/api/communication/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notifId }),
      });
      const json = await res.json();
      if (json.success) {
        setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, status: "Read" } : n)));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-lg">📢</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Announcements</p>
            <h3 className="text-xl font-bold text-slate-900">{announcements.length}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-bold text-lg">💬</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Total Notifications</p>
            <h3 className="text-xl font-bold text-slate-900">{analytics.totalSent}</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-lg">🚀</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Delivery Rate</p>
            <h3 className="text-xl font-bold text-blue-700">{analytics.deliveryRate}%</h3>
          </div>
        </div>

        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-lg">👁️</div>
          <div>
            <p className="text-[11px] text-slate-500 font-semibold uppercase">Read Rate</p>
            <h3 className="text-xl font-bold text-purple-700">{analytics.readRate}%</h3>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: "announcements", label: "Announcements Manager", icon: "📢" },
          { id: "queue", label: "Delivery Queue & Logs", icon: "📬" },
          { id: "templates", label: "Notification Templates", icon: "📝" },
          { id: "eventbus", label: "Event Bus & Triggers", icon: "⚡" },
          { id: "analytics", label: "Delivery Analytics", icon: "📊" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            className={`px-4 py-2 font-semibold rounded-lg flex items-center gap-1.5 transition whitespace-nowrap ${
              activeTab === t.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 1. ANNOUNCEMENTS TAB */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">School Announcements</h3>
              <p className="text-xs text-slate-500">Publish school-wide, class-specific, department-specific, staff, parent, or student broadcasts.</p>
            </div>
            {userRole === "admin" && (
              <button type="button" onClick={() => setShowAnnModal(true)} className="btn-primary btn-sm text-xs">
                + Publish Announcement
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.length === 0 ? (
              <div className="col-span-full py-8 text-center bg-slate-50 rounded-xl text-slate-400 text-xs">
                No announcements published yet.
              </div>
            ) : (
              announcements.map((a) => (
                <div key={a.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-sm text-slate-900">{a.title}</strong>
                    <span className="badge-indigo capitalize">{a.audienceType}</span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{a.content}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-200">
                    <span>Category: {a.category}</span>
                    <span>{new Date(a.createdAt).toLocaleDateString("en-NG")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 2. DELIVERY QUEUE & LOGS TAB */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sent Notifications & Delivery Logs</h3>
              <p className="text-xs text-slate-500">Multi-channel delivery log (In-App, Email, SMS, Push) with read receipts.</p>
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Channel</th>
                  <th>Recipient Role</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      No notifications recorded.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.id}>
                      <td className="text-xs font-semibold text-slate-900">{n.title}</td>
                      <td className="text-xs text-indigo-700 font-mono capitalize">{n.channel.replace(/_/g, " ")}</td>
                      <td className="text-xs text-slate-600 capitalize">{n.recipientRole}</td>
                      <td>
                        <span className={`badge ${n.status === "Read" ? "badge-success" : n.status === "Sent" ? "badge-info" : "badge-neutral"}`}>
                          {n.status}
                        </span>
                      </td>
                      <td className="font-mono text-xs text-slate-500">{new Date(n.sentAt).toLocaleTimeString("en-NG")}</td>
                      <td>
                        {n.status !== "Read" && (
                          <button type="button" onClick={() => handleMarkAsRead(n.id)} className="btn-ghost btn-xs text-[10px]">
                            Mark Read
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. NOTIFICATION TEMPLATES TAB */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notification Templates</h3>
              <p className="text-xs text-slate-500">Dynamic templates supporting placeholders (`{`student_name`}`, `{`fee_amount`}`, `{`due_date`}`).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-slate-900">{t.name}</strong>
                  <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{t.code}</span>
                </div>
                <p className="text-slate-700 font-semibold text-xs">Subject: {t.subjectTemplate}</p>
                <p className="text-slate-500 text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-200">{t.bodyTemplate}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. EVENT BUS & TRIGGERS TAB */}
      {activeTab === "eventbus" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Event-Driven Event Bus & Triggers</h3>
              <p className="text-xs text-slate-500">Simulate system domain events (`FEE_REMINDER`, `STUDENT_ABSENT`, `REPORT_CARD_READY`) to test event-driven notifications.</p>
            </div>
            <button type="button" onClick={() => setShowEventModal(true)} className="btn-primary btn-sm text-xs">
              ⚡ Emit Domain Event
            </button>
          </div>

          <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl space-y-4 font-mono text-xs shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-emerald-400 font-bold">● EVENT BUS LISTENER ACTIVE</span>
              <span className="text-slate-400">Subscribed: 6 Event Handlers</span>
            </div>
            <div className="space-y-2 text-slate-300">
              <p>➜ <span className="text-indigo-400">FEE_REMINDER</span> ➔ Renders template & broadcasts in-app fee alert</p>
              <p>➜ <span className="text-rose-400">STUDENT_ABSENT</span> ➔ Renders absence alert & sends notification</p>
              <p>➜ <span className="text-amber-400">REPORT_CARD_READY</span> ➔ Triggers term report availability notice</p>
              <p>➜ <span className="text-blue-400">ASSIGNMENT_DUE</span> ➔ Dispatches homework assignment due date alert</p>
            </div>
          </div>
        </div>
      )}

      {/* 5. DELIVERY ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Delivery & Engagement Analytics</h3>
              <p className="text-xs text-slate-500">Channel distribution and engagement metrics.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">In-App Messages</p>
              <h4 className="text-xl font-bold text-indigo-700">{analytics.channelBreakdown?.in_app || 0}</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Email Sent</p>
              <h4 className="text-xl font-bold text-slate-900">{analytics.channelBreakdown?.email || 0}</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">SMS Sent</p>
              <h4 className="text-xl font-bold text-slate-900">{analytics.channelBreakdown?.sms || 0}</h4>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-1">
              <p className="text-[11px] text-slate-500 font-semibold uppercase">Push Sent</p>
              <h4 className="text-xl font-bold text-slate-900">{analytics.channelBreakdown?.push || 0}</h4>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Publish Announcement */}
      {showAnnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Publish Broadcast Announcement</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Announcement Title *</label>
                <input type="text" placeholder="e.g. End of Term Resumption Notice" value={annTitle} onChange={(e) => setAnnTitle(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Target Audience *</label>
                <select value={annAudience} onChange={(e) => setAnnAudience(e.target.value)} className="input">
                  <option value="all">All School (Parents, Students, Staff)</option>
                  <option value="parents">Parents Only</option>
                  <option value="students">Students Only</option>
                  <option value="teachers">Teachers & Staff Only</option>
                </select>
              </div>
              <div>
                <label className="label">Content Body *</label>
                <textarea rows={4} placeholder="Type announcement text here..." value={annContent} onChange={(e) => setAnnContent(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowAnnModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handlePublishAnnouncement} disabled={loading || !annTitle.trim()} className="btn-primary btn-sm">
                {loading ? "Publishing..." : "Publish Broadcast"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Emit Domain Event */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-slide-up">
            <h3 className="text-base font-bold text-slate-900">Emit Domain Event (Event Bus)</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="label">Event Code *</label>
                <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="input">
                  <option value="FEE_REMINDER">FEE_REMINDER — Fee Payment Notice</option>
                  <option value="STUDENT_ABSENT">STUDENT_ABSENT — Absence Alert</option>
                  <option value="REPORT_CARD_READY">REPORT_CARD_READY — Report Card Ready</option>
                  <option value="ASSIGNMENT_DUE">ASSIGNMENT_DUE — Homework Assignment</option>
                </select>
              </div>
              <div>
                <label className="label">Student Name Placeholder *</label>
                <input type="text" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Fee Amount (₦) *</label>
                <input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} className="input" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEventModal(false)} className="btn-ghost btn-sm">
                Cancel
              </button>
              <button type="button" onClick={handleFireDomainEvent} disabled={loading} className="btn-primary btn-sm">
                {loading ? "Emitting..." : "Emit Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
