"use client";

import { useEffect, useState } from "react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function StudentNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const res = await fetch("/api/student/notifications");
        const json = await res.json();
        if (json.success) {
          setNotifications(json.data);
        }
      } catch (err) {
        console.error("Failed to load notifications", err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/student/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Failed marking notification read", err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Notification Centre</h1>
        <p className="text-sm text-gray-500">View assignment reminders, CBT alerts, and school notices</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="p-8 bg-gray-50 rounded-xl text-center border border-gray-200 text-gray-500">
          You have no notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition flex justify-between items-start ${
                item.isRead ? "bg-white border-gray-200" : "bg-indigo-50/50 border-indigo-200 shadow-xs"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-gray-900">{item.title}</span>
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {item.type}
                  </span>
                </div>
                <p className="text-xs text-gray-600">{item.message}</p>
                <p className="text-[10px] text-gray-400">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              {!item.isRead && (
                <button
                  onClick={() => markAsRead(item.id)}
                  className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-100/60 rounded transition"
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
