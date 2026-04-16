import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QueryRequest {
  query: {
    type: "text" | "vector" | "structured";
    content: string | number[];
    filters?: {
      user_id?: string;
      engram_id?: string;
      categories?: string[];
      date_range?: { start: string; end: string };
      min_quality_score?: number;
    };
  };
  search_options: {
    max_results: number;
    similarity_threshold: number;
    include_relationships: boolean;
    include_context: boolean;
  };
  requester: {
    type: "user" | "ai_agent" | "system";
    id: string;
    reason?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return errorResponse("Invalid authentication", 401);
    }

    // Parse request
    const body: QueryRequest = await req.json();

    // Validate
    if (!body.query || !body.search_options || !body.requester) {
      return errorResponse("Missing required fields", 400);
    }

    // Log access
    await logAccess(
      supabase,
      null,
      body.requester.type,
      body.requester.id,
      "query",
      body.query.type === "text" ? body.query.content as string : null,
      req.headers.get("User-Agent") || undefined
    );

    let results;

    // Execute query based on type
    switch (body.query.type) {
      case "text":
        results = await queryByText(
          supabase,
          body.query.content as string,
          body.query.filters,
          body.search_options,
          user.id
        );
        break;
      case "vector":
        results = await queryByVector(
          supabase,
          body.query.content as number[],
          body.query.filters,
          body.search_options,
          user.id
        );
        break;
      case "structured":
        results = await queryStructured(
          supabase,
          body.query.filters,
          body.search_options,
          user.id
        );
        break;
      default:
        return errorResponse("Invalid query type", 400);
    }

    // Enhance results with relationships and context if requested
    if (body.search_options.include_relationships) {
      results = await enhanceWithRelationships(supabase, results);
    }

    if (body.search_options.include_context) {
      results = await enhanceWithContext(supabase, results);
    }

    const queryTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        results,
        total_matches: results.length,
        query_time_ms: queryTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Knowledge query error:", error);
    return errorResponse(error instanceof Error ? error.message : String(error), 500);
  }
});

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

async function queryByText(
  supabase: SupabaseClient,
  text: string,
  filters: Record<string, unknown>,
  options: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>[]> {
  // Generate embedding for the query text
  const queryEmbedding = await generateEmbedding(text);

  if (!queryEmbedding) {
    // Fallback to full-text search
    return await fullTextSearch(supabase, text, filters, options, userId);
  }

  // Vector similarity search
  return await queryByVector(supabase, queryEmbedding, filters, options, userId);
}

async function queryByVector(
  supabase: SupabaseClient,
  vector: number[],
  filters: Record<string, unknown>,
  options: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>[]> {
  // Build query
  let query = supabase
    .from("knowledge_embeddings")
    .select(`
      id,
      knowledge_item_id,
      embedding_type,
      chunk_text,
      knowledge_items!inner (
        id,
        source_type,
        content_type,
        content_text,
        content_structured,
        quality_score,
        confidence_score,
        categories,
        tags,
        created_at,
        content_timestamp
      )
    `)
    .order("embedding", { ascending: true });

  // Apply filters
  if (filters?.user_id) {
    query = query.eq("knowledge_items.user_id", filters.user_id);
  } else {
    query = query.eq("knowledge_items.user_id", userId);
  }

  if (filters?.engram_id) {
    query = query.eq("knowledge_items.engram_id", filters.engram_id);
  }

  if (filters?.categories?.length) {
    query = query.contains("knowledge_items.categories", filters.categories);
  }

  if (filters?.date_range) {
    query = query
      .gte("knowledge_items.content_timestamp", filters.date_range.start)
      .lte("knowledge_items.content_timestamp", filters.date_range.end);
  }

  if (filters?.min_quality_score) {
    query = query.gte("knowledge_items.quality_score", filters.min_quality_score);
  }

  query = query.limit(options.max_results || 10);

  const { data, error } = await query;

  if (error) {
    console.error("Vector query error:", error);
    throw error;
  }

  // Calculate similarity scores and filter
  const results = data
    .map((item: Record<string, unknown>) => {
      const ki = item.knowledge_items as Record<string, unknown>;
      const similarity = cosineSimilarity(vector, item.embedding as number[]);
      return {
        knowledge_item_id: ki.id,
        content: ki.content_text || ki.content_structured,
        similarity_score: similarity,
        quality_score: ki.quality_score,
        confidence_score: ki.confidence_score,
        categories: ki.categories,
        tags: ki.tags,
        metadata: {
          created_at: ki.created_at,
          content_timestamp: ki.content_timestamp,
          source_type: ki.source_type,
          content_type: ki.content_type,
        },
      };
    })
    .filter((item: Record<string, unknown>) => (item.similarity_score as number) >= ((options.similarity_threshold as number) || 0.5))
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.similarity_score as number) - (a.similarity_score as number));

  return results;
}

