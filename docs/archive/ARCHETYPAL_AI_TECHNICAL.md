# Archetypal AI System - Technical Documentation

## 🏗️ Architecture Overview

The Archetypal AI system is a sophisticated personality-driven conversation platform that extracts personality traits from user responses to daily questions and manifests them as conversational AI agents.

---

## 📊 Database Schema

### Core Tables

#### `archetypal_ais`
Primary table for AI personalities.

```sql
CREATE TABLE archetypal_ais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  personality_traits text[] DEFAULT ARRAY[]::text[],
  core_values text[] DEFAULT ARRAY[]::text[],
  communication_style text,
  foundational_questions jsonb DEFAULT '[]'::jsonb,
  total_memories integer DEFAULT 0,
  readiness_score integer DEFAULT 0,
  training_status text DEFAULT 'training',
  is_ai_active boolean DEFAULT false,
  ai_readiness_score integer DEFAULT 0,
  interaction_count integer DEFAULT 0,
  last_interaction_at timestamptz,
  personality_evolution_log jsonb[] DEFAULT ARRAY[]::jsonb[],
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Key Fields:**
- `personality_traits` - Array of extracted traits (analytical, creative, empathetic, etc.)
- `core_values` - Array of identified values (integrity, growth, compassion, etc.)
- `communication_style` - Descriptive style (e.g., "warm and engaging")
- `foundational_questions` - JSONB array of the first 10 questions answered
- `readiness_score` - 0-100 based on total_memories (100 = 50+ memories)
- `interaction_count` - Number of conversations held

#### `archetypal_conversations`
Stores all chat interactions.

```sql
CREATE TABLE archetypal_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  archetypal_ai_id uuid REFERENCES archetypal_ais(id) ON DELETE CASCADE NOT NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  context_memories text[] DEFAULT ARRAY[]::text[],
  conversation_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

**Key Fields:**
- `context_memories` - Array of memory IDs used to generate this response
- `conversation_metadata` - Additional data like dual_mode flag, sentiment, topics

#### `ai_personality_evolution`
Tracks personality changes over time.

```sql
CREATE TABLE ai_personality_evolution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetypal_ai_id uuid REFERENCES archetypal_ais(id) ON DELETE CASCADE NOT NULL,
  personality_snapshot jsonb NOT NULL,
  total_memories_at_snapshot integer NOT NULL DEFAULT 0,
  key_insights text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now()
);
```

**Usage:**
- Captures personality state every 10 memories
- Allows tracking evolution over time
- Enables rollback to previous personality states

#### `daily_question_responses`
Training data for each AI (existing table, extended).

```sql
-- Key columns for Archetypal AI system
response_text text NOT NULL,           -- The user's answer (the "memory")
archetypal_ai_id uuid REFERENCES archetypal_ais(id),
question_id uuid REFERENCES daily_questions(id),
created_at timestamptz DEFAULT now()
```

---

## 🔧 Core Functions

### Database Functions

#### `capture_personality_snapshot(p_archetypal_ai_id uuid)`
Captures current personality state.

```sql
CREATE OR REPLACE FUNCTION capture_personality_snapshot(
  p_archetypal_ai_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_snapshot jsonb;
  v_memory_count integer;
BEGIN
  SELECT
    jsonb_build_object(
      'name', aa.name,
      'description', aa.description,
      'personality_traits', aa.personality_traits,
      'core_values', aa.core_values,
      'communication_style', aa.communication_style,
      'total_memories', aa.total_memories,
      'readiness_score', aa.readiness_score,
      'interaction_count', aa.interaction_count,
      'captured_at', now()
    ),
    aa.total_memories
  INTO v_snapshot, v_memory_count
  FROM archetypal_ais aa
  WHERE aa.id = p_archetypal_ai_id;

  INSERT INTO ai_personality_evolution (
    archetypal_ai_id,
    personality_snapshot,
    total_memories_at_snapshot
  ) VALUES (
    p_archetypal_ai_id,
    v_snapshot,
    v_memory_count
  );

  RETURN v_snapshot;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### `update_ai_interaction_count()`
Auto-updates interaction count on new conversations.

```sql
CREATE OR REPLACE FUNCTION update_ai_interaction_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE archetypal_ais
  SET
    interaction_count = interaction_count + 1,
    last_interaction_at = NEW.created_at
  WHERE id = NEW.archetypal_ai_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 🧩 Frontend Components

### ArchetypalAIChat.tsx
Main chat interface component.

**Key Features:**
- Single AI conversation mode
- Dual perspective mode (both AIs respond)
- Context-aware response generation
- Message history with timestamps
- AI switching without losing context
- Foundational questions display

**State Management:**
```typescript
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
```

**Key Methods:**
- `loadArchetypalAIs()` - Fetches user's AIs from database
- `sendMessage()` - Handles user input and triggers AI responses
- `handleSingleAIResponse()` - Generates response from one AI
- `handleDualAIResponse()` - Generates responses from multiple AIs
- `generateAIResponse()` - Core response generation logic
- `switchMode()` - Changes between single/dual perspective

### CustomEngramsDashboard.tsx
AI management and training interface.

