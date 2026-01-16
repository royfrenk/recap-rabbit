import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect staging environment
  const isStaging = process.env.ENVIRONMENT === 'staging'

  if (!isStaging) {
    return NextResponse.next()
  }

  // Check for basic auth header
  const authHeader = request.headers.get('authorization')

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ')

    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded)
      const [user, password] = decoded.split(':')

      const validUser = process.env.STAGING_USER
      const validPassword = process.env.STAGING_PASSWORD

      if (user === validUser && password === validPassword) {
        return NextResponse.next()
      }
    }
  }

  // Request authentication
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Staging Environment"',
    },
  })
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
}
