import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function decodeBase64(str: string): string {
  const buffer = Buffer.from(str, 'base64')
  return buffer.toString('utf-8')
}

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
        const decoded = decodeBase64(encoded)
        const [user, pass] = decoded.split(':')

        // Check credentials (set these in Railway env vars)
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