**Features:**
- Display all user's AIs with stats
- Create new AIs
- Show training progress (0-100%)
- Navigate to answer questions
- Display readiness indicators

### DailyQuestionCard.tsx
Question answering interface (training).

**Features:**
- Present daily questions
- AI selector
- Response input with file attachments
- Submit responses that become "memories"
- Progress tracking

---

## 🤖 Personality Extraction System

### archetypal-ai-helpers.ts
Core personality analysis engine.

#### `extractPersonalityFromMemories()`
Analyzes all responses to extract personality.

```typescript
export interface PersonalityInsights {
  dominant_traits: string[];
  core_values: string[];
  communication_patterns: string[];
  knowledge_domains: string[];
  emotional_tone: string;
  thinking_style: string;
}
```

**Analysis Pipeline:**

1. **Trait Analysis** (`analyzeTraits()`)
   - Scans for trait keywords (analyze, create, feel, etc.)
   - Scores each trait based on frequency
   - Returns top 5 dominant traits

2. **Value Analysis** (`analyzeValues()`)
   - Identifies value keywords (honest, learn, help, etc.)
   - Scores each value based on frequency
   - Returns top 5 core values

3. **Communication Pattern Analysis** (`analyzeCommunicationPatterns()`)
   - Calculates average response length
   - Detects question usage (inquisitive)
   - Identifies example usage (storyteller)

4. **Knowledge Domain Analysis** (`analyzeKnowledgeDomains()`)
   - Scans for domain-specific keywords
   - Maps to categories (finance, psychology, philosophy, etc.)
   - Returns top 4 domains

5. **Emotional Tone Analysis** (`analyzeEmotionalTone()`)
   - Detects warm words (love, care, joy)
   - Detects analytical words (analyze, evaluate)
   - Detects reflective words (think, ponder)
   - Returns dominant tone

6. **Thinking Style Analysis** (`analyzeThinkingStyle()`)
   - Strategic planner - plan, goal, organize
   - Intuitive explorer - feel, sense, intuition
   - Logical analyzer - logic, reason, evidence
   - Creative synthesizer - imagine, create, synthesize

#### `updateAIPersonalityProfile()`
Updates AI database with extracted personality.

```typescript
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
```

---

## 💬 Response Generation System

### Context Building

For each AI response, the system builds comprehensive context:

```typescript
async function generateAIResponse(userInput: string, ai: ArchetypalAI): Promise<string> {
  // 1. Fetch recent memories (training responses)
  const { data: recentResponses } = await supabase
    .from('daily_question_responses')
    .select('response_text, question_id')
    .eq('archetypal_ai_id', ai.id)
    .order('created_at', { ascending: false })
    .limit(15);

  const memoryContext = recentResponses
    ?.map(r => `- ${r.response_text}`)
    .join('\n') || '';

  // 2. Fetch recent conversations for continuity
  const { data: recentConversations } = await supabase
    .from('archetypal_conversations')
    .select('user_message, ai_response')
    .eq('archetypal_ai_id', ai.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const conversationHistory = recentConversations
    ?.map(c => `User: ${c.user_message}\nAI: ${c.ai_response}`)
    .join('\n\n') || '';

  // 3. Build system prompt with full context
  const systemPrompt = `You are ${ai.name}, an Archetypal AI...

  PERSONALITY:
  - Traits: ${ai.personality_traits?.join(', ')}
  - Core Values: ${ai.core_values?.join(', ')}
  - Communication Style: ${ai.communication_style}

  YOUR MEMORIES (from ${ai.total_memories} training responses):
  ${memoryContext}

  ${conversationHistory ? `RECENT CONVERSATION HISTORY:\n${conversationHistory}` : ''}

  INSTRUCTIONS:
  - Respond authentically as this archetypal personality
  - Draw on your memories and values when relevant
  - Be conversational and natural
  - Keep responses focused and meaningful (2-4 paragraphs)`;

  // 4. Generate response (mock or API call)
  // In production, would call OpenAI or Claude API
  return mockResponse(ai, userInput);
}
```

### Mock Response System

For development/testing without API costs:

```typescript
const mockResponses: Record<string, string> = {
  'jamal': `As someone who thinks deeply about financial strategy and legal frameworks...`,
  'dante': `That is a fascinating question that touches on something fundamental...`,
};
```

**To integrate real AI:**
Replace mock system with OpenAI/Claude API:

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ],
    temperature: 0.8,
    max_tokens: 500,
  }),
});
```

---

## 🔐 Security & Privacy

### Row Level Security (RLS)

All tables have RLS policies:

```sql
-- Users can only view their own AI conversations
CREATE POLICY "Users can view own AI conversations"
  ON archetypal_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only create conversations for their own AIs
CREATE POLICY "Users can create own AI conversations"
  ON archetypal_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### Data Isolation

- Each user's AIs are completely isolated
- No cross-user data access possible
- Conversations are private by default
- Personality extraction only uses user's own data

---

## 📈 Performance Optimizations

### Database Indexes

