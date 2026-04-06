import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <main className="flex-center min-h-screen bg-background text-center p-4">
      <div className="space-y-6">
        <h1 className="event-title text-6xl">404</h1>

        <div className="space-y-2">
          <p className="event-subtitle">Hoppsan! Den här sidan har försvunnit i kulisserna.</p>
          <p className="text-body opacity-70">Sidan du letar efter finns inte här.</p>
        </div>

        <Link to="/" className="inline-block mt-8 text-accent hover:underline font-heading">
          ← Tillbaka till scenen
        </Link>
      </div>
    </main>
  )
}

export default NotFound
