import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export default async function handler(req, res) {
  // CORS setup for local development
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const authHeader = req.headers.authorization
  if (!authHeader)
    return res.status(401).json({ error: 'No authorization header provided' })

  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Invalid token format' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID
  const basicPriceId = process.env.STRIPE_BASIC_PRICE_ID

  const missing = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!stripeSecretKey) missing.push('STRIPE_SECRET_KEY')
  if (!premiumPriceId) missing.push('STRIPE_PREMIUM_PRICE_ID')
  if (!basicPriceId) missing.push('STRIPE_BASIC_PRICE_ID')

  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`)
    return res.status(500).json({ error: 'Server misconfiguration.' })
  }

  try {
    const { plan } = req.body || {}
    const selectedPriceId = plan === 'premium' ? premiumPriceId : basicPriceId

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Sesión no válida o expirada.' })
    }

    // Resolve membership and verify role (only 'titular' can buy subscriptions)
    const { data: membership, error: memError } = await supabase
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (memError || !membership) {
      return res
        .status(403)
        .json({ error: 'El usuario no está asociado a ninguna farmacia.' })
    }

    if (membership.role !== 'titular') {
      return res.status(403).json({
        error:
          'Permiso denegado. Solo el Titular de la farmacia puede gestionar suscripciones.',
      })
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey)

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: selectedPriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      automatic_tax: {
        enabled: true,
      },
      tax_id_collection: {
        enabled: true,
      },
      success_url: `${req.headers.origin || 'https://gfarma.app'}/?stripe_success=true`,
      cancel_url: `${req.headers.origin || 'https://gfarma.app'}/?stripe_cancel=true`,
      client_reference_id: membership.org_id,
      metadata: {
        org_id: membership.org_id,
      },
      subscription_data: {
        metadata: {
          org_id: membership.org_id,
        },
      },
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Error in checkout session creation:', err)
    return res.status(500).json({ error: err.message })
  }
}
