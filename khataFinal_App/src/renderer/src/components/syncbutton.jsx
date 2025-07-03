import React, { useState } from 'react'
import './syncbutton.css'

const SyncButton = () => {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSync = async () => {
    setLoading(true)
    setStatus(null)

    try {
      const result = await window.api.sync.transactions()
      if (result.success) {
        setStatus(`✅ Synced ${result.synced} items, Deleted ${result.deleted}`)
      } else {
        setStatus(`❌ Error: ${result.error}`)
      }
    } catch (err) {
      setStatus(`❌ Failed: ${err.message}`)
    }

    setLoading(false)
  }

  return (
    <div className="sync-footer">
      <div className={`sync-container ${status ? getStatusClass(status) : ''}`}>
        <button className="sync-button" onClick={handleSync} disabled={loading}>
          <span className="sync-icon">{loading ? <div className="sync-spinner"></div> : '↻'}</span>
          <span className="sync-text">{loading ? 'Syncing...' : 'Sync Transactions'}</span>
        </button>

        {status && (
          <div className="sync-status">
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function to determine status class
function getStatusClass(status) {
  if (status.includes('✅')) return 'sync-success'
  if (status.includes('❌')) return 'sync-error'
  return ''
}

export default SyncButton
