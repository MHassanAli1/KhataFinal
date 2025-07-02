'use client'

import { useState } from 'react'

const SyncToCloudButton = () => {
  const URL_CLOUD = `https://khataremote-production.up.railway.app`
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

            if (!response.ok) throw new Error('Update failed')

            await window.api.transactions.markSynced({
              id: tx.id,
              syncedAt: new Date().toISOString()
            })

            console.log(`✅ Synced update: Transaction ${tx.id}`)
          } catch (err) {
            console.error(`❌ Failed to sync update for tx ${tx.id}`, err)
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
                userID: tx.userID,
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
    <button
      onClick={handleSync}
      disabled={syncing}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      {syncing ? 'Syncing...' : 'Sync to Cloud'}
      {message && <div className="text-xs mt-1 text-gray-500">{message}</div>}
    </button>
  )
}

export default SyncToCloudButton
