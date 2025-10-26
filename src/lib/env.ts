import { z } from 'zod';

/**
 * Environment Variable Schema with Runtime Validation
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
});

type Env = z.infer<typeof envSchema>;

/**
 * Validates and returns typed environment variables
 * Throws descriptive error if validation fails
 */
function validateEnv(): Env {
  const env = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('\n');
      throw new Error(
        `Environment validation failed:\n${missingVars}\n\nPlease check your .env file.`
      );
    }
    throw error;
  }
}

export const env = validateEnv();

export const isProduction = import.meta.env.PROD;
export const isDevelopment = import.meta.env.DEV;
