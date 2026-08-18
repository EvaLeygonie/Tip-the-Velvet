import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Loader2, Lock, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@supabase/supabase-js'
import { AuthLayout } from '@/components/admin/AuthLayout'

export const RegisterAdmin = () => {
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [localUser, setLocalUser] = useState<User | null>(null)
  // Om inbjudningslänken redan är ogiltig/utgången redirectar Supabase Auth hit med felinfo
  // i URL-hashen (#error=...&error_description=...) — då vet vi direkt, utan att vänta på
  // någon timeout, att ingen session någonsin kommer att upprättas.
  const [localLoading, setLocalLoading] = useState(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    return !hashParams.get('error')
  })

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updating, setUpdating] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    if (hashParams.get('error')) {
      return
    }

    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) {
        setLocalUser(session.user)
        setLocalLoading(false)
      }
    }
    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setLocalUser(session.user)
        setLocalLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setLocalUser(null)
        setLocalLoading(false)
      }
    })

    // Sista utväg om varken en session eller ett hash-fel dyker upp (t.ex. ovanligt
    // långsamt nätverk). Satt högt så vi inte visar "länken har löpt ut" felaktigt för en
    // legitim inbjudan vars session bara tar en stund att upprättas.
    const timer = setTimeout(() => {
      setLocalLoading(false)
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password.length < 6) {
      return toast.error(
        t(
          'Lösenordet måste vara minst 6 tecken långt.',
          'Password must be at least 6 characters long.'
        )
      )
    }

    if (password !== confirmPassword) {
      return toast.error(t('Lösenorden matchar inte.', 'The passwords do not match.'))
    }

    setUpdating(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      toast.success(t('Lösenordet har valts!', 'The password has been saved!'))
      setIsSuccess(true)

      setTimeout(() => {
        navigate('/admin')
      }, 2000)
    } catch (error: unknown) {
      console.error('Kunde inte uppdatera lösenord:', error)
      toast.error(
        (error as { message: string }).message ||
          t(
            'Någonting gick fel vid uppdateringen.',
            'Something went wrong while updating the password.'
          )
      )
    } finally {
      setUpdating(false)
    }
  }

  if (localLoading) {
    return (
      <div className="flex flex-col justify-center items-center p-8 h-screen gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="text-sm text-muted-foreground">
          {t('Verifierar inbjudan...', 'Verifying invitation...')}
        </p>
      </div>
    )
  }

  if (!localUser) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 text-center bg-background border border-border rounded-lg">
        <p className="text-destructive font-medium">
          {t('Länken är ogiltig eller har löpt ut.', 'The link is invalid or has expired.')}
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {t(
            'Be en annan administratör att skicka en ny inbjudan.',
            'Contact another administrator to send a new invitation.'
          )}
        </p>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 text-center bg-background border border-gold/30 rounded-lg flex flex-col items-center gap-4">
        <CheckCircle className="h-12 w-12 text-gold animate-bounce" />
        <h2 className="text-xl font-semibold">
          {t('Lösenordet är sparat!', 'The password has been saved!')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t(
            'Loggar in dig och skickar dig vidare till adminpanelen...',
            'Logging you in and redirecting you to the admin panel...'
          )}
        </p>
      </div>
    )
  }

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center mb-6">
        <div className="pb-3 bg-gold/10 rounded-full mb-2">
          <Lock className="h-6 w-6 text-gold" />
        </div>
        <h2 className="text-xl font-bold">{t('Välj ditt lösenord', 'Choose your password')}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            'Ditt konto har aktiverats. Välj ett lösenord för att slutföra din registrering.',
            'Your account has been activated. Choose a password to complete your registration.'
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="form-field">
          <label className="form-label-gold">{t('Nytt lösenord', 'New password')}</label>
          <input
            type="password"
            placeholder="Minst 6 tecken"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full"
            disabled={updating}
            autoComplete="new-password"
          />
        </div>

        <div className="form-field">
          <label className="form-label-gold">{t('Bekräfta lösenord', 'Confirm password')}</label>
          <input
            type="password"
            placeholder="Upprepa lösenordet"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full"
            disabled={updating}
          />
        </div>

        <button
          type="submit"
          className="w-full btn-gold py-3 flex items-center justify-center gap-2"
          disabled={updating}
        >
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t('Spara lösenord & logga in', 'Save password & log in')
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
