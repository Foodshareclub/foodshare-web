/**
 * Welcome Series Email Templates
 * Enterprise-grade email templates for FoodShare
 *
 * Design based on welcome-confirmation.html - featuring:
 * - Preheader text for email previews
 * - Decorative top bar
 * - Large centered logo
 * - Card-based content sections
 * - Rich dark footer with social links
 * - MSO conditionals for Outlook
 */

export interface EmailTemplateDefinition {
  name: string;
  slug: string;
  subject: string;
  html_content: string;
  plain_text_content: string;
  category: "automation" | "transactional" | "marketing" | "system";
  variables: string[];
}

// Shared email constants
const LOGO_URL =
  "https://***REMOVED***.supabase.co/storage/v1/object/public/assets/logo-512.png";
const BRAND_COLOR = "#ff2d55";

/**
 * Enterprise email wrapper with full HTML structure
 * Matches the beautiful welcome-confirmation.html design
 */
const emailWrapper = (
  content: string,
  options: {
    preheader?: string;
    title?: string;
  } = {}
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${options.title || "FoodShare"}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7; color: #1d1d1f; -webkit-font-smoothing: antialiased;">

  <!-- Preheader Text (hidden) -->
  ${options.preheader ? `<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${options.preheader}</div>` : ""}

  <!-- Email Container -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f7; padding: 60px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden;">

          <!-- Decorative Top Bar -->
          <tr>
            <td style="height: 6px; background-color: ${BRAND_COLOR};"></td>
          </tr>

          ${content}

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #1d1d1f; padding: 50px 40px; text-align: center;">
              <!-- Social Media -->
              <p style="margin: 0 0 18px; font-size: 13px; color: #86868b; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Connect With Us</p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 30px;">
                <tr>
                  <td align="center">
                    <a href="https://facebook.com/foodshare" style="display: inline-block; margin: 0 8px; width: 44px; height: 44px; background-color: #2d2d2d; border-radius: 50%; line-height: 44px; text-align: center; text-decoration: none;"><span style="font-size: 20px; color: #ffffff; font-family: Georgia, serif; font-weight: bold;">f</span></a>
                    <a href="https://twitter.com/foodshare" style="display: inline-block; margin: 0 8px; width: 44px; height: 44px; background-color: #2d2d2d; border-radius: 50%; line-height: 44px; text-align: center; text-decoration: none;"><span style="font-size: 18px; color: #ffffff; font-weight: bold;">X</span></a>
                    <a href="https://instagram.com/foodshare" style="display: inline-block; margin: 0 8px; width: 44px; height: 44px; background-color: #2d2d2d; border-radius: 50%; line-height: 44px; text-align: center; text-decoration: none;"><span style="font-size: 18px; color: #ffffff; font-family: Arial, sans-serif; font-weight: 900;">IG</span></a>
                    <a href="https://linkedin.com/company/foodshare" style="display: inline-block; margin: 0 8px; width: 44px; height: 44px; background-color: #2d2d2d; border-radius: 50%; line-height: 44px; text-align: center; text-decoration: none;"><span style="font-size: 18px; color: #ffffff; font-family: Arial, sans-serif; font-weight: 700;">in</span></a>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="120" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 0 30px;">
                <tr>
                  <td style="height: 1px; background-color: #3d3d3d;"></td>
                </tr>
              </table>

              <!-- Footer Logo -->
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background-color: #ffffff; border-radius: 50%; padding: 4px;">
                    <img src="${LOGO_URL}" alt="FoodShare" width="36" height="36" style="width: 36px; height: 36px; border-radius: 50%; display: block;">
                  </td>
                </tr>
              </table>

              <!-- Company Info -->
              <p style="margin: 20px 0 0; font-size: 15px; line-height: 1.5; color: #ffffff; font-weight: 600;">FoodShare LLC</p>
              <p style="margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: #86868b;">4632 Winding Way, Sacramento, CA 95841</p>
              <p style="margin: 6px 0 0; font-size: 12px; line-height: 1.5; color: #86868b;">&copy; 2025 All Rights Reserved</p>

              <!-- Contact -->
              <p style="margin: 24px 0 0; font-size: 13px; color: #86868b;">
                Questions? <a href="mailto:support@foodshare.club" style="color: ${BRAND_COLOR}; text-decoration: none; font-weight: 600;">support@foodshare.club</a>
              </p>

              <!-- Footer Links -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 0;">
                <tr>
                  <td align="center">
                    <a href="https://foodshare.club/" style="display: inline-block; margin: 4px 6px; padding: 10px 20px; background-color: #2d2d2d; border-radius: 20px; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600;">Visit Us</a>
                    <a href="https://foodshare.club/privacy" style="display: inline-block; margin: 4px 6px; padding: 10px 20px; background-color: #2d2d2d; border-radius: 20px; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600;">Privacy</a>
                    <a href="{{unsubscribe_url}}" style="display: inline-block; margin: 4px 6px; padding: 10px 20px; background-color: #2d2d2d; border-radius: 20px; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: 600;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Standard header with logo and title
 */
const emailHeader = (title: string, subtitle?: string) => `
          <!-- Header with Logo -->
          <tr>
            <td style="background-color: ${BRAND_COLOR}; padding: 60px 40px 50px; text-align: center;">
              <!-- Logo Container -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 50%; padding: 8px;">
                      <tr>
                        <td>
                          <img src="${LOGO_URL}" alt="FoodShare Logo" width="90" height="90" style="width: 90px; height: 90px; border-radius: 50%; display: block;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <h1 style="margin: 28px 0 0; color: #ffffff; font-size: 36px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2;">${title}</h1>
              ${subtitle ? `<p style="margin: 16px 0 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; font-weight: 500;">${subtitle}</p>` : ""}
            </td>
          </tr>
`;

/**
 * Content section wrapper
 */
const emailContent = (content: string) => `
          <!-- Content Section -->
          <tr>
            <td style="padding: 50px 45px; background-color: #ffffff;">
              ${content}
            </td>
          </tr>
`;

/**
 * Card component for content sections
 */
const emailCard = (content: string) => `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafafa; border-radius: 16px; border: 1px solid #e8e8ed;">
                <tr>
                  <td style="padding: 35px;">
                    ${content}
                  </td>
                </tr>
              </table>
`;

/**
 * Accent box with left border (for callouts)
 */
const emailAccentBox = (content: string, bgColor = "#fff0f3") => `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgColor}; border-radius: 12px; margin-top: 25px;">
                <tr>
                  <td style="padding: 22px 25px; border-left: 4px solid ${BRAND_COLOR};">
                    ${content}
                  </td>
                </tr>
              </table>
`;

/**
 * CTA Button (with Outlook fallback)
 */
const emailButton = (text: string, url: string) => `
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 25px 0;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:56px;v-text-anchor:middle;width:280px;" arcsize="50%" strokecolor="${BRAND_COLOR}" fillcolor="${BRAND_COLOR}">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">${text.toUpperCase()}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${url}" style="display: inline-block; padding: 18px 52px; background-color: ${BRAND_COLOR}; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 700; font-size: 15px; text-transform: uppercase; letter-spacing: 1.5px;">${text}</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
`;

/**
 * Stats row (for impact numbers)
 */
const emailStats = (stats: { value: string; label: string; color?: string }[]) => `
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1d1d1f; border-radius: 16px; margin: 25px 0;">
                <tr>
                  ${stats
                    .map(
                      (stat, i) => `
                  <td width="${Math.floor(100 / stats.length)}%" style="text-align: center; padding: 28px 12px;${i > 0 ? " border-left: 1px solid #3d3d3d;" : ""}">
                    <p style="margin: 0; font-size: 36px; font-weight: 800; color: ${stat.color || BRAND_COLOR};">${stat.value}</p>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #86868b; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.4;">${stat.label}</p>
                  </td>`
                    )
                    .join("")}
                </tr>
              </table>
`;

/**
 * Feature list item
 */
const emailFeatureItem = (emoji: string, title: string, description: string) => `
                    <tr>
                      <td style="padding: 12px 0;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td width="50" style="vertical-align: top; font-size: 24px;">${emoji}</td>
                            <td>
                              <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1d1d1f;">${title}</p>
                              <p style="margin: 4px 0 0; font-size: 14px; color: #424245; line-height: 1.5;">${description}</p>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
`;

// ============================================================================
// TEMPLATE 1: Welcome Email
// ============================================================================
export const welcomeTemplate: EmailTemplateDefinition = {
  name: "Welcome Email",
  slug: "welcome",
  subject: "Welcome to FoodShare! 🍎",
  category: "automation",
  variables: ["first_name", "unsubscribe_url"],
  plain_text_content: `
Welcome to FoodShare, {{first_name}}!

You're now part of a growing community dedicated to reducing food waste and sharing delicious meals with neighbors.

What You Can Do:
- Share surplus food with your community
- Discover food near you on our interactive map
- Connect & chat with neighbors to coordinate pickups
- Track your positive impact on the environment

Get started: https://foodshare.club

Questions? Reply to this email or reach us at support@foodshare.club

FoodShare - Reducing food waste, one share at a time
`.trim(),
  html_content: emailWrapper(
    emailHeader("Welcome to FoodShare!", "Join the movement to reduce food waste") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.8; color: #424245;">
                      You're now part of a growing community dedicated to <strong style="color: #1d1d1f;">reducing food waste</strong> and <strong style="color: #1d1d1f;">sharing delicious meals</strong> with neighbors.
                    </p>

                    <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.8; color: #424245;">
                      Every year, millions of pounds of perfectly good food goes to waste — together, we can change that!
                    </p>

                    <p style="margin: 0 0 20px; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 1px;">What You Can Do</p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${emailFeatureItem("🍎", "Share Surplus Food", "Post extras for neighbors to pick up")}
                      ${emailFeatureItem("🗺️", "Discover Food Near You", "Browse the interactive map")}
                      ${emailFeatureItem("💬", "Connect & Chat", "Coordinate pickups with neighbors")}
                      ${emailFeatureItem("📊", "Track Your Impact", "See how much food you've saved")}
                    </table>

                    ${emailButton("Explore the Map", "https://foodshare.club/map")}
              `)}

              ${emailAccentBox(`
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #86868b;">
                      <strong style="color: ${BRAND_COLOR}; font-size: 15px;">Ready to make a difference?</strong><br>
                      Start by browsing what's available near you, or share your first item today!
                    </p>
              `)}
      `),
    {
      preheader: "Welcome to FoodShare! Start sharing food with your community today.",
      title: "Welcome to FoodShare",
    }
  ),
};