async function queryStructured(
  supabase: SupabaseClient,
  filters: Record<string, unknown>,
  options: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>[]> {
  // Build structured query
  let query = supabase
    .from("knowledge_items")
    .select("*")
    .eq("user_id", userId);

  // Apply filters
  if (filters?.engram_id) {
    query = query.eq("engram_id", filters.engram_id);
  }

  if (filters?.categories?.length) {
    query = query.contains("categories", filters.categories);
  }

  if (filters?.date_range) {
    query = query
      .gte("content_timestamp", filters.date_range.start)
      .lte("content_timestamp", filters.date_range.end);
  }

  if (filters?.min_quality_score) {
    query = query.gte("quality_score", filters.min_quality_score);
  }

  query = query
    .order("quality_score", { ascending: false })
    .order("content_timestamp", { ascending: false })
    .limit(options.max_results || 10);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map((item: Record<string, unknown>) => ({
    knowledge_item_id: item.id,
    content: item.content_text || item.content_structured,
    similarity_score: null,
    quality_score: item.quality_score,
    confidence_score: item.confidence_score,
    categories: item.categories,
    tags: item.tags,
    metadata: {
      created_at: item.created_at,
      content_timestamp: item.content_timestamp,
      source_type: item.source_type,
      content_type: item.content_type,
    },
  }));
}

async function fullTextSearch(
  supabase: SupabaseClient,
  text: string,
  filters: Record<string, unknown>,
  options: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown>[]> {
  // Use PostgreSQL full-text search
  let query = supabase
    .from("knowledge_items")
    .select("*")
    .eq("user_id", userId)
    .textSearch("content_text", text, { type: "websearch" });

  // Apply filters
  if (filters?.categories?.length) {
    query = query.contains("categories", filters.categories);
  }

  if (filters?.date_range) {
    query = query
      .gte("content_timestamp", filters.date_range.start)
      .lte("content_timestamp", filters.date_range.end);
  }

  if (filters?.min_quality_score) {
    query = query.gte("quality_score", filters.min_quality_score);
  }

  query = query
    .order("quality_score", { ascending: false })
    .limit(options.max_results || 10);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data.map((item: Record<string, unknown>) => ({
    knowledge_item_id: item.id,
    content: item.content_text || item.content_structured,
    similarity_score: null,
    quality_score: item.quality_score,
    confidence_score: item.confidence_score,
    categories: item.categories,
    tags: item.tags,
    metadata: {
      created_at: item.created_at,
      content_timestamp: item.content_timestamp,
      source_type: item.source_type,
      content_type: item.content_type,
    },
  }));
}

async function enhanceWithRelationships(
  supabase: SupabaseClient,
  results: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const itemIds = results.map((r) => r.knowledge_item_id);

  if (itemIds.length === 0) return results;

  // Get relationships
  const { data: relationships } = await supabase
    .from("knowledge_relationships")
    .select("*")
    .in("source_item_id", itemIds);

  // Attach relationships to results
  return results.map((result) => {
    const rels = relationships?.filter(
      (r: Record<string, unknown>) => r.source_item_id === result.knowledge_item_id
    ) || [];

    return {
      ...result,
      relationships: rels.map((r: Record<string, unknown>) => ({
        type: r.relationship_type,
        target_id: r.target_item_id,
        strength: r.strength,
        confidence: r.confidence,
      })),
    };
  });
}

async function enhanceWithContext(
  supabase: SupabaseClient,
  results: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const itemIds = results.map((r) => r.knowledge_item_id);

  if (itemIds.length === 0) return results;

  // Get entities
  const { data: occurrences } = await supabase
    .from("knowledge_entity_occurrences")
    .select(`
      knowledge_item_id,
      context_before,
      context_after,
      knowledge_entities (
        entity_type,
        entity_text,
        normalized_text
      )
    `)
    .in("knowledge_item_id", itemIds);

  // Attach entities to results
  return results.map((result) => {
    const entities = occurrences?.filter(
      (o: Record<string, unknown>) => o.knowledge_item_id === result.knowledge_item_id
    ) || [];

    return {
      ...result,
      entities: entities.map((e: Record<string, unknown>) => ({
        type: (e.knowledge_entities as Record<string, unknown>).entity_type,
        text: (e.knowledge_entities as Record<string, unknown>).entity_text,
        normalized: (e.knowledge_entities as Record<string, unknown>).normalized_text,
        context_before: e.context_before,
        context_after: e.context_after,
      })),
    };
  });
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return null;
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: text.substring(0, 8000),
        dimensions: 3072,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.data[0].embedding;
  } catch (error) {
    console.error("Embedding generation error:", error);
    return null;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function logAccess(
  supabase: SupabaseClient,
  knowledgeItemId: string | null,
  accessorType: string,
  accessorId: string,
  accessType: string,
  queryText: string | null,
  userAgent?: string
): Promise<void> {
  try {
    await supabase.from("knowledge_access_log").insert({
      knowledge_item_id: knowledgeItemId,
      accessor_type: accessorType,
      accessor_id: accessorId,
      access_type: accessType,
      query_text: queryText,
      user_agent: userAgent,
    });
  } catch (error) {
    console.error("Access logging error:", error);
  }
}
