import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface DashboardStats {
  memoriesCount: number;
  familyMembersCount: number;
  pendingInvitationsCount: number;
  privacyScore: number;
  daysCompleted: number;
  daysRemaining: number;
  memoriesThisWeek: number;
}

interface FamilyMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastActive: string;
}

interface RecentActivity {
  action: string;
  user: string;
  time: string;
  type: string;
}

const demoStats: DashboardStats = {
  memoriesCount: 247,
  familyMembersCount: 2,
  pendingInvitationsCount: 1,
  privacyScore: 100,
  daysCompleted: 89,
  daysRemaining: 365 - 89,
  memoriesThisWeek: 12
};

const demoFamilyMembers: FamilyMember[] = [
  {
    id: 'demo-primary',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    role: 'Primary',
    status: 'active',
    lastActive: '2 hours ago'
  },
  {
    id: 'demo-family',
    name: 'Michael Johnson',
    email: 'michael@example.com',
    role: 'Family',
    status: 'active',
    lastActive: '1 day ago'
  },
  {
    id: 'demo-pending',
    name: 'Emma Johnson',
    email: 'emma@example.com',
    role: 'Family',
    status: 'pending',
    lastActive: 'Never'
  }
];

const demoRecentActivities: RecentActivity[] = [
  { action: 'Memory recorded', user: 'Sarah', time: '2 hours ago', type: 'story' },
  { action: 'Privacy settings updated', user: 'Michael', time: '1 day ago', type: 'settings' },
  { action: 'Family member invited', user: 'Sarah', time: '3 days ago', type: 'invite' }
];

const supabaseEnabled = isSupabaseConfigured();

export function useDashboard(userId: string | undefined) {
  const [stats, setStats] = useState<DashboardStats>({
    memoriesCount: 0,
    familyMembersCount: 0,
    pendingInvitationsCount: 0,
    privacyScore: 100,
    daysCompleted: 0,
    daysRemaining: 365,
    memoriesThisWeek: 0
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyDemoState = useCallback(() => {
    setStats({ ...demoStats });
    setFamilyMembers([...demoFamilyMembers]);
    setRecentActivities([...demoRecentActivities]);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!userId || !supabaseEnabled) {
      applyDemoState();
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [
        memoriesResult,
        familyMembersResult,
        profileResult
      ] = await Promise.all([
        supabase
          .from('memories')
          .select('id, created_at', { count: 'exact' })
          .eq('user_id', userId),
        supabase
          .from('family_members')
          .select('*')
          .eq('user_id', userId),
        supabase
          .from('profiles')
          .select('created_at')
          .eq('id', userId)
          .maybeSingle()
      ]);

      if (memoriesResult.error) throw memoriesResult.error;
      if (familyMembersResult.error) throw familyMembersResult.error;
      if (profileResult.error) throw profileResult.error;

      const memoriesCount = memoriesResult.count || 0;
      const memories = memoriesResult.data || [];

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const memoriesThisWeek = memories.filter(m =>
        new Date(m.created_at) >= oneWeekAgo
      ).length;

      const familyData = familyMembersResult.data || [];
      const activeFamilyMembers = familyData.filter(m => m.status === 'active');
      const pendingInvitations = familyData.filter(m => m.status === 'pending');

      const createdAt = profileResult.data?.created_at;
      let daysCompleted = 0;
      if (createdAt) {
        const created = new Date(createdAt);
        const now = new Date();
        daysCompleted = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      }

      setStats({
        memoriesCount,
        familyMembersCount: activeFamilyMembers.length,
        pendingInvitationsCount: pendingInvitations.length,
        privacyScore: 100,
        daysCompleted: Math.min(daysCompleted, 365),
        daysRemaining: Math.max(365 - daysCompleted, 0),
        memoriesThisWeek
      });

      setFamilyMembers(
        familyData.map(member => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          status: member.status,
          lastActive: member.last_active
            ? formatTimeAgo(new Date(member.last_active))
            : 'Never'
        }))
      );

      const recentMemories = memories
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

      setRecentActivities(
        recentMemories.map(memory => ({
          action: 'Memory recorded',
          user: 'You',
          time: formatTimeAgo(new Date(memory.created_at)),
          type: 'story'
        }))
      );

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [userId, applyDemoState]);

  useEffect(() => {
    if (!userId) {
      if (!supabaseEnabled) {
        applyDemoState();
      }
      setLoading(false);
      return;
    }

    void fetchDashboardData();
  }, [userId, fetchDashboardData, applyDemoState]);

  async function saveMemory(questionId: string, questionText: string, response: string): Promise<void> {
    if (!userId || !supabaseEnabled) {
      setStats(prev => ({
        ...prev,
        memoriesCount: prev.memoriesCount + 1,
        memoriesThisWeek: prev.memoriesThisWeek + 1
      }));

      setRecentActivities(prev => [
        {
          action: 'Memory recorded',
          user: 'You',
          time: 'just now',
          type: 'story'
        },
        ...prev
      ].slice(0, 5));

      return;
    }

    const { error } = await supabase
      .from('memories')
      .insert({
        user_id: userId,
        question_id: questionId,
        question_text: questionText,
        response: response,
        response_type: 'text',
        category: 'daily',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await fetchDashboardData();
  }

  async function inviteFamilyMember(email: string, name: string, role: string = 'family'): Promise<void> {
    if (!userId || !supabaseEnabled) {
      const pendingMember: FamilyMember = {
        id: `demo-${Date.now()}`,
        name,
        email,
        role,
        status: 'pending',
        lastActive: 'Never'
      };

      setFamilyMembers(prev => [...prev, pendingMember]);
      setStats(prev => ({
        ...prev,
        pendingInvitationsCount: prev.pendingInvitationsCount + 1
      }));

      return;
    }

    const { error } = await supabase
      .from('family_members')
      .insert({
        user_id: userId,
        email,
        name,
        role,
        status: 'pending',
        invited_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await fetchDashboardData();
  }

  return {
    stats,
    familyMembers,
    recentActivities,
    loading,
    error,
    saveMemory,
    inviteFamilyMember,
    refreshData: fetchDashboardData
  };
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
}
