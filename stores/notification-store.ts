import { create } from "zustand";

interface NotificationEvent {
  id: string;
  type: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: Date;
  read: boolean;
}

interface NotificationStore {
  notifications: NotificationEvent[];
  unreadCount: number;
  connected: boolean;
  addNotification: (event: Omit<NotificationEvent, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  setConnected: (connected: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  connected: false,

  addNotification: (event) =>
    set((state) => {
      const notification: NotificationEvent = {
        ...event,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
        read: false,
      };
      const notifications = [notification, ...state.notifications].slice(0, 50);
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  setConnected: (connected) => set({ connected }),
}));
