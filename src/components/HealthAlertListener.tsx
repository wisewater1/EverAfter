import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNotification, NotificationType } from '../contexts/NotificationContext';
import { logger } from '../lib/logger';

interface AgentNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    notification_type: string;
    priority: string;
    is_read: boolean;
    created_at: string;
}

export default function HealthAlertListener() {
    const { user, isDemoMode } = useAuth();
    const { showNotification } = useNotification();

    useEffect(() => {
        if (!user || isDemoMode) return;

        // Best-effort server-side read receipt so alerts don't re-fire on every
        // mount. Failures are non-user-facing: the alert itself was already shown.
        const markNotificationsRead = (ids: string[]) => {
            if (ids.length === 0) return;
            supabase
                .from('agent_notifications')
                .update({ is_read: true, read_at: new Date().toISOString() })
                .in('id', ids)
                // Two argument then rather than then().catch(): the query
                // builder is declared as a PromiseLike, which has no catch, so
                // the rejection handler goes here. Both branches only log.
                .then(
                    ({ error }: { error: { message?: string } | null }) => {
                        if (error) console.warn('Failed to mark notifications as read:', error);
                    },
                    (err: unknown) => {
                        console.warn('Failed to mark notifications as read:', err);
                    },
                );
        };

        // 1. Fetch unread notifications on mount
        const fetchUnread = async () => {
            const { data, error } = await supabase
                .from('agent_notifications')
                .select('*')
                .eq('user_id', user.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(5);

            if (error) {
                console.error('Error fetching unread notifications:', error);
                return;
            }

            if (data && data.length > 0) {
                const unread = data as AgentNotification[];
                unread.forEach(n => {
                    // Map priority to existing notification types. The table's
                    // CHECK constraint uses 'urgent' as the top priority.
                    let type: NotificationType = 'info';
                    if (n.priority === 'urgent' || n.priority === 'critical') type = 'error';
                    if (n.priority === 'high') type = 'warning';

                    showNotification(n.message, type, 8000); // Show for longer
                });

                // Mark the shown notifications as read on the server.
                markNotificationsRead(unread.map(n => n.id));
            }
        };

        fetchUnread();

        // 2. Subscribe to new notifications
        const channel = supabase
            .channel('public:agent_notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'agent_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: { new: AgentNotification }) => {
                    const newNotification = payload.new;

                    let type: NotificationType = 'info';
                    if (newNotification.priority === 'urgent' || newNotification.priority === 'critical') type = 'error';
                    if (newNotification.priority === 'high') type = 'warning';
                    if (newNotification.notification_type === 'success') type = 'success';

                    const isUrgent = newNotification.priority === 'urgent' || newNotification.priority === 'critical';
                    showNotification(newNotification.message, type, isUrgent ? 10000 : 5000);

                    // Mark the shown notification as read on the server.
                    markNotificationsRead([newNotification.id]);
                }
            )
            .subscribe((status: string) => {
                if (status === 'SUBSCRIBED') {
                    logger.info('HealthAlertListener subscribed');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isDemoMode, showNotification]);

    return null; // Headless component
}
