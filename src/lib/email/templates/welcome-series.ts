/**
 * Welcome Series Email Templates
 * Professional email templates for new user onboarding + tester recruitment
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

// Shared email styles
const LOGO_URL =
  "https://***REMOVED***.supabase.co/storage/v1/object/public/assets/logo-512.png";
const BRAND_COLOR = "#ff2d55";
const BRAND_GRADIENT = "linear-gradient(135deg, #ff2d55 0%, #ff5177 100%)";

const emailWrapper = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; color: #1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        ${content}
        <!-- Footer -->
        <tr>
          <td style="background: ${BRAND_GRADIENT}; padding: 30px; text-align: center;">
            <img src="${LOGO_URL}" alt="FoodShare" style="width: 40px; height: 40px; border-radius: 50%; background: white; padding: 2px; margin-bottom: 12px;">
            <p style="margin: 0 0 8px; font-size: 14px; color: rgba(255,255,255,0.9);">FoodShare LLC</p>
            <p style="margin: 0 0 16px; font-size: 12px; color: rgba(255,255,255,0.8);">4632 Winding Way, Sacramento, CA 95841</p>
            <p style="margin: 0; font-size: 12px; color: rgba(255,255,255,0.7);">
              <a href="{{unsubscribe_url}}" style="color: rgba(255,255,255,0.9); text-decoration: underline;">Unsubscribe</a> ·
              <a href="https://foodshare.club/privacy" style="color: rgba(255,255,255,0.9); text-decoration: underline;">Privacy</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
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
  html_content: emailWrapper(`
        <!-- Header -->
        <tr>
          <td style="background: ${BRAND_GRADIENT}; padding: 40px 30px; text-align: center;">
            <img src="${LOGO_URL}" alt="FoodShare" style="width: 80px; height: 80px; border-radius: 50%; background: white; padding: 4px; margin-bottom: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.2);">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Welcome to FoodShare! 🎉</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Join the movement to reduce food waste</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px; line-height: 1.6; color: #1a1a1a;">
              Hi {{first_name}},
            </p>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #444;">
              You're now part of a growing community dedicated to <strong>reducing food waste</strong> and <strong>sharing delicious meals</strong> with neighbors. Every year, millions of pounds of perfectly good food goes to waste — together, we can change that!
            </p>

            <!-- Features -->
            <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="margin: 0 0 16px; font-size: 18px; color: ${BRAND_COLOR};">🌱 What You Can Do</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="font-size: 20px; margin-right: 12px;">🍎</span>
                    <strong>Share Surplus Food</strong> - Post extras for neighbors to pick up
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="font-size: 20px; margin-right: 12px;">🗺️</span>
                    <strong>Discover Food Near You</strong> - Browse the interactive map
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="font-size: 20px; margin-right: 12px;">💬</span>
                    <strong>Connect & Chat</strong> - Coordinate pickups with neighbors
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="font-size: 20px; margin-right: 12px;">📊</span>
                    <strong>Track Your Impact</strong> - See how much food you've saved
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <a href="https://foodshare.club/map" style="display: inline-block; background: ${BRAND_GRADIENT}; color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(255,45,85,0.3);">
                    Explore the Map →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin: 24px 0 0; font-size: 14px; color: #666; text-align: center;">
              Questions? Reply to this email or reach us at <a href="mailto:support@foodshare.club" style="color: ${BRAND_COLOR};">support@foodshare.club</a>
            </p>
          </td>
        </tr>
  `),
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
  html_content: emailWrapper(`
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Complete Your Profile</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">It only takes 2 minutes</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px; line-height: 1.6; color: #1a1a1a;">
              Hi {{first_name}},
            </p>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #444;">
              A complete profile helps you connect better with your local food sharing community. Here's why it matters:
            </p>

            <!-- Benefits -->
            <div style="background: #eff6ff; border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #3b82f6;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #1e40af;">
                    ✓ <strong>Build trust</strong> with neighbors before meeting
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #1e40af;">
                    ✓ <strong>Get personalized alerts</strong> for food near you
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #1e40af;">
                    ✓ <strong>Stand out</strong> when sharing food
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 15px; color: #1e40af;">
                    ✓ <strong>Join local challenges</strong> and earn badges
                  </td>
                </tr>
              </table>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <a href="https://foodshare.club/profile/edit" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(59,130,246,0.3);">
                    Complete Profile →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
  `),
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
  html_content: emailWrapper(`
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Join Our Beta Program</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Help shape the future of FoodShare</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px; line-height: 1.6; color: #1a1a1a;">
              Hi {{first_name}},
            </p>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #444;">
              We're building FoodShare across multiple platforms and need passionate testers like you to help us get it right. Choose your platform (or both!):
            </p>

            <!-- Web App Card -->
            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin: 20px 0; border: 1px solid #86efac;">
              <h3 style="margin: 0 0 12px; font-size: 18px; color: #15803d;">🌐 Web App Beta</h3>
              <p style="margin: 0 0 16px; font-size: 14px; color: #166534; line-height: 1.6;">
                Test new features on foodshare.club before public release
              </p>
              <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 14px; color: #166534;">
                <li>Works on any browser (Chrome, Safari, Firefox)</li>
                <li>No installation required</li>
                <li>Test responsive design on desktop & mobile</li>
              </ul>
              <a href="https://forms.gle/web-tester-form" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Join Web Beta →
              </a>
            </div>

            <!-- iOS App Card -->
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; padding: 24px; margin: 20px 0; border: 1px solid #93c5fd;">
              <h3 style="margin: 0 0 12px; font-size: 18px; color: #1d4ed8;">📱 iOS App Beta (TestFlight)</h3>
              <p style="margin: 0 0 16px; font-size: 14px; color: #1e40af; line-height: 1.6;">
                Get early access to our native iPhone app
              </p>
              <ul style="margin: 0 0 16px; padding-left: 20px; font-size: 14px; color: #1e40af;">
                <li>Requires iPhone/iPad with iOS 17+</li>
                <li>Native push notifications & offline support</li>
                <li>Camera integration for food photos</li>
              </ul>
              <a href="https://forms.gle/ios-tester-form" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Join iOS TestFlight →
              </a>
            </div>

            <!-- Benefits -->
            <div style="background: #faf5ff; border-radius: 12px; padding: 20px; margin: 24px 0; border-left: 4px solid #8b5cf6;">
              <h4 style="margin: 0 0 12px; font-size: 15px; color: #6b21a8;">What testers receive:</h4>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding: 4px 0; font-size: 14px; color: #7c3aed;">✓ Early access to new features</td></tr>
                <tr><td style="padding: 4px 0; font-size: 14px; color: #7c3aed;">✓ Direct communication with our team</td></tr>
                <tr><td style="padding: 4px 0; font-size: 14px; color: #7c3aed;">✓ Credit as a founding contributor</td></tr>
                <tr><td style="padding: 4px 0; font-size: 14px; color: #7c3aed;">✓ Input on product direction</td></tr>
              </table>
            </div>

            <p style="margin: 20px 0 0; font-size: 14px; color: #666; background: #fef3c7; padding: 16px; border-radius: 8px;">
              <strong>Note:</strong> We review applications weekly. TestFlight invites are sent within 48 hours of approval.
            </p>
          </td>
        </tr>
  `),
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
  html_content: emailWrapper(`
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #10b981 0%, #34d399 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🥗</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Ready to Share?</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">Tips for your first food listing</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px; line-height: 1.6; color: #1a1a1a;">
              Hi {{first_name}},
            </p>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #444;">
              Ready to share your first food item? Here's how to create a listing that gets claimed quickly:
            </p>

            <!-- Tips Grid -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding: 10px; vertical-align: top;">
                  <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; height: 100%;">
                    <div style="font-size: 28px; margin-bottom: 8px;">📸</div>
                    <h4 style="margin: 0 0 8px; color: #166534; font-size: 15px;">Great Photos</h4>
                    <p style="margin: 0; font-size: 13px; color: #15803d; line-height: 1.5;">Natural lighting, show quantity, multiple angles</p>
                  </div>
                </td>
                <td width="50%" style="padding: 10px; vertical-align: top;">
                  <div style="background: #eff6ff; border-radius: 12px; padding: 20px; height: 100%;">
                    <div style="font-size: 28px; margin-bottom: 8px;">✍️</div>
                    <h4 style="margin: 0 0 8px; color: #1e40af; font-size: 15px;">Clear Description</h4>
                    <p style="margin: 0; font-size: 13px; color: #2563eb; line-height: 1.5;">What, how much, when made, allergens</p>
                  </div>
                </td>
              </tr>
              <tr>
                <td width="50%" style="padding: 10px; vertical-align: top;">
                  <div style="background: #fef3c7; border-radius: 12px; padding: 20px; height: 100%;">
                    <div style="font-size: 28px; margin-bottom: 8px;">📍</div>
                    <h4 style="margin: 0 0 8px; color: #92400e; font-size: 15px;">Pickup Details</h4>
                    <p style="margin: 0; font-size: 13px; color: #b45309; line-height: 1.5;">Specific location, available times, instructions</p>
                  </div>
                </td>
                <td width="50%" style="padding: 10px; vertical-align: top;">
                  <div style="background: #fce7f3; border-radius: 12px; padding: 20px; height: 100%;">
                    <div style="font-size: 28px; margin-bottom: 8px;">⏰</div>
                    <h4 style="margin: 0 0 8px; color: #9d174d; font-size: 15px;">Smart Timing</h4>
                    <p style="margin: 0; font-size: 13px; color: #be185d; line-height: 1.5;">Share while fresh, realistic expiry dates</p>
                  </div>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 30px 0 10px;">
                  <a href="https://foodshare.club/create" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(16,185,129,0.3);">
                    Share Your First Item →
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin: 20px 0 0; font-size: 14px; color: #666; background: #f0fdf4; padding: 16px; border-radius: 8px; text-align: center;">
              💡 <strong>Pro tip:</strong> Start with non-perishables to get comfortable with the process!
            </p>
          </td>
        </tr>
  `),
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
  html_content: emailWrapper(`
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">🏘️</div>
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Community Highlights</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 15px;">See what your neighbors are sharing</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 17px; line-height: 1.6; color: #1a1a1a;">
              Hi {{first_name}},
            </p>
            <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.7; color: #444;">
              Your local FoodShare community is thriving! Here's what's happening:
            </p>

            <!-- Stats -->
            <div style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 12px; padding: 24px; margin: 20px 0;">
              <h3 style="margin: 0 0 16px; font-size: 16px; color: #c2410c; text-align: center;">🏆 THIS WEEK'S HIGHLIGHTS</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align: center; padding: 10px;">
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ea580c;">150+</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #9a3412;">Items Shared</p>
                  </td>
                  <td width="33%" style="text-align: center; padding: 10px; border-left: 1px solid #fdba74; border-right: 1px solid #fdba74;">
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ea580c;">400+</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #9a3412;">Lbs Saved</p>
                  </td>
                  <td width="33%" style="text-align: center; padding: 10px;">
                    <p style="margin: 0; font-size: 28px; font-weight: 700; color: #ea580c;">50+</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #9a3412;">New Members</p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Did You Know -->
            <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h4 style="margin: 0 0 8px; font-size: 15px; color: #065f46;">💡 Did You Know?</h4>
              <p style="margin: 0; font-size: 14px; color: #047857; line-height: 1.6;">
                The average American household wastes about 30-40% of the food they buy. By sharing through FoodShare, you're directly fighting this waste.
              </p>
            </div>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <a href="https://foodshare.club/map" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); color: white; padding: 16px 40px; border-radius: 50px; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: 0 4px 16px rgba(249,115,22,0.3);">
                    Browse Food Near You →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
  `),
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
];
