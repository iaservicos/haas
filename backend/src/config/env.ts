const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_KEY',
  'JWT_SECRET',
  'GPTMAKER_API_TOKEN',
  'GPTMAKER_AGENT_ID',
];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing environment variable: ${envVar}`);
  }
});

export const env = {
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_KEY: process.env.SUPABASE_KEY!,
  JWT_SECRET: process.env.JWT_SECRET!,
  GPTMAKER_API_TOKEN: process.env.GPTMAKER_API_TOKEN!,
  GPTMAKER_AGENT_ID: process.env.GPTMAKER_AGENT_ID!,
  GPTMAKER_API_URL: process.env.GPTMAKER_API_URL || 'https://api.gptmaker.ai/v1',
  POWER_AUTOMATE_WEBHOOK_URL: process.env.POWER_AUTOMATE_WEBHOOK_URL || '',
  GPTMAKER_WORKSPACE_ID: process.env.GPTMAKER_WORKSPACE_ID || '',
  PORT: parseInt(process.env.PORT || '3001', 10 ),
  NODE_ENV: process.env.NODE_ENV || 'development',
};
