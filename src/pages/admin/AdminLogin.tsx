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
    <div className="page-full">
      {/* Dekorativa element för atmosfär */}
      <div className="bg-glow-spot top-[-10%] left-[-10%]" />
      <div className="bg-glow-spot bottom-[-10%] right-[-10%]" />

      <div className="w-full max-w-md z-10">
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl mb-2 tracking-wide">Tip the Velvet</h1>
          <p className="text-[10px] uppercase tracking-[0.4em] text-accent/70 font-medium">
            Admin Portal • Backstage
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="login-label">
                {t('E-post', 'Email')}
              </label>
              <div className="relative">
                <Mail className="login-icons" size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tipthevelvet.se"
                  className="login-input"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="login-label">
                {t('Lösenord', 'Password')}
              </label>
              <div className="relative">
                <Lock className="login-icons" size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="login-input"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isLoading} className="btn-save-active w-full">
              {isLoading
                ? t('Öppnar ridån...', 'Opening the curtain...')
                : t('Lyft på ridån', 'Enter backstage')}
            </button>
          </form>

          <button onClick={() => navigate('/')} className="link-back">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            {t('Tillbaka till publika sidan', 'Back to public page')}
          </button>
        </div>

        {/* Footer info */}
        <p className="copyright mt-8">
          &copy; {new Date().getFullYear()} Tip the Velvet • Restricted Access
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
