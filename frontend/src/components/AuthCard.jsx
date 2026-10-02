export default function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="auth-side">
        <div className="brand brand-lg">
          <span className="brand-mark">L</span>
          <span className="brand-name">Ledger</span>
        </div>
        <p className="auth-tagline">
          Every rupee recorded twice. A double-entry ledger where balances are derived, never stored.
        </p>
        <div className="auth-entries" aria-hidden="true">
          <div><span>DEBIT</span><span>− 2,500.00</span></div>
          <div><span>CREDIT</span><span>+ 2,500.00</span></div>
          <div className="rule" />
          <div><span>NET</span><span>0.00</span></div>
        </div>
      </div>
      <div className="auth-main">
        <div className="card auth-card">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
        </div>
        {footer && <p className="auth-footer">{footer}</p>}
      </div>
    </div>
  )
}
