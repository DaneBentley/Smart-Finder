import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get JWT from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const { tokenAmount } = req.body;

    if (!tokenAmount || tokenAmount < 100) {
      return res.status(400).json({ error: 'Minimum token purchase is 100 tokens ($1)' });
    }

    // Calculate price (100 tokens = $1.00)
    const priceInCents = tokenAmount; // 1 token = 1 cent

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Smart Finder AI Tokens',
              description: `${tokenAmount} AI search tokens`,
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin || 'chrome-extension://'}?payment=success`,
      cancel_url: `${req.headers.origin || 'chrome-extension://'}?payment=cancelled`,
      metadata: {
        userId: userId,
        tokenAmount: tokenAmount.toString()
      }
    });

    // Store pending purchase in database
    const { error: purchaseError } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        stripe_session_id: session.id,
        amount_cents: priceInCents,
        tokens_purchased: tokenAmount,
        status: 'pending',
        metadata: {
          stripe_session_id: session.id,
          created_at: new Date().toISOString()
        }
      });

    if (purchaseError) {
      console.error('Error storing purchase:', purchaseError);
      // Continue anyway, webhook will handle completion
    }

    res.status(200).json({
      paymentUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Payment session creation error:', error);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
} 