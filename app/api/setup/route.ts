// app/api/setup/route.ts
import { NextResponse } from 'next/server'
import { bootstrapOrganization } from '@/lib/initialSetup'

// This endpoint is highly privileged and MUST be protected by API keys or IP allow-lists.
export async function POST(request: Request) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: "Email and Name are required." }, { status: 400 })
    }

    // Execute the bootstrap function using the service role key from lib/supabase.ts
    const orgId = await bootstrapOrganization(email, name)

    return NextResponse.json({ success: true, organization_id: orgId, message: "Bootstrap complete. Proceed to initial user sign-up via /signup." }, { status: 200 })

  } catch (error: any) {
    console.error("Bootstrap failed:", error)
    return NextResponse.json({ error: error?.message || "Internal bootstrap failure" }, { status: 500 })
  }
}