// ============================================================================
// TEMPLATE 2: Complete Profile
// ============================================================================
export const completeProfileTemplate: EmailTemplateDefinition = {
  name: "Complete Profile Reminder",
  slug: "complete-profile",
  subject: "Complete your FoodShare profile 📝",
  category: "automation",
  variables: ["first_name", "unsubscribe_url"],
  plain_text_content: `
Hi {{first_name}},

A complete profile helps you connect better with your local food sharing community!

Why complete your profile?
- Build trust with neighbors
- Get personalized food alerts
- Stand out when sharing food
- Join local food-saving challenges

Complete your profile: https://foodshare.club/profile/edit

It only takes 2 minutes!

Best,
The FoodShare Team
`.trim(),
  html_content: emailWrapper(
    emailHeader("Complete Your Profile", "It only takes 2 minutes") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.8; color: #424245;">
                      A complete profile helps you connect better with your local food sharing community. Here's why it matters:
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${emailFeatureItem("🤝", "Build Trust", "Help neighbors know who you are before meeting")}
                      ${emailFeatureItem("🔔", "Get Personalized Alerts", "Receive notifications for food near you")}
                      ${emailFeatureItem("⭐", "Stand Out", "Complete profiles get more engagement")}
                      ${emailFeatureItem("🏆", "Join Challenges", "Earn badges and participate in local events")}
                    </table>

                    ${emailButton("Complete Your Profile", "https://foodshare.club/profile/edit")}
              `)}

              ${emailAccentBox(`
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #86868b;">
                      <strong style="color: ${BRAND_COLOR}; font-size: 15px;">Quick tip:</strong><br>
                      Add a profile photo — it helps neighbors recognize you when you meet for pickups!
                    </p>
              `)}
      `),
    {
      preheader: "Complete your profile to get the most out of FoodShare!",
      title: "Complete Your Profile",
    }
  ),
};

