'use client'

import { useAuth } from '@/lib/auth'
import Link from 'next/link'

export default function Header() {
  const { user, isAdmin, logout, isLoading } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🐰</span>
          <span className="text-xl font-bold text-gray-900">Recap Rabbit</span>
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link href="/" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                Home
              </Link>
              <Link href="/history" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                History
              </Link>
              {isAdmin && (
                <Link href="/usage" className="text-gray-600 hover:text-gray-900 text-sm font-medium transition">
                  Usage
                </Link>
              )}
              <div className="flex items-center gap-3 ml-4 pl-4 border-l">
                <span className="text-sm text-gray-500">{user.name?.split(' ')[0] || user.email}</span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            !isLoading && (
              <>
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
