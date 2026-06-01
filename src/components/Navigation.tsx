import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Settings, LogOut, BarChart3, ClipboardList, Users, Menu, X, LogIn } from 'lucide-react'
import logoFull from '@/assets/header-logo.png'

export const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const { language, setLanguage, t } = useLanguage()
  const location = useLocation()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    toast.success(t('Utloggad!', 'Logged out!'))
    setIsMobileMenuOpen(false)
  }

  const isActive = (path: string) => location.pathname === path

  const leftLinks = [
    { to: '/events', label: t('Events', 'Events') },
    { to: '/casting-call', label: t('Casting Call', 'Casting Call') },
    { to: '/artists', label: t('Artister', 'Performers') },
  ]

  const rightLinks = [
    { to: '/dresscode', label: t('Klädkod', 'Dresscode') },
    { to: '/about', label: t('Om oss', 'About') },
    { to: '/join', label: t('Joina oss', 'Join us') },
  ]

  const adminSubLinks = [
    { to: '/admin', label: 'Dashboard', icon: BarChart3 },
    { to: '/admin/event-plan', label: 'Eventplanering', icon: Settings },
    { to: '/admin/casting', label: 'Hantera Casting', icon: ClipboardList },
    { to: '/admin/contacts', label: 'Kontakter', icon: Users },
  ]

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#110805] shadow-2xl py-2' : 'bg-[#110805]/80 backdrop-blur-md py-4'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 grid grid-cols-3 items-center min-h-[60px] relative">
          {/* VÄNSTER: Språk & Vänsterlänkar */}
          <div className="flex items-center gap-6 flex-1 justify-start">
            <div className="flex items-center gap-3 pr-4 border-r border-white/10">
              <button
                className="xl:hidden text-accent p-2 -ml-2"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu size={24} />
              </button>

              <button
                onClick={() => setLanguage(language === 'sv' ? 'eng' : 'sv')}
                className="btn-lang"
              >
                {language === 'sv' ? 'EN' : 'SV'}
              </button>
            </div>

            <div className="hidden xl:flex items-center gap-6">
              {leftLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-item ${isActive(link.to) ? 'nav-item-active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* MITTEN: Logotyp */}
          <div className="flex justify-center items-center">
            <Link to="/" className="transition-all duration-500 transform">
              <img
                src={logoFull}
                alt="Logo"
                className={`transition-all duration-500 object-contain w-auto ${isScrolled ? 'h-[80px]' : 'h-[100px]'}`}
              />
            </Link>
          </div>

          {/* HÖGER: Högerlänkar & Login */}
          <div className="flex items-center justify-end gap-6 flex-1">
            <div className="hidden xl:flex items-center gap-6">
              {rightLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`nav-item ${isActive(link.to) ? 'nav-item-active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-white/10">
              {!user ? (
                <Link
                  to={`/admin/login?redirectTo=${encodeURIComponent(location.pathname)}`}
                  className="text-accent/80 hover:text-accent transition-all p-2"
                >
                  <LogIn size={22} strokeWidth={1.8} />
                </Link>
              ) : (
                <>
                  <button
                    onClick={handleSignOut}
                    className="nav-icon-btn hover:text-red-500 transition-colors"
                  >
                    <LogOut size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ADMIN SUB-NAV */}
        {user && (
          <div className="hidden xl:block border-t border-accent/20 p-2 mt-2">
            <div className="max-w-7xl mx-auto flex justify-center gap-10 pt-3">
              {adminSubLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-2.5 admin-label-link ${isActive(link.to) ? 'admin-label-link-active' : ''}`}
                  >
                    <Icon size={14} strokeWidth={1.2} />
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      {/* MOBIL MENY OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-[#110805]/95 backdrop-blur-lg z-[100] flex flex-col p-8 xl:hidden overflow-y-auto">
          <div className="flex justify-end mb-6">
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-accent p-2">
              <X size={32} />
            </button>
          </div>

          <div className="flex flex-col gap-5 items-center text-center my-auto py-4 w-full">
            {[...leftLinks, ...rightLinks].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`nav-item-mobile ${isActive(link.to) ? 'nav-item-mobile-active' : ''}`}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <>
                <div className="w-20 h-px bg-accent/20 my-4" aria-hidden="true" />
                <div className="text-[10px] uppercase font-mono tracking-[0.3em] text-accent/60 mb-1">
                  Backstage Admin
                </div>

                <div className="flex flex-col gap-3 w-full max-w-xs">
                  {adminSubLinks.map((link) => {
                    const Icon = link.icon
                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`nav-item-admin ${isActive(link.to) ? 'nav-item-admin-active' : ''}`}
                      >
                        <Icon size={14} strokeWidth={1.5} />
                        {link.label}
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Dynamisk Spacer */}
      <div className={`${user ? 'h-[140px]' : 'h-[100px]'} w-full transition-all duration-500`} />
    </>
  )
}
