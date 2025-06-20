import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'checkout.session.expired':
        await handlePaymentExpired(event.data.object);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

async function handlePaymentSuccess(session) {
  const { id: sessionId, metadata, amount_total } = session;
  const userId = metadata.userId;
  const tokenAmount = parseInt(metadata.tokenAmount);

  console.log(`Processing payment success for user ${userId}, ${tokenAmount} tokens`);

  try {
    // Update purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_session_id', sessionId);

    if (purchaseError) {
      console.error('Error updating purchase:', purchaseError);
    }

    // Add tokens to user account
    const { data: currentData, error: fetchError } = await supabase
      .from('user_data')
      .select('paid_tokens')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user data:', fetchError);
      return;
    }

    const newTokenBalance = (currentData.paid_tokens || 0) + tokenAmount;

    const { error: updateError } = await supabase
      .from('user_data')
      .update({
        paid_tokens: newTokenBalance,
        last_sync_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user tokens:', updateError);
    } else {
      console.log(`Successfully added ${tokenAmount} tokens to user ${userId}. New balance: ${newTokenBalance}`);
    }

  } catch (error) {
    console.error('Error processing payment success:', error);
  }
}

async function handlePaymentExpired(session) {
  const { id: sessionId } = session;

  console.log(`Processing payment expiration for session ${sessionId}`);

  try {
    // Update purchase record
    const { error: purchaseError } = await supabase
      .from('purchases')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_session_id', sessionId);

    if (purchaseError) {
      console.error('Error updating expired purchase:', purchaseError);
    }

  } catch (error) {
    console.error('Error processing payment expiration:', error);
  }
} 