import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Settings, LogOut, BarChart3, ClipboardList, Users, Menu, X, LogIn } from 'lucide-react'
import logoFull from '@/assets/tipthevelvet_logo_transparent.png'

const Navigation = () => {
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
    { to: '/join', label: t('Joina oss', 'Join Us') },
  ]

  const adminSubLinks = [
    { to: '/admin', label: 'Dashboard', icon: BarChart3 },
    { to: '/admin/event-planning', label: 'Eventplanering', icon: Settings },
    { to: '/admin/casting-manage', label: 'Hantera Casting', icon: ClipboardList },
    { to: '/admin/contacts', label: 'Kontakter', icon: Users },
  ]

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-[#110805] shadow-2xl py-3' : 'bg-[#110805]/80 backdrop-blur-md py-6'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-8 md:px-16 flex flex-col gap-2">
          <div className="flex items-center justify-between relative">
            {/* MOBILMENY-KNAPP */}
            <button className="lg:hidden text-accent" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>

            {/* VÄNSTER: Språkknapp */}
            <div className="hidden lg:flex items-center flex-1 justify-start">
              <button
                onClick={() => setLanguage(language === 'sv' ? 'eng' : 'sv')}
                className="px-3 py-2 border border-accent/30 text-[10px] tracking-widest text-accent hover:bg-accent hover:text-black transition-all rounded-md uppercase font-medium"
              >
                {language === 'sv' ? 'EN' : 'SV'}
              </button>
            </div>

            {/* MITTEN: Logotyp */}
            <div className="flex items-center gap-8">
              <div className="hidden lg:flex gap-8 items-center">
                {leftLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-[12px] uppercase tracking-[0.3em] font-decorative transition-all ${isActive(link.to) ? 'text-accent' : 'text-foreground/80 hover:text-accent'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>

              <Link to="/" className="px-6 lg:px-12">
                <img
                  src={logoFull}
                  alt="Logo"
                  className={`transition-all duration-500 ${isScrolled ? 'h-[60px]' : 'h-[90px]'}`}
                />
              </Link>

              <div className="hidden lg:flex gap-8 items-center">
                {rightLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-[12px] uppercase tracking-[0.3em] font-decorative transition-all ${isActive(link.to) ? 'text-accent' : 'text-foreground/80 hover:text-accent'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* HÖGER: Login-ikon */}
            <div className="flex items-center flex-1 justify-end">
              {!user ? (
                <Link
                  to="/admin/login"
                  className="text-accent/60 hover:text-accent transition-all p-2"
                >
                  <LogIn size={21} strokeWidth={1.5} />
                </Link>
              ) : (
                <div className="flex items-center gap-5 pl-6 border-l border-white/10 text-foreground/40">
                  <Link to="/admin/settings" className="hover:text-accent transition-colors">
                    <Settings size={18} />
                  </Link>
                  <button onClick={handleSignOut} className="hover:text-red-500 transition-colors">
                    <LogOut size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ADMIN SUB-NAV */}
        {user && (
          <div className="border-t border-accent/20 p-3">
            <div className=" mx-auto flex justify-center gap-12 pt-2">
              {adminSubLinks.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] transition-all ${isActive(link.to) ? 'text-accent font-semi-bold' : 'text-accent/70 hover:text-accent'}`}
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
        <div className="fixed inset-0 bg-[#110805] z-[100] flex flex-col p-8 lg:hidden">
          <div className="flex justify-end mb-12">
            <button onClick={() => setIsMobileMenuOpen(false)} className="text-accent">
              <X size={32} />
            </button>
          </div>
          <div className="flex flex-col gap-8 items-center text-center">
            {[...leftLinks, ...rightLinks].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-2xl font-decorative uppercase tracking-[0.2em] text-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dynamisk Spacer */}
      <div className={`${user ? 'h-[80px]' : 'h-[60px]'} w-full transition-all duration-500`} />
    </>
  )
}

export default Navigation
