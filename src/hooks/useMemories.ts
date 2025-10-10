import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Memory } from '../types';

export function useMemories(userId: string | undefined) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured] = useState(isSupabaseConfigured());

  const fetchMemories = useCallback(async () => {
    if (!userId) {
      setMemories([]);
      setLoading(false);
      return;
    }

    if (!isConfigured) {
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
          updated_at: new Date(Date.now() - 86400000).toISOString()
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
          updated_at: new Date(Date.now() - 172800000).toISOString()
        }
      ]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('memories')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMemories(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch memories');
    } finally {
      setLoading(false);
    }
  }, [userId, isConfigured]);

  useEffect(() => {
    void fetchMemories();
  }, [fetchMemories]);

  const addMemory = async (memory: Omit<Memory, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isConfigured) {
      const newMemory: Memory = {
        ...memory,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setMemories((prev) => [newMemory, ...prev]);
      return { data: newMemory, error: null };
    }

    try {
      const { data, error: insertError } = await supabase
        .from('memories')
        .insert([memory])
        .select()
        .single();

      if (insertError) throw insertError;
      setMemories((prev) => (data ? [data, ...prev] : prev));
      return { data: data ?? null, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add memory';
      return { data: null, error: message };
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!isConfigured) {
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      return { error: null };
    }

    try {
      const { error: deleteError } = await supabase
        .from('memories')
        .delete()
        .eq('id', memoryId);

      if (deleteError) throw deleteError;
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      return { error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete memory';
      return { error: message };
    }
  };

  return {
    memories,
    loading,
    error,
    addMemory,
    deleteMemory,
    refreshMemories: fetchMemories
  };
}
