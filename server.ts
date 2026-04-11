import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

if (!supabaseUrl || !supabaseServiceKey || !paystackSecretKey) {
  console.warn('Missing critical environment variables (Supabase or Paystack). Payment verification may fail.');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
        const { data: updateData, error: updateError, count } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_plan: plan.name, // Store exact name
            status: 'approved',
          }, { count: 'exact' })
          .eq('id', userId)
          .select();

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw updateError;
        }

        if (!updateData || updateData.length === 0) {
          console.error('No profile updated. User ID might be incorrect:', userId);
          return res.status(404).json({ error: 'User profile not found' });
        }

        console.log('Subscription updated successfully! Rows affected:', updateData.length);
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