// ============================================================================
// TEMPLATE 3: Tester Recruitment (Web + iOS)
// ============================================================================
export const testerRecruitmentTemplate: EmailTemplateDefinition = {
  name: "Beta Tester Recruitment",
  slug: "tester-recruitment",
  subject: "Help Shape FoodShare's Future - Join Our Beta Program 🚀",
  category: "automation",
  variables: ["first_name", "unsubscribe_url"],
  plain_text_content: `
Hi {{first_name}},

We're building FoodShare across multiple platforms and need passionate testers like you!

🌐 WEB APP BETA
Test new features on foodshare.club before public release
- Works on any browser
- No installation required
- Help us improve the experience

Sign up: https://forms.gle/web-tester-form

📱 iOS APP BETA (TestFlight)
Get early access to our native iPhone app
- Requires iPhone/iPad with iOS 17+
- Native push notifications & offline support
- First to try new mobile features

Sign up: https://forms.gle/ios-tester-form

As a beta tester, you'll get:
- Early access to new features
- Direct communication with our team
- Credit as a founding contributor
- Input on product direction

We review applications weekly and send TestFlight invites within 48 hours.

Thank you for being part of the FoodShare community!

Best,
The FoodShare Team
`.trim(),
  html_content: emailWrapper(
    emailHeader("Join Our Beta Program", "Help shape the future of FoodShare") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.8; color: #424245;">
                      We're building FoodShare across multiple platforms and need passionate testers like you to help us get it right. Choose your platform (or both!):
                    </p>

                    <!-- Web App Section -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border-radius: 12px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 25px; border-left: 4px solid #16a34a;">
                          <p style="margin: 0 0 12px; font-size: 17px; font-weight: 700; color: #15803d;">🌐 Web App Beta</p>
                          <p style="margin: 0 0 16px; font-size: 14px; color: #166534; line-height: 1.6;">Test new features on foodshare.club before public release</p>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                            <tr><td style="padding: 4px 0; font-size: 13px; color: #166534;">• Works on any browser (Chrome, Safari, Firefox)</td></tr>
                            <tr><td style="padding: 4px 0; font-size: 13px; color: #166534;">• No installation required</td></tr>
                            <tr><td style="padding: 4px 0; font-size: 13px; color: #166534;">• Test responsive design on desktop & mobile</td></tr>
                          </table>
                          <a href="https://forms.gle/web-tester-form" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Join Web Beta →</a>
                        </td>
                      </tr>
                    </table>

                    <!-- iOS App Section -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eff6ff; border-radius: 12px;">
                      <tr>
                        <td style="padding: 25px; border-left: 4px solid #2563eb;">
                          <p style="margin: 0 0 12px; font-size: 17px; font-weight: 700; color: #1d4ed8;">📱 iOS App Beta (TestFlight)</p>
                          <p style="margin: 0 0 16px; font-size: 14px; color: #1e40af; line-height: 1.6;">Get early access to our native iPhone app</p>
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                            <tr><td style="padding: 4px 0; font-size: 13px; color: #1e40af;">• Requires iPhone/iPad with iOS 17+</td></tr>
                            <tr><td style="padding: 4px 0; font-size: 13px; color: #1e40af;">• Native push notifications & offline support</td></tr>
                            <tr><td style="padding: 4px 0; font-size: 13px; color: #1e40af;">• Camera integration for food photos</td></tr>
                          </table>
                          <a href="https://forms.gle/ios-tester-form" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Join iOS TestFlight →</a>
                        </td>
                      </tr>
                    </table>
              `)}

              ${emailAccentBox(`
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR};">What testers receive:</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #86868b;">✓ Early access to new features</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #86868b;">✓ Direct communication with our team</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #86868b;">✓ Credit as a founding contributor</td></tr>
                      <tr><td style="padding: 4px 0; font-size: 14px; color: #86868b;">✓ Input on product direction</td></tr>
                    </table>
              `)}

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 0;">
                <tr>
                  <td style="padding: 20px 25px; text-align: center; background-color: #fef3c7; border-radius: 12px;">
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #92400e;">
                      <strong style="color: #78350f;">Note:</strong> We review applications weekly. TestFlight invites are sent within 48 hours of approval.
                    </p>
                  </td>
                </tr>
              </table>
      `),
    {
      preheader: "Join our beta program and help shape FoodShare's future!",
      title: "Beta Tester Recruitment",
    }
  ),
};

