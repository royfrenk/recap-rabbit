'use client'

import { useAuth } from '@/lib/auth'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Home, History, BarChart3, LogOut } from 'lucide-react'

export default function Header() {
  const { user, isAdmin, logout, isLoading } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image src="/logo-minimal.png" alt="Recap Rabbit" width={36} height={36} />
          <span className="text-xl font-bold text-foreground">Recap Rabbit</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/" className="gap-2">
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/history" className="gap-2">
                  <History className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/usage" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Usage</span>
                  </Link>
                </Button>
              )}
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  {user.name?.split(' ')[0] || user.email}
                </span>
                <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </>
          ) : (
            !isLoading && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
