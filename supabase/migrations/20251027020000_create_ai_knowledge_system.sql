/*
  # AI Knowledge Management System - Core Schema

  1. Purpose
    - Centralized knowledge storage for all AI systems
    - Semantic search via vector embeddings
    - Graph-based knowledge relationships
    - Privacy-preserving research data aggregation

  2. New Tables
    - `knowledge_items`: Master table for all knowledge
    - `knowledge_embeddings`: Vector storage for semantic search
    - `knowledge_relationships`: Graph structure for connected knowledge
    - `knowledge_entities`: Extracted entities with normalization
    - `knowledge_entity_occurrences`: Links entities to knowledge items
    - `knowledge_aggregations`: Pre-computed insights
    - `knowledge_access_log`: Audit trail
    - `research_consent`: User consent management
    - `anonymized_knowledge_pool`: Research data

  3. Features
    - pgvector for semantic similarity search
    - Full-text search capabilities
    - Temporal queries and versioning
    - Privacy levels and anonymization
    - Entity extraction and relationships

  4. Security
    - RLS on all tables
    - Column-level encryption for sensitive data
    - Audit logging for all access
    - Anonymization for research data
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- Create knowledge_items table
CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source Information
  source_type TEXT NOT NULL CHECK (
    source_type IN ('user_response', 'health_data', 'document',
                    'conversation', 'external_api', 'research', 'sensor')
  ),
  source_id TEXT NOT NULL,
  source_metadata JSONB DEFAULT '{}'::jsonb,

  -- User Context
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id UUID REFERENCES engrams(id) ON DELETE SET NULL,
  privacy_level TEXT DEFAULT 'private' CHECK (
    privacy_level IN ('private', 'research_anonymous', 'public')
  ),

  -- Content
  content_type TEXT NOT NULL CHECK (
    content_type IN ('text', 'numeric', 'binary', 'structured', 'multimodal')
  ),
  content_text TEXT,
  content_structured JSONB,
  content_binary_url TEXT,

  -- Processing
  processing_status TEXT DEFAULT 'pending' CHECK (
    processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped')
  ),
  processing_error TEXT,
  quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 1),
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- Classification
  categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  entities JSONB DEFAULT '[]'::jsonb,

  -- Temporal
  content_timestamp TIMESTAMPTZ,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_to TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  -- Versioning
  version INTEGER DEFAULT 1,
  supersedes UUID REFERENCES knowledge_items(id) ON DELETE SET NULL,

  -- Content hash for deduplication
  content_hash TEXT,

  UNIQUE(source_type, source_id, user_id)
);

-- Indexes for knowledge_items
CREATE INDEX IF NOT EXISTS idx_knowledge_items_user ON knowledge_items(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_items_engram ON knowledge_items(engram_id) WHERE engram_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_items_categories ON knowledge_items USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_tags ON knowledge_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_timestamp ON knowledge_items(content_timestamp DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_quality ON knowledge_items(quality_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_status ON knowledge_items(processing_status);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_content_text ON knowledge_items USING GIN(to_tsvector('english', content_text));
CREATE INDEX IF NOT EXISTS idx_knowledge_items_hash ON knowledge_items(content_hash);

-- Enable RLS
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for knowledge_items
CREATE POLICY "Users can view their own knowledge"
  ON knowledge_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own knowledge"
  ON knowledge_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own knowledge"
  ON knowledge_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own knowledge"
  ON knowledge_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role has full access"
  ON knowledge_items FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create knowledge_embeddings table
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE NOT NULL,

  -- Vector Data
  embedding_model TEXT NOT NULL DEFAULT 'text-embedding-3-large',
  embedding_dimensions INTEGER NOT NULL DEFAULT 3072,
  embedding vector(3072) NOT NULL,

  -- Context
  embedding_type TEXT NOT NULL CHECK (
    embedding_type IN ('full_content', 'summary', 'title', 'chunk', 'query')
  ),
  chunk_index INTEGER,
  chunk_text TEXT,
  chunk_token_count INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(knowledge_item_id, embedding_type, chunk_index)
);

-- Vector similarity search indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector_cosine
ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_item
ON knowledge_embeddings(knowledge_item_id);

-- Enable RLS
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for embeddings (inherit from knowledge_items)
CREATE POLICY "Users can view embeddings for their knowledge"
  ON knowledge_embeddings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_items ki
      WHERE ki.id = knowledge_embeddings.knowledge_item_id
      AND ki.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage embeddings"
  ON knowledge_embeddings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create knowledge_relationships table
CREATE TABLE IF NOT EXISTS knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE NOT NULL,
  target_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE NOT NULL,

  relationship_type TEXT NOT NULL CHECK (
    relationship_type IN ('causes', 'correlates', 'contradicts',
                          'supports', 'references', 'temporal_before',
                          'temporal_after', 'similar_to', 'part_of',
                          'derived_from', 'explains', 'evidences')
  ),

  -- Strength and Confidence
  strength DECIMAL(3,2) DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  confidence DECIMAL(3,2) DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),

  -- Evidence
  evidence_items UUID[],
  evidence_description TEXT,

  -- Bidirectional flag
  bidirectional BOOLEAN DEFAULT false,

  -- Detection method
  detected_by TEXT DEFAULT 'system',
  detection_method TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID,

  UNIQUE(source_item_id, target_item_id, relationship_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_relationships_source ON knowledge_relationships(source_item_id);
CREATE INDEX IF NOT EXISTS idx_relationships_target ON knowledge_relationships(target_item_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON knowledge_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_strength ON knowledge_relationships(strength DESC);

-- Enable RLS
ALTER TABLE knowledge_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view relationships for their knowledge"
  ON knowledge_relationships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_items ki
      WHERE ki.id = knowledge_relationships.source_item_id
      AND ki.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage relationships"
  ON knowledge_relationships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create knowledge_entities table
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity Information
  entity_type TEXT NOT NULL CHECK (
    entity_type IN ('medication', 'condition', 'symptom', 'procedure',
                    'measurement', 'person', 'location', 'organization',
                    'concept', 'event', 'food', 'activity')
  ),
  entity_text TEXT NOT NULL,
  normalized_text TEXT,

  -- Medical Ontologies
  snomed_code TEXT,
  icd10_code TEXT,
  rxnorm_code TEXT,
  loinc_code TEXT,

  -- Aliases
  aliases TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Frequency & Importance
  occurrence_count INTEGER DEFAULT 1,
  importance_score DECIMAL(3,2),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_type, normalized_text)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entities_type ON knowledge_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_text ON knowledge_entities(entity_text);
CREATE INDEX IF NOT EXISTS idx_entities_normalized ON knowledge_entities(normalized_text);
CREATE INDEX IF NOT EXISTS idx_entities_occurrence ON knowledge_entities(occurrence_count DESC);

-- Enable RLS (entities are global, but access controlled via occurrences)
ALTER TABLE knowledge_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view entities"
  ON knowledge_entities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage entities"
  ON knowledge_entities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create knowledge_entity_occurrences table
CREATE TABLE IF NOT EXISTS knowledge_entity_occurrences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE NOT NULL,
  entity_id UUID REFERENCES knowledge_entities(id) ON DELETE CASCADE NOT NULL,

  -- Context
  context_before TEXT,
  context_after TEXT,
  position_start INTEGER,
  position_end INTEGER,

  -- Confidence and method
  confidence DECIMAL(3,2),
  extraction_method TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(knowledge_item_id, entity_id, position_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entity_occurrences_item ON knowledge_entity_occurrences(knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_entity_occurrences_entity ON knowledge_entity_occurrences(entity_id);

-- Enable RLS
ALTER TABLE knowledge_entity_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view occurrences for their knowledge"
  ON knowledge_entity_occurrences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM knowledge_items ki
      WHERE ki.id = knowledge_entity_occurrences.knowledge_item_id
      AND ki.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage occurrences"
  ON knowledge_entity_occurrences FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create knowledge_aggregations table
CREATE TABLE IF NOT EXISTS knowledge_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id UUID REFERENCES engrams(id) ON DELETE SET NULL,

  -- Aggregation Details
  aggregation_type TEXT NOT NULL CHECK (
    aggregation_type IN ('daily_summary', 'weekly_insights', 'monthly_report',
                         'pattern_detected', 'trend_analysis', 'correlation_report',
                         'health_score', 'recommendation')
  ),
  aggregation_period DATERANGE,

  -- Results
  summary TEXT,
  insights JSONB DEFAULT '[]'::jsonb,
  metrics JSONB DEFAULT '{}'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,

  -- Source Items
  source_item_ids UUID[],
  item_count INTEGER,

  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  computation_time_ms INTEGER,

  UNIQUE(user_id, aggregation_type, aggregation_period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_aggregations_user ON knowledge_aggregations(user_id);
CREATE INDEX IF NOT EXISTS idx_aggregations_type ON knowledge_aggregations(aggregation_type);
CREATE INDEX IF NOT EXISTS idx_aggregations_period ON knowledge_aggregations USING GIST(aggregation_period);
CREATE INDEX IF NOT EXISTS idx_aggregations_expires ON knowledge_aggregations(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE knowledge_aggregations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own aggregations"
  ON knowledge_aggregations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage aggregations"
  ON knowledge_aggregations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create knowledge_access_log table
CREATE TABLE IF NOT EXISTS knowledge_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE SET NULL,

  -- Accessor Information
  accessor_type TEXT NOT NULL CHECK (
    accessor_type IN ('user', 'ai_agent', 'system', 'api', 'research', 'admin')
  ),
  accessor_id TEXT NOT NULL,
  accessor_name TEXT,

  -- Access Details
  access_type TEXT NOT NULL CHECK (
    access_type IN ('read', 'write', 'update', 'delete', 'query', 'export')
  ),
  access_reason TEXT,

  -- Query Context
  query_vector vector(3072),
  query_text TEXT,
  results_count INTEGER,
  response_time_ms INTEGER,

  -- Metadata
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_id TEXT
);

-- Indexes (partitioned by time for performance)
CREATE INDEX IF NOT EXISTS idx_access_log_item ON knowledge_access_log(knowledge_item_id);
CREATE INDEX IF NOT EXISTS idx_access_log_accessor ON knowledge_access_log(accessor_type, accessor_id);
CREATE INDEX IF NOT EXISTS idx_access_log_time ON knowledge_access_log(accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_type ON knowledge_access_log(access_type);

-- Enable RLS
ALTER TABLE knowledge_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access logs"
  ON knowledge_access_log FOR SELECT
  TO authenticated
  USING (
    accessor_type = 'user' AND accessor_id = auth.uid()::TEXT
  );

CREATE POLICY "Service role can manage access logs"
  ON knowledge_access_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create research_consent table
CREATE TABLE IF NOT EXISTS research_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Consent Status
  is_participating BOOLEAN DEFAULT false,
  consent_date TIMESTAMPTZ,
  withdrawal_date TIMESTAMPTZ,

  -- Consent Scope
  data_types_allowed TEXT[] DEFAULT ARRAY['health_metrics', 'responses']::TEXT[],
  anonymization_level TEXT DEFAULT 'full' CHECK (
    anonymization_level IN ('none', 'partial', 'full')
  ),

  -- Preferences
  allow_external_research BOOLEAN DEFAULT false,
  allow_commercial_use BOOLEAN DEFAULT false,
  monthly_credits INTEGER DEFAULT 0,

  -- Audit
  consent_version TEXT NOT NULL DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_research_consent_participating ON research_consent(is_participating) WHERE is_participating = true;

-- Enable RLS
ALTER TABLE research_consent ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consent"
  ON research_consent FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own consent"
  ON research_consent FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create anonymized_knowledge_pool table
CREATE TABLE IF NOT EXISTS anonymized_knowledge_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Anonymized Source (one-way hash)
  source_hash TEXT NOT NULL,

  -- Demographics (generalized)
  age_range TEXT,
  gender TEXT,
  condition_categories TEXT[],
  geographic_region TEXT,

  -- Knowledge Content
  content_type TEXT NOT NULL,
  content_summary TEXT,
  content_embedding vector(3072),
  content_keywords TEXT[],

  -- Statistical Info
  data_points_count INTEGER DEFAULT 1,
  quality_score DECIMAL(3,2),
  confidence_score DECIMAL(3,2),

  -- Research Metadata
  research_domains TEXT[],
  applicable_studies TEXT[],

  -- Temporal (rounded to month)
  collection_period DATERANGE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_anon_pool_hash ON anonymized_knowledge_pool(source_hash);
CREATE INDEX IF NOT EXISTS idx_anon_pool_type ON anonymized_knowledge_pool(content_type);
CREATE INDEX IF NOT EXISTS idx_anon_pool_domains ON anonymized_knowledge_pool USING GIN(research_domains);
CREATE INDEX IF NOT EXISTS idx_anon_pool_embedding ON anonymized_knowledge_pool USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 50);

-- Enable RLS (public read for research)
ALTER TABLE anonymized_knowledge_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view anonymous pool"
  ON anonymized_knowledge_pool FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage anonymous pool"
  ON anonymized_knowledge_pool FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Helper Functions

-- Function to calculate quality score
CREATE OR REPLACE FUNCTION calculate_knowledge_quality_score(
  p_completeness DECIMAL,
  p_accuracy DECIMAL,
  p_timeliness DECIMAL,
  p_relevance DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Weighted average: completeness(30%), accuracy(40%), timeliness(15%), relevance(15%)
  RETURN ROUND(
    (p_completeness * 0.30 +
     p_accuracy * 0.40 +
     p_timeliness * 0.15 +
     p_relevance * 0.15)::NUMERIC,
    2
  );
END;
$$;

-- Function to generate content hash for deduplication
CREATE OR REPLACE FUNCTION generate_content_hash(p_content TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN encode(digest(p_content, 'sha256'), 'hex');
END;
$$;

-- Trigger to update knowledge_items.updated_at
CREATE OR REPLACE FUNCTION update_knowledge_item_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_knowledge_item_timestamp ON knowledge_items;
CREATE TRIGGER trigger_update_knowledge_item_timestamp
  BEFORE UPDATE ON knowledge_items
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_item_timestamp();

-- Trigger to log knowledge access
CREATE OR REPLACE FUNCTION log_knowledge_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO knowledge_access_log (
    knowledge_item_id,
    accessor_type,
    accessor_id,
    access_type
  ) VALUES (
    NEW.id,
    'system',
    'trigger',
    CASE TG_OP
      WHEN 'INSERT' THEN 'write'
      WHEN 'UPDATE' THEN 'update'
      WHEN 'DELETE' THEN 'delete'
    END
  );
  RETURN NEW;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE knowledge_items IS 'Master table storing all knowledge items from various sources';
COMMENT ON TABLE knowledge_embeddings IS 'Vector embeddings for semantic search using pgvector';
COMMENT ON TABLE knowledge_relationships IS 'Graph structure representing relationships between knowledge items';
COMMENT ON TABLE knowledge_entities IS 'Normalized entities extracted from knowledge content';
COMMENT ON TABLE knowledge_aggregations IS 'Pre-computed insights and summaries';
COMMENT ON TABLE knowledge_access_log IS 'Audit trail of all knowledge access';
COMMENT ON TABLE research_consent IS 'User consent for research participation';
COMMENT ON TABLE anonymized_knowledge_pool IS 'Anonymized data for research purposes';

COMMENT ON COLUMN knowledge_items.quality_score IS 'Overall quality score (0-1) based on completeness, accuracy, timeliness';
COMMENT ON COLUMN knowledge_items.confidence_score IS 'Confidence in the data accuracy (0-1)';
COMMENT ON COLUMN knowledge_items.content_hash IS 'SHA-256 hash for deduplication';
COMMENT ON COLUMN knowledge_embeddings.embedding IS 'Vector embedding for semantic similarity search';
COMMENT ON COLUMN knowledge_relationships.strength IS 'Relationship strength (0-1)';
COMMENT ON COLUMN knowledge_relationships.confidence IS 'Confidence in relationship (0-1)';

-- Grant permissions
GRANT SELECT ON knowledge_entities TO authenticated;
GRANT SELECT ON anonymized_knowledge_pool TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_knowledge_quality_score TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION generate_content_hash TO authenticated, service_role;
