import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ErrorResponse {
  code: string;
  message: string;
  hint?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, hint?: string, status = 500): Response {
  const body: ErrorResponse = { code, message };
  if (hint) body.hint = hint;
  return jsonResponse(body, status);
}

// Generate unique public chat token
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 1. Extract and validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "AUTH_MISSING",
        "Missing Authorization header",
        "Client must send JWT in Authorization: Bearer <token> header",
        401
      );
    }

    // 2. Create Supabase client with forwarded JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("CONFIG_MISSING", "Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "AUTH_FAILED",
        "Invalid or expired session",
        "User must be authenticated",
        401
      );
    }

    const method = req.method;

    // GET - Fetch career profile
    if (method === "GET") {
      const { data: profile, error } = await supabase
        .from('career_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return jsonResponse({
        profile: profile || null,
        has_profile: !!profile
      });
    }

    // POST/PUT - Create or update career profile
    if (method === "POST" || method === "PUT") {
      const body = await req.json().catch(() => null);
      if (!body) {
        return errorResponse("INVALID_JSON", "Request body must be valid JSON", undefined, 400);
      }

      const {
        linkedin_summary,
        current_role,
        industry,
        years_experience,
        skills,
        career_interests,
        public_chat_enabled,
        public_chat_greeting,
        generate_new_token
      } = body;

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('career_profiles')
        .select('id, public_chat_token')
        .eq('user_id', user.id)
        .single();

      // Prepare update data
      const profileData: Record<string, any> = {
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      // Only include fields that are provided
      if (linkedin_summary !== undefined) profileData.linkedin_summary = linkedin_summary;
      if (current_role !== undefined) profileData.current_role = current_role;
      if (industry !== undefined) profileData.industry = industry;
      if (years_experience !== undefined) profileData.years_experience = years_experience;
      if (skills !== undefined) profileData.skills = skills;
      if (career_interests !== undefined) profileData.career_interests = career_interests;
      if (public_chat_enabled !== undefined) profileData.public_chat_enabled = public_chat_enabled;
      if (public_chat_greeting !== undefined) profileData.public_chat_greeting = public_chat_greeting;

      // Generate new public chat token if requested or if enabling public chat without one
      if (generate_new_token || (public_chat_enabled && !existingProfile?.public_chat_token)) {
        // Generate unique token
        let token = generateToken();
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          const { data: existing } = await supabase
            .from('career_profiles')
            .select('id')
            .eq('public_chat_token', token)
            .single();

          if (!existing) break;
          token = generateToken();
          attempts++;
        }

        if (attempts >= maxAttempts) {
          return errorResponse("TOKEN_GENERATION_FAILED", "Could not generate unique token");
        }

        profileData.public_chat_token = token;
      }

      let result;

      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('career_profiles')
          .update(profileData)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('career_profiles')
          .insert(profileData)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return jsonResponse({
        success: true,
        profile: result,
        message: existingProfile ? 'Profile updated successfully' : 'Profile created successfully'
      });
    }

    // DELETE - Delete career profile
    if (method === "DELETE") {
      const { error } = await supabase
        .from('career_profiles')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      return jsonResponse({
        success: true,
        message: 'Profile deleted successfully'
      });
    }

    return errorResponse("METHOD_NOT_ALLOWED", `Method ${method} not allowed`, undefined, 405);

  } catch (error: any) {
    console.error("Unhandled error in career-profile-update:", error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("SERVER_ERROR", message, "Check function logs for details");
  }
});
