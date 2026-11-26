import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Ultra-fast zero-latency pass-through.
  // Auth validation and organization scoping are handled securely inside Server Components and API routes.
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (direct 0ms execution without edge roundtrip)
     * - images & assets
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}