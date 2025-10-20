export interface AITrainingQuestion {
  id: string;
  question: string;
  category: 'personality' | 'communication' | 'values' | 'preferences' | 'history' | 'relationships';
  purpose: string;
}

export const aiTrainingQuestions: AITrainingQuestion[] = [
  {
    id: 'pers_1',
    question: "How would you describe your general personality? (e.g., outgoing, reserved, humorous, serious)",
    category: 'personality',
    purpose: 'Establishes core personality traits'
  },
  {
    id: 'pers_2',
    question: "What are your most distinctive mannerisms or habits?",
    category: 'personality',
    purpose: 'Captures unique behavioral patterns'
  },
  {
    id: 'pers_3',
    question: "How do you typically express emotions? (e.g., openly, subtly, through humor)",
    category: 'personality',
    purpose: 'Defines emotional expression style'
  },
  {
    id: 'comm_1',
    question: "What phrases or expressions do you use frequently?",
    category: 'communication',
    purpose: 'Captures speech patterns and vocabulary'
  },
  {
    id: 'comm_2',
    question: "How do you typically greet people or start conversations?",
    category: 'communication',
    purpose: 'Establishes conversation initiation style'
  },
  {
    id: 'comm_3',
    question: "What's your communication style when giving advice? (e.g., direct, gentle, storytelling)",
    category: 'communication',
    purpose: 'Defines advisory approach'
  },
  {
    id: 'comm_4',
    question: "How do you respond when someone shares good news?",
    category: 'communication',
    purpose: 'Captures celebratory response style'
  },
  {
    id: 'comm_5',
    question: "How do you comfort someone who's upset?",
    category: 'communication',
    purpose: 'Defines empathetic response patterns'
  },
  {
    id: 'val_1',
    question: "What are your most important values in life?",
    category: 'values',
    purpose: 'Establishes core value system'
  },
  {
    id: 'val_2',
    question: "What principles do you believe should guide decisions?",
    category: 'values',
    purpose: 'Defines decision-making framework'
  },
  {
    id: 'val_3',
    question: "What matters most to you in relationships?",
    category: 'values',
    purpose: 'Captures relationship priorities'
  },
  {
    id: 'pref_1',
    question: "What are your favorite topics to discuss?",
    category: 'preferences',
    purpose: 'Identifies preferred conversation themes'
  },
  {
    id: 'pref_2',
    question: "What activities or hobbies bring you the most joy?",
    category: 'preferences',
    purpose: 'Establishes interests and passions'
  },
  {
    id: 'pref_3',
    question: "How do you prefer to spend your time?",
    category: 'preferences',
    purpose: 'Defines lifestyle preferences'
  },
  {
    id: 'hist_1',
    question: "What are some defining moments or experiences in your life?",
    category: 'history',
    purpose: 'Captures formative life events'
  },
  {
    id: 'hist_2',
    question: "What stories do you love to tell about your past?",
    category: 'history',
    purpose: 'Identifies memorable narratives'
  },
  {
    id: 'hist_3',
    question: "What lessons have you learned that you want to share?",
    category: 'history',
    purpose: 'Establishes wisdom and teachings'
  },
  {
    id: 'rel_1',
    question: "How do you typically interact with family members?",
    category: 'relationships',
    purpose: 'Defines family interaction style'
  },
  {
    id: 'rel_2',
    question: "What role do you usually take in group settings? (e.g., leader, supporter, mediator)",
    category: 'relationships',
    purpose: 'Establishes social dynamics'
  },
  {
    id: 'rel_3',
    question: "How do you show love and affection to those you care about?",
    category: 'relationships',
    purpose: 'Captures expression of care'
  }
];

export function getQuestionsByCategory(category: string): AITrainingQuestion[] {
  return aiTrainingQuestions.filter(q => q.category === category);
}

export function getRandomQuestions(count: number): AITrainingQuestion[] {
  const shuffled = [...aiTrainingQuestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
