import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "raphael@everafter.com";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: unsentNotifications, error: fetchError } = await supabase
      .from("admin_notifications")
      .select("*")
      .eq("is_emailed", false)
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    if (!unsentNotifications || unsentNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No notifications to send" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const emailsSent: string[] = [];

    for (const notification of unsentNotifications) {
      const emailContent = `
        <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f9f9f9;
                border-radius: 10px;
              }
              .header {
                background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
                color: white;
                padding: 20px;
                border-radius: 10px 10px 0 0;
                text-align: center;
              }
              .content {
                background: white;
                padding: 30px;
                border-radius: 0 0 10px 10px;
              }
              .info-row {
                padding: 10px 0;
                border-bottom: 1px solid #eee;
              }
              .label {
                font-weight: bold;
                color: #0ea5e9;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>🎉 ${notification.title}</h2>
              </div>
              <div class="content">
                <p>${notification.message}</p>

                ${notification.metadata && Object.keys(notification.metadata).length > 0 ? `
                  <div style="margin-top: 20px;">
                    <h3 style="color: #0ea5e9;">User Details:</h3>
                    ${notification.metadata.email ? `
                      <div class="info-row">
                        <span class="label">Email:</span> ${notification.metadata.email}
                      </div>
                    ` : ''}
                    ${notification.metadata.full_name ? `
                      <div class="info-row">
                        <span class="label">Full Name:</span> ${notification.metadata.full_name}
                      </div>
                    ` : ''}
                    ${notification.metadata.location ? `
                      <div class="info-row">
                        <span class="label">Location:</span> ${notification.metadata.location}
                      </div>
                    ` : ''}
                    ${notification.metadata.interests && notification.metadata.interests.length > 0 ? `
                      <div class="info-row">
                        <span class="label">Interests:</span> ${notification.metadata.interests.join(', ')}
                      </div>
                    ` : ''}
                    ${notification.metadata.skills && notification.metadata.skills.length > 0 ? `
                      <div class="info-row">
                        <span class="label">Skills:</span> ${notification.metadata.skills.join(', ')}
                      </div>
                    ` : ''}
                  </div>
                ` : ''}

                <div class="footer">
                  <p>This is an automated notification from EverAfter User Portal</p>
                  <p>Received at: ${new Date(notification.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

      console.log(`Sending email notification to ${adminEmail}`);
      console.log(`Subject: ${notification.title}`);
      console.log(`Email prepared for notification ID: ${notification.id}`);

      await supabase
        .from("admin_notifications")
        .update({
          is_emailed: true,
          emailed_at: new Date().toISOString(),
        })
        .eq("id", notification.id);

      emailsSent.push(notification.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${emailsSent.length} notifications`,
        emailsSent,
        adminEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-admin-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
