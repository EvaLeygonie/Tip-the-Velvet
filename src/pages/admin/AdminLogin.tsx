import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

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

      toast.success('Välkommen tillbaka!')
      navigate('/admin')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Fel e-post eller lösenord'
      toast.error('Inloggning misslyckades: ' + errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div>
        <div>
          <div>
            <h1>Tip the Velvet</h1>
            <p>Admin Portal</p>
          </div>

          <form onSubmit={handleLogin}>
            <div>
              <label htmlFor="email">E-post</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@tipthevelvet.se"
                required
              />
            </div>

            <div>
              <label htmlFor="password">Lösenord</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Loggar in...' : 'Gå in i ridån'}
            </button>
          </form>

          <div>
            <button onClick={() => navigate('/')}>← Tillbaka till publika sidan</button>
          </div>
        </div>
      </div>
    </>
  )
}

export default AdminLogin
