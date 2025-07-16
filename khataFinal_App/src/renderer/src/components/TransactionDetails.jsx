import { useState, useEffect, useMemo } from 'react'
import './TransactionDetails.css'

export default function TransactionDetails({ transaction, onClose }) {
  /* -----------------------------------------------------------------
   * Helpers
   * ----------------------------------------------------------------- */
  const toSlug = (raw = '') => {
    const v = (raw || '').trim().toLowerCase()
    if (!v) return ''
    if (['petrol', 'پٹرول'].includes(v)) return 'petrol'
    if (['diesel', 'ڈیزل'].includes(v)) return 'diesel'
    if (['repairing', 'مرمت'].includes(v)) return 'repairing'
    if (['tuning', 'ٹیوننگ', 'ٹوننگ'].includes(v)) return 'tuning'
    return v
  }

  const normalizeGariArray = (obj) => {
    // prisma schema: obj.gariExpense[]; older handler may return obj.gariExpenses[]
    if (!obj) return []
    if (Array.isArray(obj.gariExpense)) return obj.gariExpense
    if (Array.isArray(obj.gariExpenses)) return obj.gariExpenses
    return []
  }

  const normalizeAkhrajatItem = (a) => ({
    ...a,
    gariExpense: normalizeGariArray(a), // always attach normalized arr under .gariExpense
  })

  /* -----------------------------------------------------------------
   * Local state
   * ----------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------
   * Load data from props & admin lookups
   * ----------------------------------------------------------------- */
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

  useEffect(() => {
    // Akhrajat titles
    window.api.admin.akhrajatTitles.getAll().then((titles) => {
      setAkhrajatTitles(titles || [])
    })
    // Gari expense types
    window.api?.admin?.gariExpenseTypes?.getAll?.().then((types) => {
      setGariExpenseTypes(types || [])
    })
  }, [])

  /* -----------------------------------------------------------------
   * Derived data
   * ----------------------------------------------------------------- */
  const selectedAkhrajatTitle = useMemo(
    () => akhrajatTitles.find((t) => t.name === newAkhrajat.title),
    [akhrajatTitles, newAkhrajat.title]
  )
  const isGariSelected = !!selectedAkhrajatTitle?.isGari

  const gariTypeOptions = useMemo(() => {
    // unify shapes to {label,value}
    return (gariExpenseTypes || []).map((t) => {
      const name = typeof t === 'string' ? t : t.name
      return { label: name, value: name }
    })
  }, [gariExpenseTypes])

  /* -----------------------------------------------------------------
   * Row editing helpers
   * ----------------------------------------------------------------- */
  const handleEditRowChange = (id, field, value) => {
    setEditRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  const handleEditGariExpenseChange = (id, field, value) => {
    setEditRows((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        gariExpense: {
          ...(prev[id]?.gariExpense || {}),
          [field]: value,
        },
      },
    }))
  }

  /* -----------------------------------------------------------------
   * Validation (shared)
   * ----------------------------------------------------------------- */
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

  /* -----------------------------------------------------------------
   * Save existing row
   * ----------------------------------------------------------------- */
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
      // backend compat: expects `gariExpenses` array
      gariExpenses: isGari ? [ge] : [],
    }

    const updatedItem = await window.api.akhrajat.update(payload)

    // normalize response in case backend switched to singular
    const normalizedUpdated = normalizeAkhrajatItem(updatedItem)

    setAkhrajatList((prev) => prev.map((item) => (item.id === id ? normalizedUpdated : item)))
    setEditRows((prev) => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })
    setFormError('')
  }

  /* -----------------------------------------------------------------
   * Delete row
   * ----------------------------------------------------------------- */
  const handleAkhrajatDelete = async (id) => {
    await window.api.akhrajat.delete(id)
    setAkhrajatList((prev) => prev.filter((item) => item.id !== id))
  }

  /* -----------------------------------------------------------------
   * Add new Akhrajat row
   * ----------------------------------------------------------------- */
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
      gariExpenses: isGari ? [ge] : [],
    })

    const normalizedCreated = normalizeAkhrajatItem(created)
    setAkhrajatList((prev) => [...prev, normalizedCreated])
    setNewAkhrajat({ title: '', description: '', amount: '' })
    setGariExpense({ title: '', quantity: '', part: '' })
    setFormError('')
  }

  /* -----------------------------------------------------------------
   * Trolly save
   * ----------------------------------------------------------------- */
  const handleSaveTrolly = async () => {
    await window.api.trollies.update({
      id: transaction.trollies[0]?.id,
      startNumber: starting,
      endNumber: ending,
      total,
    })
    onClose()
    setTimeout(() => {
      window.location.reload()
    }, 500)
    setFormError('')
  }

  /* -----------------------------------------------------------------
   * Render one Akhrajat row
   * ----------------------------------------------------------------- */
  const renderAkhrajatItem = (item) => {
    const gariArr = normalizeGariArray(item)
    const primaryGE = gariArr[0] || { title: '', quantity: '', part: '' }

    const edit = editRows[item.id] || {
      ...item,
      gariExpense: primaryGE,
    }

    const isEditing = !!editRows[item.id]
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

          {/* Gari Expense Type -------------------------------------- */}
          {isGari && (
            <div className="akhrajat-field">
              <label>گاڑی اخراجات کی قسم:</label>
              {isEditing ? (
                <select
                  value={edit.gariExpense?.title || ''}
                  onChange={(e) => {
                    const newTitle = e.target.value
                    setEditRows((prev) => ({
                      ...prev,
                      [item.id]: {
                        ...prev[item.id],
                        gariExpense: {
                          title: newTitle,
                          quantity: '',
                          part: '',
                        },
                      },
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
                <span>{primaryGE?.title || 'غائب'}</span>
              )}
            </div>
          )}

          {/* Quantity (Petrol/Diesel) -------------------------------- */}
          {isGari && ['petrol', 'diesel'].includes(slugEditing) && (
            <div className="akhrajat-field">
              <label>مقدار (لیٹر):</label>
              {isEditing ? (
                <input
                  type="number"
                  value={edit.gariExpense?.quantity || ''}
                  placeholder="مقدار (لیٹر)"
                  onChange={(e) => handleEditGariExpenseChange(item.id, 'quantity', e.target.value)}
                />
              ) : (
                <span>{primaryGE?.quantity || 'غائب'}</span>
              )}
            </div>
          )}

          {/* Part (Repairing) --------------------------------------- */}
          {isGari && slugEditing === 'repairing' && (
            <div className="akhrajat-field">
              <label>پرزے کا نام:</label>
              {isEditing ? (
                <input
                  type="text"
                  value={edit.gariExpense?.part || ''}
                  placeholder="پرزے کا نام"
                  onChange={(e) => handleEditGariExpenseChange(item.id, 'part', e.target.value)}
                />
              ) : (
                <span>{primaryGE?.part || 'غائب'}</span>
              )}
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
              <span>{item.amount}</span>
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
                  const gariArr = normalizeGariArray(item)
                  const primaryGE = gariArr[0] || { title: '', quantity: '', part: '' }
                  setEditRows((prev) => ({
                    ...prev,
                    [item.id]: {
                      ...item,
                      gariExpense: primaryGE,
                    },
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

  /* -----------------------------------------------------------------
   * Render
   * ----------------------------------------------------------------- */
  return (
    <div className="transaction-details">
      {formError && <div className="form-error-toast">{formError}</div>}

      {/* Akhrajat List --------------------------------------------- */}
      <div className="akhrajat-section">
        <h4>اخراجات</h4>
        {akhrajatList.length === 0 ? (
          <p>کوئی اخراجات نہیں ہیں</p>
        ) : (
          akhrajatList.map(renderAkhrajatItem)
        )}

        {/* New Akhrajat -------------------------------------------- */}
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
                      part: '',
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
                  <label>پرزے کا نام:</label>
                  <input
                    type="text"
                    placeholder="پرزے کا نام"
                    value={gariExpense.part}
                    onChange={(e) => setGariExpense({ ...gariExpense, part: e.target.value })}
                  />
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

      {/* Trolly ---------------------------------------------------- */}
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
