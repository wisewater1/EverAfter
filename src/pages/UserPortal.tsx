import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Users,
  Search,
  Filter,
  MapPin,
  Mail,
  Phone,
  Globe,
  Linkedin,
  Twitter,
  MessageSquare,
  UserPlus,
  Check,
  X,
  ArrowLeft,
  Settings,
  Shield
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string | null;
  phone_number: string | null;
  location: string | null;
  country: string | null;
  interests: string[];
  skills: string[];
  bio: string | null;
  avatar_url: string | null;
  website: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  profile_visibility: string;
  is_verified: boolean;
  last_active_at: string;
  created_at: string;
}

interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  message: string | null;
  created_at: string;
}

export default function UserPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'directory' | 'connections' | 'messages'>('directory');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'directory') {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProfiles(data || []);
      } else if (activeTab === 'connections') {
        const { data, error } = await supabase
          .from('user_connections')
          .select('*')
          .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

        if (error) throw error;
        setConnections(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendConnectionRequest = async (profileId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_connections')
        .insert({
          requester_id: user.id,
          addressee_id: profileId,
          status: 'pending',
        });

      if (error) throw error;

      await supabase.from('user_activity_log').insert({
        user_id: user.id,
        activity_type: 'connection_request',
        description: `Sent connection request to user ${profileId}`,
      });

      alert('Connection request sent!');
      loadData();
    } catch (error: any) {
      console.error('Error sending connection request:', error);
      alert(error.message || 'Failed to send connection request');
    }
  };

  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch =
      profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.bio?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = !locationFilter ||
      profile.location?.toLowerCase().includes(locationFilter.toLowerCase());

    return matchesSearch && matchesLocation && profile.user_id !== user?.id;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">User Portal</h1>
              <p className="text-slate-400">Connect with the EverAfter community</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/portal/profile')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            My Profile
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'directory'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            User Directory
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'connections'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <UserPlus className="w-5 h-5 inline mr-2" />
            My Connections
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'messages'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-5 h-5 inline mr-2" />
            Messages
          </button>
        </div>

        {activeTab === 'directory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users by name, bio..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  placeholder="Filter by location"
                  className="w-full sm:w-64 pl-10 pr-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-16 bg-slate-800/20 rounded-2xl border border-slate-700/50">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No users found</h3>
                <p className="text-slate-400">Try adjusting your search filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfiles.map((profile) => (
                  <UserCard
                    key={profile.id}
                    profile={profile}
                    onConnect={() => handleSendConnectionRequest(profile.user_id)}
                    onViewProfile={() => setSelectedProfile(profile)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'connections' && (
          <ConnectionsTab connections={connections} userId={user?.id || ''} onRefresh={loadData} />
        )}

        {activeTab === 'messages' && (
          <div className="text-center py-16 bg-slate-800/20 rounded-2xl border border-slate-700/50">
            <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">Messaging Coming Soon</h3>
            <p className="text-slate-400">Direct messaging feature will be available shortly</p>
          </div>
        )}

        {selectedProfile && (
          <ProfileModal
            profile={selectedProfile}
            onClose={() => setSelectedProfile(null)}
            onConnect={() => handleSendConnectionRequest(selectedProfile.user_id)}
          />
        )}
      </div>
    </div>
  );
}

interface UserCardProps {
  profile: UserProfile;
  onConnect: () => void;
  onViewProfile: () => void;
}

function UserCard({ profile, onConnect, onViewProfile }: UserCardProps) {
  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg flex-shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover rounded-xl" />
          ) : (
            profile.full_name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-medium text-white truncate">{profile.full_name}</h3>
            {profile.is_verified && (
              <Shield className="w-4 h-4 text-sky-400 flex-shrink-0" title="Verified" />
            )}
          </div>
          {profile.location && (
            <p className="text-sm text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {profile.location}
            </p>
          )}
        </div>
      </div>

      {profile.bio && (
        <p className="text-sm text-slate-300 mb-4 line-clamp-3">{profile.bio}</p>
      )}

      {(profile.interests.length > 0 || profile.skills.length > 0) && (
        <div className="mb-4">
          {profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {profile.interests.slice(0, 3).map((interest, index) => (
                <span key={index} className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-lg border border-amber-500/20">
                  {interest}
                </span>
              ))}
            </div>
          )}
          {profile.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.skills.slice(0, 3).map((skill, index) => (
                <span key={index} className="px-2 py-1 bg-sky-500/10 text-sky-400 text-xs rounded-lg border border-sky-500/20">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onViewProfile}
          className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-white rounded-lg transition-all text-sm"
        >
          View Profile
        </button>
        <button
          onClick={onConnect}
          className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Connect
        </button>
      </div>
    </div>
  );
}

interface ConnectionsTabProps {
  connections: Connection[];
  userId: string;
  onRefresh: () => void;
}

function ConnectionsTab({ connections, userId, onRefresh }: ConnectionsTabProps) {
  const pending = connections.filter(c => c.status === 'pending' && c.addressee_id === userId);
  const accepted = connections.filter(c => c.status === 'accepted');
  const sent = connections.filter(c => c.status === 'pending' && c.requester_id === userId);

  const handleAccept = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error accepting connection:', error);
    }
  };

  const handleReject = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('user_connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Error rejecting connection:', error);
    }
  };

  return (
    <div className="space-y-6">
      {pending.length > 0 && (
        <div className="bg-slate-800/20 rounded-2xl border border-slate-700/50 p-6">
          <h3 className="text-xl font-medium text-white mb-4">Pending Requests ({pending.length})</h3>
          <div className="space-y-3">
            {pending.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between p-4 bg-slate-800/40 rounded-xl">
                <div className="flex-1">
                  <p className="text-white font-medium">Connection request from user</p>
                  <p className="text-slate-400 text-sm">{new Date(connection.created_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAccept(connection.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleReject(connection.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-slate-800/20 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-xl font-medium text-white mb-4">My Connections ({accepted.length})</h3>
        {accepted.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No connections yet. Start connecting with users!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {accepted.map((connection) => (
              <div key={connection.id} className="p-4 bg-slate-800/40 rounded-xl">
                <p className="text-white font-medium">Connected user</p>
                <p className="text-slate-400 text-sm">Connected on {new Date(connection.updated_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
  onConnect: () => void;
}

function ProfileModal({ profile, onClose, onConnect }: ProfileModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-slate-700/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                profile.full_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-white">{profile.full_name}</h2>
                {profile.is_verified && (
                  <Shield className="w-5 h-5 text-sky-400" title="Verified" />
                )}
              </div>
              {profile.display_name && (
                <p className="text-slate-400">@{profile.display_name}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-800/50 hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-6">
          {profile.bio && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">About</h3>
              <p className="text-white">{profile.bio}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.location && (
              <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span className="text-white">{profile.location}</span>
              </div>
            )}
            {profile.phone_number && (
              <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl">
                <Phone className="w-5 h-5 text-slate-400" />
                <span className="text-white">{profile.phone_number}</span>
              </div>
            )}
          </div>

          {profile.interests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest, index) => (
                  <span key={index} className="px-3 py-1 bg-amber-500/10 text-amber-400 text-sm rounded-lg border border-amber-500/20">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {profile.skills.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-sky-500/10 text-sky-400 text-sm rounded-lg border border-sky-500/20">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={onConnect}
              className="flex-1 px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Send Connection Request
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-white rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
