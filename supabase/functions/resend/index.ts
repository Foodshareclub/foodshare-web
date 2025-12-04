import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "2.0.0";
const RESEND_API_URL = "https://api.resend.com/emails";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailPayload {
  record?: { email: string; nickname?: string; first_name?: string };
  old_record?: { email: string; nickname?: string; first_name?: string };
  type: "INSERT" | "DELETE";
}

function getEmailTemplate(isDeleted: boolean, email: string, name: string): string {
  const displayName = name || email.split("@")[0];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isDeleted ? "Sorry to see you go" : "Welcome to FoodShare"}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #363a57; max-width: 600px; margin: 0 auto; padding: 20px; }
    .container { background: linear-gradient(135deg, #f3f2f5 0%, #ffffff 100%); border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    h1 { color: #363a57; text-align: center; font-size: 28px; margin-bottom: 24px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo img { max-width: 100%; height: auto; border-radius: 12px; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #ff2d55 0%, #ff385c 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 12px; margin: 24px auto; text-align: center; font-weight: 600; box-shadow: 0 4px 12px rgba(255,45,85,0.3); transition: transform 0.2s; }
    .cta-button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(255,45,85,0.4); }
    .footer { background: linear-gradient(135deg, #ff2d55 0%, #ff385c 100%); color: white; text-align: center; padding: 24px; border-radius: 12px; margin-top: 32px; font-size: 14px; }
    .footer a { color: white; text-decoration: underline; }
    ul { padding-left: 20px; }
    li { margin: 8px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="https://i.ibb.co/d6sMFKD/Cover.png" alt="FoodShare Logo" width="504">
    </div>
    <h1>${isDeleted ? "We're Sad to See You Go 😢" : "Welcome to FoodShare! 🎉"}</h1>
    <p>Hey ${displayName},</p>
    ${
      isDeleted
        ? `<p>We're very sad to see you go. Your presence in our community will be missed. If there's anything we could have done better, please don't hesitate to let us know.</p>
         <p>Remember, you're always welcome back if you change your mind!</p>`
        : `<p>We're thrilled to have you join the FoodShare community! Get ready to embark on a journey of delicious discoveries and meaningful connections.</p>
         <p>Here's what you can do next:</p>
         <ul>
           <li>🍎 Share surplus food with your community</li>
           <li>🗺️ Discover food near you on our interactive map</li>
           <li>💬 Connect with other food enthusiasts</li>
           <li>🌍 Help reduce food waste together</li>
         </ul>`
    }
    <div style="text-align: center;">
      <a href="${isDeleted ? "https://eu-submit.jotform.com/231016600816041" : "https://foodshare.club/products"}" class="cta-button">
        ${isDeleted ? "📝 Give Feedback" : "🚀 Get Started"}
      </a>
    </div>
    <p>Best regards,<br><strong>The FoodShare Team</strong></p>
  </div>
  <div class="footer">
    <p><strong>FoodShare LLC © ${new Date().getFullYear()}</strong> | USA 20231394981</p>
    <p>4632 Winding Way, Sacramento CA 95841</p>
    <p>Questions? Contact us at <a href="mailto:support@foodshare.club">support@foodshare.club</a></p>
    <p>
      <a href="https://foodshare.club/">Visit Us</a> | 
      <a href="https://app.gitbook.com/o/S1q71czYZ02oMxTaZgTT/s/XbVLvP6lx1ACYUl8wUUI/">Privacy Policy</a> | 
      <a href="https://app.gitbook.com/o/S1q71czYZ02oMxTaZgTT/s/XbVLvP6lx1ACYUl8wUUI/terms-of-use">Terms of Use</a>
    </p>
  </div>
</body>
</html>
`;
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!resendApiKey) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "FoodShare <support@foodshare.club>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend API error:", error);
      return false;
    }

    const data = await response.json();
    console.log("Email sent successfully:", data);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID();
  const start = Date.now();

  try {
    const payload: any = await req.json();

    // Check if this is a direct email request (from Telegram bot)
    if (payload.to && payload.subject && payload.html) {
      const sent = await sendEmail(payload.to, payload.subject, payload.html);

      return new Response(
        JSON.stringify({
          success: sent,
          message: sent ? "Email sent successfully" : "Failed to send email",
          requestId,
          responseTime: Date.now() - start,
        }),
        {
          status: sent ? 200 : 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Request-Id": requestId,
            "X-Version": VERSION,
          },
        }
      );
    }

    // Handle database trigger format (original functionality)
    const isDeleted = !!payload.old_record;
    const user = isDeleted ? payload.old_record! : payload.record!;

    if (!user || !user.email) {
      return new Response(JSON.stringify({ success: false, error: "No email provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const displayName = user.first_name || user.nickname || user.email.split("@")[0];
    const subject = isDeleted ? "Sorry to see you go" : "Welcome to FoodShare! 🎉";
    const html = getEmailTemplate(isDeleted, user.email, displayName);

    const sent = await sendEmail(user.email, subject, html);

    return new Response(
      JSON.stringify({
        success: sent,
        message: sent ? "Email sent successfully" : "Failed to send email",
        requestId,
        responseTime: Date.now() - start,
      }),
      {
        status: sent ? 200 : 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
          "X-Version": VERSION,
        },
      }
    );
  } catch (error: unknown) {
    console.error("Function error:", error);
    const errorMessage = error instanceof Error ? error.message : "internal_server_error";
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        requestId,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
