import React, { createContext, useState, useEffect, useRef, useCallback } from 'react';
import { notificationsAPI } from '../api/notifications';
import { storage } from '../utils/storage';

export const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const connectedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsAPI.getNotifications({ limit: 50 });
      const list = data.notifications || data || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read).length);
    } catch {
      // Use empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  const connectSocket = useCallback(async () => {
    if (connectedRef.current) return;

    try {
      const { io } = await import('socket.io-client');
      const token = await storage.getToken();
      if (!token) return;

      const socket = io('http://localhost:3000', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        connectedRef.current = true;
      });

      socket.on('disconnect', () => {
        connectedRef.current = false;
      });

      socket.on('notification', (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socket.on('claim_update', (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'claim_update',
          title: 'Claim Updated',
          message: `Claim #${data.claimId} status: ${data.status}`,
          read: false,
          createdAt: new Date().toISOString(),
          data,
        };
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socket.on('payment_received', (data) => {
        const notification = {
          id: Date.now().toString(),
          type: 'payment',
          title: 'Payment Received',
          message: `You received a payment of $${data.amount}`,
          read: false,
          createdAt: new Date().toISOString(),
          data,
        };
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socketRef.current = socket;
    } catch (e) {
      console.error('Socket connection failed', e);
    }
  }, []);

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      connectedRef.current = false;
    }
  }, []);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification as read', e);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
    }
  }, []);

  const clearNotification = useCallback(async (notificationId) => {
    try {
      await notificationsAPI.deleteNotification(notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => {
        const removed = notifications.find((n) => n.id === notificationId);
        return removed && !removed.read ? Math.max(0, prev - 1) : prev;
      });
    } catch (e) {
      console.error('Failed to delete notification', e);
    }
  }, [notifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
    connectSocket,
    disconnectSocket,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
