/* eslint-disable prettier/prettier */
'use client'

import { useState } from 'react'
import './SyncToCloudButton.css'

const SyncToCloudButton = () => {
  const URL_CLOUD = `https://khataremote-production.up.railway.app`
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')

  const handleSync = async () => {
    setSyncing(true)
    setMessage('')

    try {
      // Build full backup and upload once
      const [
        zones,
        othersTitles,
        akhrajatTitles,
        gariTitles,
        gariExpenseTypeTitles,
        gariParts,
        transactions
      ] = await Promise.all([
        window.api.admin.zones.getAll(),
        window.api.admin.othersTitles.getAll(),
        window.api.admin.akhrajatTitles.getAll(),
        window.api.admin.gariTitles.getAll(),
        window.api.admin.gariExpenseTypes.getAll(),
        window.api.admin.gariParts.getAll(),
        window.api.transactions.getAll({})
      ])

      const normalizedTransactions = (transactions || []).map((tx) => ({
        id: tx.id,
        ZoneName: tx.ZoneName,
        KhdaName: tx.KhdaName,
        date: tx.date,
        KulAmdan: tx.KulAmdan != null ? tx.KulAmdan.toString() : '0',
        KulAkhrajat: tx.KulAkhrajat != null ? tx.KulAkhrajat.toString() : '0',
        SaafiAmdan: tx.SaafiAmdan != null ? tx.SaafiAmdan.toString() : '0',
        Exercise: tx.Exercise != null ? tx.Exercise.toString() : '0',
        KulMaizan: tx.KulMaizan != null ? tx.KulMaizan.toString() : '0',
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        activeBook: tx.activeBook
          ? {
              id: tx.activeBook.id,
              bookNumber: tx.activeBook.bookNumber,
              zoneName: tx.activeBook.zoneName,
              khdaName: tx.activeBook.khdaName,
              isActive: tx.activeBook.isActive,
              usedTickets: tx.activeBook.usedTickets,
              maxTickets: tx.activeBook.maxTickets,
              createdAt: tx.activeBook.createdAt,
              updatedAt: tx.activeBook.updatedAt
            }
          : null,
        trollies: (tx.trollies || []).map((t) => ({
          id: t.id,
          total: t.total,
          bookNumber: t.bookNumber,
          StartingNum: t.StartingNum != null ? t.StartingNum.toString() : '0',
          EndingNum: t.EndingNum != null ? t.EndingNum.toString() : '0'
        })),
        akhrajat: (tx.akhrajat || []).map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description ?? null,
          amount: a.amount != null ? a.amount.toString() : '0',
          date: a.date,
          isGari: a.isGari ?? false,
          isOther: a.isOther ?? false,
          othersTitlesId: a.othersTitlesId ?? null,
          gariExpense: (a.gariExpense || []).map((g) => ({
            Id: g.Id,
            title: g.title,
            quantity: g.quantity ?? null,
            part: g.part ?? null
          }))
        }))
      }))

      const payload = {
        version: '1.0',
        generatedAt: new Date().toISOString(),
        masters: {
          zones: zones || [],
          othersTitles: othersTitles || [],
          akhrajatTitles: akhrajatTitles || [],
          gariTitles: gariTitles || [],
          gariExpenseTypeTitles: gariExpenseTypeTitles || [],
          gariParts: gariParts || []
        },
        data: { transactions: normalizedTransactions }
      }

      const response = await fetch(`${URL_CLOUD}/backup/full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Backup upload failed')

      setMessage('✅ Backup completed successfully!')
    } catch (err) {
      console.error('❌ Sync failed', err)
      setMessage('❌ Backup failed')
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
