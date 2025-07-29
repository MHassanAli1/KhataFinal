import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-toastify'
import './TransactionDetails.css'

/* ------------------------------------------------------------------
 * Constants
 * ---------------------------------------------------------------- */
const MUTAFARIK_LABEL = 'متفرق' // MUST match AkhrajatTitle.name in DB

/**
 * TransactionDetails
 * ------------------------------------------------------------
 * - Refetches full transaction (akhrajat.gariExpense[], othersTitles).
 * - Supports Gari + Mutafarik sub‑types (othersTitlesId).
 * - Normalizes data on load/update.
 * - Updates parent transaction's KulAkhrajat on akhrajat changes.
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
    if (['parts', 'part', 'پرزہ', 'پارٹس'].includes(v)) return 'repairing'
    return v
  }

  const isMutafarik = (title) => title === MUTAFARIK_LABEL

  const normalizeGariArray = (obj) => {
    if (!obj) return []
    if (Array.isArray(obj.gariExpense)) return obj.gariExpense
    if (Array.isArray(obj.gariExpenses)) return obj.gariExpenses
    return []
  }

  const normalizeAkhrajatItem = (a) => {
    const arr = normalizeGariArray(a)
    const rel = a.othersTitles || null
    return {
      ...a,
      gariExpenses: arr,
      gariExpense: arr[0] || { title: '', quantity: '', part: '' },
      othersTitlesId: a.othersTitlesId ?? rel?.id ?? null,
      otherTitle: rel?.name ?? null
    }
  }

  const formatAmount = (v) => {
    if (v === null || v === undefined || v === '') return ''
    return typeof v === 'bigint' ? v.toString() : String(v)
  }

  const makeDisplayGariLabel = (options) => (title) => {
    const slug = toSlug(title)
    const opt = options.find((o) => toSlug(o.value) === slug || toSlug(o.label) === slug)
    return opt?.label ?? title ?? 'N/A'
  }

  const formatGariSummary = (ge, _amt, displayLabel) => {
    if (!ge) return ''
    const slug = toSlug(ge.title)
    const label = displayGariLabel(ge.title)
    if (slug === 'petrol' || slug === 'diesel') {
      return `${label}${ge.quantity ? ` – مقدار: ${ge.quantity} لیٹر` : ''}`
    }
    if (slug === 'repairing') {
      return `${label}${ge.part ? `: ${ge.part}` : ''}`
    }
    return `${label}`
  }

  const formatMutafarikSummary = (item, otherTitles) => {
    const sub = item.otherTitle || otherTitles.find((o) => o.id === item.othersTitlesId)?.name || ''
    return `${MUTAFARIK_LABEL}${sub ? ` – ${sub}` : ''}`
  }

  /* --------------------------------------------------------------
   * Local state
   * ------------------------------------------------------------ */
  const [akhrajatList, setAkhrajatList] = useState([])
  const [editRows, setEditRows] = useState({})
  const [newAkhrajat, setNewAkhrajat] = useState({
    title: '',
    description: '',
    amount: '',
    othersTitlesId: ''
  })
  const [akhrajatTitles, setAkhrajatTitles] = useState([])
  const [formError, setFormError] = useState('')
  const [gariExpense, setGariExpense] = useState({ title: '', quantity: '', part: '' })
  const [gariExpenseTypes, setGariExpenseTypes] = useState([])
  const [gariParts, setGariParts] = useState([])
  const [otherTitles, setOtherTitles] = useState([])
  const [loadingFull, setLoadingFull] = useState(false)

  /* --------------------------------------------------------------
   * Initial shallow load from prop
   * ------------------------------------------------------------ */
  useEffect(() => {
    const norm = (transaction.akhrajat || []).map(normalizeAkhrajatItem)
    setAkhrajatList(norm)
  }, [transaction])

  /* --------------------------------------------------------------
   * Full fetch (includes gariExpense + othersTitles)
   * ------------------------------------------------------------ */
  useEffect(() => {
    let active = true
    const id = transaction?.id
    if (!id) return
    setLoadingFull(true)

    const fetchFull =
      window.api?.transactions?.getById?.(id) ??
      window.api?.transaction?.getOne?.(id) ??
      Promise.resolve(null)

    fetchFull
      .then((full) => {
        if (!active || !full) return
        const norm = (full.akhrajat || []).map(normalizeAkhrajatItem)
        setAkhrajatList(norm)
      })
      .catch((err) => {
        console.error('TransactionDetails: full fetch failed', err)
        toast.error('معاملہ کی تفصیلات لوڈ کرنے میں ناکامی')
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
    window.api?.admin?.othersTitles?.getAll?.().then((ots) => {
      setOtherTitles(ots || [])
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
  const isMutafarikSelected = selectedAkhrajatTitle?.name === MUTAFARIK_LABEL

  /* --------------------------------------------------------------
   * Edit helpers
   * ------------------------------------------------------------ */
  const handleEditRowChange = (id, field, value) => {
    setEditRows((prev) => {
      const base = { ...prev[id], [field]: value }
      if (field === 'title' && !isMutafarik(value)) {
        delete base.othersTitlesId
      }
      return { ...prev, [id]: base }
    })
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

  const validateMutafarik = (isOther, subId) => {
    if (!isOther) return null
    if (!subId) return 'متفرق کی قسم منتخب کریں'
    return null
  }

  /* --------------------------------------------------------------
   * Reset form
   * ------------------------------------------------------------ */
  const handleHardReset = () => {
    setNewAkhrajat({ title: '', description: '', amount: '', othersTitlesId: '' })
    setGariExpense({ title: '', quantity: '', part: '' })
    setFormError('')
    toast.info('فارم ری سیٹ ہو گیا!')
  }

  /* --------------------------------------------------------------
   * Save existing row
   * ------------------------------------------------------------ */
  const handleEditRowSave = async (id) => {
    const row = editRows[id]
    if (!row?.title) {
      setFormError('عنوان منتخب کریں')
      toast.error('عنوان منتخب کریں')
      return
    }
    if (!row?.amount || Number(row.amount) <= 0) {
      setFormError('درست رقم درج کریں')
      toast.error('درست رقم درج کریں')
      return
    }

    const selectedAkhrajatTitle = akhrajatTitles.find((t) => t.name === row.title)
    const isGari = selectedAkhrajatTitle?.isGari
    const isOther = isMutafarik(row.title)

    const ge = row.gariExpense
    const vG = validateGari(isGari, ge)
    if (vG) {
      setFormError(vG)
      toast.error(vG)
      return
    }
    const vO = validateMutafarik(isOther, row.othersTitlesId)
    if (vO) {
      setFormError(vO)
      toast.error(vO)
      return
    }

    const payload = {
      id,
      title: row.title,
      amount: Number(row.amount),
      description: row.description || '',
      date: transaction.date,
      isGari,
      isOther,
      transactionId: transaction.id,
      gariExpenses: isGari ? [ge] : [],
      othersTitlesId: isOther ? Number(row.othersTitlesId) || null : null
    }

    try {
      const updatedItem = await window.api.akhrajat.update(payload)
      const normalizedUpdated = normalizeAkhrajatItem(updatedItem)
      setAkhrajatList((prev) => prev.map((item) => (item.id === id ? normalizedUpdated : item)))
      setEditRows((prev) => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })
      setFormError('')
      toast.success('اخراجات اپ ڈیٹ ہو گئے!')
    } catch (err) {
      setFormError(err.message || 'اخراجات اپ ڈیٹ کرنے میں ناکامی')
      toast.error(err.message || 'اخراجات اپ ڈیٹ کرنے میں ناکامی')
    }
  }

  /* --------------------------------------------------------------
   * Delete row
   * ------------------------------------------------------------ */
  const handleAkhrajatDelete = async (id) => {
    try {
      await window.api.akhrajat.delete(id)
      setAkhrajatList((prev) => prev.filter((item) => item.id !== id))
      setFormError('')
      toast.success('اخراجات حذف ہو گئے!')
    } catch (err) {
      setFormError(err.message || 'اخراجات حذف کرنے میں ناکامی')
      toast.error(err.message || 'اخراجات حذف کرنے میں ناکامی')
    }
  }

  /* --------------------------------------------------------------
   * Add new Akhrajat row
   * ------------------------------------------------------------ */
  const handleNewAkhrajatAdd = async () => {
    if (!newAkhrajat.title) {
      setFormError('عنوان منتخب کریں')
      toast.error('عنوان منتخب کریں')
      return
    }
    if (!newAkhrajat.amount || Number(newAkhrajat.amount) <= 0) {
      setFormError('درست رقم درج کریں')
      toast.error('درست رقم درج کریں')
      return
    }

    const selectedAkhrajatTitle = akhrajatTitles.find((t) => t.name === newAkhrajat.title)
    const isGari = selectedAkhrajatTitle?.isGari
    const isOther = isMutafarik(newAkhrajat.title)
    const ge = gariExpense

    const vG = validateGari(isGari, ge)
    if (vG) {
      setFormError(vG)
      toast.error(vG)
      return
    }
    const vO = validateMutafarik(isOther, newAkhrajat.othersTitlesId)
    if (vO) {
      setFormError(vO)
      toast.error(vO)
      return
    }

    try {
      const created = await window.api.akhrajat.create({
        title: newAkhrajat.title,
        description: newAkhrajat.description,
        amount: Number(newAkhrajat.amount),
        transactionId: transaction.id,
        date: transaction.date,
        isGari,
        isOther,
        gariExpenses: isGari ? [ge] : [],
        othersTitlesId: isOther ? Number(newAkhrajat.othersTitlesId) || null : null
      })

      const normalizedCreated = normalizeAkhrajatItem(created)
      setAkhrajatList((prev) => [...prev, normalizedCreated])
      setNewAkhrajat({ title: '', description: '', amount: '', othersTitlesId: '' })
      setGariExpense({ title: '', quantity: '', part: '' })
      setFormError('')
      toast.success('نیا اخراجات شامل ہو گیا!')
    } catch (err) {
      setFormError(err.message || 'اخراجات شامل کرنے میں ناکامی')
      toast.error(err.message || 'اخراجات شامل کرنے میں ناکامی')
    }
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
        <h4>اخراجات کی تفصیلات</h4>
        {akhrajatList.length === 0 ? (
          <p className="no-data-message">کوئی اخراجات نہیں ہیں</p>
        ) : (
          <div className="akhrajat-list">
            {akhrajatList.map((item) => {
              const primaryGE = item.gariExpense || { title: '', quantity: '', part: '' }
              const isEditing = !!editRows[item.id]
              const edit = editRows[item.id] || { ...item, gariExpense: primaryGE }
              const currentTitle = isEditing ? edit.title : item.title
              const isGari = akhrajatTitles.find((t) => t.name === currentTitle)?.isGari
              const isOther = isMutafarik(currentTitle)
              const slugEditing = toSlug(isEditing ? edit.gariExpense?.title : primaryGE?.title)

              return (
                <div key={item.id} className="akhrajat-item">
                  <div className="akhrajat-details">
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
                    {isOther && (
                      <div className="akhrajat-field">
                        <label>متفرق قسم:</label>
                        {isEditing ? (
                          <select
                            value={edit.othersTitlesId || ''}
                            onChange={(e) =>
                              handleEditRowChange(item.id, 'othersTitlesId', e.target.value)
                            }
                          >
                            <option value="">متفرق کی قسم منتخب کریں</option>
                            {otherTitles.map((ot) => (
                              <option key={ot.id} value={ot.id}>
                                {ot.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{formatMutafarikSummary(item, otherTitles)}</span>
                        )}
                      </div>
                    )}
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
                    {isGari && ['petrol', 'diesel'].includes(slugEditing) && isEditing && (
                      <div className="akhrajat-field">
                        <label>مقدار (لیٹر):</label>
                        <input
                          type="number"
                          value={edit.gariExpense?.quantity || ''}
                          placeholder="مقدار (لیٹر)"
                          onChange={(e) =>
                            handleEditGariExpenseChange(item.id, 'quantity', e.target.value)
                          }
                        />
                      </div>
                    )}
                    {isGari && slugEditing === 'repairing' && isEditing && (
                      <div className="akhrajat-field">
                        <label>پرزہ:</label>
                        <select
                          value={edit.gariExpense?.part || ''}
                          onChange={(e) =>
                            handleEditGariExpenseChange(item.id, 'part', e.target.value)
                          }
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
                    <div className="akhrajat-field">
                      <label>تفصیل:</label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={edit.description || ''}
                          placeholder="تفصیل (اختیاری)"
                          onChange={(e) =>
                            handleEditRowChange(item.id, 'description', e.target.value)
                          }
                        />
                      ) : (
                        <span>{item.description || 'غائب'}</span>
                      )}
                    </div>
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
                            const primaryGE = item.gariExpense || {
                              title: '',
                              quantity: '',
                              part: ''
                            }
                            setEditRows((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...item,
                                gariExpense: primaryGE,
                                othersTitlesId: item.othersTitlesId || ''
                              }
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
            })}
          </div>
        )}

        {/* New Akhrajat */}
        <div className="new-akhrajat-form">
          <h5>نیا خرچ شامل کریں</h5>
          <div className="akhrajat-field">
            <label>عنوان:</label>
            <select
              value={newAkhrajat.title}
              onChange={(e) =>
                setNewAkhrajat({
                  ...newAkhrajat,
                  title: e.target.value,
                  ...(e.target.value === MUTAFARIK_LABEL ? {} : { othersTitlesId: '' })
                })
              }
            >
              <option value="">عنوان منتخب کریں</option>
              {akhrajatTitles.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {isMutafarikSelected && (
            <div className="akhrajat-field">
              <label>متفرق قسم:</label>
              <select
                value={newAkhrajat.othersTitlesId || ''}
                onChange={(e) =>
                  setNewAkhrajat({
                    ...newAkhrajat,
                    othersTitlesId: e.target.value
                  })
                }
              >
                <option value="">متفرق کی قسم منتخب کریں</option>
                {otherTitles.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    {ot.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
          <div className="akhrajat-form-actions">
            <button onClick={handleNewAkhrajatAdd}>➕ شامل کریں</button>
            <button onClick={handleHardReset}>🔄 ری سیٹ</button>
          </div>
        </div>
      </div>

      <button onClick={() => onClose({ refetch: true })} className="close-btn">
        <span>❌</span> بند کریں
      </button>
    </div>
  )
}
