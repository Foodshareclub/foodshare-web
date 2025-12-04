import OpenAI from 'openai';
import { supabase } from '../../lib/supabase/client';

// Grok model configuration with pricing
const MODELS = {
  QUICK_INSIGHTS: 'grok-3-mini',              // $0.30/$0.50 - Best value
  FAST_REASONING: 'grok-4-fast-non-reasoning', // $0.20/$0.50 - Fast & cheap
  DEEP_ANALYSIS: 'grok-4-fast-reasoning',      // $0.20/$0.50 - Complex queries
  PREMIUM: 'grok-4'                            // $3/$15 - Critical insights only
} as const;

// Cache for insights to reduce API calls
const insightCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 3600000; // 1 hour

// Initialize Grok client
const getGrokClient = () => {
  const apiKey = process.env.XAI_API_KEY || process.env.NEXT_PUBLIC_XAI_API_KEY;

  if (!apiKey) {
    throw new Error('XAI_API_KEY not found in environment variables');
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://api.x.ai/v1',
  });
};

// Database query helpers
export const getDatabaseMetrics = async () => {
  try {
    // Get user statistics
    const { data: userStats, error: userError } = await supabase
      .from('users')
      .select('id, created_at, last_sign_in_at');

    if (userError) throw userError;

    // Get listing statistics
    const { data: listingStats, error: listingError } = await supabase
      .from('listings')
      .select('id, created_at, status, category, views');

    if (listingError) throw listingError;

    // Get message statistics
    const { data: messageStats, error: messageError } = await supabase
      .from('messages')
      .select('id, created_at');

    if (messageError) throw messageError;

    // Calculate metrics
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeUsers7d = userStats?.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) > last7Days
    ).length || 0;

    const activeUsers30d = userStats?.filter(
      u => u.last_sign_in_at && new Date(u.last_sign_in_at) > last30Days
    ).length || 0;

    const newListings7d = listingStats?.filter(
      l => new Date(l.created_at) > last7Days
    ).length || 0;

    const newListings30d = listingStats?.filter(
      l => new Date(l.created_at) > last30Days
    ).length || 0;

    return {
      totalUsers: userStats?.length || 0,
      activeUsers7d,
      activeUsers30d,
      totalListings: listingStats?.length || 0,
      activeListings: listingStats?.filter(l => l.status === 'available').length || 0,
      newListings7d,
      newListings30d,
      totalMessages: messageStats?.length || 0,
      listingsByCategory: listingStats?.reduce((acc: Record<string, number>, l) => {
        acc[l.category] = (acc[l.category] || 0) + 1;
        return acc;
      }, {}),
      averageViews: listingStats?.reduce((sum, l) => sum + (l.views || 0), 0) / (listingStats?.length || 1),
    };
  } catch (error) {
    console.error('Error fetching database metrics:', error);
    throw error;
  }
};

// Get user churn insights
export const getUserChurnData = async () => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, created_at, last_sign_in_at, email');

  if (error) throw error;

  const now = new Date();
  const inactiveThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const churnRisk = users?.filter(
    u => u.last_sign_in_at && new Date(u.last_sign_in_at) < inactiveThreshold
  );

  return {
    totalUsers: users?.length || 0,
    atRiskUsers: churnRisk?.length || 0,
    churnRate: ((churnRisk?.length || 0) / (users?.length || 1)) * 100,
  };
};

