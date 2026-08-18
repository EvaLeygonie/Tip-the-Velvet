import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'
import { Lock, Mail, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/components/admin/AuthLayout'

export const AdminLogin = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success(t('Välkommen tillbaka!', 'Welcome back!'))

      const redirectTo = searchParams.get('redirectTo')

      if (redirectTo) {
        navigate(redirectTo)
      } else {
        navigate('/admin')
      }
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
    <AuthLayout>
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="email" className="form-label-gold">
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
          <label htmlFor="password" className="form-label-gold">
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

        <button type="submit" disabled={isLoading} className="btn-gold w-full">
          {isLoading
            ? t('Öppnar ridån...', 'Opening the curtain...')
            : t('Lyft på ridån', 'Enter backstage')}
        </button>
      </form>

      <button onClick={() => navigate('/')} className="link-back">
        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
        {t('Tillbaka till publika sidan', 'Back to public page')}
      </button>
    </AuthLayout>
  )
}
