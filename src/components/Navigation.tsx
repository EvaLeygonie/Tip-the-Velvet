import { Link } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

const Navigation = () => {
  const { user, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()

  const handleSignOut = async () => {
    await signOut()
    toast.success(t('Utloggad!', 'Logged out!'))
  }

  const publicLinks = [
    { to: '/', label: t('Hem', 'Home') },
    { to: '/about', label: t('Om oss', 'About') },
    { to: '/events', label: t('Events', 'Events') },
    { to: '/dresscode', label: t('Klädkod', 'Dresscode') },
    { to: '/join', label: t('Joina oss', 'Join Us') },
  ]

  return (
    <nav className="nav-container">
      <div className="flex items-center gap-8">
        <Link to="/" className="nav-logo">
          TIP THE VELVET
        </Link>

        <div className="hidden md:flex gap-6">
          {publicLinks.map((link) => (
            <Link key={link.to} to={link.to} className="nav-link">
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button onClick={() => setLanguage(language === 'sv' ? 'eng' : 'sv')} className="btn-lang">
          {language === 'sv' ? 'EN' : 'SV'}
        </button>

        {user ? (
          <div className="flex items-center gap-4">
            <Link to="/admin" className="nav-link-admin">
              Dashboard
            </Link>
            <button onClick={handleSignOut} className="btn-logout">
              {t('Logga ut', 'Logout')}
            </button>
          </div>
        ) : (
          <Link to="/admin/login" className="nav-link opacity-50 hover:opacity-100">
            Admin
          </Link>
        )}
      </div>
    </nav>
  )
}

export default Navigation
