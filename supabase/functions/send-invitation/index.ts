
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Declare Deno to fix "Cannot find name 'Deno'" error in the frontend-shared workspace
declare const Deno: any;

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, projectName, inviteLink, inviterEmail } = await req.json()

    if (!to || !inviteLink) {
      throw new Error('Missing required identity parameters (to, inviteLink)')
    }

    // We use Resend as the default recommended mailer for Supabase Edge Functions
    // You can sign up for a free account at resend.com
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Antigravity CRM <onboarding@resend.dev>',
        to: [to],
        subject: `[ACTION REQUIRED] Invitation to join cluster: ${projectName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #e2e8f0; border-radius: 24px;">
            <div style="background-color: #4f46e5; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <h1 style="font-size: 24px; font-weight: 900; color: #0f172a; margin-bottom: 8px; letter-spacing: -0.025em;">Identity Node Activation</h1>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
              User <strong>${inviterEmail}</strong> has authorized your access to the <strong>${projectName}</strong> cluster on the Antigravity Lead Management network.
            </p>
            <a href="${inviteLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);">
              ACTIVATE ACCESS NODE
            </a>
            <div style="margin-top: 40px; padding-top: 24px; border-t: 1px solid #f1f5f9;">
              <p style="font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: bold;">Security Protocol: Encrypted Transmission</p>
            </div>
          </div>
        `,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify({ message: 'Invitation dispatched', data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