```sql
CREATE INDEX idx_archetypal_conversations_user_id
  ON archetypal_conversations(user_id);

CREATE INDEX idx_archetypal_conversations_ai_id
  ON archetypal_conversations(archetypal_ai_id);

CREATE INDEX idx_archetypal_conversations_created_at
  ON archetypal_conversations(created_at DESC);
```

### Caching Strategy

- Recent conversations cached in component state
- Personality profiles cached after extraction
- Memory context limited to most recent 15 responses

### Load Optimization

- Paginated conversation history
- Lazy loading of older messages
- Debounced input for typing indicators
- Optimistic UI updates

---

## 🚀 Deployment Configuration

### Environment Variables

```env
# Supabase (already configured)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional: OpenAI for production AI responses
VITE_OPENAI_API_KEY=your_openai_key
```

### Migration Checklist

1. ✅ Database migration applied (`create_archetypal_conversation_system`)
2. ✅ Components created and integrated
3. ✅ Helper functions implemented
4. ✅ Dashboard navigation updated
5. ✅ Build verified successful

---

## 🧪 Testing Recommendations

### Unit Tests

Test personality extraction:
```typescript
describe('extractPersonalityFromMemories', () => {
  it('should identify analytical traits', async () => {
    const responses = [
      { response_text: 'I analyze data and examine evidence systematically...' }
    ];
    const insights = await extractPersonalityFromMemories(aiId, userId);
    expect(insights.dominant_traits).toContain('analytical');
  });
});
```

### Integration Tests

Test conversation flow:
```typescript
describe('ArchetypalAIChat', () => {
  it('should send message and receive AI response', async () => {
    const { getByPlaceholderText, getByRole } = render(<ArchetypalAIChat />);
    const input = getByPlaceholderText('Message AI...');
    const sendButton = getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/As someone who thinks/)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests

Full user journey:
1. Create new AI
2. Answer 50 questions
3. Verify readiness reaches 100%
4. Navigate to chat
5. Send message
6. Verify AI responds
7. Test dual perspective mode

---

## 📚 API Reference

### Supabase Queries

#### Fetch AIs
```typescript
const { data, error } = await supabase
  .from('archetypal_ais')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

#### Create Conversation
```typescript
const { data, error } = await supabase
  .from('archetypal_conversations')
  .insert({
    user_id: userId,
    archetypal_ai_id: aiId,
    user_message: message,
    ai_response: response,
  });
```

#### Fetch Memories
```typescript
const { data, error } = await supabase
  .from('daily_question_responses')
  .select('response_text')
  .eq('archetypal_ai_id', aiId)
  .order('created_at', { ascending: false })
  .limit(15);
```

---

## 🐛 Common Issues & Solutions

### Issue: AI not responding
**Cause:** Readiness score < 50 (100%)
**Solution:** Answer more questions until 50+ memories

### Issue: Generic responses
**Cause:** Insufficient training data
**Solution:** Answer questions more thoroughly (200+ words)

### Issue: Personality doesn't match expectations
**Cause:** Extraction needs more varied data
**Solution:** Answer diverse question categories

### Issue: Chat history not loading
**Cause:** RLS policy blocking access
**Solution:** Verify auth.uid() matches conversation user_id

---

## 🔮 Future Enhancements

### Planned Features

1. **Voice Integration**
   - Text-to-speech for AI responses
   - Voice input for user messages
   - Personality-matched voice tones

2. **Multi-Modal Memories**
   - Image attachments in question responses
   - Video memory capture
   - Audio diary entries

3. **AI Collaboration**
   - Multiple AIs working together on tasks
   - AI-to-AI conversations
   - Collaborative problem solving

4. **Advanced Analytics**
   - Personality drift tracking
   - Conversation sentiment analysis
   - Knowledge gap identification

5. **Export/Import**
   - Export AI personality to JSON
   - Share AI profiles with others
   - Import community-created AIs

6. **API Access**
   - REST API for external integrations
   - Webhook support for events
   - Third-party app connections

---

## 📖 Developer Resources

### Code Structure
```
src/
├── components/
│   ├── ArchetypalAIChat.tsx       # Main chat interface
│   ├── CustomEngramsDashboard.tsx # AI management
│   └── DailyQuestionCard.tsx      # Training interface
├── lib/
│   └── archetypal-ai-helpers.ts   # Personality extraction
└── pages/
    └── Dashboard.tsx               # Main navigation

supabase/
└── migrations/
    └── create_archetypal_conversation_system.sql
```

### Key Files
- **ArchetypalAIChat.tsx** - 500+ lines, handles all chat logic
- **archetypal-ai-helpers.ts** - 400+ lines, personality extraction engine
- **Dashboard.tsx** - Navigation integration point

---

## 🎓 Learning Resources

### Understanding the System
1. Read ARCHETYPAL_AI_GUIDE.md for user perspective
2. Review database schema in migration file
3. Study personality extraction algorithms
4. Explore chat component architecture

### Contributing
1. Follow TypeScript best practices
2. Add unit tests for new features
3. Document complex algorithms
4. Maintain RLS security patterns

---

**Technical Documentation v1.0**
*Built on Supabase, React, TypeScript, and modern web standards*
