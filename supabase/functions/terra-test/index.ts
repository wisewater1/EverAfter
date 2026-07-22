import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  AuthError,
  corsPreflight,
  errorResponse,
  jsonResponse,
  requireUser,
  serviceClient,
} from "../_shared/http.ts";

// Terra API v2 authenticates with two headers: `dev-id` and `x-api-key`.
const TERRA_API_BASE = "https://api.tryterra.co/v2";

interface TestRequest {
  action?: string;
  api_key?: string;
  dev_id?: string;
  webhook_secret?: string;
}

/**
 * Probe our own terra-webhook with an UNSIGNED body to confirm it is deployed
 * and fail-closed. terra-webhook rejects any request without a Terra-Signature
 * header with 401 ("Missing signature") BEFORE it writes or normalizes any
 * data, and returns 503 when the signing secret is unset. Nothing is ever
 * injected — the probe is rejected by design, which is precisely the property
 * we are verifying. (The previous version of this file used the service-role
 * key to POST fabricated health payloads into a caller-supplied user_id with no
 * authentication; that injection vector has been removed entirely.)
 */
async function probeWebhook(): Promise<{ ok: boolean; detail: string }> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/terra-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Only present to pass the API gateway; terra-webhook ignores it and
        // trusts solely the (deliberately absent) Terra-Signature header.
        apikey: ANON,
        Authorization: `Bearer ${ANON}`,
      },
      body: JSON.stringify({
        type: "connectivity_probe",
        user: { user_id: "connectivity-probe", provider: "TEST" },
      }),
    });

    if (res.status === 401) {
      return {
        ok: true,
        detail:
          "Webhook is deployed and enforcing signatures — the unsigned probe was correctly rejected.",
      };
    }
    if (res.status === 503) {
      return {
        ok: false,
        detail:
          "Webhook is deployed but TERRA_WEBHOOK_SECRET is not configured on the server.",
      };
    }
    if (res.status === 200) {
      return {
        ok: false,
        detail:
          "Webhook accepted an unsigned request — signature verification is NOT being enforced.",
      };
    }
    return {
      ok: false,
      detail: `Webhook responded with an unexpected status (${res.status}).`,
    };
  } catch (err) {
    return {
      ok: false,
      detail: `Webhook is unreachable: ${
        err instanceof Error ? err.message : "network error"
      }.`,
    };
  }
}

/**
 * Validate the caller-supplied Terra dev-id + api-key against the live Terra
 * API. These are the user's OWN credentials, entered in the setup wizard, so
 * this is a genuine credential check — not a mock. Credentials are never logged.
 */
async function validateTerraCredentials(
  devId: string,
  apiKey: string,
): Promise<{ valid: boolean; detail: string }> {
  try {
    const res = await fetch(`${TERRA_API_BASE}/subscriptions`, {
      method: "GET",
      headers: { "dev-id": devId, "x-api-key": apiKey },
    });
    if (res.status === 200) {
      return { valid: true, detail: "Terra accepted the credentials." };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        valid: false,
        detail: "Terra rejected the developer ID / API key.",
      };
    }
    return { valid: false, detail: `Terra returned status ${res.status}.` };
  } catch (err) {
    return {
      valid: false,
      detail: `Could not reach Terra: ${
        err instanceof Error ? err.message : "network error"
      }.`,
    };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsPreflight(req);
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  try {
    // AUTH: a real signed-in user is required. The public anon key (which alone
    // satisfies the API gateway) resolves to no user here and is rejected —
    // closing the prior unauthenticated service-role injection hole.
    const user = await requireUser(req);

    const body = (await req.json().catch(() => ({}))) as TestRequest;
    const action = body.action;

    if (action === "validate_credentials") {
      const devId = (body.dev_id ?? "").trim();
      const apiKey = (body.api_key ?? "").trim();
      if (!devId || !apiKey) {
        return jsonResponse(req, {
          valid: false,
          error: "Developer ID and API key are required.",
          details: "Fill in every field before validating.",
        });
      }
      const { valid, detail } = await validateTerraCredentials(devId, apiKey);
      return jsonResponse(req, {
        valid,
        error: valid ? undefined : "Invalid Terra credentials",
        details: detail,
      });
    }

    if (action === "test_webhook") {
      const { ok, detail } = await probeWebhook();
      return jsonResponse(req, {
        success: ok,
        error: ok ? undefined : "Webhook test failed",
        details: detail,
      });
    }

    if (action === "full_integration_test") {
      const checks: { name: string; ok: boolean; detail: string }[] = [];

      // 1. Authentication — we already resolved a real user.
      checks.push({
        name: "Authentication",
        ok: true,
        detail: `Signed in as ${user.email ?? user.id}.`,
      });

      // 2. Database connectivity + Terra linkage for THIS user only.
      try {
        const svc = serviceClient();
        const { error, data } = await svc
          .from("terra_users")
          .select("terra_user_id, provider")
          .eq("user_id", user.id)
          .limit(5);
        if (error) {
          checks.push({
            name: "Database connectivity",
            ok: false,
            detail: error.message,
          });
        } else {
          checks.push({
            name: "Database connectivity",
            ok: true,
            detail:
              `Reachable — ${data?.length ?? 0} Terra link(s) on file for your account.`,
          });
        }
      } catch (err) {
        checks.push({
          name: "Database connectivity",
          ok: false,
          detail: err instanceof Error ? err.message : "Query failed.",
        });
      }

      // 3. Webhook deployed + fail-closed.
      const webhook = await probeWebhook();
      checks.push({
        name: "Webhook signature enforcement",
        ok: webhook.ok,
        detail: webhook.detail,
      });

      const success = checks.every((c) => c.ok);
      return jsonResponse(req, {
        success,
        error: success ? undefined : "One or more integration checks failed",
        details: checks
          .map((c) => `${c.ok ? "✓" : "✗"} ${c.name}: ${c.detail}`)
          .join("  "),
        checks,
      });
    }

    return errorResponse(req, `Unknown action: ${action ?? "(none)"}`, 400);
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(req, error.message, error.status);
    }
    console.error(
      "Error in terra-test:",
      error instanceof Error ? error.message : "unknown",
    );
    return jsonResponse(
      req,
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
