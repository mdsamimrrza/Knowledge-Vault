import nodemailer from "nodemailer";
import { getEnv } from "./env";

let _transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!_transporter) {
    const env = getEnv();
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.EMAIL_USER,
        pass: env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production"
      }
    });

    // Verify connection on first use
    _transporter.verify((error) => {
      if (error) {
        console.error("❌ NODEMAILER CONNECTION FAILED:", error.message);
      } else {
        console.log("✅ Email system ready — sending from:", env.EMAIL_USER);
      }
    });
  }
  return _transporter;
}

/**
 * Validates if an email domain exists using DNS MX records
 */
export async function isValidEmailDomain(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const domain = normalizedEmail.split('@')[1];
  
  // Hard-block known test/fake domains
  const blacklistedDomains = ['test.com', 'example.com', 'fake.com', 'invalid.com', 'mailinator.com', 'guerrillamail.com', 'throwaway.email', 'tempmail.com'];
  if (blacklistedDomains.some(d => domain.endsWith(d))) return false;

  try {
    const dns = await import('node:dns/promises');
    const mx = await dns.resolveMx(domain);
    return mx && mx.length > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Sends a Security OTP via Email
 */
export async function sendOTP(email: string, otp: string, subject = "Security Code Verification") {
  const env = getEnv();
  if (!env.EMAIL_USER || !env.EMAIL_PASS) {
    // Mock delivery for non-production/testing
    return true;
  }

  const transporter = getTransporter();

  try {
    console.log(`📧 Attempting to send OTP to: ${email}...`);
    const info = await transporter.sendMail({
      from: `"Knowledge Vault Security" <${env.EMAIL_USER}>`,
      to: email,
      subject: subject,
      headers: {
        "X-Auto-Response-Suppress": "All",
        "Auto-Submitted": "auto-generated",
        "Precedence": "bulk"
      },
      html: `
        <div style="font-family: sans-serif; max-width: 500px; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #0d9488; margin-top: 0;">Security Verification</h2>
          <p style="font-weight: bold; color: #333;">Action: ${subject}</p>
          <p style="color: #555;">A high-risk administrative action or password reset requires your authorization.</p>
          <div style="background: #f0fdfa; padding: 30px; text-align: center; border-radius: 10px; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #0d9488; display: block;">${otp}</span>
          </div>
          <p style="font-size: 13px; color: #666; line-height: 1.5;">This code will expire in 5 minutes. If you did not request this, please change your password immediately.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #999; text-align: center;">© Knowledge Vault Security Systems</p>
        </div>
      `,
    });
    console.log(`✅ Email sent successfully: ${info.messageId}`);
    return info;
  } catch (err: any) {
    console.error("❌ NODEMAILER ERROR:", err);
    throw new Error(`Failed to send email: ${err.message}`);
  }
}
