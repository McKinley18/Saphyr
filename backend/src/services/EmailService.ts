import nodemailer from 'nodemailer';

// You can replace these with your actual SMTP details later (e.g. Gmail, SendGrid, etc.)
// For now, it will log the reset link to the console for development.
export class EmailService {
  static async sendResetEmail(email: string, token: string) {
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    
    console.log("-----------------------------------------");
    console.log(`📧 EMAIL SENT TO: ${email}`);
    console.log(`🔗 RESET LINK: ${resetLink}`);
    console.log("-----------------------------------------");

    // Mock successful send for development
    return true;

    /* 
    // REAL EMAIL CONFIGURATION EXAMPLE:
    const transporter = nodemailer.createTransport({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      auth: {
        user: "your-email@example.com",
        pass: "your-password"
      }
    });

    await transporter.sendMail({
      from: '"Saphyr Support" <noreply@saphyr.com>',
      to: email,
      subject: "Reset Your Saphyr Password",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset for your Saphyr account.</p>
          <p>Click the button below to set a new password. This link will expire in 1 hour.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    });
    */
  }

  static async send2FACode(email: string, code: string) {
    console.log("-----------------------------------------");
    console.log(`📧 2FA CODE SENT TO: ${email}`);
    console.log(`🔢 CODE: ${code}`);
    console.log("-----------------------------------------");

    // Real implementation would use nodemailer here
    return true;
  }
}
