import { useState } from "react"

export default function CopyId({ id }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked: id is still selectable */
    }
  }
  return (
    <span className="copy-id">
      <code>{id}</code>
      <button type="button" className="btn btn-ghost btn-xs" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
    </span>
  )
}