// ============================================================================
// TEMPLATE 4: First Share Tips
// ============================================================================
export const firstShareTipsTemplate: EmailTemplateDefinition = {
  name: "First Share Tips",
  slug: "first-share-tips",
  subject: "Ready to share your first food? 🥗",
  category: "automation",
  variables: ["first_name", "unsubscribe_url"],
  plain_text_content: `
Hi {{first_name}},

Ready to share your first food item? Here's how to create a listing that gets claimed quickly:

📸 Take Great Photos
- Use natural lighting
- Show the actual quantity
- Multiple angles help

✍️ Write a Clear Description
- What it is and how much
- When it was made/purchased
- Any allergens or dietary info

📍 Set Pickup Details
- Specific location (porch, lobby, etc.)
- Available times
- Any special instructions

⏰ Set a Realistic Expiry
- Consider food type
- Don't wait until last minute
- Better to share while fresh

Share your first item: https://foodshare.club/create

Pro tip: Start with non-perishables to get comfortable with the process!

Happy sharing,
The FoodShare Team
`.trim(),
  html_content: emailWrapper(
    emailHeader("Ready to Share?", "Tips for your first food listing") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.8; color: #424245;">
                      Ready to share your first food item? Here's how to create a listing that gets claimed quickly:
                    </p>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${emailFeatureItem("📸", "Take Great Photos", "Use natural lighting, show quantity, multiple angles help")}
                      ${emailFeatureItem("✍️", "Write a Clear Description", "What it is, how much, when made, any allergens")}
                      ${emailFeatureItem("📍", "Set Pickup Details", "Specific location, available times, special instructions")}
                      ${emailFeatureItem("⏰", "Set Smart Timing", "Share while fresh, set realistic expiry dates")}
                    </table>

                    ${emailButton("Share Your First Item", "https://foodshare.club/create")}
              `)}

              ${emailAccentBox(`
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #86868b;">
                      <strong style="color: ${BRAND_COLOR}; font-size: 15px;">💡 Pro tip:</strong><br>
                      Start with non-perishables to get comfortable with the process!
                    </p>
              `)}
      `),
    {
      preheader: "Tips for creating your first food listing on FoodShare!",
      title: "First Share Tips",
    }
  ),
};

