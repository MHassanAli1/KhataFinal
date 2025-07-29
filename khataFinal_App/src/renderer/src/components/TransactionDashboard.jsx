import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './TransactionDashboard.css'
import TransactionDetails from './TransactionDetails'
import UrduKeyboard from './UrduKeyboard' // Import UrduKeyboard component
import { LogoutButton } from './logout'
import SyncToCloudButton from './SyncToCloudButton'
import CheckForUpdates from './CheckForUpdates'

function TransactionDashboard() {
  const [transactions, setTransactions] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [pendingDelete, setPendingDelete] = useState({
    id: null,
    confirmMessage: '',
    mode: null
  })
  const [editRows, setEditRows] = useState({})
  const [editConfirmId, setEditConfirmId] = useState(null)
  const [filterZone, setFilterZone] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterKhda, setFilterKhda] = useState('')
  const [khdaList, setKhdaList] = useState([])
  const [zoneList, setZoneList] = useState([])
  const [filterZoneId, setFilterZoneId] = useState('')
  const [filterKhdaList, setFilterKhdaList] = useState([])
  const [allKhdas, setAllKhdas] = useState([])
  const [filterBookNumber, setFilterBookNumber] = useState('')

  const navigate = useNavigate()

  // Keyboard state
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [activeInput, setActiveInput] = useState(null)

  // References for text input fields
  const inputRefs = useRef({})

  // Add effect to add/remove body class for editing mode
  useEffect(() => {
    if (Object.keys(editRows).length > 0) {
      document.body.classList.add('editing-active-body')
    } else {
      document.body.classList.remove('editing-active-body')
    }

    // Clean up on unmount
    return () => {
      document.body.classList.remove('editing-active-body')
    }
  }, [editRows])

  useEffect(() => {
    window.api.transactions.getAll().then(setTransactions)
  }, [])

  useEffect(() => {
    if (filterZoneId) {
      window.api.admin.khdas
        .getAll(Number(filterZoneId))
        .then((khdas) => setFilterKhdaList(khdas.map((k) => k.name)))
        .catch((err) => {
          console.error('Error fetching khdas', err)
          setFilterKhdaList([])
        })
    } else {
      setFilterKhdaList([])
    }
  }, [filterZoneId])

  useEffect(() => {
    window.api.admin.khdas
      .getAllkhdas()
      .then((khdas) => setAllKhdas(khdas.map((k) => k.name)))
      .catch((err) => {
        console.error('Error fetching all khdas', err)
        setAllKhdas([])
      })
  }, [])

  useEffect(() => {
    window.api.admin.zones.getAll().then((zones) => {
      setZoneList(zones)
    })
  }, [])

  // Handle keyboard input
  const handleKeyPress = (char) => {
    if (!activeInput) return

    // For editing cells
    if (activeInput.startsWith('edit-')) {
      const [_, txnId, field] = activeInput.split('-')

      if (char === 'backspace') {
        setEditRows((prev) => {
          const currentValue = prev[txnId][field] || ''
          return {
            ...prev,
            [txnId]: {
              ...prev[txnId],
              [field]: currentValue.slice(0, -1)
            }
          }
        })
      } else {
        setEditRows((prev) => ({
          ...prev,
          [txnId]: {
            ...prev[txnId],
            [field]: (prev[txnId][field] || '') + char
          }
        }))
      }
    }
  }

  // Handle input focus
  const handleInputFocus = (inputId) => {
    setActiveInput(inputId)
    setShowKeyboard(true)
  }

  // Close keyboard
  const closeKeyboard = () => {
    setShowKeyboard(false)
    setActiveInput(null)
  }

  const toggleExpand = (id) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const handleNavigation = (route) => {
    navigate(route)
  }

  // Filter transactions first
  const filteredTransactions = transactions.filter((txn) => {
    // zone filter
    const matchesZone =
      !filterZone || txn.ZoneName?.toLowerCase().includes(filterZone.toLowerCase())

    // khda filter
    const matchesKhda =
      !filterKhda || txn.KhdaName?.toLowerCase().includes(filterKhda.toLowerCase())

    // date filter
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
          if (txnDateOnly < startDateOnly) {
            matchesDate = false
          }
        }

        if (filterEndDate && matchesDate) {
          const endDate = new Date(filterEndDate)
          const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
          if (txnDateOnly > endDateOnly) {
            matchesDate = false
          }
        }
      } else {
        // if no date and user applied date filters, exclude
        matchesDate = false
      }
    }

    // book number filter
    const matchesBookNumber =
      !filterBookNumber || (txn.bookNumber && txn.bookNumber.toString().includes(filterBookNumber))

    return matchesZone && matchesKhda && matchesDate && matchesBookNumber
  })

  // Calculate totals based on FILTERED transactions only
  const totalByZone = filteredTransactions.reduce((acc, t) => {
    acc[t.ZoneName] = acc[t.ZoneName] || {
      KulAmdan: 0n,
      KulAkhrajat: 0n,
      SaafiAmdan: 0n,
      Exercise: 0n,
      KulMaizan: 0n
    }
    acc[t.ZoneName].KulAmdan += BigInt(t.KulAmdan)
    acc[t.ZoneName].KulAkhrajat += BigInt(t.KulAkhrajat)
    acc[t.ZoneName].SaafiAmdan += BigInt(t.SaafiAmdan)
    acc[t.ZoneName].Exercise += BigInt(t.Exercise || 0)
    acc[t.ZoneName].KulMaizan += BigInt(t.KulMaizan || 0)
    return acc
  }, {})

  return (
    <div className="transaction-dashboard">
      <div className="navigation-header">
        <button
          className="nav-button form-button"
          onClick={() => handleNavigation('/CreateTransactionForm')}
        >
          📝 فارم
        </button>
        <h2>ریکارڈ ڈیش بورڈ</h2>
        <button className="nav-button report-button" onClick={() => handleNavigation('/report')}>
          📊 اعداد و شمار
        </button>
      </div>

      <div className="filters">
        <label>
          زون منتخب کریں:
          <select
            value={filterZoneId}
            onChange={(e) => {
              const id = e.target.value
              setFilterZoneId(id)
              setFilterKhda('') // ✅ reset the khda filter when zone changes
              const name = zoneList.find((z) => z.id === Number(id))?.name || ''
              setFilterZone(name)
            }}
            className="filter-select"
          >
            <option value="">-- تمام زون --</option>
            {zoneList.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
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
          >
            <option value="">-- تمام کھدے --</option>
            {filterKhdaList.map((khda) => (
              <option key={khda} value={khda}>
                {khda}
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
              <th>کتاب نمبر</th>
              <th>ابتدائی نمبر</th>
              <th>اختتامی نمبر</th>
              <th>کل ٹرالیاں</th>
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

              return (
                <tr key={txn.id} className={isEditing ? 'editing-row' : ''}>
                  <td>
                    {isEditing ? (
                      <input
                        type="date"
                        className="edit-input"
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
                        new Date(txn.date).toLocaleDateString()
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="edit-input"
                        value={edited.ZoneName || txn.ZoneName || ``}
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, ZoneName: e.target.value }
                          }))
                        }
                      >
                        {zoneList.map((zone) => (
                          <option key={zone.id} value={zone.name}>
                            {zone.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      txn.ZoneName
                    )}
                  </td>
                  <td>
                    {isEditing ? (
                      <select
                        className="edit-input"
                        value={edited.KhdaName || txn.KhdaName || ``}
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, KhdaName: e.target.value }
                          }))
                        }
                      >
                        {allKhdas.map((khda) => (
                          <option key={khda} value={khda}>
                            {khda}
                          </option>
                        ))}
                      </select>
                    ) : (
                      txn.KhdaName
                    )}
                  </td>
                  <td>{txn.trollies[0]?.bookNumber ?? '—'}</td>
                  <td>{txn.trollies[0]?.StartingNum.toString() ?? '—'}</td>
                  <td>{txn.trollies[0]?.EndingNum.toString() ?? '—'}</td>
                  <td>{txn.trollies[0]?.total ?? '—'}</td>
                  <td>
                    {isEditing ? (
                      <input
                        type="number"
                        className="edit-input"
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                        value={edited.KulAmdan || txn.KulAmdan || ``}
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, KulAmdan: e.target.value }
                          }))
                        }
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
                        value={edited.KulAkhrajat || txn.KulAkhrajat || ``}
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
                        value={edited.SaafiAmdan || txn.SaafiAmdan || ``}
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, SaafiAmdan: e.target.value }
                          }))
                        }
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
                        value={edited.Exercise || txn.Exercise || 0 || ``}
                        onChange={(e) =>
                          setEditRows((prev) => ({
                            ...prev,
                            [txn.id]: { ...edited, Exercise: e.target.value }
                          }))
                        }
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
                        value={edited.KulMaizan || txn.KulMaizan || 0}
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
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
                            onClick={() => {
                              // pull out the one Trolly record
                              const trolly = txn.trollies[0]
                              // count how many trolleys have this bookNumber
                              const all = transactions.filter(
                                (t) => t.trollies[0]?.bookNumber === trolly.bookNumber
                              )
                              const last = Math.max(
                                ...all.map((t) => Number(t.trollies[0].EndingNum))
                              )

                              // if the ActiveBook is still active or full, delete entire book
                              if (all.length >= trolly.total || txn.activeBook.isActive) {
                                setPendingDelete({
                                  id: trolly.id,
                                  confirmMessage:
                                    'یہ کتاب فعال ہے یا مکمل ہے۔ پوری کتاب حذف کرنا چاہتے ہیں؟',
                                  mode: 'book',
                                  bookNumber: trolly.bookNumber
                                })
                              }
                              // if this isn’t the very last trolley, cascade-delete the rest
                              else if (BigInt(trolly.EndingNum) < BigInt(last)) {
                                setPendingDelete({
                                  id: trolly.id,
                                  confirmMessage: `ٹرالی ${trolly.StartingNum} کے بعد باقی (${BigInt(trolly.EndingNum) + 1}–${last}) حذف ہوں گے۔ کیا تصدیق کرتے ہیں؟`,
                                  mode: 'cascade',
                                  bookNumber: trolly.bookNumber
                                })
                              }
                              // otherwise, deleting the last trolley in this book
                              else {
                                setPendingDelete({
                                  id: trolly.id,
                                  confirmMessage: 'کیا آپ واقعی اس ٹرالی کو حذف کرنا چاہتے ہیں؟',
                                  mode: 'single',
                                  bookNumber: trolly.bookNumber
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
              )
            })}
          </tbody>
        </table>
      </div>

      {expandedId && (
        <TransactionDetails
          transaction={transactions.find((t) => t.id === expandedId)}
          onClose={() => setExpandedId(null)}
        />
      )}

      <hr />
      <div className="zone-summary">
        <h3>📈 زون کا خلاصہ</h3>
        {Object.keys(totalByZone).length > 0 ? (
          <div className="summary-grid">
            {Object.entries(totalByZone).map(([zone, totals]) => (
              <div key={zone} className="zone-card">
                <div className="zone-header">
                  <strong> {zone}</strong>
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

      {/* Confirmation Modal */}
      {pendingDelete.id !== null && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-icon">🗑️</div>
            <h3>حذف کی تصدیق</h3>
            <p>{pendingDelete.confirmMessage}</p>
            <div className="modal-buttons">
              <button
                className="confirm-delete-button"
                onClick={async () => {
                  try {
                    if (pendingDelete.mode === 'book') {
                      await window.api.transactions.deleteBookByNumber(pendingDelete.bookNumber)
                    } else if (pendingDelete.mode === 'cascade') {
                      await window.api.transactions.deleteFromTrolly(pendingDelete.id)
                    } else {
                      await window.api.transactions.deleteTrolly(pendingDelete.id)
                    }
                    setPendingDelete({ id: null, confirmMessage: '', mode: null })
                    setTransactions(await window.api.transactions.getAll())
                  } catch (err) {
                    console.error('Delete error', err)
                  }
                }}
              >
                ✅ تصدیق کریں
              </button>
              <button
                className="cancel-modal-button"
                onClick={() => setPendingDelete({ id: null, confirmMessage: '', mode: null })}
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
                  setTransactions(await window.api.transactions.getAll())
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

      {/* Keyboard toggle button */}
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

      {/* Urdu Keyboard */}
      {showKeyboard && <UrduKeyboard onKeyPress={handleKeyPress} onClose={closeKeyboard} />}

      {/* Bottom Navigation Menu */}
      <div className="bottom-navigation">
        <div className="bottom-nav-section">
          <h4 className="section-title">📊 رپورٹس اور خلاصہ</h4>
          <div className="bottom-nav-buttons">
            <button
              className="bottom-nav-btn primary"
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
              className="bottom-nav-btn primary"
              onClick={() => handleNavigation('./GariSummary')}
            >
              <span className="btn-icon">🚗</span>
              <span className="btn-text">گاڑی کا خلاصہ</span>
            </button>
            <button
              className="bottom-nav-btn primary"
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
              className="bottom-nav-btn secondary"
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
