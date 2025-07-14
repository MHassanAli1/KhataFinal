import { useState } from 'react'
import './CheckForUpdates.css'

const CheckForUpdates = () => {
  const [checking, setChecking] = useState(false)

  const handleCheckForUpdates = () => {
    setChecking(true)
    // Call the main process to check for updates
    window.api.ipc.send('check-for-updates')
    
    // Reset the state after 3 seconds
    setTimeout(() => {
      setChecking(false)
    }, 3000)
  }

  return (
    <div className="update-check-container">
      <button 
        onClick={handleCheckForUpdates} 
        disabled={checking}
        className="check-updates-btn"
      >
        <span className="update-btn-icon">
          {checking ? '🔄' : '🔄'}
        </span>
        <span className="update-btn-text">
          {checking ? 'چیک کر رہا ہے...' : 'اپڈیٹس چیک کریں'}
        </span>
      </button>
    </div>
  )
}

export default CheckForUpdates