// ============================================================================
// TEMPLATE 5: Community Highlights
// ============================================================================
export const communityHighlightsTemplate: EmailTemplateDefinition = {
  name: "Community Highlights",
  slug: "community-highlights",
  subject: "See what your neighbors are sharing 🏘️",
  category: "automation",
  variables: ["first_name", "unsubscribe_url"],
  plain_text_content: `
Hi {{first_name}},

Your local FoodShare community is thriving! Here's what's happening:

🏆 THIS WEEK'S HIGHLIGHTS
- Food items shared this week: 150+
- Pounds of food saved from waste: 400+
- New members joined: 50+

🌟 TOP SHARERS
Community members like you are making a difference every day by sharing surplus food with neighbors.

💡 DID YOU KNOW?
The average American household wastes about 30-40% of the food they buy. By sharing through FoodShare, you're directly fighting this waste.

Browse what's available near you: https://foodshare.club/map

Be part of the solution,
The FoodShare Team
`.trim(),
  html_content: emailWrapper(
    emailHeader("Community Highlights", "See what your neighbors are sharing") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0 0 25px; font-size: 16px; line-height: 1.8; color: #424245;">
                      Your local FoodShare community is thriving! Here's what's happening this week:
                    </p>
              `)}

              <!-- Impact Stats -->
              <p style="margin: 30px 0 15px; font-size: 13px; color: #86868b; text-align: center; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">This Week's Highlights</p>
              ${emailStats([
                { value: "150+", label: "Items<br/>Shared" },
                { value: "400+", label: "Lbs<br/>Saved" },
                { value: "50+", label: "New<br/>Members" },
              ])}

              ${emailAccentBox(
                `
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #86868b;">
                      <strong style="color: ${BRAND_COLOR}; font-size: 15px;">💡 Did You Know?</strong><br>
                      The average American household wastes about 30-40% of the food they buy. By sharing through FoodShare, you're directly fighting this waste.
                    </p>
              `,
                "#ecfdf5"
              )}

              ${emailButton("Browse Food Near You", "https://foodshare.club/map")}
      `),
    {
      preheader: "Your community is thriving! See what neighbors are sharing this week.",
      title: "Community Highlights",
    }
  ),
};

// ============================================================================
// TEMPLATE 6: Volunteer Recruitment
// ============================================================================
export const volunteerRecruitmentTemplate: EmailTemplateDefinition = {
  name: "Volunteer Recruitment",
  slug: "volunteer-recruitment",
  subject: "Volunteer with FoodShare - Make a Difference in Your Community 🤝",
  category: "marketing",
  variables: ["first_name", "unsubscribe_url"],
  plain_text_content: `
Hi {{first_name}},

You've been part of the FoodShare community, and we've loved having you! Now, we're inviting you to take the next step and become a volunteer.

THE PROBLEM WE'RE SOLVING TOGETHER:
- 40% of food produced goes to waste
- 210,000 Sacramento residents face food insecurity
- Every volunteer hour saves ~10 lbs of food

"I used to throw away so much food. Now I share it with my neighbors. This is what community should be." — Sarah M., FoodShare Volunteer

WHY VOLUNTEER?

Make a Real Difference - Help neighbors access fresh food while reducing waste.

Join an Amazing Team - Connect with like-minded people who care about community.

Grow Your Skills - Gain experience in organizing, food safety, and events.

Flexible Commitment - 2 hours/month to 10 hours/week — we have roles that fit your life.

VOLUNTEER ROLES AVAILABLE:

- Food Rescue Coordinators - Collect and distribute surplus food
- Community Ambassadors - Spread the word and onboard new members
- Event Helpers - Support food sharing events and pop-ups
- Tech Champions - Help neighbors navigate the app

Apply now: https://foodshare.club/volunteer

Questions? Reply to this email or reach out at support@foodshare.club

Together, we're building a community where no good food goes to waste.

With gratitude,
The FoodShare Team
`.trim(),
  html_content: emailWrapper(
    emailHeader("Volunteer With Us", "Make a difference in your community") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.8; color: #424245;">
                      You've been part of the FoodShare community, and we've loved having you! Now, we're inviting you to take the next step and become a <strong style="color: #1d1d1f;">volunteer</strong>.
                    </p>
                    <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #424245;">
                      Our volunteers are the heartbeat of FoodShare — they're the ones making sure good food reaches neighbors in need.
                    </p>
              `)}

              <!-- Impact Stats -->
              <p style="margin: 30px 0 15px; font-size: 13px; color: #86868b; text-align: center; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">The Problem We're Solving Together</p>
              ${emailStats([
                { value: "40%", label: "of food produced<br/>goes to waste" },
                { value: "210K", label: "Sacramento residents<br/>face food insecurity" },
                { value: "10 lbs", label: "of food saved<br/>per volunteer hour" },
              ])}

              <!-- Testimonial -->
              ${emailCard(`
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="text-align: center; padding: 10px 20px;">
                          <p style="margin: 0 0 20px; font-size: 20px; font-style: italic; color: #424245; line-height: 1.6;">
                            "I used to throw away so much food. Now I share it with my neighbors. This is what community should be."
                          </p>
                          <p style="margin: 0; font-size: 14px; color: #86868b;">
                            <strong style="color: ${BRAND_COLOR};">— Sarah M.</strong>, FoodShare Volunteer
                          </p>
                        </td>
                      </tr>
                    </table>
              `)}

              <!-- Why Volunteer -->
              <p style="margin: 35px 0 20px; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 1px;">Why Volunteer?</p>
              ${emailCard(`
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${emailFeatureItem("🏘️", "Make a Real Difference", "Help neighbors access fresh food while reducing waste")}
                      ${emailFeatureItem("👥", "Join an Amazing Team", "Connect with like-minded people who care about community")}
                      ${emailFeatureItem("🌱", "Grow Your Skills", "Gain experience in organizing, food safety, and events")}
                      ${emailFeatureItem("💪", "Flexible Commitment", "2 hours/month to 10 hours/week — we have roles that fit your life")}
                    </table>
              `)}

              <!-- Volunteer Roles -->
              ${emailAccentBox(`
                    <p style="margin: 0 0 15px; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR};">Volunteer Roles Available</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e9;">
                          <strong style="color: #1d1d1f;">Food Rescue Coordinators</strong>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">Collect and distribute surplus food from local businesses</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e9;">
                          <strong style="color: #1d1d1f;">Community Ambassadors</strong>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">Spread the word and help onboard new members</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e9;">
                          <strong style="color: #1d1d1f;">Event Helpers</strong>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">Support food sharing events and community pop-ups</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <strong style="color: #1d1d1f;">Tech Champions</strong>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">Help neighbors navigate the app and platform</p>
                        </td>
                      </tr>
                    </table>
              `)}

              ${emailButton("Apply to Volunteer", "https://foodshare.club/volunteer")}
      `),
    {
      preheader: "Join our volunteer team and help reduce food waste in Sacramento!",
      title: "Volunteer with FoodShare",
    }
  ),
};

