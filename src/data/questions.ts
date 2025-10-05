// Question categories and their focus areas
export interface Question {
  id: string;
  question: string;
  category: 'values' | 'humor' | 'daily' | 'stories' | 'childhood' | 'family' | 'wisdom' | 'relationships' | 'dreams' | 'challenges';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  personalityAspect: 'core_values' | 'emotional_patterns' | 'social_behavior' | 'decision_making' | 'creativity' | 'resilience' | 'communication_style' | 'life_philosophy';
  difficulty: 'light' | 'medium' | 'deep';
}

export interface DailyQuestionSet {
  day: number;
  questions: Question[];
}

// Sample questions for different times and personality aspects
const questionBank: Question[] = [
  // Morning Questions - Light & Energizing
  {
    id: 'morning_1',
    question: "What's the first thing that brings you joy when you wake up?",
    category: 'daily',
    timeOfDay: 'morning',
    personalityAspect: 'emotional_patterns',
    difficulty: 'light'
  },
  {
    id: 'morning_2',
    question: "How do you like to start your perfect morning?",
    category: 'daily',
    timeOfDay: 'morning',
    personalityAspect: 'life_philosophy',
    difficulty: 'light'
  },
  {
    id: 'morning_3',
    question: "What motivates you to get out of bed each day?",
    category: 'values',
    timeOfDay: 'morning',
    personalityAspect: 'core_values',
    difficulty: 'medium'
  },
  {
    id: 'morning_4',
    question: "Describe your ideal breakfast and who you'd share it with.",
    category: 'relationships',
    timeOfDay: 'morning',
    personalityAspect: 'social_behavior',
    difficulty: 'light'
  },

  // Afternoon Questions - Reflective & Engaging
  {
    id: 'afternoon_1',
    question: "What's a decision you made today that reflects who you are?",
    category: 'values',
    timeOfDay: 'afternoon',
    personalityAspect: 'decision_making',
    difficulty: 'medium'
  },
  {
    id: 'afternoon_2',
    question: "How do you handle unexpected challenges during your day?",
    category: 'challenges',
    timeOfDay: 'afternoon',
    personalityAspect: 'resilience',
    difficulty: 'medium'
  },
  {
    id: 'afternoon_3',
    question: "What's something creative you've done or thought about recently?",
    category: 'dreams',
    timeOfDay: 'afternoon',
    personalityAspect: 'creativity',
    difficulty: 'light'
  },
  {
    id: 'afternoon_4',
    question: "How do you prefer to communicate when something matters to you?",
    category: 'relationships',
    timeOfDay: 'afternoon',
    personalityAspect: 'communication_style',
    difficulty: 'medium'
  },

  // Evening Questions - Deeper & Contemplative
  {
    id: 'evening_1',
    question: "What's a story from your past that shaped who you became?",
    category: 'stories',
    timeOfDay: 'evening',
    personalityAspect: 'core_values',
    difficulty: 'deep'
  },
  {
    id: 'evening_2',
    question: "What wisdom would you want to pass down to future generations?",
    category: 'wisdom',
    timeOfDay: 'evening',
    personalityAspect: 'life_philosophy',
    difficulty: 'deep'
  },
  {
    id: 'evening_3',
    question: "Describe a moment when you felt most authentically yourself.",
    category: 'values',
    timeOfDay: 'evening',
    personalityAspect: 'core_values',
    difficulty: 'deep'
  },
  {
    id: 'evening_4',
    question: "What's a relationship that has profoundly influenced your life?",
    category: 'relationships',
    timeOfDay: 'evening',
    personalityAspect: 'social_behavior',
    difficulty: 'deep'
  },

  // Night Questions - Gentle & Reflective
  {
    id: 'night_1',
    question: "What brings you peace at the end of the day?",
    category: 'daily',
    timeOfDay: 'night',
    personalityAspect: 'emotional_patterns',
    difficulty: 'light'
  },
  {
    id: 'night_2',
    question: "What's a simple pleasure that always makes you smile?",
    category: 'humor',
    timeOfDay: 'night',
    personalityAspect: 'emotional_patterns',
    difficulty: 'light'
  },
  {
    id: 'night_3',
    question: "How do you like to unwind and reflect on your day?",
    category: 'daily',
    timeOfDay: 'night',
    personalityAspect: 'life_philosophy',
    difficulty: 'light'
  },
  {
    id: 'night_4',
    question: "What's a dream or hope you carry with you?",
    category: 'dreams',
    timeOfDay: 'night',
    personalityAspect: 'core_values',
    difficulty: 'medium'
  }
];

