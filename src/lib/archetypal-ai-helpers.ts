import { supabase } from './supabase';

export interface PersonalityInsights {
  dominant_traits: string[];
  core_values: string[];
  communication_patterns: string[];
  knowledge_domains: string[];
  emotional_tone: string;
  thinking_style: string;
}

export async function extractPersonalityFromMemories(
  archetypalAIId: string,
  userId: string
): Promise<PersonalityInsights> {
  const { data: responses, error } = await supabase
    .from('daily_question_responses')
    .select(`
      response_text,
      daily_questions:question_id (
        question_text,
        question_category:category_id (category_name)
      )
    `)
    .eq('archetypal_ai_id', archetypalAIId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !responses) {
    return getDefaultPersonality();
  }

  const allText = responses.map(r => r.response_text).join(' ').toLowerCase();

  const traits = analyzeTraits(allText, responses);
  const values = analyzeValues(allText, responses);
  const patterns = analyzeCommunicationPatterns(responses);
  const domains = analyzeKnowledgeDomains(responses);
  const tone = analyzeEmotionalTone(allText);
  const thinking = analyzeThinkingStyle(allText, responses);

  return {
    dominant_traits: traits,
    core_values: values,
    communication_patterns: patterns,
    knowledge_domains: domains,
    emotional_tone: tone,
    thinking_style: thinking,
  };
}

function analyzeTraits(text: string, responses: any[]): string[] {
  const traits: string[] = [];

  const traitIndicators = {
    analytical: ['analyze', 'data', 'logic', 'reason', 'evidence', 'examine', 'systematic'],
    creative: ['imagine', 'create', 'innovative', 'artistic', 'original', 'design'],
    empathetic: ['feel', 'understand', 'compassion', 'care', 'empathy', 'emotions'],
    pragmatic: ['practical', 'realistic', 'efficient', 'useful', 'effective', 'results'],
    philosophical: ['why', 'meaning', 'purpose', 'existence', 'truth', 'wisdom'],
    adventurous: ['explore', 'risk', 'adventure', 'new', 'challenge', 'discovery'],
    cautious: ['careful', 'consider', 'evaluate', 'assess', 'protect', 'security'],
    optimistic: ['hope', 'positive', 'opportunity', 'growth', 'improve', 'better'],
  };

  for (const [trait, keywords] of Object.entries(traitIndicators)) {
    const score = keywords.reduce((sum, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      return sum + (matches ? matches.length : 0);
    }, 0);

    if (score > 3) {
      traits.push(trait);
    }
  }

  return traits.slice(0, 5);
}

function analyzeValues(text: string, responses: any[]): string[] {
  const values: string[] = [];

  const valueIndicators = {
    integrity: ['honest', 'truth', 'authentic', 'genuine', 'transparent', 'ethical'],
    growth: ['learn', 'grow', 'develop', 'improve', 'evolve', 'progress'],
    connection: ['relationship', 'connect', 'together', 'community', 'family', 'bond'],
    independence: ['freedom', 'autonomous', 'self', 'independent', 'choice', 'liberty'],
    achievement: ['success', 'accomplish', 'achieve', 'goal', 'win', 'excel'],
    compassion: ['help', 'care', 'kindness', 'support', 'empathy', 'service'],
    knowledge: ['knowledge', 'wisdom', 'understand', 'learn', 'insight', 'education'],
    security: ['safe', 'secure', 'stable', 'protect', 'certainty', 'reliable'],
  };

  for (const [value, keywords] of Object.entries(valueIndicators)) {
    const score = keywords.reduce((sum, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = text.match(regex);
      return sum + (matches ? matches.length : 0);
    }, 0);

    if (score > 2) {
      values.push(value);
    }
  }

  return values.slice(0, 5);
}

function analyzeCommunicationPatterns(responses: any[]): string[] {
  const patterns: string[] = [];

  const avgLength = responses.reduce((sum, r) => sum + r.response_text.length, 0) / responses.length;

  if (avgLength > 500) {
    patterns.push('detailed and thorough');
  } else if (avgLength < 150) {
    patterns.push('concise and direct');
  } else {
    patterns.push('balanced and clear');
  }

  const hasQuestions = responses.some(r => r.response_text.includes('?'));
  if (hasQuestions) {
    patterns.push('inquisitive and engaging');
  }

  const hasExamples = responses.some(r =>
    r.response_text.toLowerCase().includes('example') ||
    r.response_text.toLowerCase().includes('for instance')
  );
  if (hasExamples) {
    patterns.push('illustrative storyteller');
  }

  return patterns;
}