// ============================================================================
// TEMPLATE 7: Monthly Impact Digest
// ============================================================================
export const monthlyImpactDigestTemplate: EmailTemplateDefinition = {
  name: "Monthly Impact Digest",
  slug: "monthly-impact-digest",
  subject: "Your Community Impact This Month 🌟",
  category: "automation",
  variables: [
    "first_name",
    "month_name",
    "meals_saved",
    "co2_prevented",
    "new_neighbors",
    "top_sharer",
    "unsubscribe_url",
  ],
  plain_text_content: `
Hi {{first_name}},

What a month for our FoodShare community! Here's what we accomplished together in {{month_name}}:

YOUR COMMUNITY'S IMPACT:
- {{meals_saved}} meals saved from waste
- {{co2_prevented}} lbs of CO2 prevented
- {{new_neighbors}} new neighbors joined

COMMUNITY SPOTLIGHT:
This month's top sharer is {{top_sharer}}! Thank you for making a difference.

YOUR PERSONAL STATS:
Check your impact dashboard to see how you've contributed to these amazing numbers.

View your impact: https://foodshare.club/profile/impact

Every share counts. Every meal matters. Thank you for being part of this community.

See you next month,
The FoodShare Team
`.trim(),
  html_content: emailWrapper(
    emailHeader("{{month_name}} Impact Report", "Look what we accomplished together!") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #424245;">
                      What a month for our FoodShare community! Here's what we accomplished <strong style="color: #1d1d1f;">together</strong> in {{month_name}}:
                    </p>
              `)}

              <!-- Impact Stats -->
              <p style="margin: 30px 0 15px; font-size: 13px; color: #86868b; text-align: center; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Community Impact</p>
              ${emailStats([
                { value: "{{meals_saved}}", label: "Meals<br/>Saved" },
                { value: "{{co2_prevented}}", label: "Lbs CO2<br/>Prevented", color: "#10b981" },
                { value: "{{new_neighbors}}", label: "New<br/>Neighbors", color: "#3b82f6" },
              ])}

              <!-- Community Spotlight -->
              ${emailCard(`
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="text-align: center; padding: 10px 20px;">
                          <p style="margin: 0 0 8px; font-size: 12px; color: ${BRAND_COLOR}; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Community Spotlight</p>
                          <p style="margin: 0 0 8px; font-size: 24px; font-weight: 700; color: #1d1d1f;">🏆 {{top_sharer}}</p>
                          <p style="margin: 0; font-size: 14px; color: #86868b;">This month's top sharer — thank you for making a difference!</p>
                        </td>
                      </tr>
                    </table>
              `)}

              ${emailAccentBox(`
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR};">📊 Your Personal Impact</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #86868b;">
                      Check your impact dashboard to see how you've contributed to these amazing community numbers.
                    </p>
              `)}

              ${emailButton("View My Impact", "https://foodshare.club/profile/impact")}

              <p style="margin: 24px 0 0; font-size: 16px; color: #424245; text-align: center; font-style: italic;">
                Every share counts. Every meal matters.<br/>Thank you for being part of this community. 💚
              </p>
      `),
    {
      preheader: "See what our community accomplished together this month!",
      title: "Monthly Impact Digest",
    }
  ),
};

