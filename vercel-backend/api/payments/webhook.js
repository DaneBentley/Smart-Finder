import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Read the raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    event = stripe.webhooks.constructEvent(
      body,
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

    // Use atomic token addition function to prevent race conditions
    const { data: tokenResult, error: tokenError } = await supabase.rpc('add_user_tokens', {
      p_user_id: userId,
      p_token_amount: tokenAmount
    });

    if (tokenError || !tokenResult || !tokenResult.length || !tokenResult[0].success) {
      console.error('Error adding tokens:', tokenError || 'Token addition failed');
      return;
    }

    const result = tokenResult[0];
    console.log(`Successfully added ${tokenAmount} paid tokens to user ${userId}. New balance: ${result.total_tokens} (Free: ${result.new_free_tokens}, Paid: ${result.new_paid_tokens})`);

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