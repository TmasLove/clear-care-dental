import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '../../hooks/useNotifications';
import { formatDateTime } from '../../utils/formatters';
import { colors } from '../../utils/colors';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const NOTIFICATION_ICONS = {
  claim_update: '📋',
  payment: '💰',
  appointment: '📅',
  eligibility: '✅',
  alert: '⚠️',
  info: 'ℹ️',
  default: '🔔',
};

const NotificationItem = ({ notification, onPress, onDelete }) => {
  const icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;

  return (
    <TouchableOpacity
      style={[styles.item, !notification.read && styles.itemUnread]}
      onPress={onPress}
      onLongPress={onDelete}
      activeOpacity={0.8}
    >
      <View style={styles.itemIcon}>
        <Text style={styles.itemIconText}>{icon}</Text>
        {!notification.read && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, !notification.read && styles.itemTitleUnread]}>
          {notification.title || 'Notification'}
        </Text>
        <Text style={styles.itemMessage} numberOfLines={2}>
          {notification.message || notification.body || ''}
        </Text>
        <Text style={styles.itemTime}>
          {formatDateTime(notification.createdAt || notification.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const NotificationsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearNotification,
  } = useNotifications();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handlePress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    // Navigate based on type
    if (notification.type === 'claim_update' && notification.data?.claimId) {
      navigation.navigate('ClaimDetail', { claimId: notification.data.claimId });
    }
  };

  const handleDelete = (notification) => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => clearNotification(notification.id) },
      ]
    );
  };

  const mockNotifications = [
    {
      id: '1',
      type: 'claim_update',
      title: 'Claim Approved',
      message: 'Your claim for Adult Prophylaxis (D1110) has been approved. Insurance pays $116.',
      read: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment Processed',
      message: 'Payment of $71.00 has been processed for your periodic oral evaluation.',
      read: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '3',
      type: 'info',
      title: 'Benefits Reset Reminder',
      message: 'Your annual dental benefits will reset on January 1st. You have $1,160 remaining.',
      read: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: '4',
      type: 'appointment',
      title: 'Appointment Reminder',
      message: 'You have an appointment with Dr. Kim tomorrow at 9:00 AM.',
      read: true,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ];

  const displayNotifications = notifications.length > 0 ? notifications : mockNotifications;

  if (loading) return <LoadingSpinner fullScreen message="Loading notifications..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllRead}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayNotifications}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <NotificationItem
            notification={item}
            onPress={() => handlePress(item)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="🔔"
            title="No Notifications"
            subtitle="You're all caught up! Notifications about your claims and benefits will appear here."
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  markAllRead: {
    fontSize: 14,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
  },
  itemUnread: {
    backgroundColor: '#F0F5FA',
  },
  itemIcon: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  itemIconText: {
    fontSize: 20,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  itemTitleUnread: {
    fontWeight: '800',
  },
  itemMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6,
  },
  itemTime: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 76,
  },
});

export default NotificationsScreen;
