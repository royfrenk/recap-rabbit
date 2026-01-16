'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import Image from 'next/image'
import { useAuth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void
          renderButton: (element: HTMLElement, config: any) => void
        }
      }
    }
  }
}

export default function SignupPage() {
  const router = useRouter()
  const { signup, loginWithGoogle, user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [googleLoaded, setGoogleLoaded] = useState(false)

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  // Check if Google script is loaded (poll for it)
  useEffect(() => {
    if (!googleClientId) return

    const checkGoogle = () => {
      if (window.google) {
        setGoogleLoaded(true)
        return true
      }
      return false
    }

    // Check immediately
    if (checkGoogle()) return

    // Poll every 100ms for up to 5 seconds
    const interval = setInterval(() => {
      if (checkGoogle()) {
        clearInterval(interval)
      }
    }, 100)

    const timeout = setTimeout(() => clearInterval(interval), 5000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [googleClientId])

  // Initialize Google Sign-In
  useEffect(() => {
    if (googleLoaded && googleClientId && window.google) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleResponse,
      })
      const buttonDiv = document.getElementById('google-signup-button')
      if (buttonDiv) {
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'signup_with',
        })
      }
    }
  }, [googleLoaded, googleClientId])

  const handleGoogleResponse = async (response: any) => {
    setError('')
    setIsLoading(true)
    try {
      await loginWithGoogle(response.credential)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Google sign-up failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Redirect if already logged in
  if (user) {
    router.push('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await signup(email, password, name || undefined)
      router.push('/')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {googleClientId && (
        <Script
          src="https://accounts.google.com/gsi/client"
          onLoad={() => setGoogleLoaded(true)}
        />
      )}
      <div className="max-w-md mx-auto mt-8">
        <Card>
          <CardHeader className="text-center">
            <Image src="/logo-minimal.png" alt="Recap Rabbit" width={80} height={80} className="mx-auto" />
            <CardTitle className="mt-4">Create Account</CardTitle>
            <CardDescription>Join Recap Rabbit to get podcast summaries</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}

            {googleClientId && (
              <>
                <div id="google-signup-button" className="w-full mb-4"></div>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-card text-muted-foreground">or sign up with email</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  Name (optional)
                </label>
                <Input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email
                </label>
                <Input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Choose a password"
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <Link href="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
