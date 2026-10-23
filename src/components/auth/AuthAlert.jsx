import { Link } from 'react-router-dom'

export default function AuthAlert({ error }) {
  if (!error) return null
  return (
    <div className="auth-alert" role="alert">
      <span>{error.message}</span>
      {error.link && <> <Link to={error.link.to}>{error.link.label}</Link></>}
    </div>
  )
}
