import React, { useEffect } from 'react';
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
    const { user } = useAuth();
    const { showNotification } = useNotification();

    useEffect(() => {
        if (!user) return;

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
                data.forEach(n => {
                    // Map priority to existing notification types
                    let type: NotificationType = 'info';
                    if (n.priority === 'critical') type = 'error';
                    if (n.priority === 'high') type = 'warning';

                    showNotification(n.message, type, 8000); // Show for longer
                });

                // Mark them as read locally or on server? 
                // For now, we just show them. Ideally we mark them read on server.
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
                (payload) => {
                    const newNotification = payload.new as AgentNotification;

                    let type: NotificationType = 'info';
                    if (newNotification.priority === 'critical') type = 'error';
                    if (newNotification.priority === 'high') type = 'warning';
                    if (newNotification.notification_type === 'success') type = 'success';

                    showNotification(newNotification.message, type, newNotification.priority === 'critical' ? 10000 : 5000);

                    // Optional: Play a sound
                    if (newNotification.priority === 'critical') {
                        try {
                            const audio = new Audio('/sounds/alert.mp3'); // We haven't added this file, so this might fail silently
                            audio.play().catch(() => { });
                        } catch (e) {
                            // Ignore audio errors
                        }
                    }
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    logger.info('HealthAlertListener subscribed');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, showNotification]);

    return null; // Headless component
}
