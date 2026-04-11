import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

// SMTP Config
const smtpConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  from: process.env.SMTP_FROM || 'Real Estate Solution <noreply@realestatesolution.ng>',
};

if (!supabaseUrl || !supabaseServiceKey || !paystackSecretKey) {
  console.warn('Missing critical environment variables (Supabase or Paystack). Payment verification may fail.');
}

if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
  console.warn('SMTP configuration is incomplete. Email notifications will not be sent.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const transporter = nodemailer.createTransport({
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.port === 465,
  auth: smtpConfig.auth,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Email Approval Endpoint
  app.post('/api/send-approval-email', async (req, res) => {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.log('--- MOCK EMAIL NOTIFICATION ---');
      console.log(`To: ${email}`);
      console.log(`Subject: Account Approved - Real Estate Solution`);
      console.log(`Content: Hello ${name}, your account has been approved.`);
      console.log('-------------------------------');
      return res.json({ success: true, message: 'SMTP not configured, email logged to console' });
    }

    try {
      await transporter.sendMail({
        from: smtpConfig.from,
        to: email,
        subject: 'Account Approved - Real Estate Solution',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Account Approved!</h1>
              <p style="color: #666;">Real Estate Solution</p>
            </div>
            <p>Hello <strong>${name}</strong>,</p>
            <p>We are excited to inform you that your account on <strong>Real Estate Solution</strong> has been approved by our administrators.</p>
            <p>You can now log in to your dashboard to start managing your properties and listings.</p>
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.APP_URL}/login" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Dashboard</a>
            </div>
            <p style="color: #666; font-size: 14px;">If you have any questions, feel free to reply to this email.</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">&copy; 2026 Real Estate Solution. All rights reserved.</p>
          </div>
        `,
      });

      console.log(`Approval email sent to ${email}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending approval email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Paystack Verification Endpoint
  app.post('/api/verify-payment', async (req, res) => {
    const { reference, planId, userId } = req.body;
    console.log('Payment verification request:', { reference, planId, userId });

    if (!reference || !planId || !userId) {
      console.error('Missing required fields in verification request');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // 1. Verify with Paystack
      console.log('Verifying with Paystack...');
      const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      });

      console.log('Paystack response status:', response.data.status);
      console.log('Paystack transaction status:', response.data.data?.status);

      if (response.data.status && response.data.data.status === 'success') {
        // 2. Fetch plan details to get the name
        console.log('Fetching plan details for ID:', planId);
        const { data: plan, error: planError } = await supabaseAdmin
          .from('subscription_plans')
          .select('name')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          console.error('Plan fetch error:', planError || 'Plan not found');
          return res.status(404).json({ error: 'Plan not found' });
        }

        console.log('Updating user profile for user:', userId, 'to plan:', plan.name);
        // 3. Update user profile
        const { data: updateData, error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: plan.name, // Store exact name
            status: 'approved',
          })
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error('Profile update error:', updateError);
          return res.status(500).json({ error: 'Failed to update profile: ' + updateError.message });
        }

        if (!updateData || updateData.length === 0) {
          console.error('No profile updated. User ID might be incorrect or profile does not exist:', userId);
          return res.status(404).json({ error: 'User profile not found. Please ensure you have completed your profile setup.' });
        }

        // 4. Update user metadata to reset listing count cycle
        console.log('Updating user metadata for user:', userId);
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { subscription_updated_at: new Date().toISOString() }
        });

        if (authError) {
          console.error('Auth metadata update error:', authError);
          // We don't necessarily want to fail the whole request if metadata update fails, 
          // but it's good to know.
        }

        console.log('Subscription updated successfully! Profile updated:', updateData[0].id);
        return res.json({ success: true, message: 'Subscription updated successfully' });
      } else {
        console.error('Payment verification failed at Paystack');
        return res.status(400).json({ error: 'Payment verification failed' });
      }
    } catch (error: any) {
      console.error('Payment verification error:', error.response?.data || error.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
