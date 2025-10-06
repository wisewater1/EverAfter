import React, { useState } from 'react';
import { Calendar, Mic, MessageCircle, Filter, Search, Play, Heart, Star, Clock, Sun, Sunset, Moon, RotateCcw } from 'lucide-react';

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

interface Memory {
  id: string;
  date: string;
  question: string;
  response: string;
  type: 'text' | 'voice' | 'story';
  category: 'values' | 'humor' | 'daily' | 'stories' | 'childhood' | 'family';
  tags: string[];
  duration?: string;
  favorite?: boolean;
}

export function MemoryTimeline() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'category' | 'favorites'>('newest');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const memories: Memory[] = [
    {
      id: '1',
      date: '2024-01-20',
      question: "What's a funny story from your childhood that still makes you laugh?",
      response: "I remember when I was seven, I tried to teach our cat to fetch like a dog. I spent hours throwing a ball, and finally the cat brought me back a dead mouse instead. My mom wasn't thrilled, but I was so proud of my 'successful' training! Looking back, I think the cat was trying to teach me something about expectations versus reality.",
      type: 'text',
      category: 'humor',
      tags: ['childhood', 'pets', 'funny', 'learning'],
      favorite: true
    },
    {
      id: '2',
      date: '2024-01-19',
      question: "What values do you hope your family will always remember about you?",
      response: "Kindness above all else. I've always believed that being kind costs nothing but means everything. I hope they remember how I tried to help others, even in small ways, and that I always chose compassion over being right. The world needs more gentleness, and I hope I modeled that for them.",
      type: 'voice',
      category: 'values',
      tags: ['kindness', 'family', 'legacy', 'compassion'],
      duration: '2:34',
      favorite: true
    },
    {
      id: '3',
      date: '2024-01-18',
      question: "Tell me about a perfect ordinary day in your life.",
      response: "Saturday mornings were my favorite. I'd wake up early, make coffee, and sit on the porch reading while everyone else slept. The quiet was golden - just me, my book, and the birds waking up. Then the family would slowly emerge, and we'd make pancakes together. Nothing fancy, just flour everywhere and laughter filling the kitchen. Those simple moments were everything.",
      type: 'text',
      category: 'daily',
      tags: ['morning', 'family', 'peaceful', 'routine']
    },
    {
      id: '4',
      date: '2024-01-17',
      question: "What's the most important lesson your parents taught you?",
      response: "My father always said, 'Your word is your bond.' He taught me that integrity isn't just about the big moments - it's about keeping every small promise, being on time, doing what you say you'll do. My mother showed me that listening is more powerful than speaking. Together, they taught me that character is built in the quiet moments when no one is watching.",
      type: 'text',
      category: 'family',
      tags: ['parents', 'integrity', 'character', 'wisdom'],
      favorite: false
    }
  ];

  const categories = [
    { key: 'all', label: 'All Memories', color: 'gray', count: memories.length },
    { key: 'values', label: 'Values & Wisdom', color: 'blue', count: memories.filter(m => m.category === 'values').length },
    { key: 'humor', label: 'Joy & Humor', color: 'yellow', count: memories.filter(m => m.category === 'humor').length },
    { key: 'daily', label: 'Daily Life', color: 'green', count: memories.filter(m => m.category === 'daily').length },
    { key: 'family', label: 'Family Stories', color: 'purple', count: memories.filter(m => m.category === 'family').length },
    { key: 'childhood', label: 'Childhood', color: 'pink', count: memories.filter(m => m.category === 'childhood').length }
  ];

  const filteredMemories = memories.filter(memory => {
    const matchesCategory = selectedCategory === 'all' || memory.category === selectedCategory;
    const matchesType = selectedType === 'all' || memory.type === selectedType;
    const matchesDifficulty = selectedDifficulty === 'all' || memory.difficulty === selectedDifficulty;
    const matchesTimeOfDay = selectedTimeOfDay === 'all' || memory.timeOfDay === selectedTimeOfDay;
    const matchesFavorites = !showFavoritesOnly || memory.favorite;
    const matchesSearch = memory.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         memory.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         memory.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    let matchesDateRange = true;
    if (dateRange.start || dateRange.end) {
      const memoryDate = new Date(memory.date);
      if (dateRange.start) {
        matchesDateRange = matchesDateRange && memoryDate >= new Date(dateRange.start);
      }
      if (dateRange.end) {
        matchesDateRange = matchesDateRange && memoryDate <= new Date(dateRange.end);
      }
    }
    
    return matchesCategory && matchesType && matchesDifficulty && matchesTimeOfDay && 
           matchesFavorites && matchesSearch && matchesDateRange;
  });

  // Sort filtered memories
  const sortedMemories = [...filteredMemories].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case 'oldest':
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case 'category':
        return a.category.localeCompare(b.category);
      case 'favorites':
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      default:
        return 0;
    }
  });

  const clearAllFilters = () => {
    setSelectedCategory('all');
    setSelectedType('all');
    setSelectedDifficulty('all');
    setSelectedTimeOfDay('all');
    setDateRange({ start: '', end: '' });
    setSortBy('newest');
    setShowFavoritesOnly(false);
    setSearchTerm('');
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedCategory !== 'all') count++;
    if (selectedType !== 'all') count++;
    if (selectedDifficulty !== 'all') count++;
    if (selectedTimeOfDay !== 'all') count++;
    if (dateRange.start || dateRange.end) count++;
    if (showFavoritesOnly) count++;
    if (searchTerm) count++;
    return count;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'voice': return <Mic className="w-4 h-4" />;
      case 'story': return <MessageCircle className="w-4 h-4" />;
      default: return <DharmaWheel className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    const categoryObj = categories.find(cat => cat.key === category);
    switch (categoryObj?.color) {
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'green': return 'bg-green-100 text-green-800 border-green-200';
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'pink': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryButtonColor = (category: any, isSelected: boolean) => {
    if (isSelected) return 'bg-blue-600 text-white border-blue-600';
    
    switch (category.color) {
      case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'yellow': return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'green': return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
      case 'pink': return 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <DharmaWheel className="w-7 h-7 text-blue-600" />
          <h1 className="text-2xl font-light text-white">Memory Timeline</h1>
        </div>
        <p className="text-gray-300">Precious moments, stories, and wisdom preserved forever</p>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-2xl shadow-sm border border-gray-700/50 p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search memories, questions, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 border border-gray-600 bg-gray-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-all duration-200"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 border ${
              showFilters || getActiveFilterCount() > 0
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {getActiveFilterCount() > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {getActiveFilterCount()}
              </span>
            )}
          </button>
        </div>
        
        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-6">
            {/* Category Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">Category</label>
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${getCategoryButtonColor(category, selectedCategory === category.key)}`}
                  >
                    {category.label}
                    <span className="ml-2 text-xs opacity-75">({category.count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Type and Difficulty Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Response Type</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all', label: 'All Types', count: memories.length },
                    { key: 'text', label: 'Text', count: memories.filter(m => m.type === 'text').length },
                    { key: 'voice', label: 'Voice', count: memories.filter(m => m.type === 'voice').length },
                    { key: 'story', label: 'Story', count: memories.filter(m => m.type === 'story').length }
                  ].map((type) => (
                    <button
                      key={type.key}
                      onClick={() => setSelectedType(type.key)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                        selectedType === type.key
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {type.label} ({type.count})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Time of Day</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'all', label: 'All Times', icon: Clock },
                    { key: 'morning', label: 'Morning', icon: Sun },
                    { key: 'afternoon', label: 'Afternoon', icon: Sun },
                    { key: 'evening', label: 'Evening', icon: Sunset },
                    { key: 'night', label: 'Night', icon: Moon }
                  ].map((time) => (
                    <button
                      key={time.key}
                      onClick={() => setSelectedTimeOfDay(time.key)}
                      className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                        selectedTimeOfDay === time.key
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      <time.icon className="w-3 h-3" />
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Date Range and Sort Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Date Range</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Start date"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="End date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="category">By Category</option>
                  <option value="favorites">Favorites First</option>
                </select>
              </div>
            </div>

            {/* Additional Options */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showFavoritesOnly}
                  onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-300">Show favorites only</span>
              </label>

              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-all duration-200"
              >
                <RotateCcw className="w-4 h-4" />
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-8">
        {sortedMemories.map((memory, index) => (
          <div key={memory.id} className="relative group">
            {/* Timeline line */}
            {index !== sortedMemories.length - 1 && (
              <div className="absolute left-8 top-16 w-px h-full bg-gradient-to-b from-gray-600 to-transparent" />
            )}
            
            <div className="flex gap-6">
              {/* Timeline dot */}
              <div className="flex-shrink-0 relative">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center shadow-md border border-gray-700 group-hover:shadow-lg transition-all duration-300">
                  <div className="text-blue-600">
                    {getTypeIcon(memory.type)}
                  </div>
                </div>
                {memory.favorite && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm">
                    <Star className="w-3 h-3 text-white fill-current" />
                  </div>
                )}
              </div>
              
              {/* Memory content */}
              <div className="flex-1 bg-gray-800 rounded-2xl shadow-sm border border-gray-700/50 overflow-hidden group-hover:shadow-md transition-all duration-300">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        {new Date(memory.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(memory.category)}`}>
                        {categories.find(cat => cat.key === memory.category)?.label}
                      </span>
                      {memory.type === 'voice' && memory.duration && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {memory.duration}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {memory.type === 'voice' && (
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-900/30 text-blue-400 rounded-lg hover:bg-blue-900/50 transition-colors text-sm font-medium">
                          <Play className="w-3 h-3" />
                          Play
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/30">
                        <Heart className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-medium text-white mb-4 leading-relaxed">
                    {memory.question}
                  </h3>
                  
                  <p className="text-gray-300 leading-relaxed mb-6 text-base">
                    {memory.response}
                  </p>
                  
                  <div className="flex gap-2 flex-wrap">
                    {memory.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs font-medium hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedMemories.length === 0 && (
        <div className="text-center py-16">
          <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-medium text-white mb-3">No memories found</h3>
          <p className="text-gray-300 max-w-md mx-auto">
            Try adjusting your search terms or filter criteria to find the memories you're looking for.
          </p>
          {getActiveFilterCount() > 0 && (
            <button
              onClick={clearAllFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}