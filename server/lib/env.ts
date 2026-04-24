import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(10, "MONGODB_URI is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters for security"),
  ADMIN_SECRET_KEY: z
    .string()
    .min(16, "ADMIN_SECRET_KEY must be at least 16 characters"),
  SUPER_ADMIN_EMAIL: z.string().email("SUPER_ADMIN_EMAIL must be a valid email"),
  EMAIL_USER: z.string().email("EMAIL_USER must be a valid email"),
  EMAIL_PASS: z.string().min(1, "EMAIL_PASS is required"),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform((v) => parseInt(v, 10)),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 5000)),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates process.env against the schema.
 * Can be called explicitly or will be called automatically by getEnv()
 */
export function validateEnv(): Env {
  // If already validated, just return
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("\n❌ Invalid environment configuration:\n");
    result.error.issues.forEach((issue) => {
      console.error(`  • ${issue.path.join(".")}: ${issue.message}`);
    });
    console.error("\nFix the above .env values before starting the server.\n");
    process.exit(1);
  }

  _env = result.data;
  return result.data;
}

/**
 * Safe accessor for environment variables.
 * Automatically validates on first call if not already done.
 */
export function getEnv(): Env {
  if (!_env) {
    return validateEnv();
  }
  return _env;
}