// ============================================================================
// TEMPLATE 8: Milestone Celebration
// ============================================================================
export const milestoneCelebrationTemplate: EmailTemplateDefinition = {
  name: "Milestone Celebration",
  slug: "milestone-celebration",
  subject: "🎉 You've reached a milestone on FoodShare!",
  category: "automation",
  variables: [
    "first_name",
    "milestone_type",
    "milestone_number",
    "total_meals",
    "total_co2",
    "unsubscribe_url",
  ],
  plain_text_content: `
Hi {{first_name}},

🎉 CONGRATULATIONS! You've just hit a huge milestone!

You've shared {{milestone_number}} {{milestone_type}} on FoodShare!

YOUR TOTAL IMPACT:
- {{total_meals}} meals shared with neighbors
- {{total_co2}} lbs of CO2 prevented
- Countless smiles created

You're not just sharing food — you're building community and protecting our planet. That's something to be proud of!

Keep up the amazing work. Your neighbors appreciate you.

Share more: https://foodshare.club/create

With gratitude,
The FoodShare Team

P.S. Share this milestone on social media and inspire others to join the movement!
`.trim(),
  html_content: emailWrapper(
    emailHeader("Congratulations! 🎉", "You've reached a milestone") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              <!-- Milestone Badge -->
              ${emailCard(`
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="text-align: center; padding: 20px;">
                          <p style="margin: 0 0 8px; font-size: 48px;">🏆</p>
                          <p style="margin: 0 0 8px; font-size: 12px; color: #92400e; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Milestone Achieved</p>
                          <p style="margin: 0; font-size: 32px; font-weight: 800; color: #1d1d1f;">{{milestone_number}} {{milestone_type}}</p>
                        </td>
                      </tr>
                    </table>
              `)}

              <p style="margin: 25px 0; font-size: 16px; line-height: 1.7; color: #424245; text-align: center;">
                You're not just sharing food — you're <strong style="color: #1d1d1f;">building community</strong> and <strong style="color: #1d1d1f;">protecting our planet</strong>. That's something to be proud of!
              </p>

              <!-- Total Impact Stats -->
              <p style="margin: 30px 0 15px; font-size: 13px; color: #86868b; text-align: center; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Total Impact</p>
              ${emailStats([
                { value: "{{total_meals}}", label: "Meals<br/>Shared" },
                { value: "{{total_co2}}", label: "Lbs CO2<br/>Prevented", color: "#10b981" },
              ])}

              ${emailButton("Keep Sharing", "https://foodshare.club/create")}

              <p style="margin: 24px 0 0; font-size: 14px; color: #86868b; text-align: center;">
                P.S. Share this milestone on social media and inspire others to join the movement! 🚀
              </p>
      `),
    {
      preheader: "Congratulations! You've reached a milestone on FoodShare!",
      title: "Milestone Celebration",
    }
  ),
};

// ============================================================================
// TEMPLATE 9: Welcome to the Neighborhood
// ============================================================================
export const welcomeNeighborhoodTemplate: EmailTemplateDefinition = {
  name: "Welcome to the Neighborhood",
  slug: "welcome-neighborhood",
  subject: "Welcome to the neighborhood, {{first_name}}! 🏘️",
  category: "automation",
  variables: [
    "first_name",
    "neighborhood_name",
    "nearby_sharers",
    "recent_listings",
    "unsubscribe_url",
  ],
  plain_text_content: `
Hi {{first_name}},

Welcome to the {{neighborhood_name}} FoodShare community! 🏘️

You've just joined a group of neighbors who believe that good food shouldn't go to waste. Here's what's happening in your area:

YOUR NEIGHBORS:
{{nearby_sharers}} neighbors are already sharing food near you.

RECENT LISTINGS NEARBY:
{{recent_listings}}

GETTING STARTED:

1. Complete your profile - Help neighbors know who you are
2. Browse the map - See what's available nearby
3. Share something - Got extras? Post your first listing!

Explore your neighborhood: https://foodshare.club/map

We're excited to have you. Welcome to the family!

The FoodShare Team
`.trim(),
  html_content: emailWrapper(
    emailHeader("Welcome to {{neighborhood_name}}!", "Your neighbors are excited to meet you") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #424245;">
                      Welcome to the <strong style="color: #1d1d1f;">{{neighborhood_name}}</strong> FoodShare community! You've just joined a group of neighbors who believe that good food shouldn't go to waste.
                    </p>
              `)}

              <!-- Neighbors Stat -->
              ${emailStats([
                {
                  value: "{{nearby_sharers}}",
                  label: "Neighbors already<br/>sharing near you",
                  color: "#10b981",
                },
              ])}

              <!-- Getting Started Steps -->
              ${emailAccentBox(`
                    <p style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR};">🚀 Getting Started</p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e9;">
                          <strong style="color: #1d1d1f;">1. Complete your profile</strong>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">Help neighbors know who you are</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #ffe4e9;">
                          <strong style="color: #1d1d1f;">2. Browse the map</strong>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">See what's available nearby</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <strong style="color: #1d1d1f;">3. Share something</strong>
                          <p style="margin: 4px 0 0; font-size: 13px; color: #86868b;">Got extras? Post your first listing!</p>
                        </td>
                      </tr>
                    </table>
              `)}

              ${emailButton("Explore Your Neighborhood", "https://foodshare.club/map")}

              <p style="margin: 24px 0 0; font-size: 16px; color: #424245; text-align: center; font-style: italic;">
                We're excited to have you. Welcome to the family! 💚
              </p>
      `),
    {
      preheader: "Welcome to your neighborhood on FoodShare! Your neighbors are ready to share.",
      title: "Welcome to the Neighborhood",
    }
  ),
};

// ============================================================================
// TEMPLATE 10: Re-engagement (We Miss You)
// ============================================================================
export const reengagementTemplate: EmailTemplateDefinition = {
  name: "We Miss You",
  slug: "reengagement-miss-you",
  subject: "We miss you, {{first_name}}! Your neighbors are still sharing 🥗",
  category: "automation",
  variables: [
    "first_name",
    "days_inactive",
    "nearby_listings",
    "community_meals_saved",
    "unsubscribe_url",
  ],
  plain_text_content: `
