import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import RemoveButton from './RemoveButton';
import { useAuth } from '../contexts/AuthContext';

export function RemoveConnectionExample() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<any[]>([]);

  const handleRemoveConnection = async (connectionId: string, providerName: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('provider_accounts')
      .delete()
      .eq('id', connectionId)
      .eq('user_id', user.id);

    if (error) throw error;

    setConnections(prev => prev.filter(conn => conn.id !== connectionId));
  };

  return (
    <div className="space-y-4">
      {connections.map(connection => (
        <div key={connection.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <div>
            <h3 className="text-white font-medium">{connection.provider}</h3>
            <p className="text-sm text-slate-400">Connected on {new Date(connection.created_at).toLocaleDateString()}</p>
          </div>
          <RemoveButton
            onRemove={() => handleRemoveConnection(connection.id, connection.provider)}
            itemName={connection.provider}
            itemType="connection"
            confirmationMessage={`Are you sure you want to disconnect ${connection.provider}? You'll need to reconnect to sync data again.`}
            variant="icon"
            size="md"
          />
        </div>
      ))}
    </div>
  );
}

export function RemoveFamilyMemberExample() {
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  const handleRemoveFamilyMember = async (memberId: string, memberName: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('id', memberId)
      .eq('user_id', user.id);

    if (error) throw error;

    setFamilyMembers(prev => prev.filter(member => member.id !== memberId));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {familyMembers.map(member => (
        <div key={member.id} className="relative group bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <RemoveButton
              onRemove={() => handleRemoveFamilyMember(member.id, member.name)}
              itemName={member.name}
              itemType="family member"
              confirmationMessage={`Remove ${member.name} from your family members? Their legacy data will be preserved but they will no longer appear in your dashboard.`}
              variant="icon"
              size="sm"
            />
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold">
              {member.name.charAt(0)}
            </div>
            <h3 className="text-white font-medium">{member.name}</h3>
            <p className="text-sm text-slate-400">{member.relationship}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RemoveHealthGoalExample() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<any[]>([]);

  const handleRemoveGoal = async (goalId: string, goalTitle: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('health_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', user.id);

    if (error) throw error;

    setGoals(prev => prev.filter(goal => goal.id !== goalId));
  };

  return (
    <div className="space-y-3">
      {goals.map(goal => (
        <div key={goal.id} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg border border-slate-700/30 hover:bg-slate-800/50 transition-all">
          <div className="flex-1">
            <h4 className="text-white font-medium">{goal.title}</h4>
            <p className="text-sm text-slate-400 mt-1">{goal.description}</p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-xs text-slate-500">Target: {goal.target_value} {goal.unit}</span>
              <span className="text-xs text-slate-500">Progress: {goal.current_value}/{goal.target_value}</span>
            </div>
          </div>
          <RemoveButton
            onRemove={() => handleRemoveGoal(goal.id, goal.title)}
            itemName={`"${goal.title}"`}
            itemType="health goal"
            variant="icon"
            size="md"
          />
        </div>
      ))}
    </div>
  );
}

export function RemoveEmergencyContactExample() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);

  const handleRemoveContact = async (contactId: string, contactName: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('emergency_contacts')
      .delete()
      .eq('id', contactId)
      .eq('user_id', user.id);

    if (error) throw error;

    setContacts(prev => prev.filter(contact => contact.id !== contactId));
  };

  return (
    <div className="space-y-3">
      {contacts.map(contact => (
        <div key={contact.id} className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/10">
          <div>
            <h4 className="text-white font-medium">{contact.name}</h4>
            <p className="text-sm text-slate-400">{contact.relationship}</p>
            <p className="text-sm text-slate-500">{contact.phone}</p>
          </div>
          <RemoveButton
            onRemove={() => handleRemoveContact(contact.id, contact.name)}
            itemName={contact.name}
            itemType="emergency contact"
            variant="button"
            size="sm"
          />
        </div>
      ))}
    </div>
  );
}

export function RemoveWithoutConfirmationExample() {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);

  const handleQuickRemove = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
          <span className="text-white">{item}</span>
          <RemoveButton
            onRemove={() => handleQuickRemove(index)}
            itemName={item}
            variant="icon"
            size="sm"
            showConfirmation={false}
          />
        </div>
      ))}
    </div>
  );
}

export function RemoveArchetypalAIExample() {
  const { user } = useAuth();
  const [archetypalAIs, setArchetypalAIs] = useState<any[]>([]);

  const handleRemoveAI = async (aiId: string, aiName: string) => {
    if (!user?.id) throw new Error('User not authenticated');

    const { error: conversationsError } = await supabase
      .from('archetypal_conversations')
      .delete()
      .eq('archetypal_ai_id', aiId);

    if (conversationsError) throw conversationsError;

    const { error } = await supabase
      .from('archetypal_ais')
      .delete()
      .eq('id', aiId)
      .eq('user_id', user.id);

    if (error) throw error;

    setArchetypalAIs(prev => prev.filter(ai => ai.id !== aiId));
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {archetypalAIs.map(ai => (
        <div key={ai.id} className="relative group bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 rounded-xl p-6 border border-violet-500/20 hover:border-violet-500/30 transition-all">
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <RemoveButton
              onRemove={() => handleRemoveAI(ai.id, ai.name)}
              itemName={ai.name}
              itemType="AI assistant"
              confirmationMessage={`Are you sure you want to remove ${ai.name}? All conversation history with this AI will be permanently deleted.`}
              variant="icon"
              size="sm"
            />
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-white text-xl">🤖</span>
            </div>
            <h3 className="text-white font-medium">{ai.name}</h3>
            <p className="text-sm text-slate-400 mt-1">{ai.archetype}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
