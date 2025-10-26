# AI Knowledge Management System - Implementation Guide

## Quick Start

### 1. Database Setup

Apply the migration in Supabase Dashboard → SQL Editor:

```bash
# Via Supabase CLI
supabase db push

# Or run the migration file directly
supabase/migrations/20251027020000_create_ai_knowledge_system.sql
```

### 2. Deploy Edge Functions

```bash
# Deploy ingestion function
supabase functions deploy knowledge-ingest

# Deploy query function
supabase functions deploy knowledge-query
```

### 3. Configure Environment Variables

In Supabase Dashboard → Functions → Secrets, add:

```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

## Usage Examples

### Ingest Knowledge

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/knowledge-ingest`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      source_type: 'user_response',
      source_id: 'daily-question-123',
      content: {
        type: 'text',
        data: 'I felt energized after my morning walk today.',
        metadata: {
          timestamp: new Date().toISOString(),
          tags: ['exercise', 'mood', 'morning'],
          categories: ['health', 'wellness'],
        },
      },
      processing_options: {
        generate_embeddings: true,
        extract_entities: true,
        privacy_level: 'private',
      },
    }),
  }
);

const result = await response.json();
console.log('Knowledge item created:', result.knowledge_item_id);
```

### Query Knowledge

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/knowledge-query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      query: {
        type: 'text',
        content: 'How has my exercise affected my mood?',
        filters: {
          categories: ['health', 'wellness'],
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31',
          },
          min_quality_score: 0.7,
        },
      },
      search_options: {
        max_results: 10,
        similarity_threshold: 0.6,
        include_relationships: true,
        include_context: true,
      },
      requester: {
        type: 'ai_agent',
        id: 'st-raphael',
        reason: 'health_insights',
      },
    }),
  }
);

const results = await response.json();
console.log(`Found ${results.total_matches} relevant items`);
results.results.forEach((item) => {
  console.log(`- ${item.content} (similarity: ${item.similarity_score})`);
});
```

### Integration with St. Raphael

```typescript
// In your AI agent code
async function getRaphaelContext(userId: string, topic: string) {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/knowledge-query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        query: {
          type: 'text',
          content: topic,
          filters: {
            user_id: userId,
            categories: ['health'],
          },
        },
        search_options: {
          max_results: 5,
          similarity_threshold: 0.7,
          include_relationships: true,
          include_context: true,
        },
        requester: {
          type: 'ai_agent',
          id: 'st-raphael',
        },
      }),
    }
  );

  const { results } = await response.json();

  // Use results as context for AI response
  const contextText = results
    .map((r) => `- ${r.content} (score: ${r.similarity_score})`)
    .join('\n');

  return contextText;
}
```

## Integration Patterns

### Pattern 1: Automatic Daily Question Ingestion

```typescript
// After user submits daily question response
async function onDailyQuestionSubmit(
  userId: string,
  questionId: string,
  response: string
) {
  await fetch(`${SUPABASE_URL}/functions/v1/knowledge-ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      source_type: 'user_response',
      source_id: `daily-${questionId}`,
      content: {
        type: 'text',
        data: response,
        metadata: {
          timestamp: new Date().toISOString(),
          categories: ['personality', 'engram'],
        },
      },
      processing_options: {
        generate_embeddings: true,
        extract_entities: true,
      },
    }),
  });
}
```

### Pattern 2: Health Data Ingestion

```typescript
// After health metrics sync
async function onHealthDataSync(userId: string, metrics: any) {
  await fetch(`${SUPABASE_URL}/functions/v1/knowledge-ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      source_type: 'health_data',
      source_id: `metrics-${Date.now()}`,
      user_id: userId,
      content: {
        type: 'structured',
        data: metrics,
        metadata: {
          timestamp: metrics.recorded_at,
          categories: ['health', 'metrics'],
          tags: ['glucose', 'heart_rate', 'sleep'],
        },
      },
      processing_options: {
        generate_embeddings: false, // Numeric data
        privacy_level: 'research_anonymous',
      },
    }),
  });
}
```

### Pattern 3: AI Agent Knowledge Retrieval

```typescript
// Get context for AI response
async function getAIContext(
  userId: string,
  conversationHistory: string[]
) {
  // Combine recent conversation into query
  const queryText = conversationHistory.slice(-3).join(' ');

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/knowledge-query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        query: {
          type: 'text',
          content: queryText,
          filters: {
            user_id: userId,
            min_quality_score: 0.8,
          },
        },
        search_options: {
          max_results: 10,
          similarity_threshold: 0.7,
          include_relationships: true,
          include_context: true,
        },
        requester: {
          type: 'ai_agent',
          id: 'raphael-chat',
        },
      }),
    }
  );

  return await response.json();
}
```

## Database Queries

### Get User's Knowledge Stats

```sql
SELECT
  COUNT(*) as total_items,
  AVG(quality_score) as avg_quality,
  COUNT(DISTINCT source_type) as source_types,
  array_agg(DISTINCT categories) as all_categories
FROM knowledge_items
WHERE user_id = 'USER_ID';
```

### Find Similar Knowledge Items

```sql
SELECT
  ki.id,
  ki.content_text,
  ki.quality_score,
  ke.embedding <=> query_embedding AS similarity
FROM knowledge_items ki
JOIN knowledge_embeddings ke ON ke.knowledge_item_id = ki.id
WHERE ki.user_id = 'USER_ID'
  AND ke.embedding <=> query_embedding < 0.5
ORDER BY ke.embedding <=> query_embedding
LIMIT 10;
```

### Get Knowledge Relationships

```sql
SELECT
  source.content_text as from_content,
  kr.relationship_type,
  target.content_text as to_content,
  kr.strength,
  kr.confidence
FROM knowledge_relationships kr
JOIN knowledge_items source ON source.id = kr.source_item_id
JOIN knowledge_items target ON target.id = kr.target_item_id
WHERE source.user_id = 'USER_ID'
ORDER BY kr.strength DESC;
```

### Entity Frequency Analysis

```sql
SELECT
  ke.entity_type,
  ke.entity_text,
  ke.occurrence_count,
  COUNT(keo.id) as user_occurrences
FROM knowledge_entities ke
JOIN knowledge_entity_occurrences keo ON keo.entity_id = ke.id
JOIN knowledge_items ki ON ki.id = keo.knowledge_item_id
WHERE ki.user_id = 'USER_ID'
GROUP BY ke.id, ke.entity_type, ke.entity_text, ke.occurrence_count
ORDER BY user_occurrences DESC
LIMIT 20;
```

## Performance Optimization

### 1. Batch Embedding Generation

```typescript
// Instead of generating embeddings one at a time
const texts = ['text1', 'text2', 'text3', ...]; // Up to 50

const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openaiKey}`,
  },
  body: JSON.stringify({
    model: 'text-embedding-3-large',
    input: texts,
    dimensions: 3072,
  }),
});

