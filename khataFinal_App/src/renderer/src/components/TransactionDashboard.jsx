/* eslint-disable */
import { useEffect, useState, useCallback, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import './TransactionDashboard.css'
import TransactionDetails from './TransactionDetails'
import UrduKeyboard from './UrduKeyboard'
import { LogoutButton } from './logout'
import SyncToCloudButton from './SyncToCloudButton'
import CheckForUpdates from './CheckForUpdates'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function TransactionDashboard() {
  const [transactions, setTransactions] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState({
    id: null,
    confirmMessage: '',
    mode: null,
    bookNumber: null
  })
  const [editRows, setEditRows] = useState({})
  const [editConfirmId, setEditConfirmId] = useState(null)
  const [filterZone, setFilterZone] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterKhda, setFilterKhda] = useState('')
  // removed unused khdaList state
  const [zoneList, setZoneList] = useState([])
  const [filterZoneId, setFilterZoneId] = useState('')
  const [filterKhdaList, setFilterKhdaList] = useState([])
  const [allKhdas, setAllKhdas] = useState([])
  const [filterBookNumber, setFilterBookNumber] = useState('')

  const navigate = useNavigate()
  // removed unused inputRefs ref
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [activeInput, setActiveInput] = useState(null)

  // Refresh transactions after updates or deletions
  const refreshTransactions = useCallback(async () => {
    try {
      const txns = await window.api.transactions.getAll({
        zoneName: filterZone || undefined,
        khdaName: filterKhda || undefined,
        bookNumber: filterBookNumber ? parseInt(filterBookNumber, 10) : undefined,
        dateFrom: filterStartDate || undefined,
        dateTo: filterEndDate || undefined
      })
      setTransactions(txns || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      toast.error('ریکارڈز لوڈ کرنے میں ناکامی')
    }
  }, [filterZone, filterKhda, filterBookNumber, filterStartDate, filterEndDate])

  useEffect(() => {
    document.body.classList.toggle('editing-active-body', Object.keys(editRows).length > 0)
    return () => document.body.classList.remove('editing-active-body')
  }, [editRows])

  useEffect(() => {
    refreshTransactions()
  }, [refreshTransactions])

  useEffect(() => {
    if (filterZoneId) {
      window.api.admin.khdas
        .getAll(Number(filterZoneId))
        .then((khdas) => setFilterKhdaList(khdas.map((k) => k.name)))
        .catch((err) => {
          console.error('Error fetching khdas:', err)
          setFilterKhdaList([])
          toast.error('کھدوں کی فہرست لوڈ کرنے میں ناکامی')
        })
    } else {
      setFilterKhdaList([])
      setFilterKhda('')
    }
  }, [filterZoneId])

  useEffect(() => {
    window.api.admin.khdas
      .getAllkhdas()
      .then((khdas) => setAllKhdas(khdas.map((k) => k.name)))
      .catch((err) => {
        console.error('Error fetching all khdas:', err)
        setAllKhdas([])
        toast.error('تمام کھدوں کی فہرست لوڈ کرنے میں ناکامی')
      })
  }, [])

  useEffect(() => {
    window.api.admin.zones
      .getAll()
      .then(setZoneList)
      .catch((err) => {
        console.error('Error fetching zones:', err)
        toast.error('زونز لوڈ کرنے میں ناکامی')
      })
  }, [])

  const handleKeyPress = (char) => {
  if (!activeInput || !activeInput.startsWith('edit-')) return
  const [, txnId, field] = activeInput.split('-')
  setEditRows((prev) => {
      const currentValue = prev[txnId][field] || ''
      return {
        ...prev,
        [txnId]: {
          ...prev[txnId],
          [field]: char === 'backspace' ? currentValue.slice(0, -1) : currentValue + char
        }
      }
    })
  }

  const handleInputFocus = (inputId) => {
    setActiveInput(inputId)
    setShowKeyboard(true)
  }

  const closeKeyboard = () => {
    setShowKeyboard(false)
    setActiveInput(null)
  }

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // When TransactionDetails changes akhrajat (or anything) and backend
  // recalculates totals, merge the fresh record into our table rows.
  const handleDetailsUpdated = useCallback((updatedTx) => {
    if (!updatedTx?.id) return
    setTransactions((prev) => prev.map((t) => (t.id === updatedTx.id ? updatedTx : t)))
    setEditRows((prev) => {
      if (!prev[updatedTx.id]) return prev
      return {
        ...prev,
        [updatedTx.id]: {
          ...prev[updatedTx.id],
          KulAkhrajat: updatedTx.KulAkhrajat,
          SaafiAmdan: updatedTx.SaafiAmdan,
          KulMaizan: updatedTx.KulMaizan
        }
      }
    })
  }, [])

  const handleNavigation = (route) => {
    navigate(route)
  }

  // Normalize Urdu text for comparison
  const normalizeUrdu = (text) => {
    return text
      ? text
          .normalize('NFKC') // Normalize Unicode
          .replace(/[\u200B-\u200F\u202A-\u202E]/g, '') // Remove control characters
          .trim()
      : ''
  }

  const filteredTransactions = transactions.filter((txn) => {
    const matchesZone =
      !filterZone || normalizeUrdu(txn.ZoneName || '').includes(normalizeUrdu(filterZone))
    const matchesKhda =
      !filterKhda || normalizeUrdu(txn.KhdaName || '').includes(normalizeUrdu(filterKhda))
    let matchesDate = true
    if (filterStartDate || filterEndDate) {
      const txnDate = txn.date ? new Date(txn.date) : null
      if (txnDate) {
        const txnDateOnly = new Date(txnDate.getFullYear(), txnDate.getMonth(), txnDate.getDate())
        if (filterStartDate) {
          const startDate = new Date(filterStartDate)
          const startDateOnly = new Date(
            startDate.getFullYear(),
            startDate.getMonth(),
            startDate.getDate()
          )
          if (txnDateOnly < startDateOnly) matchesDate = false
        }
        if (filterEndDate && matchesDate) {
          const endDate = new Date(filterEndDate)
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
          if (txnDateOnly > endDateOnly) matchesDate = false
        }
      } else {
        matchesDate = false
      }
    }
    const matchesBookNumber = (() => {
      if (!filterBookNumber) return true
      const ts = txn.trollies || []
      return ts.some((t) => t.bookNumber?.toString().includes(filterBookNumber.trim()))
    })()
    return matchesZone && matchesKhda && matchesDate && matchesBookNumber
  })

  const totalByZone = filteredTransactions.reduce((acc, t) => {
    const zone = normalizeUrdu(t.ZoneName || 'نامعلوم')
    acc[zone] = acc[zone] || {
      KulAmdan: 0n,
      KulAkhrajat: 0n,
      SaafiAmdan: 0n,
      Exercise: 0n,
      KulMaizan: 0n
    }
    acc[zone].KulAmdan += BigInt(t.KulAmdan || 0)
    acc[zone].KulAkhrajat += BigInt(t.KulAkhrajat || 0)
    acc[zone].SaafiAmdan += BigInt(t.SaafiAmdan || 0)
    acc[zone].Exercise += BigInt(t.Exercise || 0)
    acc[zone].KulMaizan += BigInt(t.KulMaizan || 0)
    return acc
  }, {})

  const handleDeleteConfirmation = async () => {
    try {
      let message
      if (
        pendingDelete.mode === 'book' ||
        pendingDelete.mode === 'single' ||
        pendingDelete.mode === 'cascade'
      ) {
        const response = await window.api.transactions.deleteTrolly(pendingDelete.id)
        message = response.message || `ٹرالی یا کتاب حذف ہو گئی۔`
      }
      setPendingDelete({ id: null, confirmMessage: '', mode: null, bookNumber: null })
      await refreshTransactions()
      toast.success(message)
    } catch (err) {
      console.error('Delete error:', err)
      toast.error(`حذف کرنے میں ناکامی: ${err.message}`)
    }
  }

  return (
    <div className="transaction-dashboard">
      <div className="navigation-header">
        <button
          className="nav-button form-button highlight"
          onClick={() => handleNavigation('/CreateTransactionForm')}
        >
          📝 فارم
        </button>
        <h2>ریکارڈ ڈیش بورڈ</h2>
        <button className="nav-button report-button" onClick={() => handleNavigation('/report')}>
          📊 اعداد و شمار
        </button>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="filters">
        <label>
          زون منتخب کریں:
          <select
            value={filterZoneId}
            onChange={(e) => {
              const id = e.target.value
              setFilterZoneId(id)
              const name = zoneList.find((z) => z.id === Number(id))?.name || ''
              setFilterZone(name)
            }}
            className="filter-select"
          >
            <option value="">-- تمام زون --</option>
            {zoneList.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {normalizeUrdu(zone.name)}
              </option>
            ))}
          </select>
        </label>
        <label>
          کھدہ منتخب کریں:
          <select
            value={filterKhda}
            onChange={(e) => setFilterKhda(e.target.value)}
            className="filter-select"
            disabled={!filterKhdaList.length}
          >
            <option value="">-- تمام کھدے --</option>
            {filterKhdaList.map((khda) => (
              <option key={khda} value={khda}>
                {normalizeUrdu(khda)}
              </option>
            ))}
          </select>
        </label>
        <label>
          کتاب نمبر:
          <input
            type="text"
            value={filterBookNumber}
            onChange={(e) => setFilterBookNumber(e.target.value)}
            className="filter-input"
            placeholder="کتاب نمبر درج کریں"
            onFocus={() => handleInputFocus('filter-bookNumber')}
          />
        </label>
        <label>
          شروع تاریخ:
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </label>
        <label>
          آخری تاریخ:
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </label>
      </div>

      <div
        className={`table-container ${Object.keys(editRows).length > 0 ? 'editing-active' : ''}`}
      >
        <table>
          <thead>
            <tr>
              <th>تاریخ</th>
              <th>زون</th>
              <th>کھدہ</th>
              <th>کل آمدن</th>
              <th>کل اخراجات</th>
              <th>صافی آمدن</th>
              <th>ایکسایز</th>
              <th>کل میزان</th>
              <th>تفصیل / حذف</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((txn) => {
              const isEditing = editRows[txn.id]
              const edited = editRows[txn.id] || {}

              // helper to compute and set derived numbers during editing
              const setWithDerived = (field, value) => {
                setEditRows((prev) => {
                  const cur = prev[txn.id] || {}
                  const draft = { ...cur, [field]: value }
                  const n = (v) => (v === '' || v == null ? 0 : Number(v))
                  const baseKulAkh = n(draft.KulAkhrajat ?? txn.KulAkhrajat)
                  const baseKulAmd = n(draft.KulAmdan ?? txn.KulAmdan)
                  const baseEx = n(draft.Exercise ?? txn.Exercise)
                  // If SaafiAmdan is being directly edited, respect it; otherwise derive
                  const saafi =
                    field === 'SaafiAmdan' ? n(value) : Math.max(0, baseKulAmd - baseKulAkh)
                  const kulMaizan = saafi + (field === 'Exercise' ? n(value) : baseEx)
                  return {
                    ...prev,
                    [txn.id]: { ...draft, SaafiAmdan: saafi, KulMaizan: kulMaizan }
                  }
                })
              }

              return (
                <Fragment key={txn.id}>
                  <tr className={isEditing ? 'editing-row' : ''}>
                  <td>
                    {isEditing ? (
                      <input
                        type="date"
                        className="edit-input"
                        readOnly
                        value={
                          edited.date
                            ? typeof edited.date === 'string'
                              ? edited.date
                              : new Date(edited.date).toISOString().split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, date: e.target.value }
                          }))
                        }
                      />
                    ) : txn.date ? (
                      typeof txn.date === 'string' ? (
                        txn.date
                      ) : (
                        new Date(txn.date).toLocaleDateString('ur-PK')
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="edit-input"
                        value={edited.ZoneName || txn.ZoneName || ''}
                        readOnly
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, ZoneName: e.target.value }
                          }))
                        }
                      >
                        {zoneList.map((zone) => (
                          <option key={zone.id} value={zone.name}>
                            {normalizeUrdu(zone.name)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      normalizeUrdu(txn.ZoneName) || '—'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="edit-input"
                        value={edited.KhdaName || txn.KhdaName || ''}
                        readOnly
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, KhdaName: e.target.value }
                          }))
                        }
                      >
                        {allKhdas.map((khda) => (
                          <option key={khda} value={khda}>
                            {normalizeUrdu(khda)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      normalizeUrdu(txn.KhdaName) || '—'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="edit-input"
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                        value={edited.KulAmdan ?? txn.KulAmdan ?? ''}
                        onChange={(e) => setWithDerived('KulAmdan', e.target.value)}
                      />
                    ) : (
                      txn.KulAmdan.toString()
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="edit-input"
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                        readOnly
                        value={edited.KulAkhrajat ?? txn.KulAkhrajat ?? ''}
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, KulAkhrajat: e.target.value }
                          }))
                        }
                      />
                    ) : (
                      txn.KulAkhrajat.toString()
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="edit-input"
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                        value={edited.SaafiAmdan ?? txn.SaafiAmdan ?? ''}
                        onChange={(e) => setWithDerived('SaafiAmdan', e.target.value)}
                      />
                    ) : (
                      txn.SaafiAmdan.toString()
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="edit-input"
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                        value={edited.Exercise ?? txn.Exercise ?? 0}
                        onChange={(e) => setWithDerived('Exercise', e.target.value)}
                      />
                    ) : (
                      txn.Exercise?.toString() || '0'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="edit-input"
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                        value={edited.KulMaizan ?? txn.KulMaizan ?? 0}
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, KulMaizan: e.target.value }
                          }))
                        }
                      />
                    ) : (
                      txn.KulMaizan?.toString() || '0'
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {isEditing ? (
                        <>
                          <button className="save-button" onClick={() => setEditConfirmId(txn.id)}>
                            ✅ محفوظ کریں
                          </button>
                          <button
                            className="cancel-button"
                            onClick={() =>
                              setEditRows((prev) => {
                                const updated = { ...prev }
                                delete updated[txn.id]
                                return updated
                              })
                            }
                          >
                            ❌ منسوخ کریں
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="edit-button"
                            onClick={() =>
                              setEditRows((prev) => ({
                                ...prev,
                                [txn.id]: { ...txn }
                              }))
                            }
                          >
                            ترمیم
                          </button>
                          <button
                            className="delete-button"
                            onClick={async () => {
                              const trolly = (txn.trollies || [])[0]
                              if (!trolly) {
                                toast.error('ٹرالی کی معلومات غائب ہیں')
                                return
                              }
                              const bookNum = trolly.bookNumber
                              const zone = normalizeUrdu(txn.ZoneName)
                              const khda = normalizeUrdu(txn.KhdaName)
                              const startNum = Number(trolly.StartingNum)

                              const allInBook = transactions.filter((t) =>
                                (t.trollies || []).some((tr) => tr.bookNumber === bookNum)
                              )
                              const totalInBook = allInBook.reduce(
                                (sum, t) =>
                                  sum +
                                  (t.trollies || []).reduce((s, tr) => s + (tr.total || 0), 0),
                                0
                              )

                              const forward = allInBook.filter((t) => {
                                const minStart = (t.trollies || []).reduce((min, tr) => {
                                  const n = Number(tr.StartingNum)
                                  if (min === null || n < min) return n
                                  return min
                                }, null)
                                return (minStart ?? 0) >= startNum
                              })
                              const forwardCount = forward.length

                              const isFullOrInactive =
                                txn.activeBook?.usedTickets >= 100 ||
                                txn.activeBook?.isActive === false

                              if (isFullOrInactive) {
                                setPendingDelete({
                                  id: trolly.id,
                                  mode: 'single',
                                  bookNumber: bookNum,
                                  confirmMessage: `کتاب نمبر ${bookNum} (زون: ${zone}، کھدہ: ${khda}) غیر فعال یا مکمل ہے۔ اس کی کل ${totalInBook} ٹکٹس حذف ہوں گی۔ کیا آپ تصدیق کرتے ہیں؟`
                                })
                              } else if (forwardCount > 1) {
                                setPendingDelete({
                                  id: trolly.id,
                                  mode: 'cascade',
                                  bookNumber: bookNum,
                                  confirmMessage: `ٹرالی نمبر ${startNum} سے کتاب نمبر ${bookNum} کی کل ${forwardCount} ٹرالیاں حذف ہوں گی۔ کیا آپ تصدیق کرتے ہیں؟`
                                })
                              } else {
                                setPendingDelete({
                                  id: trolly.id,
                                  mode: 'single',
                                  bookNumber: bookNum,
                                  confirmMessage: `کیا آپ واقعی کتاب نمبر ${bookNum} کی ٹرالی نمبر ${startNum} حذف کرنا چاہتے ہیں؟`
                                })
                              }
                            }}
                          >
                            حذف
                          </button>
                          <button className="details-button" onClick={() => toggleExpand(txn.id)}>
                            {expandedId === txn.id ? '🔼 بند کریں' : '🔽 مزید دیکھیں'}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  </tr>
                  {expandedId === txn.id && (
                    <tr className="details-row">
                      <td colSpan={9}>
                        <TransactionDetails
                          transaction={transactions.find((t) => t.id === txn.id) || txn}
                          onUpdate={handleDetailsUpdated}
                          onClose={() => setExpandedId(null)}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>


      <hr />
      <div className="zone-summary">
        <h3>📈 زون کا خلاصہ</h3>
        {Object.keys(totalByZone).length > 0 ? (
          <div className="summary-grid">
            {Object.entries(totalByZone).map(([zone, totals]) => (
              <div key={zone} className="zone-card">
                <div className="zone-header">
                  <strong>{normalizeUrdu(zone)}</strong>
                </div>
                <div className="zone-stats">
                  <div className="stat-item">
                    <span className="stat-label"> آمدن:</span>
                    <span className="stat-value">{totals.KulAmdan.toString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">اخراجات:</span>
                    <span className="stat-value">{totals.KulAkhrajat.toString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label"> صافی آمدن:</span>
                    <span className="stat-value profit">{totals.SaafiAmdan.toString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label"> ایکسایز:</span>
                    <span className="stat-value">{totals.Exercise.toString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label"> میزان:</span>
                    <span className="stat-value">{totals.KulMaizan.toString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data-message">
            <p>فلٹر کے معیار کے مطابق کوئی ڈیٹا نہیں ملا</p>
          </div>
        )}
      </div>

      {(pendingDelete.id !== null || pendingDelete.mode === 'book') && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-icon">🗑️</div>
            <h3>حذف کی تصدیق</h3>
            <p>{pendingDelete.confirmMessage}</p>
            <div className="modal-buttons">
              <button className="confirm-delete-button" onClick={handleDeleteConfirmation}>
                ✅ تصدیق کریں
              </button>
              <button
                className="cancel-modal-button"
                onClick={() =>
                  setPendingDelete({ id: null, confirmMessage: '', mode: null, bookNumber: null })
                }
              >
                ❌ منسوخ کریں
              </button>
            </div>
          </div>
        </div>
      )}

      {editConfirmId !== null && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-icon">💾</div>
            <h3>تبدیلی کی تصدیق</h3>
            <p>کیا آپ اس ترمیم کو محفوظ کرنا چاہتے ہیں؟</p>
            <div className="modal-buttons">
              <button
                className="confirm-save-button"
                onClick={async () => {
                  try {
                    const updatedData = editRows[editConfirmId]
                    await window.api.transactions.update({
                      id: editConfirmId,
                      ...updatedData
                    })
                    setEditConfirmId(null)
                    setEditRows((prev) => {
                      const updated = { ...prev }
                      delete updated[editConfirmId]
                      return updated
                    })
                    await refreshTransactions()
                    toast.success('ترمیم کامیابی سے محفوظ ہو گئی۔')
                  } catch (err) {
                    console.error('Update error:', err)
                    toast.error(`ترمیم محفوظ کرنے میں ناکامی: ${err.message}`)
                  }
                }}
              >
                ✅ ہاں، محفوظ کریں
              </button>
              <button className="cancel-modal-button" onClick={() => setEditConfirmId(null)}>
                ❌ نہیں، منسوخ کریں
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        className="circle-btn primary keyboard-toggle"
        onClick={() => setShowKeyboard(!showKeyboard)}
        aria-label="Toggle Urdu Keyboard"
      >
        <span role="img" aria-label="keyboard">
          ⌨️
        </span>
      </button>

      {showKeyboard && <UrduKeyboard onKeyPress={handleKeyPress} onClose={closeKeyboard} />}

      <div className="bottom-navigation">
        <div className="bottom-nav-section">
          <h4 className="section-title">📊 رپورٹس اور خلاصہ</h4>
          <div className="bottom-nav-buttons">
            <button
              className="bottom-nav-btn primary emphasis"
              onClick={() => handleNavigation('./AkhrajatSummary')}
            >
              <span className="btn-icon">💰</span>
              <span className="btn-text">اخراجات کا خلاصہ</span>
            </button>
            <button
              className="bottom-nav-btn primary"
              onClick={() => handleNavigation('./TrollySummary')}
            >
              <span className="btn-icon">🚛</span>
              <span className="btn-text">ٹرالی کا خلاصہ</span>
            </button>
            <button
              className="bottom-nav-btn secondary"
              onClick={() => handleNavigation('./TrollySummaryold')}
            >
              <span className="btn-icon">📋</span>
              <span className="btn-text">ٹرالی کی تفصیل</span>
            </button>
            <button
              className="bottom-nav-btn primary"
              onClick={() => handleNavigation('./TransactionSummary')}
            >
              <span className="btn-icon">📈</span>
              <span className="btn-text">ریکارڈ کا خلاصہ</span>
            </button>
            <button
              className="bottom-nav-btn primary emphasis"
              onClick={() => handleNavigation('./GariSummary')}
            >
              <span className="btn-icon">🚗</span>
              <span className="btn-text">گاڑی کا خلاصہ</span>
            </button>
            <button
              className="bottom-nav-btn primary emphasis"
              onClick={() => handleNavigation('./MutafarikAkhrajatSummary')}
            >
              <span className="btn-icon">⛩️</span>
              <span className="btn-text">متفرق اخراجات</span>
            </button>
          </div>
        </div>

        <div className="bottom-nav-section">
          <h4 className="section-title">⚙️ منیجمنٹ</h4>
          <div className="bottom-nav-buttons">
            <button
              className="bottom-nav-btn secondary emphasis"
              onClick={() => handleNavigation('./AdminPanel')}
            >
              <span className="btn-icon">👨‍💼</span>
              <span className="btn-text">ایڈمن پینل</span>
            </button>
            <div className="sync-wrapper">
              <SyncToCloudButton />
            </div>
            <div className="sync-wrapper">
              <CheckForUpdates />
            </div>
          </div>
        </div>
      </div>

      <LogoutButton />
      <div className="developer-mark">
        <span className="developer-text">Made with ❤️ by Cache</span>
      </div>
    </div>
  )
}

export default TransactionDashboard
