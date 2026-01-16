import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect staging environment
  const isStaging = process.env.STAGING_AUTH === 'true'

  if (!isStaging) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')
    if (scheme === 'Basic' && encoded) {
      try {
        // Use Web API for base64 decoding (Edge compatible)
        const decoded = new TextDecoder().decode(
          Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
        )
        const colonIndex = decoded.indexOf(':')
        const user = decoded.slice(0, colonIndex)
        const pass = decoded.slice(colonIndex + 1)

        // Check credentials
        if (user === process.env.STAGING_USER && pass === process.env.STAGING_PASS) {
          return NextResponse.next()
        }
      } catch (e) {
        // Invalid base64
      }
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Staging"',
    },
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
