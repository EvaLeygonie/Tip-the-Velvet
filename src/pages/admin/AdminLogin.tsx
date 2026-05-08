import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Lock, Mail, ArrowLeft } from 'lucide-react'

const AdminLogin = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/admin')
    }
  }, [user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success(t('Välkommen tillbaka!', 'Welcome back!'))
      navigate('/admin')
    } catch (error: unknown) {
      let errorMessage = t('Ett oväntat fel uppstod', 'An unexpected error occurred')

      if (error instanceof Error) {
        const msg = error.message

        if (msg === 'Invalid login credentials') {
          errorMessage = t('Fel e-post eller lösenord', 'Invalid email or password')
        } else if (msg === 'Email not confirmed') {
          errorMessage = t('E-postadressen är inte bekräftad', 'Email not confirmed')
        } else if (msg.includes('rate limit')) {
          errorMessage = t(
            'För många inloggningsförsök. Vänta en stund.',
            'Too many login attempts. Please wait.'
          )
        }
      }

      toast.error(`${t('Inloggning misslyckades', 'Login failed')}: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Dekorativa element för atmosfär */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl uppercase font-decorative text-accent mb-2 tracking-tighter">
            Tip the Velvet
          </h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-accent/70 font-medium">
            Admin Portal • Backstage
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-accent/10 border border-white/10 backdrop-blur-xl p-8 md:p-10 rounded-2xl shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-[11px] uppercase tracking-widest text-accent ml-1"
              >
                {t('E-post', 'Email')}
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-accent/50"
                  size={18}
                />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tipthevelvet.se"
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/60 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-[11px] uppercase tracking-widest text-accent ml-1"
              >
                {t('Lösenord', 'Password')}
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-accent/50"
                  size={18}
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-accent/60 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-accent/80 hover:bg-accent disabled:bg-accent/50 text-black font-bold py-4 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(212,175,55,0.2)] active:scale-[0.98] mt-4 uppercase text-xs tracking-widest"
            >
              {isLoading
                ? t('Öppnar ridån...', 'Opening the curtain...')
                : t('Gå in i ridån', 'Enter the curtain')}
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-8 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-white/80 hover:text-accent transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            {t('Tillbaka till publika sidan', 'Back to public page')}
          </button>
        </div>

        {/* Footer info */}
        <p className="text-center mt-8 text-[9px] text-white/80 uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} Tip the Velvet • Restricted Access
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
