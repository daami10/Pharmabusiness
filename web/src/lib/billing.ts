// Shared helper to start a Stripe Checkout session and redirect.
// Used by the subscription paywall and the trial banner. The server
// (web/api/checkout.js) verifies the JWT, requires the 'titular' role and
// derives the org_id from the token — never from the client.
export async function startCheckout(
  plan: 'basic' | 'premium',
  token: string | undefined,
): Promise<void> {
  if (!token) throw new Error('No se encontró sesión de usuario.')

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al iniciar la pasarela de pago.')
  }

  const data = await res.json()
  if (!data.url) throw new Error('No se recibió la URL de redirección.')

  window.location.href = data.url
}
