import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import Logo from '../Logo'
import '../../styles/auth.css'

// Shared frame for the four authentication screens: large logo top-left,
// warm background, one centred rounded card.
const AuthLayout = forwardRef(function AuthLayout({ title, subtitle, wide = false, children, footer }, headingRef) {
  return (
    <div className="auth-page">
      <span className="auth-blob auth-blob-yellow" aria-hidden="true" />
      <span className="auth-blob auth-blob-peach" aria-hidden="true" />
      <header className="auth-header">
        <div className="auth-logo"><Logo size={160} to="/" /></div>
        <Link to="/" className="auth-back">← Back</Link>
      </header>
      <main className="auth-main">
        <section className={`auth-card${wide ? ' auth-card-wide' : ''}`} aria-labelledby="auth-title">
          <h1 id="auth-title" ref={headingRef} tabIndex={-1}>{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
          {footer && <p className="auth-footer">{footer}</p>}
        </section>
      </main>
    </div>
  )
})

export default AuthLayout
