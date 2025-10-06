import React, { useState, useEffect } from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, 
  MessageCircle, Calendar, Book, Heart, Star, Camera,
  Settings, Share2, Download, Clock, MapPin, Users,
  Mic, Video, Phone, Mail, Gift, Music, Image,
  ChevronLeft, ChevronRight, X, Search, Filter
} from 'lucide-react';

// Dharma Wheel SVG Component
const DharmaWheel = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="6" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="16.24" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="7.76" x2="4.93" y2="4.93" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

interface MemorialService {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  category: 'communication' | 'memories' | 'experiences' | 'legacy';
  isActive: boolean;
  lastUsed?: string;
  usageCount: number;
}

interface Memory {
  id: string;
  title: string;
  type: 'photo' | 'video' | 'audio' | 'story' | 'letter';
  date: string;
  content: string;
  thumbnail?: string;
  duration?: string;
  tags: string[];
}

interface VirtualExperience {
  id: string;
  name: string;
  type: 'place' | 'event' | 'conversation' | 'activity';
  description: string;
  thumbnail: string;
  duration: string;
  participants: string[];
  isAvailable: boolean;
}

export function MemorialEnvironment() {
  const [activeTab, setActiveTab] = useState<'home' | 'memories' | 'experiences' | 'communication' | 'legacy'>('home');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<VirtualExperience | null>(null);
  const [activeService, setActiveService] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const memorialServices: MemorialService[] = [
    {
      id: 'voice-chat',
      name: 'Voice Conversation',
      icon: Mic,
      description: 'Have a natural conversation using their preserved voice patterns',
      category: 'communication',
      isActive: true,
      lastUsed: '2 hours ago',
      usageCount: 47
    },
    {
      id: 'video-call',
      name: 'Video Presence',
      icon: Video,
      description: 'Experience their presence through AI-generated video interactions',
      category: 'communication',
      isActive: true,
      lastUsed: '1 day ago',
      usageCount: 23
    },
    {
      id: 'memory-sharing',
      name: 'Memory Sharing',
      icon: Heart,
      description: 'Share and discuss cherished memories together',
      category: 'memories',
      isActive: true,
      lastUsed: '3 hours ago',
      usageCount: 89
    },
    {
      id: 'story-telling',
      name: 'Story Time',
      icon: Book,
      description: 'Listen to their favorite stories and life experiences',
      category: 'memories',
      isActive: true,
      lastUsed: '5 hours ago',
      usageCount: 156
    },
    {
      id: 'virtual-visits',
      name: 'Virtual Visits',
      icon: MapPin,
      description: 'Visit meaningful places together in virtual reality',
      category: 'experiences',
      isActive: true,
      lastUsed: '1 week ago',
      usageCount: 12
    },
    {
      id: 'music-sessions',
      name: 'Music Together',
      icon: Music,
      description: 'Listen to their favorite songs and musical memories',
      category: 'experiences',
      isActive: true,
      lastUsed: '6 hours ago',
      usageCount: 78
    },
    {
      id: 'wisdom-keeper',
      name: 'Wisdom Keeper',
      icon: Star,
      description: 'Access their advice and wisdom for life decisions',
      category: 'legacy',
      isActive: true,
      lastUsed: '2 days ago',
      usageCount: 34
    },
    {
      id: 'legacy-letters',
      name: 'Legacy Letters',
      icon: Mail,
      description: 'Receive personalized messages for special occasions',
      category: 'legacy',
      isActive: true,
      lastUsed: '1 month ago',
      usageCount: 8
    }
  ];

  const memories: Memory[] = [
    {
      id: '1',
      title: 'Family Vacation to the Beach',
      type: 'video',
      date: '2023-07-15',
      content: 'A wonderful day building sandcastles and watching the sunset together.',
      duration: '3:42',
      tags: ['family', 'vacation', 'beach', 'summer']
    },
    {
      id: '2',
      title: 'Grandmother\'s Recipe Stories',
      type: 'audio',
      date: '2023-05-20',
      content: 'Stories about cooking traditional family recipes passed down through generations.',
      duration: '12:18',
      tags: ['cooking', 'family', 'traditions', 'recipes']
    },
    {
      id: '3',
      title: 'Wedding Day Memories',
      type: 'photo',
      date: '1987-06-12',
      content: 'Beautiful moments from their wedding day, full of love and joy.',
      tags: ['wedding', 'love', 'celebration', 'milestone']
    },
    {
      id: '4',
      title: 'Life Advice Letter',
      type: 'letter',
      date: '2023-12-01',
      content: 'A heartfelt letter with wisdom and guidance for future generations.',
      tags: ['wisdom', 'advice', 'legacy', 'family']
    }
  ];

  const virtualExperiences: VirtualExperience[] = [
    {
      id: '1',
      name: 'Childhood Home Visit',
      type: 'place',
      description: 'Walk through their childhood home and hear stories about growing up',
      thumbnail: 'https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '15-30 min',
      participants: ['You', 'AI Presence'],
      isAvailable: true
    },
    {
      id: '2',
      name: 'Family Dinner Conversation',
      type: 'event',
      description: 'Recreate a typical family dinner with stories and laughter',
      thumbnail: 'https://images.pexels.com/photos/3184183/pexels-photo-3184183.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '45-60 min',
      participants: ['Family Members', 'AI Presence'],
      isAvailable: true
    },
    {
      id: '3',
      name: 'Garden Walk & Talk',
      type: 'activity',
      description: 'Stroll through their favorite garden while discussing life',
      thumbnail: 'https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '20-40 min',
      participants: ['You', 'AI Presence'],
      isAvailable: true
    },
    {
      id: '4',
      name: 'Birthday Celebration',
      type: 'event',
      description: 'Celebrate their birthday with virtual cake and memories',
      thumbnail: 'https://images.pexels.com/photos/1729808/pexels-photo-1729808.jpeg?auto=compress&cs=tinysrgb&w=400',
      duration: '30-45 min',
      participants: ['Family Members', 'AI Presence'],
      isAvailable: false
    }
  ];

  const handleServiceClick = (service: MemorialService) => {
    setActiveService(service.id);
    setShowServiceModal(true);
  };

  const handleMemoryClick = (memory: Memory) => {
    setSelectedMemory(memory);
  };

  const handleExperienceClick = (experience: VirtualExperience) => {
    if (experience.isAvailable) {
      setSelectedExperience(experience);
    }
  };

  const startService = (serviceId: string) => {
    console.log(`Starting service: ${serviceId}`);
    setShowServiceModal(false);
    // Here you would integrate with actual AI services
  };

  const filteredServices = memorialServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || service.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredMemories = memories.filter(memory => 
    memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    memory.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredExperiences = virtualExperiences.filter(experience =>
    experience.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    experience.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderHomeTab = () => (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center mb-12">
        <div className="w-32 h-32 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center shadow-2xl">
          <DharmaWheel className="w-16 h-16 text-white" />
        </div>
        <h1 className="text-3xl font-light text-white mb-4">Welcome to the Memorial Space</h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto leading-relaxed">
          Connect with cherished memories and experience their presence through our interactive memorial environment.
        </p>
        <div className="mt-6 text-sm text-gray-400">
          Last visit: {currentTime.toLocaleDateString()} at {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {memorialServices.slice(0, 4).map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceClick(service)}
            className="group bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700/50 hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 text-left"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
              <service.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{service.name}</h3>
            <p className="text-gray-400 text-sm mb-4">{service.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Used {service.usageCount} times</span>
              <span>{service.lastUsed}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Memories */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium text-white">Recent Memories</h2>
          <button
            onClick={() => setActiveTab('memories')}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            View All →
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memories.slice(0, 3).map((memory) => (
            <button
              key={memory.id}
              onClick={() => handleMemoryClick(memory)}
              className="group bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700/50 hover:shadow-xl hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 text-left"
            >
              <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                {memory.type === 'video' && <Video className="w-8 h-8 text-white" />}
                {memory.type === 'audio' && <Music className="w-8 h-8 text-white" />}
                {memory.type === 'photo' && <Image className="w-8 h-8 text-white" />}
                {memory.type === 'letter' && <Mail className="w-8 h-8 text-white" />}
              </div>
              <div className="p-4">
                <h3 className="text-white font-medium mb-2 group-hover:text-purple-300 transition-colors">
                  {memory.title}
                </h3>
                <p className="text-gray-400 text-sm mb-3">{memory.content}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(memory.date).toLocaleDateString()}</span>
                  {memory.duration && <span>{memory.duration}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMemoriesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-white">Memory Collection</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMemories.map((memory) => (
          <button
            key={memory.id}
            onClick={() => handleMemoryClick(memory)}
            className="group bg-gray-800 rounded-xl overflow-hidden shadow-lg border border-gray-700/50 hover:shadow-xl hover:border-purple-500/50 transition-all duration-300 hover:-translate-y-1 text-left"
          >
            <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center relative">
              {memory.type === 'video' && <Video className="w-12 h-12 text-white" />}
              {memory.type === 'audio' && <Music className="w-12 h-12 text-white" />}
              {memory.type === 'photo' && <Image className="w-12 h-12 text-white" />}
              {memory.type === 'letter' && <Mail className="w-12 h-12 text-white" />}
              {memory.duration && (
                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  {memory.duration}
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-white font-medium mb-2 group-hover:text-purple-300 transition-colors">
                {memory.title}
              </h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">{memory.content}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <span>{new Date(memory.date).toLocaleDateString()}</span>
                <span className="capitalize">{memory.type}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {memory.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderExperiencesTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-white">Virtual Experiences</h2>
        <div className="text-sm text-gray-400">
          {virtualExperiences.filter(e => e.isAvailable).length} of {virtualExperiences.length} available
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredExperiences.map((experience) => (
          <button
            key={experience.id}
            onClick={() => handleExperienceClick(experience)}
            disabled={!experience.isAvailable}
            className={`group text-left rounded-xl overflow-hidden shadow-lg border transition-all duration-300 ${
              experience.isAvailable
                ? 'bg-gray-800 border-gray-700/50 hover:shadow-xl hover:border-green-500/50 hover:-translate-y-1'
                : 'bg-gray-900 border-gray-800 opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="aspect-video relative overflow-hidden">
              <img
                src={experience.thumbnail}
                alt={experience.name}
                className={`w-full h-full object-cover transition-transform duration-300 ${
                  experience.isAvailable ? 'group-hover:scale-105' : 'grayscale'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 text-white text-sm mb-2">
                  <Clock className="w-4 h-4" />
                  {experience.duration}
                </div>
                <div className="flex items-center gap-2 text-white text-sm">
                  <Users className="w-4 h-4" />
                  {experience.participants.join(', ')}
                </div>
              </div>
              {!experience.isAvailable && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-white text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2" />
                    <div className="text-sm">Coming Soon</div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className={`font-medium mb-2 transition-colors ${
                experience.isAvailable ? 'text-white group-hover:text-green-300' : 'text-gray-400'
              }`}>
                {experience.name}
              </h3>
              <p className="text-gray-400 text-sm mb-3">{experience.description}</p>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  experience.type === 'place' ? 'bg-blue-900/50 text-blue-300' :
                  experience.type === 'event' ? 'bg-purple-900/50 text-purple-300' :
                  experience.type === 'conversation' ? 'bg-green-900/50 text-green-300' :
                  'bg-orange-900/50 text-orange-300'
                }`}>
                  {experience.type}
                </span>
                {experience.isAvailable && (
                  <div className="text-green-400 text-xs font-medium">Available Now</div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCommunicationTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-light text-white">Communication Services</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredServices.filter(s => s.category === 'communication').map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceClick(service)}
            className="group bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700/50 hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-2 group-hover:text-blue-300 transition-colors">
                  {service.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{service.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Used {service.usageCount} times</span>
                  <span>Last used {service.lastUsed}</span>
                </div>
                <div className="mt-3">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    service.isActive ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${service.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                    {service.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderLegacyTab = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-light text-white">Legacy Services</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredServices.filter(s => s.category === 'legacy').map((service) => (
          <button
            key={service.id}
            onClick={() => handleServiceClick(service)}
            className="group bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700/50 hover:shadow-xl hover:border-yellow-500/50 transition-all duration-300 hover:-translate-y-1 text-left"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-600 to-orange-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <service.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white mb-2 group-hover:text-yellow-300 transition-colors">
                  {service.name}
                </h3>
                <p className="text-gray-400 text-sm mb-4">{service.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Used {service.usageCount} times</span>
                  <span>Last used {service.lastUsed}</span>
                </div>
                <div className="mt-3">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                    service.isActive ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${service.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                    {service.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900/30">
      {/* Header */}
      <div className="bg-gray-800/95 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DharmaWheel className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-light bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Memorial Environment
                </h1>
                <p className="text-xs text-gray-400 -mt-0.5">Interactive Memorial Space</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-700"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-700"
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { key: 'home', label: 'Home', icon: DharmaWheel },
              { key: 'memories', label: 'Memories', icon: Heart },
              { key: 'experiences', label: 'Experiences', icon: MapPin },
              { key: 'communication', label: 'Communication', icon: MessageCircle },
              { key: 'legacy', label: 'Legacy', icon: Star }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                  activeTab === tab.key
                    ? 'text-blue-400 border-blue-400'
                    : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'home' && renderHomeTab()}
        {activeTab === 'memories' && renderMemoriesTab()}
        {activeTab === 'experiences' && renderExperiencesTab()}
        {activeTab === 'communication' && renderCommunicationTab()}
        {activeTab === 'legacy' && renderLegacyTab()}
      </div>

      {/* Service Modal */}
      {showServiceModal && activeService && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full">
            <div className="p-6">
              {(() => {
                const service = memorialServices.find(s => s.id === activeService);
                if (!service) return null;
                
                return (
                  <>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                        <service.icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-white">{service.name}</h3>
                        <p className="text-sm text-gray-400">Ready to start</p>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-6">{service.description}</p>
                    
                    <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">Usage Statistics</span>
                        <span className="text-white">{service.usageCount} sessions</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-400">Last Used</span>
                        <span className="text-white">{service.lastUsed}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-gray-400">Status</span>
                        <span className={`${service.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {service.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => startService(service.id)}
                        disabled={!service.isActive}
                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        Start Session
                      </button>
                      <button
                        onClick={() => setShowServiceModal(false)}
                        className="px-4 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Memory Modal */}
      {selectedMemory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white">{selectedMemory.title}</h3>
                <button
                  onClick={() => setSelectedMemory(null)}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center mb-6">
                {selectedMemory.type === 'video' && <Video className="w-16 h-16 text-white" />}
                {selectedMemory.type === 'audio' && <Music className="w-16 h-16 text-white" />}
                {selectedMemory.type === 'photo' && <Image className="w-16 h-16 text-white" />}
                {selectedMemory.type === 'letter' && <Mail className="w-16 h-16 text-white" />}
                
                {selectedMemory.type === 'video' && (
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors rounded-xl"
                  >
                    {isPlaying ? <Pause className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white" />}
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">{selectedMemory.content}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{new Date(selectedMemory.date).toLocaleDateString()}</span>
                  {selectedMemory.duration && <span>{selectedMemory.duration}</span>}
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  {selectedMemory.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors">
                    <Heart className="w-4 h-4" />
                    Favorite
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experience Modal */}
      {selectedExperience && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-white">{selectedExperience.name}</h3>
                <button
                  onClick={() => setSelectedExperience(null)}
                  className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="aspect-video rounded-xl overflow-hidden mb-6">
                <img
                  src={selectedExperience.thumbnail}
                  alt={selectedExperience.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">{selectedExperience.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Clock className="w-4 h-4" />
                    Duration: {selectedExperience.duration}
                  </div>
                  <div className="flex items-center gap-2 text-gray-400">
                    <Users className="w-4 h-4" />
                    Participants: {selectedExperience.participants.length}
                  </div>
                </div>
                
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Participants</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedExperience.participants.map((participant) => (
                      <span key={participant} className="px-3 py-1 bg-gray-600 text-gray-300 rounded-full text-sm">
                        {participant}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      console.log(`Starting experience: ${selectedExperience.id}`);
                      setSelectedExperience(null);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200"
                  >
                    Start Experience
                  </button>
                  <button
                    onClick={() => setSelectedExperience(null)}
                    className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}