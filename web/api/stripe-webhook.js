import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Helper to parse raw body from the request stream
async function getRawBody(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

// CRITICAL: Disable Vercel's automatic body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID
  const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID

  if (
    !sig ||
    !webhookSecret ||
    !stripeSecretKey ||
    !supabaseUrl ||
    !supabaseServiceKey ||
    !premiumPriceId ||
    !basicPriceId
  ) {
    console.error('Missing environment variables (Basic or Premium Price ID, Webhook Secret, etc.) or Stripe signature header.')
    return res.status(500).json({ error: 'Server misconfiguration.' })
  }

  let event
  const stripe = new Stripe(stripeSecretKey)

  try {
    const rawBody = await getRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err) {
    console.error(`Signature verification failed: ${err.message}`)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log(`Processing event: ${event.type}`)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const orgId = session.client_reference_id || session.metadata?.org_id

        if (!orgId) {
          console.error('No org_id found in client_reference_id or session metadata')
          return res.status(400).json({ error: 'Missing organization reference.' })
        }

        // Fetch actual subscription details from Stripe
        const subscriptionId = session.subscription
        const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)

        const stripeCustomerId = session.customer
        const status = stripeSubscription.status
        const currentPeriodEnd = new Date(
          stripeSubscription.current_period_end * 1000,
        ).toISOString()
        const priceId = stripeSubscription.items.data[0].price.id

        const plan = priceId === premiumPriceId ? 'premium' : 'basico'

        const { error } = await supabase
          .from('organizations')
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: subscriptionId,
            plan,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
          })
          .eq('id', orgId)

        if (error) throw error
        console.log(
          `Success: Registered subscription ${subscriptionId} for organization ${orgId}`,
        )
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        const status = subscription.status
        const currentPeriodEnd = new Date(
          subscription.current_period_end * 1000,
        ).toISOString()
        const priceId = subscription.items.data[0].price.id

        const plan =
          priceId === premiumPriceId && (status === 'active' || status === 'trialing')
            ? 'premium'
            : 'basico'

        const { error } = await supabase
          .from('organizations')
          .update({
            plan,
            subscription_status: status,
            current_period_end: currentPeriodEnd,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) throw error
        console.log(
          `Success: Updated subscription ${subscription.id} status to ${status}`,
        )
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object

        const { error } = await supabase
          .from('organizations')
          .update({
            plan: 'basico',
            subscription_status: 'canceled',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id)

        if (error) throw error
        console.log(`Success: Canceled and downgraded subscription ${subscription.id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err)
    return res.status(500).json({ error: err.message })
  }
}
