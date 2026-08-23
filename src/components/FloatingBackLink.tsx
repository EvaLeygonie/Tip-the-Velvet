import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

interface FloatingBackLinkProps {
  to: string
  label: string
}

// Fixed-position back arrow, used on pages long enough that scrolling back up to reach
// an inline header link would be annoying.
export const FloatingBackLink = ({ to, label }: FloatingBackLinkProps) => (
  <Link to={to} title={label} aria-label={label} className="floating-back-link">
    <ArrowLeft size={18} />
  </Link>
)
