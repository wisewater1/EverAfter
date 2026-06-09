import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface IngestRequest {
  source_type: string;
  source_id: string;
  user_id?: string;
  engram_id?: string;
  content: {
    type: string;
    data: any;
    metadata?: {
      timestamp?: string;
      tags?: string[];
      categories?: string[];
    };
  };
  processing_options?: {
    generate_embeddings?: boolean;
    extract_entities?: boolean;
    find_relationships?: boolean;
    privacy_level?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Get auth token from request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401);
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Get user from token
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (userError || !user) {
      return errorResponse("Invalid authentication", 401);
    }

    // Parse request body
    const body: IngestRequest = await req.json();

    // Validate required fields
    if (!body.source_type || !body.source_id || !body.content) {
      return errorResponse("Missing required fields", 400);
    }

    // Use authenticated user_id if not provided
    const userId = body.user_id || user.id;

    // Validate user_id matches authenticated user (unless service role)
    if (userId !== user.id && authHeader.indexOf(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "") === -1) {
      return errorResponse("Unauthorized user_id", 403);
    }

    // Process and validate content
    const processedContent = await processContent(body.content);

    // Calculate quality scores
    const qualityMetrics = calculateQualityMetrics(
      processedContent,
      body.content.metadata
    );

    // Generate content hash for deduplication
    const contentText = extractTextContent(processedContent);
    const contentHash = await generateHash(contentText);

    // Check for existing item
    const { data: existing } = await supabase
      .from("knowledge_items")
      .select("id")
      .eq("source_type", body.source_type)
      .eq("source_id", body.source_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      return errorResponse("Knowledge item already exists", 409);
    }

    // Insert knowledge item
    const { data: knowledgeItem, error: insertError } = await supabase
      .from("knowledge_items")
      .insert({
        source_type: body.source_type,
        source_id: body.source_id,
        source_metadata: body.content.metadata || {},
        user_id: userId,
        engram_id: body.engram_id || null,
        privacy_level: body.processing_options?.privacy_level || "private",
        content_type: body.content.type,
        content_text: contentText,
        content_structured: processedContent,
        processing_status: "pending",
        quality_score: qualityMetrics.overall,
        confidence_score: qualityMetrics.confidence,
        categories: body.content.metadata?.categories || [],
        tags: body.content.metadata?.tags || [],
        content_timestamp: body.content.metadata?.timestamp || new Date().toISOString(),
        content_hash: contentHash,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse(`Failed to insert knowledge item: ${insertError.message}`, 500);
    }

    // Queue processing tasks
    const processingTasks: Promise<any>[] = [];

    if (body.processing_options?.generate_embeddings !== false) {
      processingTasks.push(
        generateAndStoreEmbedding(supabase, knowledgeItem.id, contentText)
      );
    }

    if (body.processing_options?.extract_entities) {
      processingTasks.push(
        extractAndStoreEntities(supabase, knowledgeItem.id, contentText)
      );
    }

    // Execute processing tasks in parallel
    const results = await Promise.allSettled(processingTasks);

    // Count successful tasks
    const successfulTasks = results.filter((r) => r.status === "fulfilled").length;

    // Update processing status
    await supabase
      .from("knowledge_items")
      .update({
        processing_status: successfulTasks === processingTasks.length ? "completed" : "processing",
        processed_at: new Date().toISOString(),
      })
      .eq("id", knowledgeItem.id);

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        knowledge_item_id: knowledgeItem.id,
        processing_status: successfulTasks === processingTasks.length ? "completed" : "processing",
        quality_score: qualityMetrics.overall,
        confidence_score: qualityMetrics.confidence,
        tasks_completed: successfulTasks,
        tasks_total: processingTasks.length,
        processing_time_ms: processingTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Knowledge ingest error:", error);
    return errorResponse(error.message, 500);
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

async function processContent(content: any): Promise<any> {
  // Process based on content type
  switch (content.type) {
    case "text":
      return {
        text: content.data,
        word_count: content.data.split(/\s+/).length,
      };
    case "numeric":
      return {
        value: content.data,
        type: typeof content.data,
      };
    case "structured":
      return content.data;
    default:
      return content.data;
  }
}

function extractTextContent(processed: any): string {
  if (typeof processed === "string") {
    return processed;
  }
  if (processed.text) {
    return processed.text;
  }
  if (typeof processed === "object") {
    return JSON.stringify(processed);
  }
  return String(processed);
}

function calculateQualityMetrics(content: any, metadata: any): {
  overall: number;
  confidence: number;
  completeness: number;
  timeliness: number;
} {
  // Completeness: Check for required fields
  let completeness = 0.5;
  if (content) completeness += 0.2;
  if (metadata?.timestamp) completeness += 0.15;
  if (metadata?.tags?.length) completeness += 0.15;

  // Timeliness: Based on recency
  let timeliness = 1.0;
  if (metadata?.timestamp) {
    const age = Date.now() - new Date(metadata.timestamp).getTime();
    const daysOld = age / (1000 * 60 * 60 * 24);
    timeliness = Math.max(0.3, 1 - daysOld / 365);
  }

  // Confidence: Based on source and validation
  const confidence = 0.8; // Default, can be improved with validation

  // Overall quality score
  const overall = (
    completeness * 0.3 +
    confidence * 0.4 +
    timeliness * 0.3
  );

  return {
    overall: Math.round(overall * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    completeness: Math.round(completeness * 100) / 100,
    timeliness: Math.round(timeliness * 100) / 100,
  };
}

async function generateHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function generateAndStoreEmbedding(
  supabase: any,
  knowledgeItemId: string,
  text: string
): Promise<void> {
  try {
    // Call OpenAI to generate embedding
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.warn("OpenAI API key not found, skipping embedding generation");
      return;
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-large",
        input: text.substring(0, 8000), // Limit to 8K chars
        dimensions: 3072,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const result = await response.json();
    const embedding = result.data[0].embedding;

    // Store embedding
    await supabase.from("knowledge_embeddings").insert({
      knowledge_item_id: knowledgeItemId,
      embedding_model: "text-embedding-3-large",
      embedding_dimensions: 3072,
      embedding: embedding,
      embedding_type: "full_content",
      chunk_text: text.substring(0, 500),
    });
  } catch (error) {
    console.error("Embedding generation error:", error);
    throw error;
  }
}

async function extractAndStoreEntities(
  supabase: any,
  knowledgeItemId: string,
  text: string
): Promise<void> {
  try {
    // Simple entity extraction (can be enhanced with NLP library)
    const entities = extractSimpleEntities(text);

    for (const entity of entities) {
      // Insert or get entity
      const { data: existingEntity } = await supabase
        .from("knowledge_entities")
        .select("id")
        .eq("entity_type", entity.type)
        .eq("normalized_text", entity.normalized)
        .maybeSingle();

      let entityId: string;

      if (existingEntity) {
        entityId = existingEntity.id;
        // Increment occurrence count
        await supabase.rpc("increment_entity_occurrence", {
          entity_id: entityId,
        });
      } else {
        const { data: newEntity } = await supabase
          .from("knowledge_entities")
          .insert({
            entity_type: entity.type,
            entity_text: entity.text,
            normalized_text: entity.normalized,
          })
          .select("id")
          .single();
        entityId = newEntity.id;
      }

      // Store occurrence
      await supabase.from("knowledge_entity_occurrences").insert({
        knowledge_item_id: knowledgeItemId,
        entity_id: entityId,
        position_start: entity.position,
        position_end: entity.position + entity.text.length,
        confidence: 0.7,
        extraction_method: "simple_pattern",
      });
    }
  } catch (error) {
    console.error("Entity extraction error:", error);
    throw error;
  }
}

function extractSimpleEntities(text: string): Array<{
  type: string;
  text: string;
  normalized: string;
  position: number;
}> {
  const entities: Array<any> = [];

  // Simple patterns for common medical terms
  const medicationPattern = /\b(aspirin|metformin|insulin|ibuprofen|acetaminophen)\b/gi;
  const symptomPattern = /\b(headache|nausea|fever|fatigue|pain|dizziness)\b/gi;

  let match;

  // Extract medications
  while ((match = medicationPattern.exec(text)) !== null) {
    entities.push({
      type: "medication",
      text: match[0],
      normalized: match[0].toLowerCase(),
      position: match.index,
    });
  }

  // Extract symptoms
  while ((match = symptomPattern.exec(text)) !== null) {
    entities.push({
      type: "symptom",
      text: match[0],
      normalized: match[0].toLowerCase(),
      position: match.index,
    });
  }

  return entities;
}
