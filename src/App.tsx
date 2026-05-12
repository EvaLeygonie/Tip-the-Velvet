import './App.css'
import { Toaster } from 'sonner'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { LanguageProvider } from './contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/admin/ProtectedRoute'
import Navigation from '@/components/Navigation'
import { Footer } from '@/components/footer'

import ScrollToTop from '@/components/ScrollToTop'
import HomePage from '@/pages/HomePage'
import NotFound from '@/pages/NotFound'
import Events from '@/pages/Events'
import EventDetail from '@/pages/EventDetail.tsx'
import About from '@/pages/About'
import Dresscode from '@/pages/Dresscode'
import JoinUs from '@/pages/JoinUs'
import AdminLogin from '@/pages/admin/AdminLogin'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import EventEditor from '@/pages/admin/EventEditor'
import AdminEventPlan from '@/pages/admin/AdminEventPlan'
import Artists from '@/pages/Artists'
import ArtistDetail from '@/pages/ArtistDetail'

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#1d0d0d',
              border: '1px solid rgba(212, 175, 55, 0.5)',
              color: '#f9f7f1',
              fontFamily: 'inherit',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              fontSize: '11px',
              borderRadius: '6px',
            },
            className: 'font-decorative',
          }}
        />
        <BrowserRouter>
          <Navigation />
          <ScrollToTop />
          <main className="layout-base">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/events" element={<Events />} />
              <Route path="/events/:type/:slug" element={<EventDetail />} />
              <Route path="/about" element={<About />} />
              <Route path="/dresscode" element={<Dresscode />} />
              <Route path="/join" element={<JoinUs />} />
              <Route path="/artists" element={<Artists />} />
              <Route path="/artists/:slug" element={<ArtistDetail />} />

              <Route path="/admin/login" element={<AdminLogin />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/event-editor"
                element={
                  <ProtectedRoute>
                    <EventEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/event-editor/:slug"
                element={
                  <ProtectedRoute>
                    <EventEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/event-plan"
                element={
                  <ProtectedRoute>
                    <AdminEventPlan />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
)

export default App