Hi {{first_name}},

We noticed you haven't been on FoodShare in a while, and we wanted to check in. Your neighbors miss you!

WHILE YOU WERE AWAY:
- Your community saved {{community_meals_saved}} meals
- {{nearby_listings}} new listings posted near you
- New neighbors joined and are ready to share

WHAT'S NEW:
We've been busy making FoodShare even better — faster map loading, easier posting, and more ways to connect with neighbors.

Come back and see what's cooking: https://foodshare.club/map

Whether you're sharing or claiming, your participation makes our community stronger. We'd love to see you back!

Warmly,
The FoodShare Team

P.S. Got feedback? We'd love to hear why you've been away. Just reply to this email.
`.trim(),
  html_content: emailWrapper(
    emailHeader("We Miss You!", "Your neighbors are still sharing") +
      emailContent(`
              <p style="margin: 0 0 20px; font-size: 18px; line-height: 1.7; color: #1d1d1f;">
                Hi <strong style="color: ${BRAND_COLOR};">{{first_name}}</strong>,
              </p>

              ${emailCard(`
                    <p style="margin: 0; font-size: 16px; line-height: 1.8; color: #424245;">
                      We noticed you haven't been on FoodShare in a while, and we wanted to check in. <strong style="color: #1d1d1f;">Your neighbors miss you!</strong>
                    </p>
              `)}

              <!-- What's Happened Stats -->
              <p style="margin: 30px 0 15px; font-size: 13px; color: #86868b; text-align: center; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">While You Were Away</p>
              ${emailStats([
                { value: "{{community_meals_saved}}", label: "Meals Saved<br/>by your community" },
                {
                  value: "{{nearby_listings}}",
                  label: "New Listings<br/>posted near you",
                  color: "#10b981",
                },
              ])}

              ${emailAccentBox(`
                    <p style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR};">✨ What's New</p>
                    <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #86868b;">
                      We've been busy making FoodShare even better — faster map loading, easier posting, and more ways to connect with neighbors.
                    </p>
              `)}

              <p style="margin: 25px 0; font-size: 16px; line-height: 1.7; color: #424245; text-align: center;">
                Whether you're sharing or claiming, your participation makes our community stronger. <strong style="color: #1d1d1f;">We'd love to see you back!</strong>
              </p>

              ${emailButton("See What's Cooking", "https://foodshare.club/map")}

              <p style="margin: 24px 0 0; font-size: 14px; color: #86868b; text-align: center;">
                P.S. Got feedback? We'd love to hear why you've been away.<br/>Just reply to this email — we read every message.
              </p>
      `),
    {
      preheader: "We miss you! Your neighbors are still sharing food on FoodShare.",
      title: "We Miss You",
    }
  ),
};

// ============================================================================
// ALL TEMPLATES
// ============================================================================
export const welcomeSeriesTemplates: EmailTemplateDefinition[] = [
  welcomeTemplate,
  completeProfileTemplate,
  testerRecruitmentTemplate,
  firstShareTipsTemplate,
  communityHighlightsTemplate,
  volunteerRecruitmentTemplate,
  monthlyImpactDigestTemplate,
  milestoneCelebrationTemplate,
  welcomeNeighborhoodTemplate,
  reengagementTemplate,
];