// Get email campaign insights
export const getEmailCampaignData = async () => {
  try {
    const { data: emails, error } = await supabase
      .from('email_logs')
      .select('id, created_at, status, provider, template_id')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const successRate = ((emails?.filter(e => e.status === 'sent').length || 0) / (emails?.length || 1)) * 100;

    // Analyze send times
    const sendTimes = emails?.reduce((acc: Record<number, number>, email) => {
      const hour = new Date(email.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const bestSendTime = Object.entries(sendTimes || {}).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      totalEmails: emails?.length || 0,
      successRate,
      bestSendTime: bestSendTime ? `${bestSendTime}:00` : 'N/A',
      providerStats: emails?.reduce((acc: Record<string, number>, e) => {
        acc[e.provider] = (acc[e.provider] || 0) + 1;
        return acc;
      }, {}),
    };
  } catch (error) {
    console.error('Error fetching email campaign data:', error);
    return null;
  }
};

// Smart model selection based on query complexity
const selectModel = (query: string): string => {
  const complexKeywords = ['predict', 'analyze', 'optimize', 'recommend', 'strategy', 'detailed'];
  const isComplex = complexKeywords.some(keyword => query.toLowerCase().includes(keyword));

  if (query.length > 200 || isComplex) {
    return MODELS.FAST_REASONING;
  }

  return MODELS.QUICK_INSIGHTS;
};

// Main function to get AI insights
export const getGrokInsights = async (
  userQuery: string,
  includeMetrics: boolean = true
): Promise<string> => {
  try {
    // Check cache
    const cacheKey = `${userQuery}-${includeMetrics}`;
    const cached = insightCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Fetch relevant database metrics
    let contextData = '';

    if (includeMetrics) {
      const metrics = await getDatabaseMetrics();
      const churnData = await getUserChurnData();
      const emailData = await getEmailCampaignData();

      contextData = `
Current FoodShare Platform Metrics:

USER METRICS:
- Total Users: ${metrics.totalUsers}
- Active Users (7 days): ${metrics.activeUsers7d}
- Active Users (30 days): ${metrics.activeUsers30d}
- Users at Churn Risk: ${churnData.atRiskUsers} (${churnData.churnRate.toFixed(2)}%)

LISTING METRICS:
- Total Listings: ${metrics.totalListings}
- Active Listings: ${metrics.activeListings}
- New Listings (7 days): ${metrics.newListings7d}
- New Listings (30 days): ${metrics.newListings30d}
- Average Views per Listing: ${metrics.averageViews.toFixed(2)}
- Listings by Category: ${JSON.stringify(metrics.listingsByCategory, null, 2)}

ENGAGEMENT METRICS:
- Total Messages: ${metrics.totalMessages}

EMAIL CAMPAIGN METRICS:
${emailData ? `
- Total Emails Sent: ${emailData.totalEmails}
- Success Rate: ${emailData.successRate.toFixed(2)}%
- Best Send Time: ${emailData.bestSendTime}
- Provider Stats: ${JSON.stringify(emailData.providerStats, null, 2)}
` : 'Email data not available'}
`;
    }

    // Select appropriate model
    const model = selectModel(userQuery);

    // Call Grok API
    const client = getGrokClient();
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `You are an AI business analyst for FoodShare, a food sharing platform.
Analyze the provided metrics and answer admin questions with actionable insights.
Be concise, data-driven, and provide specific recommendations.
${contextData}`,
        },
        {
          role: 'user',
          content: userQuery,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const insight = completion.choices[0]?.message?.content || 'No insight generated';

    // Cache the result
    insightCache.set(cacheKey, {
      data: insight,
      timestamp: Date.now(),
    });

    // Track usage
    await trackGrokUsage(model, completion.usage?.total_tokens || 0);

    return insight;
  } catch (error) {
    console.error('Error getting Grok insights:', error);
    throw new Error('Failed to generate insights. Please try again.');
  }
};

// Track Grok API usage
const trackGrokUsage = async (model: string, tokens: number) => {
  try {
    await supabase.from('grok_usage_logs').insert({
      model,
      tokens,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error tracking Grok usage:', error);
  }
};

// Get suggested questions based on current metrics
export const getSuggestedQuestions = async (): Promise<string[]> => {
  const metrics = await getDatabaseMetrics();
  const churnData = await getUserChurnData();

  const suggestions = [
    'Which users are most likely to churn?',
    'What\'s causing the spike in listings today?',
    'Optimize my email campaign timing',
    'What are the most popular food categories?',
    'How can I improve user engagement?',
  ];

  // Add dynamic suggestions based on metrics
  if (churnData.churnRate > 20) {
    suggestions.unshift('Why is my churn rate so high?');
  }

  if (metrics.newListings7d > metrics.newListings30d / 4) {
    suggestions.unshift('Analyze the recent spike in new listings');
  }

  if (metrics.activeUsers7d < metrics.totalUsers * 0.1) {
    suggestions.unshift('How can I re-engage inactive users?');
  }

  return suggestions.slice(0, 6);
};

// Clear cache
export const clearInsightCache = () => {
  insightCache.clear();
};
