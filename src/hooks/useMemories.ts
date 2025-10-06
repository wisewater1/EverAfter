import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Memory } from '../types';

export function useMemories(userId: string | undefined) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!userId) {
      setMemories([]);
      setLoading(false);
      return;
    }

    if (!isConfigured) {
      // Demo mode - use mock data
      setMemories([
        {
          id: '1',
          user_id: userId,
          question_id: 'q1',
          question_text: "What's the first thing that brings you joy when you wake up?",
          response: 'The warmth of morning sunlight and the smell of fresh coffee.',
          response_type: 'text',
          category: 'daily',
          personality_aspect: 'emotional_patterns',
          difficulty: 'light',
          time_of_day: 'morning',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: '2',
          user_id: userId,
          question_id: 'q2',
          question_text: 'What motivates you to get out of bed each day?',
          response: 'Knowing that I can make a positive difference in someones life.',
          response_type: 'text',
          category: 'values',
          personality_aspect: 'core_values',
          difficulty: 'medium',
          time_of_day: 'morning',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          updated_at: new Date(Date.now() - 172800000).toISOString(),
        },
      ]);
      setLoading(false);
      return;
    }

    fetchMemories();
  }, [userId, isConfigured]);

  const fetchMemories = async () => {
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMemories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch memories');
    } finally {
      setLoading(false);
    }
  };

  const addMemory = async (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isConfigured) {
      // Demo mode - add to local state
      const newMemory: Memory = {
        ...memory,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMemories((prev) => [newMemory, ...prev]);
      return { data: newMemory, error: null };
    }

    try {
      const { data, error } = await supabase
        .from('memories')
        .insert([memory])
        .select()
        .single();

      if (error) throw error;
      setMemories((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to add memory';
      return { data: null, error };
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!isConfigured) {
      // Demo mode - remove from local state
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      return { error: null };
    }

    try {
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', memoryId);

      if (error) throw error;
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete memory';
      return { error };
    }
  };

  return {
    memories,
    loading,
    error,
    addMemory,
    deleteMemory,
    refreshMemories: fetchMemories,
  };
}
