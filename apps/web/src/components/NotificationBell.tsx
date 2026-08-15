"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  channel: string;
  status: string;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/communication/notifications");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setNotifications(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => n.status !== "Read").length;

  const handleMarkRead = async (notifId: string) => {
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
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none cursor-pointer"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-slate-400 hover:text-white transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 shadow-2xl border border-slate-800 z-50 overflow-hidden animate-slide-up">
          <div className="p-3 bg-slate-950 border-b border-slate-800 text-white flex items-center justify-between text-xs">
            <span className="font-bold">Notifications</span>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              {unreadCount} Unread
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 text-xs">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">No notifications yet.</div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id)}
                  className={`p-3 space-y-1 cursor-pointer transition ${
                    n.status !== "Read" ? "bg-slate-800/50 hover:bg-slate-800 text-white" : "hover:bg-slate-800/30 text-slate-400 opacity-80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <strong className="text-white font-semibold">{n.title}</strong>
                    {n.status !== "Read" && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                  </div>
                  <p className="text-slate-400 text-[11px] line-clamp-2">{n.message}</p>
                  <span className="text-[9px] text-slate-500 block font-mono">
                    {new Date(n.createdAt).toLocaleTimeString("en-NG")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
