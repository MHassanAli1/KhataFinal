import { useState, useEffect, useMemo } from 'react'
import './TransactionDetails.css'

/**
 * TransactionDetails
 * ------------------------------------------------------------
 * - Always refetches a *full* transaction (with akhrajat.gariExpense[])
 *   so read-mode summaries show correct gari expense type.
 * - Supports prisma relation name `gariExpense` (singular) or legacy `gariExpenses`.
 * - Displays Gari expense *type* + (quantity|part) + amount in read mode.
 * - Provides dropdown of Gari Parts when type is Repairing/مرمت.
 * - Normalizes data on load & after create/update.
 */
export default function TransactionDetails({ transaction, onClose }) {
  /* --------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------ */
  const toSlug = (raw = '') => {
    const v = (raw || '').trim().toLowerCase()
    if (!v) return ''
    if (['petrol', 'پٹرول'].includes(v)) return 'petrol'
    if (['diesel', 'ڈیزل'].includes(v)) return 'diesel'
    if (['repairing', 'مرمت'].includes(v)) return 'repairing'
    if (['tuning', 'ٹیوننگ', 'ٹوننگ'].includes(v)) return 'tuning'
    if (['parts', 'part', 'پرزہ', 'پارٹس'].includes(v)) return 'repairing' // treat "parts" as repairing
    return v
  }

  /** Return gariExpense[] regardless of backend key shape. */
  const normalizeGariArray = (obj) => {
    if (!obj) return []
    if (Array.isArray(obj.gariExpense)) return obj.gariExpense
    if (Array.isArray(obj.gariExpenses)) return obj.gariExpenses
    return []
  }

  /** Build a normalized Akhrajat row with primary convenience object. */
  const normalizeAkhrajatItem = (a) => {
    const arr = normalizeGariArray(a)
    return {
      ...a,
      gariExpenses: arr, // keep full array for outbound payloads
      gariExpense: arr[0] || { title: '', quantity: '', part: '' } // primary for UI
    }
  }

  const formatAmount = (v) => {
    if (v === null || v === undefined || v === '') return ''
    return typeof v === 'bigint' ? v.toString() : String(v)
  }

  /** Map backend title -> display label (Urdu if lookup exists). */
  const makeDisplayGariLabel = (options) => (title) => {
    const slug = toSlug(title)
    const opt = options.find((o) => toSlug(o.value) === slug || toSlug(o.label) === slug)
    return opt?.label ?? title ?? 'N/A'
  }

  /** Summary shown in read mode under the Gari field. */
  const formatGariSummary = (ge, amt, displayLabel) => {
    if (!ge) return ''
    const slug = toSlug(ge.title)
    const label = displayLabel(ge.title)
    const amtTxt = formatAmount(amt)
    if (slug === 'petrol' || slug === 'diesel') {
      return `${label}${ge.quantity ? ` – مقدار: ${ge.quantity} لیٹر` : ''}${
        amtTxt ? ` – ${amtTxt}` : ''
      }`
    }
    if (slug === 'repairing') {
      return `${label}${ge.part ? `: ${ge.part}` : ''}${amtTxt ? ` – ${amtTxt}` : ''}`
    }
    return `${label}${amtTxt ? ` – ${amtTxt}` : ''}`
  }

  /* --------------------------------------------------------------
   * Local state
   * ------------------------------------------------------------ */
  const [starting, setStarting] = useState(0n)
  const [ending, setEnding] = useState(0n)
  const [total, setTotal] = useState(0)
  const [akhrajatList, setAkhrajatList] = useState([])
  const [editRows, setEditRows] = useState({})
  const [newAkhrajat, setNewAkhrajat] = useState({ title: '', description: '', amount: '' })
  const [akhrajatTitles, setAkhrajatTitles] = useState([]) // [{name,isGari}]
  const [formError, setFormError] = useState('')
  const [gariExpense, setGariExpense] = useState({ title: '', quantity: '', part: '' })
  const [gariExpenseTypes, setGariExpenseTypes] = useState([]) // [{name}] or [string]
  const [gariParts, setGariParts] = useState([]) // [{name}] or [string]
  const [loadingFull, setLoadingFull] = useState(false)

  /* --------------------------------------------------------------
   * Initial shallow load from prop (fast paint; may lack gariExpense)
   * ------------------------------------------------------------ */
  useEffect(() => {
    const trolly = transaction.trollies?.[0]
    if (trolly) {
      setStarting(BigInt(trolly.StartingNum || 0))
      setEnding(BigInt(trolly.EndingNum || 0))
      setTotal(Number(trolly.total) || 0)
    }
    const norm = (transaction.akhrajat || []).map(normalizeAkhrajatItem)
    setAkhrajatList(norm)
  }, [transaction])

  /* --------------------------------------------------------------
   * Guaranteed full fetch (ensures akhrajat.gariExpense[] present)
   * ------------------------------------------------------------ */
  useEffect(() => {
    let active = true
    const id = transaction?.id
    if (!id) return
    setLoadingFull(true)

    // Prefer modern handler; fallback to legacy if needed.
    const fetchFull =
      window.api?.transactions?.getById?.(id) ??
      window.api?.transaction?.getOne?.(id) ??
      Promise.resolve(null)

    Promise.resolve(fetchFull)
      .then((full) => {
        if (!active || !full) return
        const trolly = full.trollies?.[0]
        if (trolly) {
          setStarting(BigInt(trolly.StartingNum || 0))
          setEnding(BigInt(trolly.EndingNum || 0))
          setTotal(Number(trolly.total) || 0)
        }
        const norm = (full.akhrajat || []).map(normalizeAkhrajatItem)
        setAkhrajatList(norm)
      })
      .catch((err) => {
        console.error('TransactionDetails: full fetch failed', err)
      })
      .finally(() => {
        if (active) setLoadingFull(false)
      })

    return () => {
      active = false
    }
  }, [transaction?.id])

  /* --------------------------------------------------------------
   * Admin lookups
   * ------------------------------------------------------------ */
  useEffect(() => {
    window.api.admin.akhrajatTitles.getAll().then((titles) => {
      setAkhrajatTitles(titles || [])
    })
    window.api?.admin?.gariExpenseTypes?.getAll?.().then((types) => {
      setGariExpenseTypes(types || [])
    })
    window.api?.admin?.gariParts?.getAll?.().then((parts) => {
      setGariParts(parts || [])
    })
  }, [])

  /* --------------------------------------------------------------
   * Derived
   * ------------------------------------------------------------ */
  const gariTypeOptions = useMemo(() => {
    return (gariExpenseTypes || []).map((t) => {
      const name = typeof t === 'string' ? t : t.name
      return { label: name, value: name }
    })
  }, [gariExpenseTypes])

  const gariPartOptions = useMemo(() => {
    return (gariParts || []).map((p) => {
      const name = typeof p === 'string' ? p : p.name
      return { label: name, value: name }
    })
  }, [gariParts])

  const displayGariLabel = useMemo(() => makeDisplayGariLabel(gariTypeOptions), [gariTypeOptions])

  const selectedAkhrajatTitle = useMemo(
    () => akhrajatTitles.find((t) => t.name === newAkhrajat.title),
    [akhrajatTitles, newAkhrajat.title]
  )
  const isGariSelected = !!selectedAkhrajatTitle?.isGari

  /* --------------------------------------------------------------
   * Edit helpers
   * ------------------------------------------------------------ */
  const handleEditRowChange = (id, field, value) => {
    setEditRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  const handleEditGariExpenseChange = (id, field, value) => {
    setEditRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        gariExpense: {
          ...(prev[id]?.gariExpense || {}),
          [field]: value
        }
      }
    }))
  }

  /* --------------------------------------------------------------
   * Validation
   * ------------------------------------------------------------ */
  const validateGari = (isGari, ge) => {
    if (!isGari) return null
    if (!ge?.title) return 'گاڑی اخراجات کی قسم منتخب کریں'
    const slug = toSlug(ge.title)
    if ((slug === 'petrol' || slug === 'diesel') && (!ge.quantity || Number(ge.quantity) <= 0)) {
      return 'پٹرول یا ڈیزل کے لیے درست مقدار درج کریں'
    }
    if (slug === 'repairing' && (!ge.part || !ge.part.trim())) {
      return 'مرمت کے لیے پرزہ کا نام درج کریں'
    }
    return null
  }

  /* --------------------------------------------------------------
   * Save existing row
   * ------------------------------------------------------------ */
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

    const selectedAkhrajatTitle = akhrajatTitles.find((t) => t.name === row.title)
    const isGari = selectedAkhrajatTitle?.isGari
    const ge = row.gariExpense
    const vErr = validateGari(isGari, ge)
    if (vErr) {
      setFormError(vErr)
      return
    }

    const payload = {
      id,
      title: row.title,
      amount: Number(row.amount),
      description: row.description || '',
      date: transaction.date,
      isGari,
      transactionId: transaction.id,
      gariExpenses: isGari ? [ge] : []
    }

    const updatedItem = await window.api.akhrajat.update(payload)
    const normalizedUpdated = normalizeAkhrajatItem(updatedItem)

    setAkhrajatList((prev) => prev.map((item) => (item.id === id ? normalizedUpdated : item)))
    setEditRows((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    setFormError('')
  }

  /* --------------------------------------------------------------
   * Delete row
   * ------------------------------------------------------------ */
  const handleAkhrajatDelete = async (id) => {
    await window.api.akhrajat.delete(id)
    setAkhrajatList((prev) => prev.filter((item) => item.id !== id))
  }

  /* --------------------------------------------------------------
   * Add new Akhrajat row
   * ------------------------------------------------------------ */
  const handleNewAkhrajatAdd = async () => {
    if (!newAkhrajat.title) {
      setFormError('عنوان منتخب کریں')
      return
    }
    if (!newAkhrajat.amount || Number(newAkhrajat.amount) <= 0) {
      setFormError('درست رقم درج کریں')
      return
    }

    const selectedAkhrajatTitle = akhrajatTitles.find((t) => t.name === newAkhrajat.title)
    const isGari = selectedAkhrajatTitle?.isGari
    const ge = gariExpense
    const vErr = validateGari(isGari, ge)
    if (vErr) {
      setFormError(vErr)
      return
    }

    const created = await window.api.akhrajat.create({
      ...newAkhrajat,
      transactionId: transaction.id,
      date: transaction.date,
      isGari,
      gariExpenses: isGari ? [ge] : []
    })

    const normalizedCreated = normalizeAkhrajatItem(created)
    setAkhrajatList((prev) => [...prev, normalizedCreated])
    setNewAkhrajat({ title: '', description: '', amount: '' })
    setGariExpense({ title: '', quantity: '', part: '' })
    setFormError('')
  }

  /* --------------------------------------------------------------
   * Trolly save
   * ------------------------------------------------------------ */
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
    setFormError('')
  }

  /* --------------------------------------------------------------
   * Render one Akhrajat row
   * ------------------------------------------------------------ */
  const renderAkhrajatItem = (item) => {
    const primaryGE = item.gariExpense || { title: '', quantity: '', part: '' }
    const isEditing = !!editRows[item.id]
    const edit = editRows[item.id] || { ...item, gariExpense: primaryGE }

    const currentTitle = isEditing ? edit.title : item.title
    const isGari = akhrajatTitles.find((t) => t.name === currentTitle)?.isGari
    const slugEditing = toSlug(isEditing ? edit.gariExpense?.title : primaryGE?.title)

    return (
      <div key={item.id} className="akhrajat-item">
        <div className="akhrajat-details">
          {/* Title --------------------------------------------------- */}
          <div className="akhrajat-field">
            <label>عنوان:</label>
            {isEditing ? (
              <select
                value={edit.title}
                onChange={(e) => handleEditRowChange(item.id, 'title', e.target.value)}
              >
                <option value="">عنوان منتخب کریں</option>
                {akhrajatTitles.map((title) => (
                  <option key={title.name} value={title.name}>
                    {title.name}
                  </option>
                ))}
              </select>
            ) : (
              <span>{item.title}</span>
            )}
          </div>

          {/* Gari Expense Type + Inline Summary ---------------------- */}
          {isGari && (
            <div className="akhrajat-field">
              <label>گاڑی اخراجات:</label>
              {isEditing ? (
                <select
                  value={edit.gariExpense?.title || ''}
                  onChange={(e) => {
                    const newTitle = e.target.value
                    setEditRows((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        gariExpense: { title: newTitle, quantity: '', part: '' }
                      }
                    }))
                  }}
                >
                  <option value="">گاڑی اخراجات کی قسم</option>
                  {gariTypeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : (
                <span>{formatGariSummary(primaryGE, item.amount, displayGariLabel)}</span>
              )}
            </div>
          )}

          {/* Quantity (Petrol/Diesel) -- edit only */}
          {isGari && ['petrol', 'diesel'].includes(slugEditing) && isEditing && (
            <div className="akhrajat-field">
              <label>مقدار (لیٹر):</label>
              <input
                type="number"
                value={edit.gariExpense?.quantity || ''}
                placeholder="مقدار (لیٹر)"
                onChange={(e) => handleEditGariExpenseChange(item.id, 'quantity', e.target.value)}
              />
            </div>
          )}

          {/* Part (Repairing) -- edit only (dropdown) */}
          {isGari && slugEditing === 'repairing' && isEditing && (
            <div className="akhrajat-field">
              <label>پرزہ:</label>
              <select
                value={edit.gariExpense?.part || ''}
                onChange={(e) => handleEditGariExpenseChange(item.id, 'part', e.target.value)}
              >
                <option value="">-- پرزہ منتخب کریں --</option>
                {gariPartOptions.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description -------------------------------------------- */}
          <div className="akhrajat-field">
            <label>تفصیل:</label>
            {isEditing ? (
              <input
                type="text"
                value={edit.description || ''}
                placeholder="تفصیل (اختیاری)"
                onChange={(e) => handleEditRowChange(item.id, 'description', e.target.value)}
              />
            ) : (
              <span>{item.description || 'غائب'}</span>
            )}
          </div>

          {/* Amount ------------------------------------------------- */}
          <div className="akhrajat-field">
            <label>رقم:</label>
            {isEditing ? (
              <input
                type="number"
                value={edit.amount}
                onChange={(e) => handleEditRowChange(item.id, 'amount', e.target.value)}
              />
            ) : (
              <span>{formatAmount(item.amount)}</span>
            )}
          </div>
        </div>

        {/* Row Actions ---------------------------------------------- */}
        <div className="akhrajat-actions">
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
              <button
                onClick={() => {
                  const primaryGE = item.gariExpense || { title: '', quantity: '', part: '' }
                  setEditRows((prev) => ({
                    ...prev,
                    [item.id]: { ...item, gariExpense: primaryGE }
                  }))
                }}
              >
                ✏️
              </button>
              <button onClick={() => handleAkhrajatDelete(item.id)}>🗑️</button>
            </>
          )}
        </div>
      </div>
    )
  }

  /* --------------------------------------------------------------
   * Render
   * ------------------------------------------------------------ */
  return (
    <div className="transaction-details">
      {formError && <div className="form-error-toast">{formError}</div>}
      {loadingFull && <div className="akhrajat-loading">…لوڈ ہو رہا ہے</div>}

      {/* Akhrajat List */}
      <div className="akhrajat-section">
        <h4>اخراجات</h4>
        {akhrajatList.length === 0 ? (
          <p>کوئی اخراجات نہیں ہیں</p>
        ) : (
          akhrajatList.map((item) => renderAkhrajatItem(item))
        )}

        {/* New Akhrajat */}
        <div className="new-akhrajat-form">
          <h5>نیا خرچ شامل کریں</h5>
          <div className="akhrajat-field">
            <label>عنوان:</label>
            <select
              value={newAkhrajat.title}
              onChange={(e) => setNewAkhrajat({ ...newAkhrajat, title: e.target.value })}
            >
              <option value="">عنوان منتخب کریں</option>
              {akhrajatTitles.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {isGariSelected && (
            <div className="gari-expense-box">
              <div className="akhrajat-field">
                <label>گاڑی اخراجات کی قسم:</label>
                <select
                  value={gariExpense.title}
                  onChange={(e) =>
                    setGariExpense({
                      ...gariExpense,
                      title: e.target.value,
                      quantity: '',
                      part: ''
                    })
                  }
                >
                  <option value="">گاڑی اخراجات کی قسم</option>
                  {gariTypeOptions.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {['petrol', 'diesel'].includes(toSlug(gariExpense.title)) && (
                <div className="akhrajat-field">
                  <label>مقدار (لیٹر):</label>
                  <input
                    type="number"
                    placeholder="مقدار (لیٹر)"
                    value={gariExpense.quantity}
                    onChange={(e) => setGariExpense({ ...gariExpense, quantity: e.target.value })}
                  />
                </div>
              )}

              {toSlug(gariExpense.title) === 'repairing' && (
                <div className="akhrajat-field">
                  <label>پرزہ:</label>
                  <select
                    value={gariExpense.part}
                    onChange={(e) => setGariExpense({ ...gariExpense, part: e.target.value })}
                  >
                    <option value="">-- پرزہ منتخب کریں --</option>
                    {gariPartOptions.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="akhrajat-field">
            <label>تفصیل (اختیاری):</label>
            <input
              type="text"
              placeholder="تفصیل (اختیاری)"
              value={newAkhrajat.description}
              onChange={(e) => setNewAkhrajat({ ...newAkhrajat, description: e.target.value })}
            />
          </div>

          <div className="akhrajat-field">
            <label>رقم:</label>
            <input
              type="number"
              placeholder="رقم"
              value={newAkhrajat.amount}
              onChange={(e) => setNewAkhrajat({ ...newAkhrajat, amount: e.target.value })}
            />
          </div>

          <button onClick={handleNewAkhrajatAdd}>➕ شامل کریں</button>
        </div>
      </div>

      {/* Trolly */}
      <div className="trolly-section">
        <h4>ٹرولیاں</h4>
        <div className="trolly-form">
          <div className="trolly-field">
            <label>ابتدائی نمبر:</label>
            <input
              type="number"
              value={starting.toString()}
              onChange={(e) => setStarting(BigInt(e.target.value || 0))}
            />
          </div>
          <div className="trolly-field">
            <label>اختتامی نمبر:</label>
            <input
              type="number"
              value={ending.toString()}
              onChange={(e) => setEnding(BigInt(e.target.value || 0))}
            />
          </div>
          <div className="trolly-field">
            <label>کل ٹرالیاں:</label>
            <input
              type="number"
              value={total}
              onChange={(e) => setTotal(Number(e.target.value) || 0)}
            />
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
