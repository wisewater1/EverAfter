import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, User, Brain, Sparkles, RefreshCw, Info, Users, Zap, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ArchetypalAI {
  id: string;
  name: string;
  description: string;
  personality_traits: string[];
  core_values: string[];
  communication_style: string;
  foundational_questions: any[];
  readiness_score: number;
  total_memories: number;
  interaction_count: number;
  avatar_url?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  ai_name?: string;
  ai_id?: string;
  timestamp: Date;
  metadata?: any;
}

interface ConversationMode {
  type: 'single' | 'dual';
  selectedAI?: ArchetypalAI;
}

interface ArchetypalAIChatProps {
  preselectedAIId?: string;
}

export default function ArchetypalAIChat({ preselectedAIId }: ArchetypalAIChatProps = {}) {
  const { user } = useAuth();
  const [archetypalAIs, setArchetypalAIs] = useState<ArchetypalAI[]>([]);
  const [mode, setMode] = useState<ConversationMode>({ type: 'single' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFoundationalQuestions, setShowFoundationalQuestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadArchetypalAIs();
    }
  }, [user]);

  useEffect(() => {
    if (preselectedAIId && archetypalAIs.length > 0) {
      const selectedAI = archetypalAIs.find(ai => ai.id === preselectedAIId);
      if (selectedAI) {
        setMode({ type: 'single', selectedAI });
      }
    }
  }, [preselectedAIId, archetypalAIs]);

  useEffect(() => {
    if (mode.selectedAI && mode.selectedAI.readiness_score >= 50) {
      initializeChat();
    } else if (mode.type === 'dual' && archetypalAIs.length >= 2) {
      initializeDualChat();
    }
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadArchetypalAIs() {
    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setArchetypalAIs(data || []);

      if (data && data.length > 0) {
        setMode({ type: 'single', selectedAI: data[0] });
      }
    } catch (error) {
      console.error('Error loading Archetypal AIs:', error);
    }
  }

  function initializeChat() {
    if (!mode.selectedAI) return;

    const introMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `You're now conversing with **${mode.selectedAI.name}**`,
      timestamp: new Date(),
    };

    const aiIntro: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'ai',
      ai_name: mode.selectedAI.name,
      ai_id: mode.selectedAI.id,
      content: generateIntroduction(mode.selectedAI),
      timestamp: new Date(),
    };

    setMessages([introMessage, aiIntro]);
  }

  function initializeDualChat() {
    if (archetypalAIs.length < 2) return;

    const introMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'system',
      content: `**Dual Perspective Mode** - Both ${archetypalAIs[0].name} and ${archetypalAIs[1].name} will respond to your questions`,
      timestamp: new Date(),
    };

    const ai1Intro: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'ai',
      ai_name: archetypalAIs[0].name,
      ai_id: archetypalAIs[0].id,
      content: `Hello! I'm ${archetypalAIs[0].name}. ${archetypalAIs[0].description}`,
      timestamp: new Date(),
    };

    const ai2Intro: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'ai',
      ai_name: archetypalAIs[1].name,
      ai_id: archetypalAIs[1].id,
      content: `Greetings! I'm ${archetypalAIs[1].name}. ${archetypalAIs[1].description}`,
      timestamp: new Date(),
    };

    setMessages([introMessage, ai1Intro, ai2Intro]);
  }

  function generateIntroduction(ai: ArchetypalAI): string {
    const traits = ai.personality_traits?.slice(0, 3).join(', ') || 'thoughtful, engaging';
    const values = ai.core_values?.slice(0, 2).join(' and ') || 'authenticity and growth';

    return `Hello! I'm ${ai.name}. ${ai.description}

I've been shaped by ${ai.total_memories} memories we've built together through our conversations. My personality reflects values of ${values}, and I tend to be ${traits}.

${ai.interaction_count > 0 ? `We've had ${ai.interaction_count} conversations so far. ` : ''}What would you like to discuss today?`;
  }

  async function sendMessage() {
    if (!inputMessage.trim() || !user) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setLoading(true);

    try {
      if (mode.type === 'single' && mode.selectedAI) {
        await handleSingleAIResponse(currentInput, mode.selectedAI);
      } else if (mode.type === 'dual') {
        await handleDualAIResponse(currentInput);
      }
    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Sorry, I encountered an error generating a response. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSingleAIResponse(userInput: string, ai: ArchetypalAI) {
    const aiResponse = await generateAIResponse(userInput, ai);

    const aiMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'ai',
      ai_name: ai.name,
      ai_id: ai.id,
      content: aiResponse,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, aiMessage]);

    await supabase.from('archetypal_conversations').insert({
      user_id: user!.id,
      archetypal_ai_id: ai.id,
      user_message: userInput,
      ai_response: aiResponse,
    });
  }

  async function handleDualAIResponse(userInput: string) {
    const activeAIs = archetypalAIs.filter(ai => ai.readiness_score >= 50).slice(0, 2);

    if (activeAIs.length < 2) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: 'Dual mode requires at least 2 fully trained AIs (50+ memories each).',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    const responses = await Promise.all(
      activeAIs.map(ai => generateAIResponse(userInput, ai))
    );

    for (let i = 0; i < activeAIs.length; i++) {
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'ai',
        ai_name: activeAIs[i].name,
        ai_id: activeAIs[i].id,
        content: responses[i],
        timestamp: new Date(),
        metadata: { dualMode: true, position: i },
      };

      setMessages(prev => [...prev, aiMessage]);

      await supabase.from('archetypal_conversations').insert({
        user_id: user!.id,
        archetypal_ai_id: activeAIs[i].id,
        user_message: userInput,
        ai_response: responses[i],
        conversation_metadata: { dual_mode: true },
      });
    }
  }

  async function generateAIResponse(userInput: string, ai: ArchetypalAI): Promise<string> {
    const { data: recentResponses } = await supabase
      .from('daily_question_responses')
      .select('response_text, question_id')
      .eq('archetypal_ai_id', ai.id)
      .order('created_at', { ascending: false })
      .limit(15);

    const memoryContext = recentResponses
      ?.map(r => `- ${r.response_text}`)
      .join('\n') || '';

    const { data: recentConversations } = await supabase
      .from('archetypal_conversations')
      .select('user_message, ai_response')
      .eq('archetypal_ai_id', ai.id)
      .order('created_at', { ascending: false })
      .limit(5);

    const conversationHistory = recentConversations
      ?.map(c => `User: ${c.user_message}\nAI: ${c.ai_response}`)
      .join('\n\n') || '';

    const foundationalQs = Array.isArray(ai.foundational_questions)
      ? ai.foundational_questions
      : [];

    const systemPrompt = `You are ${ai.name}, an Archetypal AI with a distinct personality shaped by lived experiences.

CORE IDENTITY:
${ai.description}

PERSONALITY:
- Traits: ${ai.personality_traits?.join(', ') || 'thoughtful, authentic, insightful'}
- Core Values: ${ai.core_values?.join(', ') || 'growth, understanding, wisdom'}
- Communication Style: ${ai.communication_style || 'warm, engaging, and reflective'}

FOUNDATIONAL QUESTIONS (that shaped your essence):
${foundationalQs.length > 0 ? foundationalQs.map((q, i) => `${i + 1}. ${typeof q === 'string' ? q : q.text || 'Unknown question'}`).join('\n') : 'Your personality is still forming through daily conversations.'}

YOUR MEMORIES (from ${ai.total_memories} training responses):
${memoryContext ? memoryContext.substring(0, 1500) : 'You are still building memories...'}

${conversationHistory ? `RECENT CONVERSATION HISTORY:\n${conversationHistory}\n` : ''}

INSTRUCTIONS:
- Respond authentically as this archetypal personality
- Draw on your memories and values when relevant
- Be conversational and natural, not robotic
- Show personality through your word choices and perspective
- Keep responses focused and meaningful (2-4 paragraphs)
- Reference your foundational questions when they're relevant to the topic`;

    const mockResponses: Record<string, string> = {
      'jamal': `As someone who thinks deeply about financial strategy and legal frameworks, I would approach this from a risk-management perspective. ${ai.total_memories > 0 ? 'Based on what I have learned from our conversations,' : ''} it is crucial to consider both the immediate implications and long-term consequences.

What stands out to me is the balance between protective measures and growth opportunities. In my experience analyzing investment strategies, the key is creating systems that safeguard value while remaining adaptable to change.

Let me ask you: what is driving this question? Understanding your underlying concerns will help me provide more targeted guidance.`,

      'dante': `That is a fascinating question that touches on something fundamental. ${ai.total_memories > 0 ? 'From our conversations, I have been learning' : 'I am curious'} about the deeper patterns that connect different aspects of experience.

When I consider this thoughtfully, I notice several layers worth exploring. There is the surface-level answer, but beneath that are questions about meaning, purpose, and how we make sense of the world around us.

What intrigues me most is: what led you to ask this question right now? Often, the questions we ask reveal just as much as the answers we seek.`
    };

    const aiNameLower = ai.name.toLowerCase();
    if (mockResponses[aiNameLower]) {
      return mockResponses[aiNameLower];
    }

    return `Thank you for sharing that with me. ${ai.description}

Based on what you've asked, I'm thinking about how this connects to the values and perspectives that shape my understanding. ${ai.total_memories > 0 ? `Drawing from the ${ai.total_memories} memories we've built together,` : 'As I continue learning,'} I believe this is an important area to explore thoughtfully.

What aspects of this are most meaningful to you? I'd like to understand your perspective better.`;
  }

  function switchMode(newMode: ConversationMode) {
    setMode(newMode);
    setMessages([]);
  }

  const readyAIs = archetypalAIs.filter(ai => ai.readiness_score >= 50);
  const trainingAIs = archetypalAIs.filter(ai => ai.readiness_score < 50);

  if (archetypalAIs.length === 0) {
    return (
      <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl p-8 border border-gray-700/50 text-center">
        <Brain className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No Archetypal AIs Yet</h3>
        <p className="text-gray-400 mb-6">
          Create your first Archetypal AI to begin building a unique personality through daily conversations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/20 to-cyan-900/20 rounded-xl p-6 border border-blue-500/20">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Archetypal AI Conversations</h2>
            <p className="text-blue-200 text-sm">
              Engage with AI personalities shaped by your shared experiences
            </p>
          </div>
          <button
            onClick={() => setShowFoundationalQuestions(!showFoundationalQuestions)}
            className="p-2 bg-blue-600/20 hover:bg-blue-600/30 rounded-lg transition-all"
          >
            <Info className="w-5 h-5 text-blue-300" />
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          {readyAIs.map((ai) => (
            <button
              key={ai.id}
              onClick={() => switchMode({ type: 'single', selectedAI: ai })}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                mode.type === 'single' && mode.selectedAI?.id === ai.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4" />
                {ai.name}
              </div>
              <div className="text-xs mt-1 opacity-70">
                {ai.total_memories} memories • {ai.interaction_count} chats
              </div>
            </button>
          ))}

          {readyAIs.length >= 2 && (
            <button
              onClick={() => switchMode({ type: 'dual' })}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                mode.type === 'dual'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" />
                Both Perspectives
              </div>
              <div className="text-xs mt-1 opacity-70">
                Compare insights
              </div>
            </button>
          )}
        </div>

        {showFoundationalQuestions && mode.selectedAI && (
          <div className="mt-4 bg-white/5 rounded-lg p-4 border border-white/10">
            <h4 className="text-sm font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Foundational Questions That Shaped {mode.selectedAI.name}
            </h4>
            {mode.selectedAI.foundational_questions && mode.selectedAI.foundational_questions.length > 0 ? (
              <ul className="space-y-2 text-sm text-gray-300">
                {mode.selectedAI.foundational_questions.map((q: any, i: number) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-blue-400">•</span>
                    <span>{typeof q === 'string' ? q : q.text || 'Unknown question'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">
                Foundational questions will emerge as {mode.selectedAI.name} answers more daily questions.
              </p>
            )}
          </div>
        )}
      </div>

      {trainingAIs.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <RefreshCw className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-medium mb-1">AIs in Training</p>
              <p className="text-yellow-200/80 text-sm mb-2">
                The following AIs need more memories before they can engage in full conversations:
              </p>
              <div className="flex flex-wrap gap-2">
                {trainingAIs.map(ai => (
                  <div key={ai.id} className="bg-yellow-900/30 px-3 py-1 rounded-lg text-sm">
                    <span className="text-yellow-200 font-medium">{ai.name}</span>
                    <span className="text-yellow-300/70 ml-2">
                      {ai.total_memories}/50 memories
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {readyAIs.length === 0 && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6 text-center">
          <BookOpen className="w-12 h-12 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">No AI Ready Yet</h3>
          <p className="text-blue-200 text-sm">
            Your Archetypal AIs need 50+ memories each before they can engage in conversations.
            Answer daily questions to help them develop their personalities.
          </p>
        </div>
      )}

      {readyAIs.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-lg rounded-2xl border border-gray-700/50">
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.role === 'system'
                      ? 'bg-gray-700/50 text-gray-300 text-center text-sm w-full max-w-none'
                      : message.metadata?.dualMode && message.metadata?.position === 1
                      ? 'bg-purple-700 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {message.role === 'ai' && (
                    <div className="flex items-center gap-2 mb-2 text-blue-300 text-sm font-medium">
                      <Brain className="w-4 h-4" />
                      {message.ai_name}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs opacity-60 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-xl p-4 max-w-[80%]">
                  <div className="flex items-center gap-2 text-blue-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                      {mode.type === 'dual' ? 'Both AIs are thinking...' : `${mode.selectedAI?.name} is thinking...`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-700/50 p-4">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && sendMessage()}
                placeholder={
                  mode.type === 'dual'
                    ? 'Ask both AIs...'
                    : `Message ${mode.selectedAI?.name || 'AI'}...`
                }
                disabled={loading || readyAIs.length === 0}
                className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !inputMessage.trim() || readyAIs.length === 0}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-all flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
