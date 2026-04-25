import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

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
  from: process.env.SMTP_FROM || `Real Estate Solution <${process.env.SMTP_USER}>`,
};

if (!supabaseUrl || !supabaseServiceKey || !paystackSecretKey) {
  console.warn('Missing critical environment variables (Supabase or Paystack). Payment verification may fail.');
}

if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
  console.warn('SMTP configuration is incomplete. Email notifications will not be sent.');
} else {
  console.log('SMTP Configured:', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    user: smtpConfig.auth.user,
    from: smtpConfig.from
  });
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
const transporter = nodemailer.createTransport({
  host: smtpConfig.host,
  port: smtpConfig.port,
  secure: smtpConfig.port === 465,
  auth: smtpConfig.auth,
  tls: {
    // Do not fail on invalid certs (common with some SMTP providers)
    rejectUnauthorized: false
  }
});

export async function createServer() {
  const app = express();
  
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Email Approval Endpoint
  app.post('/api/send-approval-email', async (req, res) => {
    const { userId, email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    // Update user metadata with approval timestamp
    if (userId) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { approved_at: new Date().toISOString() }
        });
        console.log(`Updated approved_at for user ${userId}`);
      } catch (metaError) {
        console.error('Error updating approval metadata:', metaError);
      }
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
              <a href="${(process.env.APP_URL && !process.env.APP_URL.includes('localhost') ? process.env.APP_URL : 'https://ais-dev-kqlxcloxp3rbt7rbrldrg2-81034014431.europe-west1.run.app')}/login" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Login to Dashboard</a>
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

  // Welcome Email Endpoint
  app.post('/api/send-welcome-email', async (req, res) => {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.log('SMTP not configured for welcome email');
      return res.json({ success: true, message: 'SMTP not configured' });
    }

    try {
      // Generate a verification link using Supabase Admin SDK
      const appUrl = process.env.APP_URL && !process.env.APP_URL.includes('localhost') 
        ? process.env.APP_URL 
        : 'https://ais-dev-kqlxcloxp3rbt7rbrldrg2-81034014431.europe-west1.run.app';

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: {
          redirectTo: `${appUrl}/email-confirmation`
        }
      });

      if (linkError) {
        console.error('Error generating verification link:', linkError);
      }

      const verificationLink = linkData?.properties?.action_link;

      await transporter.sendMail({
        from: smtpConfig.from,
        to: email,
        subject: 'Welcome to Real Estate Solution!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">Welcome!</h1>
              <p style="color: #666;">Real Estate Solution</p>
            </div>
            <p>Hello <strong>${name}</strong>,</p>
            <p>Thank you for joining <strong>Real Estate Solution</strong>! We're glad to have you with us.</p>
            
            <p>To get started, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${verificationLink || appUrl + '/login'}" 
                 style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
                Verify My Email Address
              </a>
            </div>

            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #475569; font-size: 14px;">
                <strong>What happens next?</strong><br>
                After verification, your account will be reviewed by our administrators. This usually takes less than 24 hours. You'll receive another email once your account is fully approved.
              </p>
            </div>

            <p style="color: #666; font-size: 13px;">If the button above doesn't work, copy and paste this link into your browser:</p>
            <p style="color: #2563eb; font-size: 12px; word-break: break-all;">${verificationLink || 'N/A'}</p>

            <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">&copy; 2026 Real Estate Solution. All rights reserved.</p>
          </div>
        `,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending welcome email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Admin Notification: Profile Ready for Review
  app.post('/api/notify-admin-ready', async (req, res) => {
    const { userId, email, name } = req.body;

    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      console.log(`[Notification Mock] Profile ready for review: ${name} (${email})`);
      return res.json({ success: true });
    }

    try {
      // Fetch the full profile to include in the email
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      await transporter.sendMail({
        from: smtpConfig.from,
        to: process.env.SMTP_USER,
        subject: `Profile Ready for Review: ${name} - Real Estate Solution`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">Profile Ready for Review</h2>
            <p style="text-align: center; color: #666;">User <strong>${name}</strong> has completed their profile and is requesting approval.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              ${profile?.avatar_url ? 
                `<img src="${profile.avatar_url}" alt="${name}" style="width: 120px; height: 120px; border-radius: 60px; object-cover: cover; border: 4px solid #f0f4ff;">` : 
                `<div style="width: 120px; height: 120px; border-radius: 60px; background: #f0f4ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; margin: 0 auto;">${name.charAt(0)}</div>`
              }
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 100px;"><strong>Name:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Phone:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${profile?.phone || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Role:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; font-weight: bold;">${profile?.role || 'N/A'}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${(process.env.APP_URL && !process.env.APP_URL.includes('localhost') ? process.env.APP_URL : 'https://ais-dev-kqlxcloxp3rbt7rbrldrg2-81034014431.europe-west1.run.app')}/admin" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Review in Admin Dashboard
              </a>
            </div>
          </div>
        `,
      });

      console.log(`Review notification sent for ${name}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error sending review notification:', error);
      res.status(500).json({ error: 'Failed to notify admin' });
    }
  });

  // Admin Notification Endpoint (Deprecated for Signup, but kept for legacy/other uses if any)
  app.post('/api/notify-admin-new-user', async (req, res) => {
    const { email, name, role, phone, address, avatarUrl } = req.body;

    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      return res.json({ success: true });
    }

    try {
      await transporter.sendMail({
        from: smtpConfig.from,
        to: process.env.SMTP_USER, // Send to the admin email
        subject: `New ${role.toUpperCase()} Registration - Real Estate Solution`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb; text-align: center;">New User Registration</h2>
            <p style="text-align: center; color: #666;">A new user has registered and is awaiting your approval.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              ${avatarUrl ? 
                `<img src="${avatarUrl}" alt="${name}" style="width: 120px; height: 120px; border-radius: 60px; object-cover: cover; border: 4px solid #f0f4ff;">` : 
                `<div style="width: 120px; height: 120px; border-radius: 60px; background: #f0f4ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; margin: 0 auto;">${name.charAt(0)}</div>`
              }
            </div>

            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 100px;"><strong>Name:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Email:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${email}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Phone:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${phone || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Address:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px;">${address || 'Not provided'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 13px;"><strong>Role:</strong></td>
                  <td style="padding: 8px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; font-weight: bold;">${role}</td>
                </tr>
              </table>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <a href="${(process.env.APP_URL && !process.env.APP_URL.includes('localhost') ? process.env.APP_URL : 'https://ais-dev-kqlxcloxp3rbt7rbrldrg2-81034014431.europe-west1.run.app')}/admin" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Review in Admin Dashboard
              </a>
            </div>
          </div>
        `,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error notifying admin:', error);
      res.status(500).json({ error: 'Failed to notify admin' });
    }
  });

  // SMTP Test Endpoint
  app.post('/api/test-smtp', async (req, res) => {
    const { email } = req.body;
    
    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass) {
      return res.status(400).json({ 
        error: 'SMTP configuration is incomplete',
        details: {
          host: !!smtpConfig.host,
          user: !!smtpConfig.auth.user,
          pass: !!smtpConfig.auth.pass
        }
      });
    }

    try {
      await transporter.verify();
      await transporter.sendMail({
        from: smtpConfig.from,
        to: email || smtpConfig.auth.user,
        subject: 'SMTP Test - Real Estate Solution',
        text: 'This is a test email to verify your SMTP configuration is working correctly.',
      });
      res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error: any) {
      console.error('SMTP Test Error:', error);
      res.status(500).json({ 
        error: 'SMTP Test Failed', 
        message: error.message,
        code: error.code,
        command: error.command
      });
    }
  });

  // Admin: Permanently Delete User
  app.post('/api/admin/delete-user', async (req, res) => {
    const { userId, adminId } = req.body;
    console.log(`[ADMIN DELETE USER] Request from admin ${adminId} to delete user ${userId}`);

    if (!userId || !adminId) {
      return res.status(400).json({ error: 'User ID and Admin ID are required' });
    }

    try {
      // 1. Verify the requester is an admin
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single();

      if (adminError) {
        console.error(`[ADMIN DELETE USER] Admin verification error:`, adminError);
        return res.status(500).json({ error: 'Failed to verify admin status' });
      }

      if (adminProfile?.role !== 'admin') {
        console.warn(`[ADMIN DELETE USER] Unauthorized attempt by user ${adminId} (role: ${adminProfile?.role})`);
        return res.status(403).json({ error: 'Unauthorized. Admin privileges required.' });
      }

      // 2. Delete user's properties first (to avoid foreign key constraints)
      console.log(`[ADMIN DELETE USER] Deleting properties for user: ${userId}`);
      const { error: propsDeleteError } = await supabaseAdmin
        .from('properties')
        .delete()
        .eq('agent_id', userId);
      
      if (propsDeleteError) {
        console.error(`[ADMIN DELETE USER] Properties delete error:`, propsDeleteError);
        // We continue even if this fails, as there might be no properties
      }

      // 3. Delete from Supabase Auth
      console.log(`[ADMIN DELETE USER] Deleting from auth: ${userId}`);
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (authDeleteError) {
        console.error(`[ADMIN DELETE USER] Auth delete error:`, authDeleteError);
        throw authDeleteError;
      }

      // 4. Delete from profiles table
      console.log(`[ADMIN DELETE USER] Deleting from profiles: ${userId}`);
      const { error: profileDeleteError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileDeleteError) {
        console.error(`[ADMIN DELETE USER] Profile delete error:`, profileDeleteError);
        throw profileDeleteError;
      }

      console.log(`[ADMIN DELETE USER] Success! Admin ${adminId} permanently deleted user ${userId}`);
      res.json({ success: true, message: 'User permanently deleted' });
    } catch (error: any) {
      console.error('[ADMIN DELETE USER] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  });

  // Admin: Permanently Delete Property
  app.post('/api/admin/delete-property', async (req, res) => {
    const { propertyId, adminId } = req.body;
    console.log(`[ADMIN DELETE PROPERTY] Request from admin ${adminId} to delete property ${propertyId}`);

    if (!propertyId || !adminId) {
      return res.status(400).json({ error: 'Property ID and Admin ID are required' });
    }

    try {
      // 1. Verify the requester is an admin
      const { data: adminProfile, error: adminError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single();

      if (adminError || adminProfile?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized. Admin privileges required.' });
      }

      // 2. Delete from properties table
      console.log(`[ADMIN DELETE PROPERTY] Deleting from properties: ${propertyId}`);
      const { error: deleteError } = await supabaseAdmin
        .from('properties')
        .delete()
        .eq('id', propertyId);
      
      if (deleteError) throw deleteError;

      console.log(`[ADMIN DELETE PROPERTY] Success! Admin ${adminId} permanently deleted property ${propertyId}`);
      res.json({ success: true, message: 'Property permanently deleted' });
    } catch (error: any) {
      console.error('[ADMIN DELETE PROPERTY] Error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete property' });
    }
  });

  // Admin: Sync Missing Emails from Auth to Profiles
  app.post('/api/admin/sync-emails', async (req, res) => {
    const { adminId } = req.body;
    
    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }

    try {
      // 1. Verify admin
      const { data: adminProfile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', adminId)
        .single();

      if (adminProfile?.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // 2. Find profiles with missing emails
      const { data: profiles, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .is('email', null);

      if (fetchError) throw fetchError;

      if (!profiles || profiles.length === 0) {
        return res.json({ success: true, count: 0, message: 'All profiles already have emails' });
      }

      let syncCount = 0;
      for (const profile of profiles) {
        // Fetch user from auth
        const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
        
        if (authUser?.email) {
          // Update profile
          await supabaseAdmin
            .from('profiles')
            .update({ email: authUser.email })
            .eq('id', profile.id);
          syncCount++;
        }
      }

      res.json({ success: true, count: syncCount, message: `Successfully synced ${syncCount} email(s)` });
    } catch (error: any) {
      console.error('[ADMIN SYNC EMAILS] Error:', error);
      res.status(500).json({ error: error.message });
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

  // Paystack Webhook Endpoint
  app.post('/api/paystack-webhook', async (req: any, res) => {
    const signature = req.headers['x-paystack-signature'];
    
    if (!signature) {
      return res.status(401).send('No signature provided');
    }

    // Verify signature
    const hash = crypto
      .createHmac('sha512', paystackSecretKey)
      .update(req.rawBody)
      .digest('hex');

    if (hash !== signature) {
      console.error('Invalid Paystack signature');
      return res.status(401).send('Invalid signature');
    }

    const event = req.body;
    console.log('Paystack Webhook received:', event.event);

    if (event.event === 'charge.success') {
      const { reference, metadata } = event.data;
      const userId = metadata?.userId;
      const planId = metadata?.planId;

      console.log('Processing charge.success:', { reference, userId, planId });

      if (userId && planId) {
        try {
          // 1. Fetch plan details
          const { data: plan, error: planError } = await supabaseAdmin
            .from('subscription_plans')
            .select('name')
            .eq('id', planId)
            .single();

          if (planError || !plan) {
            console.error('Webhook: Plan not found', planError);
          } else {
            // 2. Update user profile
            const { error: updateError } = await supabaseAdmin
              .from('profiles')
              .update({
                subscription_plan: plan.name,
                status: 'approved',
              })
              .eq('id', userId);

            if (updateError) {
              console.error('Webhook: Profile update error', updateError);
            } else {
              // 3. Update auth metadata
              await supabaseAdmin.auth.admin.updateUserById(userId, {
                user_metadata: { subscription_updated_at: new Date().toISOString() }
              });
              console.log(`Webhook: Successfully updated subscription for user ${userId} to ${plan.name}`);
            }
          }
        } catch (error) {
          console.error('Webhook: Error processing subscription update', error);
        }
      }
    }

    res.status(200).send('Webhook received');
  });
  
  return app;
}

export const appPromise = createServer();

if (process.env.NODE_ENV !== 'production' || (!process.env.NETLIFY && !process.env.VERCEL)) {
  appPromise.then(app => {
    const PORT = 3000;
    
    // Vite middleware for development
    if (process.env.NODE_ENV !== 'production') {
      createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      }).then(vite => {
        app.use(vite.middlewares);
        app.listen(PORT, '0.0.0.0', () => {
          console.log(`Server running on http://localhost:${PORT}`);
        });
      });
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    }
  });
}

export default async (req: any, res: any) => {
  const app = await appPromise;
  return app(req, res);
};