// Generate daily question sets
export function generateDailyQuestions(day: number): DailyQuestionSet {
  const seed = day;
  
  // Select questions for each time of day
  const morningQuestions = questionBank.filter(q => q.timeOfDay === 'morning');
  const afternoonQuestions = questionBank.filter(q => q.timeOfDay === 'afternoon');
  const eveningQuestions = questionBank.filter(q => q.timeOfDay === 'evening');
  const nightQuestions = questionBank.filter(q => q.timeOfDay === 'night');
  
  // Use day as seed for consistent but varied selection
  const selectQuestion = (questions: Question[], offset: number) => {
    const index = (seed + offset) % questions.length;
    return questions[index];
  };
  
  return {
    day,
    questions: [
      selectQuestion(morningQuestions, 0),
      selectQuestion(afternoonQuestions, 1),
      selectQuestion(eveningQuestions, 2),
      selectQuestion(nightQuestions, 3)
    ]
  };
}

// Get current time-based question
export function getCurrentTimeQuestion(day: number): Question {
  const dailySet = generateDailyQuestions(day);
  const currentHour = new Date().getHours();
  
  if (currentHour >= 6 && currentHour < 12) {
    return dailySet.questions[0]; // Morning
  } else if (currentHour >= 12 && currentHour < 17) {
    return dailySet.questions[1]; // Afternoon
  } else if (currentHour >= 17 && currentHour < 21) {
    return dailySet.questions[2]; // Evening
  } else {
    return dailySet.questions[3]; // Night
  }
}

// Get all questions for a specific day
export function getQuestionsForDay(day: number): DailyQuestionSet {
  return generateDailyQuestions(day);
}

// Legacy functions for backward compatibility
export function getQuestionByDay(day: number): { question: string } | null {
  const currentQuestion = getCurrentTimeQuestion(day);
  return { question: currentQuestion.question };
}

export function getRandomQuestion(): { question: string } {
  const randomIndex = Math.floor(Math.random() * questionBank.length);
  return { question: questionBank[randomIndex].question };
}

// Get time-appropriate greeting
export function getTimeGreeting(): string {
  const currentHour = new Date().getHours();
  
  if (currentHour >= 6 && currentHour < 12) {
    return "Good morning";
  } else if (currentHour >= 12 && currentHour < 17) {
    return "Good afternoon";
  } else if (currentHour >= 17 && currentHour < 21) {
    return "Good evening";
  } else {
    return "Good night";
  }
}

// Get personality aspect description
export function getPersonalityAspectDescription(aspect: string): string {
  const descriptions = {
    'core_values': 'Exploring your fundamental beliefs and principles',
    'emotional_patterns': 'Understanding your emotional responses and feelings',
    'social_behavior': 'Discovering how you interact with others',
    'decision_making': 'Learning about your thought processes and choices',
    'creativity': 'Uncovering your creative expressions and imagination',
    'resilience': 'Exploring how you overcome challenges and adapt',
    'communication_style': 'Understanding how you express yourself',
    'life_philosophy': 'Discovering your outlook on life and meaning'
  };
  return descriptions[aspect as keyof typeof descriptions] || 'Exploring an aspect of your personality';
}