const result = await response.json();
// result.data will have embeddings for all texts
```

### 2. Caching Strategy

```typescript
// Cache frequent queries in Redis
const cacheKey = `knowledge_query:${userId}:${queryHash}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const results = await queryKnowledge(...);
await redis.setex(cacheKey, 300, JSON.stringify(results)); // 5 min TTL
return results;
```

### 3. Index Optimization

```sql
-- For very large datasets (>1M vectors), use HNSW instead of IVFFlat
DROP INDEX idx_knowledge_embeddings_vector_cosine;

CREATE INDEX idx_knowledge_embeddings_vector_hnsw
ON knowledge_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

## Security Best Practices

### 1. Always Validate User Access

```typescript
// Before querying knowledge
const { data: hasAccess } = await supabase
  .from('knowledge_items')
  .select('id')
  .eq('id', knowledgeItemId)
  .eq('user_id', requestingUserId)
  .maybeSingle();

if (!hasAccess) {
  throw new Error('Unauthorized access');
}
```

### 2. Sanitize User Input

```typescript
function sanitizeInput(text: string): string {
  // Remove potential SQL injection attempts
  return text
    .replace(/[^\w\s\-,.!?]/gi, '')
    .substring(0, 10000); // Limit length
}
```

### 3. Rate Limiting

```typescript
// Implement rate limiting for queries
const rateKey = `rate:knowledge:${userId}`;
const count = await redis.incr(rateKey);

if (count === 1) {
  await redis.expire(rateKey, 60); // 1 minute window
}

if (count > 100) {
  throw new Error('Rate limit exceeded');
}
```

## Monitoring & Alerts

### Key Metrics to Track

1. **Ingestion Rate**: Items/second
2. **Query Latency**: p50, p95, p99
3. **Vector Search Accuracy**: Recall@10
4. **Quality Score Distribution**
5. **Storage Growth Rate**

### Set Up Alerts

```sql
-- Alert if quality score drops below threshold
SELECT
  user_id,
  AVG(quality_score) as avg_quality
FROM knowledge_items
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING AVG(quality_score) < 0.5;
```

## Troubleshooting

### Issue: Slow Vector Search

**Solution**:
- Increase IVFFlat lists: `WITH (lists = 200)`
- Use HNSW index for >1M vectors
- Add pre-filtering before vector search

### Issue: Poor Search Results

**Solution**:
- Lower similarity threshold
- Increase max_results
- Check embedding quality
- Verify query text preprocessing

### Issue: High OpenAI Costs

**Solution**:
- Batch embedding generation (50 texts/request)
- Cache embeddings aggressively
- Use text-embedding-3-small for non-critical use cases
- Implement deduplication before embedding

## Future Enhancements

1. **Advanced NLP**: Use spaCy or Hugging Face for better entity extraction
2. **Graph Algorithms**: Implement PageRank for knowledge importance
3. **Active Learning**: Identify knowledge gaps and ask targeted questions
4. **Multi-Modal**: Add support for images, audio, video
5. **Federated Learning**: Train models without centralizing data
6. **Real-Time Streaming**: Process knowledge as it arrives
7. **Knowledge Graphs**: Build comprehensive semantic networks

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **pgvector Guide**: https://github.com/pgvector/pgvector
- **OpenAI Embeddings**: https://platform.openai.com/docs/guides/embeddings
- **PostgreSQL FTS**: https://www.postgresql.org/docs/current/textsearch.html

## Conclusion

The AI Knowledge Management System provides a powerful foundation for enhancing all AI systems in the EverAfter platform with contextual, personalized knowledge. By following this implementation guide, you can integrate knowledge management into your existing workflows and unlock advanced AI capabilities.
