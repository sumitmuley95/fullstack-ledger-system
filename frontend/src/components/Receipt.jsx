import { formatINR } from "../api"
import CopyId from "./CopyId"

// Renders whatever the transaction endpoints return, including the
// idempotent replies ("already processed" / "still processing").
export default function Receipt({ result }) {
  const t = result.transaction
  return (
    <div className="card receipt">
      <p className="eyebrow">{result.message}</p>
      {t ? (
        <>
          <div className="receipt-amount num">{formatINR(t.amount)}</div>
          <span className={`badge badge-${t.status === "COMPLETED" ? "active" : "frozen"}`}>{t.status}</span>
          <dl>
            <dt>From</dt><dd><CopyId id={t.fromAccount} /></dd>
            <dt>To</dt><dd><CopyId id={t.toAccount} /></dd>
            <dt>Transaction</dt><dd><CopyId id={t._id} /></dd>
            {t.createdAt && (<><dt>Time</dt><dd>{new Date(t.createdAt).toLocaleString("en-IN")}</dd></>)}
          </dl>
        </>
      ) : (
        <p className="muted">Check your balance again in a moment.</p>
      )}
    </div>
  )
}
