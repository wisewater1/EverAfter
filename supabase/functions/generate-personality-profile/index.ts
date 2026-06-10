import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PersonalityResponse {
  id: string;
  question_text: string;
  answer_text: string;
  sent_at: string;
  answered_at: string;
}

interface TraitExtraction {
  trait_name: string;
  trait_value: string;
  trait_description: string;
  confidence: number;
  evidence: string[];
}

interface PersonalityProfile {
  core_traits: Record<string, any>;
  communication_style: Record<string, any>;
  social_tendencies: Record<string, any>;
  interests: Record<string, any>;
  behavioral_patterns: Record<string, any>;
  relationship_dynamics: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { family_member_id, force_regenerate = false } = await req.json();

    if (!family_member_id) {
      throw new Error("family_member_id is required");
    }

    const startTime = Date.now();

    const { data: familyMember, error: memberError } = await supabase
      .from("family_members")
      .select("*")
      .eq("id", family_member_id)
      .eq("user_id", user.id)
      .single();

    if (memberError || !familyMember) {
      throw new Error("Family member not found");
    }

    const { data: existingProfile } = await supabase
      .from("family_personality_profiles")
      .select("*")
      .eq("family_member_id", family_member_id)
      .single();

    if (existingProfile && !force_regenerate) {
      return new Response(
        JSON.stringify({
          success: true,
          profile: existingProfile,
          message: "Profile already exists. Use force_regenerate=true to regenerate.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: responses, error: responsesError } = await supabase
      .from("family_personality_questions")
      .select("*")
      .eq("family_member_id", family_member_id)
      .eq("status", "answered")
      .order("answered_at", { ascending: true });

    if (responsesError) {
      throw new Error(`Failed to fetch responses: ${responsesError.message}`);
    }

    if (!responses || responses.length < 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Insufficient data",
          message: `Need at least 3 answered questions to generate a profile. Currently have ${responses?.length || 0}.`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: dimensions } = await supabase
      .from("personality_dimensions")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    const profileData: PersonalityProfile = {
      core_traits: {},
      communication_style: {},
      social_tendencies: {},
      interests: {},
      behavioral_patterns: {},
      relationship_dynamics: {},
    };

    const extractedTraits: TraitExtraction[] = [];
    let totalConfidence = 0;

    const responseTexts = responses
      .map((r: any, idx: number) => `Q${idx + 1}: ${r.question_text}\nA${idx + 1}: ${r.answer_text}`)
      .join("\n\n");

    for (const dimension of (dimensions || [])) {
      const dimensionResponses = responses.filter((r: any) =>
        r.question_text.toLowerCase().includes(dimension.dimension_name.toLowerCase()) ||
        r.answer_text.toLowerCase().includes(dimension.dimension_name.toLowerCase())
      );

      const prompt = `You are an expert psychologist analyzing personality responses to build a comprehensive family personality profile.

Dimension: ${dimension.display_name}
Description: ${dimension.description}

Analyze these responses to identify personality traits for this dimension:

${responseTexts}

Extract 2-4 key personality traits for this dimension. For each trait provide:
1. trait_name: A concise descriptor (e.g., "highly_creative", "detail_oriented", "socially_confident")
2. trait_value: A brief value or manifestation (e.g., "High", "Moderate", "Low", or descriptive)
3. trait_description: A 1-2 sentence description of how this trait manifests
4. confidence: A score from 0.0 to 1.0 indicating confidence in this assessment
5. evidence: Key phrases from responses that support this trait (max 3)

Consider:
- Response depth and detail level
- Emotional expression and language patterns
- Values and priorities mentioned
- Communication style and tone
- Behavioral patterns described

Return ONLY a valid JSON array with no additional text:
[{"trait_name": "...", "trait_value": "...", "trait_description": "...", "confidence": 0.0, "evidence": ["...", "..."]}]`;

      try {
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are an expert psychologist specializing in personality assessment. Respond only with valid JSON arrays.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
        });

        if (!openaiResponse.ok) {
          console.error(`OpenAI API error for dimension ${dimension.dimension_name}`);
          continue;
        }

        const aiResult = await openaiResponse.json();
        const content = aiResult.choices[0]?.message?.content || "[]";

        let traits: TraitExtraction[] = [];
        try {
          traits = JSON.parse(content);
        } catch (parseError) {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            traits = JSON.parse(jsonMatch[0]);
          }
        }

        if (Array.isArray(traits) && traits.length > 0) {
          for (const trait of traits) {
            extractedTraits.push({
              ...trait,
              dimension: dimension.dimension_name,
              dimension_category: dimension.dimension_category,
            });

            totalConfidence += trait.confidence || 0.5;

            const category = dimension.dimension_category;
            if (!profileData[category as keyof PersonalityProfile]) {
              profileData[category as keyof PersonalityProfile] = {};
            }

            (profileData[category as keyof PersonalityProfile] as Record<string, any>)[trait.trait_name] = {
              value: trait.trait_value,
              description: trait.trait_description,
              confidence: trait.confidence,
              evidence: trait.evidence || [],
            };
          }
        }
      } catch (error) {
        console.error(`Error processing dimension ${dimension.dimension_name}:`, error);
      }
    }

    const avgConfidence = extractedTraits.length > 0
      ? totalConfidence / extractedTraits.length
      : 0.5;

    const completenessScore = Math.min(
      100,
      Math.round(
        (responses.length / 20) * 40 +
        (extractedTraits.length / 16) * 60
      )
    );

    const behaviorPatterns = analyzePatterns(responses);
    profileData.behavioral_patterns = behaviorPatterns;

    let profileId: string;

    if (existingProfile) {
      const { data: updated, error: updateError } = await supabase
        .from("family_personality_profiles")
        .update({
          profile_data: profileData,
          completeness_score: completenessScore,
          confidence_score: avgConfidence,
          total_responses: responses.length,
          questions_answered: responses.length,
          last_analyzed_at: new Date().toISOString(),
          profile_version: (existingProfile.profile_version || 1) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProfile.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`);
      }

      profileId = updated.id;
    } else {
      const { data: created, error: createError } = await supabase
        .from("family_personality_profiles")
        .insert({
          family_member_id,
          user_id: user.id,
          profile_data: profileData,
          completeness_score: completenessScore,
          confidence_score: avgConfidence,
          total_responses: responses.length,
          questions_answered: responses.length,
          last_analyzed_at: new Date().toISOString(),
          profile_version: 1,
        })
        .select()
        .single();

      if (createError) {
        throw new Error(`Failed to create profile: ${createError.message}`);
      }

      profileId = created.id;
    }

    for (const trait of extractedTraits) {
      const { data: dimension } = await supabase
        .from("personality_dimensions")
        .select("id")
        .eq("dimension_name", (trait as any).dimension)
        .single();

      if (dimension) {
        await supabase.from("personality_traits").insert({
          profile_id: profileId,
          dimension_id: dimension.id,
          trait_name: trait.trait_name,
          trait_value: trait.trait_value,
          trait_description: trait.trait_description,
          confidence_score: trait.confidence,
          supporting_response_ids: responses.slice(0, 5).map((r: any) => r.id),
          evidence_summary: trait.evidence?.join("; ") || "",
        });
      }
    }

    const processingTime = Date.now() - startTime;

    await supabase.from("profile_generation_log").insert({
      profile_id: profileId,
      generation_type: existingProfile ? "full_reanalysis" : "initial",
      responses_analyzed: responses.length,
      traits_extracted: extractedTraits.length,
      patterns_identified: Object.keys(behaviorPatterns).length,
      insights_generated: 0,
      processing_time_ms: processingTime,
      ai_model_used: "gpt-4o-mini",
      success: true,
    });

    const { data: finalProfile } = await supabase
      .from("family_personality_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        profile: finalProfile,
        traits_extracted: extractedTraits.length,
        completeness_score: completenessScore,
        confidence_score: avgConfidence,
        processing_time_ms: processingTime,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error generating personality profile:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function analyzePatterns(responses: any[]): Record<string, any> {
  const patterns: Record<string, any> = {};

  const avgResponseLength = responses.reduce((sum, r) => sum + (r.answer_text?.length || 0), 0) / responses.length;
  patterns.response_depth = avgResponseLength > 300 ? "detailed" : avgResponseLength > 150 ? "moderate" : "brief";

  const responseTimes = responses
    .filter((r) => r.sent_at && r.answered_at)
    .map((r) => {
      const sent = new Date(r.sent_at).getTime();
      const answered = new Date(r.answered_at).getTime();
      return (answered - sent) / (1000 * 60 * 60);
    });

  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    patterns.response_timing = avgResponseTime < 24 ? "prompt" : avgResponseTime < 72 ? "moderate" : "deliberate";
  }

  const emotionWords = ["love", "hate", "joy", "sad", "happy", "angry", "excited", "worried", "afraid", "proud", "grateful"];
  const emotionCount = responses.reduce(
    (count, r) =>
      count + emotionWords.filter((word) => r.answer_text?.toLowerCase().includes(word)).length,
    0
  );
  patterns.emotional_expression = emotionCount > responses.length * 2 ? "highly_expressive" : emotionCount > responses.length ? "moderately_expressive" : "reserved";

  return patterns;
}
