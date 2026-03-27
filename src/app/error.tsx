"use client"

export default function GlobalError({
  error,
  reset
}: {
  error: Error
  reset: () => void
}) {

  console.error("GLOBAL_APP_ERROR", error)

  return (
    <html>
      <body>
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Application error</h2>
          <p>We encountered a critical error. Please try reloading.</p>
          <button 
            onClick={() => reset()}
            style={{ 
              padding: '0.5rem 1rem', 
              background: '#0070f3', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
