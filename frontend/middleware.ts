import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Hardcoded credentials for staging
const STAGING_USER = 'recap'
const STAGING_PASS = 'rabbit'

export function middleware(request: NextRequest) {
  // Only protect if hostname contains 'staging'
  const hostname = request.headers.get('host') || ''
  const isStaging = hostname.includes('staging')

  if (!isStaging) {
    return NextResponse.next()
  }

  const authHeader = request.headers.get('authorization')

  if (authHeader) {
    try {
      const encoded = authHeader.split(' ')[1]
      const decoded = atob(encoded)
      const [user, pass] = decoded.split(':')

      if (user === STAGING_USER && pass === STAGING_PASS) {
        return NextResponse.next()
      }
    } catch (e) {
      // ignore
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
