import { Sparkles } from 'lucide-react';

const HomePage = () => {
  return (
    <>
    <div className="p-8 md:p-12 space-y-4">
      <div className="space-y-2">
        <h1 className="title">Tip the Velvet</h1>
        <h2 className="subtitle">Burlesque Club Presents</h2>
      </div>

      {/* Gulddelaren - nu som en utility */}
      <div className="flex items-center gap-3">
        <div className="gold-divider" />
        <Sparkles className="w-4 h-4 text-accent" />
        <div className="gold-divider" />
      </div>

      {/* Eventdetaljer */}
      <div className="space-y-1.5 text-body">
        <p><span className="event-label">Date:</span> Date</p>
        <p><span className="event-label">Time:</span> 19.00 – 2.00</p>
        <p><span className="event-label">Location:</span> Location</p>
      </div>

      <p className="text-body opacity-90">
        Event description
      </p>
    </div>
    </>
  )
}

export default HomePage