function analyzeKnowledgeDomains(responses: any[]): string[] {
  const domains: string[] = [];

  const domainKeywords = {
    'finance & business': ['money', 'invest', 'business', 'financial', 'market', 'economy'],
    'technology': ['tech', 'software', 'digital', 'computer', 'system', 'code'],
    'psychology & emotions': ['feel', 'emotion', 'mental', 'psychology', 'behavior', 'mind'],
    'philosophy & ethics': ['philosophy', 'ethics', 'moral', 'meaning', 'existence', 'truth'],
    'health & wellness': ['health', 'wellness', 'fitness', 'medical', 'body', 'exercise'],
    'relationships': ['relationship', 'family', 'friend', 'love', 'connection', 'people'],
    'creativity & arts': ['art', 'creative', 'design', 'music', 'write', 'express'],
    'science': ['science', 'research', 'study', 'experiment', 'data', 'theory'],
  };

  const allText = responses.map(r => r.response_text).join(' ').toLowerCase();

  for (const [domain, keywords] of Object.entries(domainKeywords)) {
    const score = keywords.reduce((sum, keyword) => {
      const regex = new RegExp(keyword, 'gi');
      const matches = allText.match(regex);
      return sum + (matches ? matches.length : 0);
    }, 0);

    if (score > 2) {
      domains.push(domain);
    }
  }

  return domains.slice(0, 4);
}

function analyzeEmotionalTone(text: string): string {
  const toneScores = {
    warm: 0,
    analytical: 0,
    enthusiastic: 0,
    reflective: 0,
    formal: 0,
  };

  if (text.includes('!')) toneScores.enthusiastic += 5;
  if (text.match(/[.]{3}/)) toneScores.reflective += 3;

  const warmWords = ['love', 'care', 'feel', 'heart', 'joy', 'happy', 'appreciate'];
  warmWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'gi'));
    if (matches) toneScores.warm += matches.length;
  });

  const analyticalWords = ['analyze', 'consider', 'evaluate', 'assess', 'examine', 'study'];
  analyticalWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'gi'));
    if (matches) toneScores.analytical += matches.length;
  });

  const reflectiveWords = ['think', 'reflect', 'ponder', 'contemplate', 'wonder', 'realize'];
  reflectiveWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'gi'));
    if (matches) toneScores.reflective += matches.length;
  });

  const maxScore = Math.max(...Object.values(toneScores));
  const dominantTone = Object.entries(toneScores).find(([_, score]) => score === maxScore)?.[0] || 'balanced';

  return dominantTone;
}

function analyzeThinkingStyle(text: string, responses: any[]): string {
  const styles = {
    'strategic planner': 0,
    'intuitive explorer': 0,
    'logical analyzer': 0,
    'creative synthesizer': 0,
  };

  const strategicWords = ['plan', 'strategy', 'goal', 'steps', 'organize', 'systematic'];
  strategicWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'gi'));
    if (matches) styles['strategic planner'] += matches.length;
  });

  const intuitiveWords = ['feel', 'sense', 'intuition', 'instinct', 'vibe', 'gut'];
  intuitiveWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'gi'));
    if (matches) styles['intuitive explorer'] += matches.length;
  });

  const logicalWords = ['logic', 'reason', 'evidence', 'proof', 'rational', 'analyze'];
  logicalWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'gi'));
    if (matches) styles['logical analyzer'] += matches.length;
  });

  const creativeWords = ['imagine', 'create', 'innovative', 'original', 'unique', 'synthesize'];
  creativeWords.forEach(word => {
    const matches = text.match(new RegExp(word, 'gi'));
    if (matches) styles['creative synthesizer'] += matches.length;
  });

  const maxScore = Math.max(...Object.values(styles));
  return Object.entries(styles).find(([_, score]) => score === maxScore)?.[0] || 'balanced thinker';
}

function getDefaultPersonality(): PersonalityInsights {
  return {
    dominant_traits: ['thoughtful', 'authentic', 'curious'],
    core_values: ['growth', 'understanding', 'integrity'],
    communication_patterns: ['balanced and clear'],
    knowledge_domains: ['general knowledge'],
    emotional_tone: 'warm',
    thinking_style: 'balanced thinker',
  };
}

export async function updateAIPersonalityProfile(
  archetypalAIId: string,
  userId: string
): Promise<void> {
  const insights = await extractPersonalityFromMemories(archetypalAIId, userId);

  await supabase
    .from('archetypal_ais')
    .update({
      personality_traits: insights.dominant_traits,
      core_values: insights.core_values,
      communication_style: `${insights.emotional_tone} and ${insights.communication_patterns[0] || 'engaging'}`,
    })
    .eq('id', archetypalAIId)
    .eq('user_id', userId);
}

export async function capturePersonalitySnapshot(
  archetypalAIId: string
): Promise<void> {
  const { data, error } = await supabase.rpc('capture_personality_snapshot', {
    p_archetypal_ai_id: archetypalAIId,
  });

  if (error) {
    console.error('Error capturing personality snapshot:', error);
  }
}

export async function getFoundationalQuestions(
  archetypalAIId: string
): Promise<string[]> {
  const { data: responses } = await supabase
    .from('daily_question_responses')
    .select(`
      daily_questions:question_id (
        question_text
      )
    `)
    .eq('archetypal_ai_id', archetypalAIId)
    .order('created_at', { ascending: true })
    .limit(10);

  if (!responses) return [];

  return responses
    .map((r: any) => r.daily_questions?.question_text)
    .filter(Boolean);
}
