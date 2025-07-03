'use client'

import { useState } from 'react'
import './SyncToCloudButton.css'

const SyncToCloudButton = () => {
// Contact the developers at ahmadhhassan30nov@gmail.com or muhammadhassanali327@gmail.com to get the cloud database backup URL
  const URL_CLOUD = `Ask Developer for the CLOUD DATABASE BACKUP URL`
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  const handleSync = async () => {
    setSyncing(true)
    setMessage('')

    try {
      // STEP 1: get local transactions
      const localTransactions = await window.api.transactions.getAll()

      // STEP 2: update changed transactions
      for (const tx of localTransactions) {
        if (tx.Synced && tx.SyncedAt && new Date(tx.updatedAt) > new Date(tx.SyncedAt)) {
          try {
            const response = await fetch(`${URL_CLOUD}/transactions/${tx.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ZoneName: tx.ZoneName,
                KhdaName: tx.KhdaName,
                KulAmdan: tx.KulAmdan.toString(),
                bookNumber: tx.bookNumber,
                date: tx.date,
                KulAkhrajat: tx.KulAkhrajat.toString(),
                SaafiAmdan: tx.SaafiAmdan.toString(),
                Exercise: tx.Exercise.toString(),
                KulMaizan: tx.KulMaizan.toString(),
                trollies: tx.trollies.map((t) => ({
                  total: t.total,
                  StartingNum: t.StartingNum.toString(),
                  EndingNum: t.EndingNum.toString()
                })),
                akhrajat: tx.akhrajat.map((a) => ({
                  title: a.title,
                  description: a.description,
                  amount: a.amount.toString(),
                  date: a.date
                }))
              })
            })

            if (response.status === 404) {
              // server does not know about this id
              console.warn(`⚠️ Transaction ${tx.id} not found on server, retrying as POST`)
              throw new Error('Not found')
            }

            if (!response.ok) throw new Error('Update failed')

            await window.api.transactions.markSynced({
              id: tx.id,
              syncedAt: new Date().toISOString()
            })

            console.log(`✅ Synced update: Transaction ${tx.id}`)
          } catch (err) {
            console.error(`❌ Failed to sync update for tx ${tx.id}, will retry as POST`, err)

            // fallback to POST
            try {
              const createResponse = await fetch(`${URL_CLOUD}/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: tx.id, // 👈 add this
                  ZoneName: tx.ZoneName,
                  KhdaName: tx.KhdaName,
                  KulAmdan: tx.KulAmdan.toString(),
                  bookNumber: tx.bookNumber,
                  ticketNumber: tx.ticketNumber,
                  date: tx.date,
                  KulAkhrajat: tx.KulAkhrajat.toString(),
                  SaafiAmdan: tx.SaafiAmdan.toString(),
                  Exercise: tx.Exercise.toString(),
                  KulMaizan: tx.KulMaizan.toString(),
                  trollies: tx.trollies.map((t) => ({
                    id: t.id, // 👈 add this too if you want to sync trolly id
                    total: t.total,
                    StartingNum: t.StartingNum.toString(),
                    EndingNum: t.EndingNum.toString()
                  })),
                  akhrajat: tx.akhrajat.map((a) => ({
                    id: a.id, // 👈 add this too if you want to sync akhrajat id
                    title: a.title,
                    description: a.description,
                    amount: a.amount.toString(),
                    date: a.date
                  }))
                })
              })

              if (!createResponse.ok) throw new Error('POST fallback failed')

              await window.api.transactions.markSynced({
                id: tx.id,
                syncedAt: new Date().toISOString()
              })

              console.log(`✅ Synced create fallback for tx ${tx.id}`)
            } catch (postErr) {
              console.error(`❌ Failed to sync fallback POST for tx ${tx.id}`, postErr)
            }
          }
        }
      }

      // STEP 3: post new transactions
      for (const tx of localTransactions) {
        if (!tx.Synced) {
          try {
            const response = await fetch(`${URL_CLOUD}/transactions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: tx.id, // 👈 add this
                ZoneName: tx.ZoneName,
                KhdaName: tx.KhdaName,
                KulAmdan: tx.KulAmdan.toString(),
                bookNumber: tx.bookNumber,
                ticketNumber: tx.ticketNumber,
                date: tx.date,
                KulAkhrajat: tx.KulAkhrajat.toString(),
                SaafiAmdan: tx.SaafiAmdan.toString(),
                Exercise: tx.Exercise.toString(),
                KulMaizan: tx.KulMaizan.toString(),
                trollies: tx.trollies.map((t) => ({
                  id: t.id, // 👈 add this
                  total: t.total,
                  StartingNum: t.StartingNum.toString(),
                  EndingNum: t.EndingNum.toString()
                })),
                akhrajat: tx.akhrajat.map((a) => ({
                  id: a.id, // 👈 add this
                  title: a.title,
                  description: a.description,
                  amount: a.amount.toString(),
                  date: a.date
                }))
              })
            })

            if (!response.ok) throw new Error('Post failed')

            await window.api.transactions.markSynced({
              id: tx.id,
              syncedAt: new Date().toISOString()
            })

            console.log(`✅ Synced create: Transaction ${tx.id}`)
          } catch (err) {
            console.error(`❌ Failed to sync create for tx ${tx.id}`, err)
          }
        }
      }

      // STEP 4: deleted transactions
      const deleted = await window.api.transactions.getDeleted()

      for (const d of deleted) {
        try {
          const response = await fetch(`${URL_CLOUD}/transactions/${d.transactionId}`, {
            method: 'DELETE'
          })
          if (!response.ok) throw new Error('Delete failed')
          console.log(`✅ Synced delete: Transaction ${d.transactionId}`)
        } catch (err) {
          console.error(`❌ Failed to delete transaction ${d.transactionId}`, err)
        }
      }

      // STEP 5: clear deleted transactions
      await window.api.transactions.clearDeleted()

      setMessage('✅ Sync completed successfully!')
    } catch (err) {
      console.error('❌ Sync failed', err)
      setMessage('❌ Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="sync-button-container">
      <button onClick={handleSync} disabled={syncing} className="sync-cloud-btn">
        <span className="sync-btn-icon">{syncing ? '🔄' : '☁️'}</span>
        <span className="sync-btn-text">
          {syncing ? 'سینک ہو رہا ہے...' : 'کلاؤڈ میں سینک کریں'}
        </span>
      </button>
      {message && (
        <div className={`sync-message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  )
}

export default SyncToCloudButton
