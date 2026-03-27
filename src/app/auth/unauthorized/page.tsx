import React from 'react'
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-bold text-red-500 mb-4">Access Restricted</h1>
        <p className="text-slate-400 mb-8">
          Sorry, you do not have an active invitation or organization associated with your account. 
          EnviroJim is a private B2B platform.
        </p>
        <div className="space-y-4">
          <Link 
            href="/login"
            className="block w-full py-3 bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition-all"
          >
            Back to Login
          </Link>
          <a 
            href="mailto:support@envirojim.com"
            className="block w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold transition-all"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
