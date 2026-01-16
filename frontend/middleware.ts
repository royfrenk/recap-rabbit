import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Simple secret key in URL - add ?key=recaprabbit to access
  const url = new URL(request.url)
  const key = url.searchParams.get('key')

  // Check for key in URL or cookie
  const hasAccess = key === 'recaprabbit' || request.cookies.get('staging_access')?.value === 'true'

  if (hasAccess) {
    // Set cookie so they don't need key every time
    const response = NextResponse.next()
    if (key === 'recaprabbit') {
      response.cookies.set('staging_access', 'true', { maxAge: 60 * 60 * 24 * 7 }) // 7 days
    }
    return response
  }

  return new NextResponse('Access denied. Add ?key=recaprabbit to URL', {
    status: 403,
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo).*)'],
}
