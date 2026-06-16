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

  if (!supabaseUrl || !supabaseServiceKey || !stripeSecretKey) {
    return res.status(500).json({
      error:
        'Variables de entorno faltantes en el servidor para procesar Stripe Customer Portal.',
    })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return res.status(401).json({ error: 'Sesión no válida o expirada.' })
    }

    // Resolve membership and verify role (only 'titular' can manage subscription billing)
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
          'Permiso denegado. Solo el Titular de la farmacia puede gestionar la facturación.',
      })
    }

    // Retrieve the stripe_customer_id from the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', membership.org_id)
      .maybeSingle()

    if (orgError || !org) {
      return res
        .status(500)
        .json({ error: 'No se pudo obtener la información de la organización.' })
    }

    if (!org.stripe_customer_id) {
      return res.status(400).json({
        error:
          'No se encontró historial de facturación. Primero debes suscribirte a un plan de pago.',
      })
    }

    // Initialize Stripe client
    const stripe = new Stripe(stripeSecretKey)

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${req.headers.origin || 'https://gfarma.app'}/`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('Error in customer portal session creation:', err)
    return res.status(500).json({ error: err.message })
  }
}
