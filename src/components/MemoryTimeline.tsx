import React, { useState } from 'react';
import { Calendar, Heart, Clock, Filter, Search, Tag } from 'lucide-react';

interface Memory {
  id: string;
  date: string;
  question: string;
  response: string;
  category: string;
  timeOfDay: string;
  mood?: string;
}

const MemoryTimeline: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sample memories data
  const memories: Memory[] = [
    {
      id: '1',
      date: '2024-01-15',
      question: "What's the first thing that brings you joy when you wake up?",
      response: "The sound of birds chirping outside my window and the smell of fresh coffee brewing. There's something magical about those quiet morning moments before the world fully wakes up.",
      category: 'daily',
      timeOfDay: 'morning',
      mood: 'peaceful'
    },
    {
      id: '2',
      date: '2024-01-14',
      question: "What's a story from your past that shaped who you became?",
      response: "When I was 12, my grandmother taught me how to bake her famous apple pie. It wasn't just about the recipe - she shared stories of her own childhood, and I learned that food is love made visible.",
      category: 'stories',
      timeOfDay: 'evening',
      mood: 'nostalgic'
    },
    {
      id: '3',
      date: '2024-01-13',
      question: "How do you handle unexpected challenges during your day?",
      response: "I take a deep breath and remind myself that challenges are opportunities in disguise. I try to break them down into smaller, manageable pieces and tackle them one at a time.",
      category: 'challenges',
      timeOfDay: 'afternoon',
      mood: 'determined'
    }
  ];

  const categories = ['all', 'daily', 'stories', 'challenges', 'relationships', 'dreams'];

  const filteredMemories = memories.filter(memory => {
    const matchesFilter = selectedFilter === 'all' || memory.category === selectedFilter;
    const matchesSearch = memory.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         memory.question.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getTimeIcon = (timeOfDay: string) => {
    switch (timeOfDay) {
      case 'morning': return '🌅';
      case 'afternoon': return '☀️';
      case 'evening': return '🌅';
      case 'night': return '🌙';
      default: return '⏰';
    }
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'peaceful': return 'bg-blue-100 text-blue-700';
      case 'nostalgic': return 'bg-purple-100 text-purple-700';
      case 'determined': return 'bg-green-100 text-green-700';
      case 'joyful': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Memory Timeline</h1>
        <p className="text-gray-600">A journey through your thoughts, stories, and reflections</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search your memories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedFilter(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedFilter === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
              }`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {filteredMemories.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No memories found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          filteredMemories.map((memory, index) => (
            <div key={memory.id} className="relative">
              {/* Timeline Line */}
              {index !== filteredMemories.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-full bg-gradient-to-b from-purple-200 to-transparent"></div>
              )}
              
              {/* Memory Card */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold shadow-lg">
                    <span className="text-lg">{getTimeIcon(memory.timeOfDay)}</span>
                  </div>
                </div>
                
                <div className="flex-1 bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          {new Date(memory.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500 capitalize">{memory.timeOfDay}</span>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">
                        {memory.question}
                      </h3>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {memory.mood && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMoodColor(memory.mood)}`}>
                          {memory.mood}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700`}>
                        {memory.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4">
                    <p className="text-gray-700 leading-relaxed italic">
                      "{memory.response}"
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {memory.timeOfDay}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-4 h-4" />
                        {memory.category}
                      </span>
                    </div>
                    
                    <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600 mb-1">{memories.length}</div>
            <div className="text-sm text-gray-600">Total Memories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {new Set(memories.map(m => m.category)).size}
            </div>
            <div className="text-sm text-gray-600">Categories Explored</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 mb-1">
              {Math.round(memories.reduce((acc, m) => acc + m.response.length, 0) / memories.length)}
            </div>
            <div className="text-sm text-gray-600">Avg. Response Length</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryTimeline;