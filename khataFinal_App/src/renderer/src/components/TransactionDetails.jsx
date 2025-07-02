import { useState, useEffect } from 'react'
import './TransactionDetails.css'

export default function TransactionDetails({ transaction, onClose }) {
  const [starting, setStarting] = useState(0n)
  const [ending, setEnding] = useState(0n)
  const [total, setTotal] = useState(0)
  const [akhrajatList, setAkhrajatList] = useState([])
  const [editRows, setEditRows] = useState({})
  const [newAkhrajat, setNewAkhrajat] = useState({ title: '', description: '', amount: 0 })
  const [akhrajatTitles, setAkhrajatTitles] = useState([])
  const [formError, setFormError] = useState('')

  useEffect(() => {
    const trolly = transaction.trollies?.[0]
    if (trolly) {
      setStarting(BigInt(trolly.StartingNum || 0))
      setEnding(BigInt(trolly.EndingNum || 0))
      setTotal(trolly.total || 0)
    }

    setAkhrajatList(transaction.akhrajat || [])
  }, [transaction])

  useEffect(() => {
    window.api.admin.akhrajatTitles.getAll().then((titles) => {
      setAkhrajatTitles(titles.map((t) => t.name))
    })
  }, [])

  const handleSaveTrolly = async () => {
    await window.api.trollies.update({
      id: transaction.trollies[0]?.id,
      startNumber: starting,
      endNumber: ending,
      total
    })
    onClose()
    setTimeout(() => {
      window.location.reload()
    }, 500)
    setFormError('');
  }

  const handleEditRowChange = (id, field, value) => {
    setEditRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  const handleEditRowSave = async (id) => {
    const row = editRows[id]
    if (!row?.title) {
      setFormError('عنوان منتخب کریں')
      return
    }
    if (!row?.amount || Number(row.amount) <= 0) {
      setFormError('درست رقم درج کریں')
      return
    }

    const updatedItem = await window.api.akhrajat.update({
      id,
      title: row.title,
      amount: Number(row.amount),
      description: row.description || '',
      date: transaction.date
    })

    setAkhrajatList((prev) => prev.map((item) => (item.id === id ? updatedItem : item)))
    setEditRows((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    setFormError('');
  }

  const handleAkhrajatDelete = async (id) => {
    await window.api.akhrajat.delete(id)
    setAkhrajatList(akhrajatList.filter((item) => item.id !== id))
  }

  const handleNewAkhrajatAdd = async () => {
    if (!newAkhrajat.title) {
      setFormError('عنوان منتخب کریں')
      return
    }
    if (!newAkhrajat.amount || Number(newAkhrajat.amount) <= 0) {
      setFormError('درست رقم درج کریں')
      return
    }

    const created = await window.api.akhrajat.create({
      ...newAkhrajat,
      transactionId: transaction.id,
      date: transaction.date
    })

    setAkhrajatList((prev) => [...prev, created])
    setNewAkhrajat({ title: '', description: '', amount: 0 })
    setFormError('')
  }

  return (
    <div className="transaction-details">
      {formError && <div className="form-error-toast">{formError}</div>}
      <div className="akhrajat-section">
        <h4>اخراجات</h4>
        {akhrajatList.map((item) => {
          const edit = editRows[item.id] || item
          const isEditing = !!editRows[item.id]

          return (
            <div key={item.id} className="akhrajat-item">
              <select
                value={edit.title}
                onChange={(e) => handleEditRowChange(item.id, 'title', e.target.value)}
              >
                <option value="">عنوان منتخب کریں</option>
                {akhrajatTitles.map((title) => (
                  <option key={title} value={title}>
                    {title}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={edit.description || ''}
                placeholder="تفصیل (اختیاری)"
                onChange={(e) => handleEditRowChange(item.id, 'description', e.target.value)}
              />
              <input
                type="number"
                value={edit.amount}
                onChange={(e) => handleEditRowChange(item.id, 'amount', e.target.value)}
              />
              {isEditing ? (
                <>
                  <button onClick={() => handleEditRowSave(item.id)}>✅</button>
                  <button
                    onClick={() => {
                      setEditRows((prev) => {
                        const copy = { ...prev }
                        delete copy[item.id]
                        return copy
                      })
                    }}
                  >
                    ❌
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditRows((prev) => ({ ...prev, [item.id]: item }))}>
                    ✏️
                  </button>
                  <button onClick={() => handleAkhrajatDelete(item.id)}>🗑️</button>
                </>
              )}
            </div>
          )
        })}

        <div className="new-akhrajat-form">
          <select
            value={newAkhrajat.title}
            onChange={(e) => setNewAkhrajat({ ...newAkhrajat, title: e.target.value })}
          >
            <option value="">عنوان منتخب کریں</option>
            {akhrajatTitles.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="تفصیل (اختیاری)"
            value={newAkhrajat.description}
            onChange={(e) => setNewAkhrajat({ ...newAkhrajat, description: e.target.value })}
          />
          <input
            type="number"
            placeholder="رقم"
            value={newAkhrajat.amount}
            onChange={(e) => setNewAkhrajat({ ...newAkhrajat, amount: Number(e.target.value) })}
          />
          <button onClick={handleNewAkhrajatAdd}>➕ شامل کریں</button>
        </div>
      </div>

      <div className="trolly-section">
        <h4>ٹرولیاں</h4>
        <div className="trolly-form">
          <div className="trolly-field">
            <label>ابتدائی نمبر:</label>
            <input
              type="number"
              value={starting.toString()}
              onChange={(e) => setStarting(BigInt(e.target.value))}
            />
          </div>
          <div className="trolly-field">
            <label>اختتامی نمبر:</label>
            <input
              type="number"
              value={ending.toString()}
              onChange={(e) => setEnding(BigInt(e.target.value))}
            />
          </div>
          <div className="trolly-field">
            <label>کل ٹرالیاں:</label>
            <input type="number" value={total} onChange={(e) => setTotal(Number(e.target.value))} />
          </div>
        </div>
        <button onClick={handleSaveTrolly} className="save-trolly-btn">
          محفوظ کریں (صفحہ ریفریش ہوگا)
        </button>
      </div>

      <button onClick={onClose} className="close-btn">
        بند کریں
      </button>
    </div>
  )
}
