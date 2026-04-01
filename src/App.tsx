import './App.css'
import { Toaster } from 'sonner'
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ProtectedRoute } from "@/components/admin/ProtectedRoute"

import HomePage from "@/pages/HomePage"
import NotFound from "@/pages/NotFound"
import Events from "@/pages/Events"
import EventDetail from "@/pages/EventDetail.tsx"
import About from "@/pages/About"
import Dresscode from "@/pages/Dresscode"
import JoinUs from "@/pages/JoinUs"
import AdminLogin from "@/pages/admin/AdminLogin"
import AdminDashboard from "@/pages/admin/AdminDashboard.tsx"
import AdminEventPlan from "@/pages/admin/AdminEventPlan.tsx"
import Artists from "@/pages/admin/Artists"
import ArtistDetail from "@/pages/admin/ArtistDetail"

const queryClient = new QueryClient()

const App = () => (
  <QueryClientProvider client={queryClient}>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:eventSlug" element={<EventDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/dresscode" element={<Dresscode />} />
           <Route path="/join" element={<JoinUs />} />
           <Route path="/admin/login" element={<AdminLogin />} />
           <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
           <Route path="/admin/eventplan" element={<ProtectedRoute><AdminEventPlan /></ProtectedRoute>} />
           <Route path="/admin/artists" element={<ProtectedRoute><Artists /></ProtectedRoute>} />
           <Route path="/admin/artists/:id" element={<ProtectedRoute><ArtistDetail /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
  </QueryClientProvider>
);

export default App;
