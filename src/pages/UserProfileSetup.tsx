import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Save,
  User,
  MapPin,
  Phone,
  Globe,
  Linkedin,
  Twitter,
  Mail,
  Plus,
  X,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

interface UserProfile {
  user_id: string;
  full_name: string;
  display_name: string;
  phone_number: string;
  location: string;
  country: string;
  interests: string[];
  skills: string[];
  bio: string;
  avatar_url: string;
  website: string;
  linkedin_url: string;
  twitter_url: string;
  profile_visibility: 'public' | 'connections' | 'private';
  allow_messages: boolean;
  allow_connection_requests: boolean;
}

export default function UserProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    full_name: '',
    display_name: '',
    phone_number: '',
    location: '',
    country: '',
    interests: [],
    skills: [],
    bio: '',
    avatar_url: '',
    website: '',
    linkedin_url: '',
    twitter_url: '',
    profile_visibility: 'public',
    allow_messages: true,
    allow_connection_requests: true,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            ...profile,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            ...profile,
            user_id: user.id,
          });

        if (error) throw error;
      }

      await supabase.from('user_activity_log').insert({
        user_id: user.id,
        activity_type: 'profile_update',
        description: 'Updated profile information',
      });

      alert('Profile saved successfully!');
      navigate('/portal');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      alert(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests?.includes(newInterest.trim())) {
      setProfile({
        ...profile,
        interests: [...(profile.interests || []), newInterest.trim()],
      });
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setProfile({
      ...profile,
      interests: profile.interests?.filter(i => i !== interest) || [],
    });
  };

  const addSkill = () => {
    if (newSkill.trim() && !profile.skills?.includes(newSkill.trim())) {
      setProfile({
        ...profile,
        skills: [...(profile.skills || []), newSkill.trim()],
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfile({
      ...profile,
      skills: profile.skills?.filter(s => s !== skill) || [],
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/portal')}
              className="w-10 h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">My Profile</h1>
              <p className="text-slate-400">Manage your public profile information</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-medium text-white mb-6">Basic Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={profile.display_name || ''}
                  onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  placeholder="johndoe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profile.phone_number || ''}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={profile.location || ''}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  placeholder="San Francisco, CA"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bio
                </label>
                <textarea
                  value={profile.bio || ''}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  placeholder="Tell others about yourself..."
                />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-medium text-white mb-6">Interests & Skills</h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Interests
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                    placeholder="Add an interest..."
                  />
                  <button
                    onClick={addInterest}
                    className="px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.interests?.map((interest, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm rounded-lg border border-amber-500/20 flex items-center gap-2"
                    >
                      {interest}
                      <button onClick={() => removeInterest(interest)} className="hover:text-amber-300">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Skills
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                    placeholder="Add a skill..."
                  />
                  <button
                    onClick={addSkill}
                    className="px-4 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.skills?.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-sky-500/10 text-sky-400 text-sm rounded-lg border border-sky-500/20 flex items-center gap-2"
                    >
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-sky-300">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
            <h2 className="text-xl font-medium text-white mb-6">Privacy Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Profile Visibility
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'public', label: 'Public', desc: 'Anyone can view your profile' },
                    { value: 'connections', label: 'Connections Only', desc: 'Only your connections can view' },
                    { value: 'private', label: 'Private', desc: 'Only you can view' },
                  ].map((option) => (
                    <label key={option.value} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl cursor-pointer hover:bg-slate-800/60 transition-all">
                      <input
                        type="radio"
                        name="visibility"
                        value={option.value}
                        checked={profile.profile_visibility === option.value}
                        onChange={(e) => setProfile({ ...profile, profile_visibility: e.target.value as any })}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-white font-medium">{option.label}</p>
                        <p className="text-slate-400 text-sm">{option.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl">
                <div>
                  <p className="text-white font-medium">Allow Messages</p>
                  <p className="text-slate-400 text-sm">Other users can send you messages</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.allow_messages}
                  onChange={(e) => setProfile({ ...profile, allow_messages: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl">
                <div>
                  <p className="text-white font-medium">Allow Connection Requests</p>
                  <p className="text-slate-400 text-sm">Other users can send connection requests</p>
                </div>
                <input
                  type="checkbox"
                  checked={profile.allow_connection_requests}
                  onChange={(e) => setProfile({ ...profile, allow_connection_requests: e.target.checked })}
                  className="w-5 h-5"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
