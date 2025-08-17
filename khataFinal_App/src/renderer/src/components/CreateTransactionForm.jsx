import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import './CreateTransactionForm.css'
import UrduKeyboard from './UrduKeyboard'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

/* ------------------------------------------------------------------
 * MUST MATCH the name value stored in AkhrajatTitle that represents
 * the umbrella "Other / Mutafarik" category in your DB.
 * ---------------------------------------------------------------- */
const MUTAFARIK_LABEL = 'متفرق'

export default function CreateTransactionForm() {
  const [formKey, setFormKey] = useState(0)
  const navigate = useNavigate()

  /* ------------------------------------------------------------------
   * Core form state
   * ---------------------------------------------------------------- */
  const [zone, setZone] = useState('')
  const [khda, setKhda] = useState('')
  const [kulAmdan, setKulAmdan] = useState(null)
  const [kulAkhrajat, setKulAkhrajat] = useState(null)
  const [saafiAmdan, setSaafiAmdan] = useState(null)
  const [exercise, setExercise] = useState(null)
  const [kulMaizan, setKulMaizan] = useState(null)
  const [date, setDate] = useState('')
  const [akhrajat, setAkhrajat] = useState([])
  const [zonesList, setZonesList] = useState([])
  const [khdaList, setKhdaList] = useState([])
  const [akhrajatTitles, setAkhrajatTitles] = useState([])
  const [booksForKhda, setBooksForKhda] = useState([])
  // Multiple book/trolly rows in a single transaction
  // row: { bookNumber: '', starting: null, ending: '', total: '' }
  const [trollyRows, setTrollyRows] = useState([])
  const [formError, setFormError] = useState('')

  const parseIntOrNull = (v) => {
    const n = parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  }

  /* ------------------------------------------------------------------
   * Admin metadata for gari & other sub‑forms
   * ---------------------------------------------------------------- */
  const [gariTitles, setGariTitles] = useState([])
  const [gariExpenseTypes, setGariExpenseTypes] = useState([])
  const [gariParts, setGariParts] = useState([])
  const [othersTitlesList, setOthersTitlesList] = useState([])

  /* ------------------------------------------------------------------
   * Virtual keyboard state
   * ---------------------------------------------------------------- */
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [activeInput, setActiveInput] = useState(null)
  const [inputRefs, setInputRefs] = useState({})
  const khdaRef = useRef(null)
  const akhrajatRefs = useRef({})

  /* ==================================================================
   * Reset form
   * ================================================================== */
  const resetForm = () => {
    if (document.activeElement instanceof HTMLElement && document.activeElement !== document.body) {
      document.activeElement.blur()
    }
    setZone('')
    setKhda('')
    setTrollyRows([])
    setKulAmdan(null)
    setKulAkhrajat(null)
    setSaafiAmdan(null)
    setExercise(null)
    setKulMaizan(null)
    setDate('')
    setAkhrajat([])
    setBooksForKhda([])
    setFormError('')
    setKhdaList([])
    closeKeyboard()
    setFormKey((k) => k + 1)
  }

  /* ==================================================================
   * Init fetch (static admin lookups)
   * ================================================================== */
  useEffect(() => {
    window.api.admin.zones.getAll().then(setZonesList)
    window.api.admin.akhrajatTitles.getAll().then((titles) => {
      setAkhrajatTitles(titles.map((t) => t.name))
    })
    window.api.admin.gariExpenseTypes.getAll().then((types) => {
      setGariExpenseTypes(types.map((t) => t.name))
    })
    window.api.admin.gariParts.getAll().then((parts) => {
      setGariParts(parts.map((p) => p.name))
    })
    window.api.admin.gariTitles.getAll().then((titles) => {
      setGariTitles(titles.map((t) => t.name))
    })
    window.api.admin.othersTitles.getAll().then(setOthersTitlesList)
    setInputRefs({ khda: khdaRef })
  }, [])

  /* ==================================================================
   * Fetch khdas when zone changes
   * ================================================================== */
  useEffect(() => {
    if (zone && zone !== '' && !isNaN(Number(zone))) {
      window.api.admin.khdas
        .getAll(Number(zone))
        .then((khdas) => {
          setKhdaList(khdas.map((k) => k.name))
        })
        .catch((err) => {
          console.error('❌ khdas:getAll failed', err)
        })
    } else {
      setKhdaList([])
    }
  }, [zone])

  /* ==================================================================
   * Load books when khda changes
   * ================================================================== */
  useEffect(() => {
    if (!zone || !khda) {
      setBooksForKhda([])
      setTrollyRows([])
      return
    }
    const zoneName = zonesList.find((z) => z.id === +zone)?.name
    if (!zoneName) {
      setBooksForKhda([])
      setTrollyRows([])
      return
    }
    window.api.transactions
      .getActiveBookByZone(zoneName, khda)
      .then((books) => {
        setBooksForKhda(books)
        const nonFull = books.filter((b) => b.usedTickets < 100)
        // If exactly one active non-full book, prefill one row for convenience
        if (nonFull.length === 1) {
          const bn = nonFull[0].bookNumber
          setTrollyRows([
            {
              bookNumber: String(bn),
              starting: (bn - 1) * 100 + nonFull[0].usedTickets + 1,
              ending: '',
              total: ''
            }
          ])
        } else {
          setTrollyRows([])
        }
      })
      .catch((err) => {
        console.error('Failed to fetch books:', err)
        setBooksForKhda([])
        setTrollyRows([])
      })
  }, [zone, khda, zonesList])

  // helpers for multi-row calculations
  const computeStartingForRow = (rows, idx) => {
    const row = rows[idx]
    if (!row?.bookNumber) return null
    const bookNum = parseInt(row.bookNumber, 10)
    const found = booksForKhda.find((b) => b.bookNumber === bookNum)
    const baseUsed = found ? Number(found.usedTickets || 0) : 0
    const priorUsedInForm = rows
      .slice(0, idx)
      .filter((r) => parseInt(r.bookNumber, 10) === bookNum)
      .reduce((sum, r) => sum + (parseInt(r.total, 10) || 0), 0)
    return (bookNum - 1) * 100 + baseUsed + priorUsedInForm + 1
  }

  const recomputeRowDerived = (rows) =>
    rows.map((r, idx) => {
      const s = computeStartingForRow(rows, idx)
      const e = parseIntOrNull(r.ending)
      const t = s != null && e != null && e >= s ? String(e - s + 1) : ''
      return { ...r, starting: s, total: t }
    })

  const addTrollyRow = () => {
    setTrollyRows((prev) => {
      const next = [...prev, { bookNumber: '', starting: null, ending: '', total: '' }]
      return recomputeRowDerived(next)
    })
  }

  const removeTrollyRow = (index) => {
    setTrollyRows((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return recomputeRowDerived(next)
    })
  }

  const updateTrollyRow = (index, field, value) => {
    setTrollyRows((prev) => {
      const next = prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
      return recomputeRowDerived(next)
    })
  }

  /* ==================================================================
   * Auto-calc kulAkhrajat from akhrajat amounts
   * ================================================================== */
  useEffect(() => {
    const totalAkhrajat = akhrajat.reduce((sum, item) => {
      const amount = parseFloat(item.amount)
      return sum + (isNaN(amount) ? 0 : amount)
    }, 0)
    setKulAkhrajat(totalAkhrajat || null)
  }, [akhrajat])

  /* ==================================================================
   * Auto-calc Saafi Amdan and Kul Maizan
   * ================================================================== */
  useEffect(() => {
    const amdan = parseFloat(kulAmdan) || 0
    const akhrajat = parseFloat(kulAkhrajat) || 0
    setSaafiAmdan(amdan - akhrajat || null)
  }, [kulAmdan, kulAkhrajat])

  useEffect(() => {
    const saafi = parseFloat(saafiAmdan) || 0
    const exc = parseFloat(exercise) || 0
    setKulMaizan(saafi + exc || null)
  }, [saafiAmdan, exercise])

  /* ==================================================================
   * Refs management for Urdu keyboard across dynamic list
   * ================================================================== */
  useEffect(() => {
    akhrajat.forEach((_, index) => {
      if (!akhrajatRefs.current[`desc-${index}`]) {
        akhrajatRefs.current[`desc-${index}`] = React.createRef()
      }
    })
    const akhrajatInputRefs = {}
    Object.keys(akhrajatRefs.current).forEach((key) => {
      if (key.startsWith('desc-')) {
        const index = parseInt(key.replace('desc-', ''), 10)
        if (index < akhrajat.length) {
          akhrajatInputRefs[`akhrajat-${key}`] = akhrajatRefs.current[key]
        }
      }
    })
    setInputRefs((prev) => ({
      ...prev,
      ...akhrajatInputRefs
    }))
  }, [akhrajat])

  /* ==================================================================
   * Urdu keyboard handlers
   * ================================================================== */
  const handleKeyPress = (char) => {
    if (!activeInput) return
    const inputRef = inputRefs[activeInput]
    if (!inputRef || !inputRef.current) return
    const input = inputRef.current
    const start = input.selectionStart
    const end = input.selectionEnd

    if (char === 'backspace') {
      if (start === end && start > 0) {
        const newValue = input.value.substring(0, start - 1) + input.value.substring(end)
        updateInputValue(activeInput, newValue)
        setTimeout(() => {
          input.selectionStart = start - 1
          input.selectionEnd = start - 1
        }, 0)
      } else if (start !== end) {
        const newValue = input.value.substring(0, start) + input.value.substring(end)
        updateInputValue(activeInput, newValue)
        setTimeout(() => {
          input.selectionStart = start
          input.selectionEnd = start
        }, 0)
      }
    } else {
      const newValue = input.value.substring(0, start) + char + input.value.substring(end)
      updateInputValue(activeInput, newValue)
      setTimeout(() => {
        input.focus()
        input.selectionStart = start + char.length
        input.selectionEnd = start + char.length
      }, 0)
    }
  }

  const updateInputValue = (inputName, value) => {
    if (inputName === 'khda') {
      setKhda(value)
    } else if (inputName.startsWith('akhrajat-desc-')) {
      const index = parseInt(inputName.replace('akhrajat-desc-', ''), 10)
      if (!isNaN(index) && index >= 0 && index < akhrajat.length) {
        updateAkhrajat(index, 'description', value)
      }
    }
  }

  const handleInputFocus = (inputName) => {
    setActiveInput(inputName)
    setShowKeyboard(true)
  }

  const closeKeyboard = () => {
    setShowKeyboard(false)
    setActiveInput(null)
  }

  /* ==================================================================
   * Akhrajat list maintenance
   * ================================================================== */
  const addAkhrajat = () => {
    setAkhrajat((prev) => [
      ...prev,
      {
        description: '',
        amount: '',
        title: '',
        gariExpenses: [],
        othersTitlesId: null,
        otherTitle: ''
      }
    ])
  }

  const updateAkhrajat = (index, field, value) => {
    setAkhrajat((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const next = { ...item, [field]: value }
        if (field === 'title') {
          if (value === MUTAFARIK_LABEL) {
            next.gariExpenses = []
          } else if (gariTitles.includes(value)) {
            next.othersTitlesId = null
            next.otherTitle = ''
          } else {
            next.gariExpenses = []
            next.othersTitlesId = null
            next.otherTitle = ''
          }
        }
        return next
      })
    )
  }

  const removeAkhrajat = (index) => {
    setAkhrajat((prev) => prev.filter((_, i) => i !== index))
    setTimeout(() => {
      const rebuiltRefs = {}
      akhrajat.forEach((_, i) => {
        rebuiltRefs[`desc-${i}`] = React.createRef()
      })
      akhrajatRefs.current = rebuiltRefs
    }, 0)
    const newAkhrajatRefs = { ...akhrajatRefs.current }
    delete newAkhrajatRefs[`desc-${index}`]
    for (let i = index + 1; i < akhrajat.length; i++) {
      if (newAkhrajatRefs[`desc-${i}`]) {
        newAkhrajatRefs[`desc-${i - 1}`] = newAkhrajatRefs[`desc-${i}`]
        delete newAkhrajatRefs[`desc-${i}`]
      }
    }
    akhrajatRefs.current = newAkhrajatRefs
  }

  const handleReturn = () => {
    navigate('/')
  }

  /* ==================================================================
   * Submit
   * ================================================================== */
  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')

    const user = await window.api.auth.getSession()
    try {
      if (!user?.id) {
        setFormError('صارف نہیں ملا، دوبارہ لاگ ان کریں۔')
        toast.error('صارف نہیں ملا، دوبارہ لاگ ان کریں۔')
        return
      }

      const zoneName = zonesList.find((z) => z.id === Number(zone))?.name || ''
      if (!zoneName) {
        setFormError('براہ کرم زون منتخب کریں۔')
        toast.error('براہ کرم زون منتخب کریں۔')
        return
      }

      if (!khda) {
        setFormError('براہ کرم کھدہ منتخب کریں۔')
        toast.error('براہ کرم کھدہ منتخب کریں۔')
        return
      }

      if (!trollyRows.length) {
        setFormError('کم از کم ایک کتاب/ٹرالی شامل کریں۔')
        toast.error('کم از کم ایک کتاب/ٹرالی شامل کریں۔')
        return
      }

      // Validate each row
      for (let i = 0; i < trollyRows.length; i++) {
        const r = trollyRows[i]
        if (!r.bookNumber) {
          setFormError('براہ کرم کتاب نمبر منتخب کریں۔')
          toast.error('براہ کرم کتاب نمبر منتخب کریں۔')
          return
        }
        if (!r.ending) {
          setFormError('اختتامی نمبر درج کریں۔')
          toast.error('اختتامی نمبر درج کریں۔')
          return
        }
        const s = parseIntOrNull(r.starting)
        const e = parseIntOrNull(r.ending)
        const t = parseIntOrNull(r.total)
        if (s == null || e == null || e < s || t == null || t <= 0) {
          setFormError('ٹرالی کی مقدار/نمبر درست نہیں۔')
          toast.error('ٹرالی کی مقدار/نمبر درست نہیں۔')
          return
        }
        const bn = parseInt(r.bookNumber, 10)
        const found = booksForKhda.find((b) => b.bookNumber === bn)
        const baseUsed = found ? Number(found.usedTickets || 0) : 0
        const additionalInForm = trollyRows
          .slice(0, i)
          .filter((x) => parseInt(x.bookNumber, 10) === bn)
          .reduce((sum, x) => sum + (parseInt(x.total, 10) || 0), 0)
        const maxCap = 100
        if (baseUsed + additionalInForm + t > maxCap) {
          setFormError(
            `کتاب نمبر ${bn} میں ${maxCap - (baseUsed + additionalInForm)} ٹکٹ باقی ہیں۔`
          )
          toast.error(`کتاب نمبر ${bn} میں ${maxCap - (baseUsed + additionalInForm)} ٹکٹ باقی ہیں۔`)
          return
        }
        const maxTicketInBook = bn * 100
        if (e > maxTicketInBook) {
          setFormError(
            `کتاب نمبر ${bn} کے لیے اختتامی نمبر ${maxTicketInBook} سے زیادہ نہیں ہو سکتا۔`
          )
          toast.error(
            `کتاب نمبر ${bn} کے لیے اختتامی نمبر ${maxTicketInBook} سے زیادہ نہیں ہو سکتا۔`
          )
          return
        }
      }

      // Validate akhrajat amounts
      const hasInvalidAkhrajat = akhrajat.some((item) => {
        if (!item.title) return true
        const amount = parseFloat(item.amount)
        return item.amount === '' || isNaN(amount) || amount < 0
      })
      if (hasInvalidAkhrajat) {
        setFormError('تمام اخراجات کے لیے درست رقم درج کریں۔')
        toast.error('تمام اخراجات کے لیے درست رقم درج کریں۔')
        return
      }

      const hasIncompleteGari = akhrajat.some((item) => {
        if (!gariTitles.includes(item.title)) return false
        const type = item.gariExpenses?.[0]?.title
        if (!type) return true
        if ((type === 'پٹرول' || type === 'ڈیزل') && !item.gariExpenses?.[0]?.quantity) return true
        if (type === 'مرمت' && !item.gariExpenses?.[0]?.part) return true
        return false
      })
      if (hasIncompleteGari) {
        setFormError('گاڑی اخراجات کے مکمل تفصیل درج کریں۔')
        toast.error('گاڑی اخراجات کے مکمل تفصیل درج کریں۔')
        return
      }

      const hasIncompleteOther = akhrajat.some((item) => {
        if (item.title !== MUTAFARIK_LABEL) return false
        return !item.othersTitlesId && !item.otherTitle && !item.description
      })
      if (hasIncompleteOther) {
        setFormError('متفرق اخراجات کے ذیلی عنوان کا انتخاب کریں یا تفصیل لکھیں۔')
        toast.error('متفرق اخراجات کے ذیلی عنوان کا انتخاب کریں یا تفصیل لکھیں۔')
        return
      }

      const nKulAmdan = kulAmdan === null || kulAmdan === '' ? 0 : Number(kulAmdan)
      const nKulAkhrajat = kulAkhrajat === null || kulAkhrajat === '' ? 0 : Number(kulAkhrajat)
      const nSaafiAmdan = saafiAmdan === null || saafiAmdan === '' ? 0 : Number(saafiAmdan)
      const nExercise = exercise === null || exercise === '' ? 0 : Number(exercise)
      const nKulMaizan = kulMaizan === null || kulMaizan === '' ? 0 : Number(kulMaizan)

      const payloadAkhrajat = akhrajat.map((item) => {
        const isGari = gariTitles.includes(item.title)
        const isOther = item.title === MUTAFARIK_LABEL
        const amt = item.amount === '' || item.amount == null ? 0 : Number(item.amount)
        const row = {
          ...item,
          amount: amt,
          isGari,
          isOther,
          date
        }
        if (isOther) {
          if (item.othersTitlesId) {
            row.othersTitlesId = Number(item.othersTitlesId)
          }
          if (item.otherTitle && !item.othersTitlesId) {
            row.otherTitle = item.otherTitle.trim()
          }
        }
        return row
      })

      await window.api.transactions.create({
        userID: user.id,
        ZoneName: zoneName,
        KhdaName: khda,
        trollyEntries: trollyRows.map((r) => ({
          bookNumber: Number(r.bookNumber),
          totalTickets: Number(r.total),
          EndingNum: Number(r.ending)
        })),
        KulAmdan: BigInt(nKulAmdan),
        KulAkhrajat: BigInt(nKulAkhrajat),
        SaafiAmdan: BigInt(nSaafiAmdan),
        Exercise: BigInt(nExercise),
        KulMaizan: BigInt(nKulMaizan),
        date,
        akhrajat: payloadAkhrajat
      })

      window.focus()
      resetForm()
      window.api.admin.zones.getAll().then(setZonesList)
      setKhda('')
      toast.success('✅ معاملہ کامیابی سے محفوظ ہو گیا!')
    } catch (err) {
      console.error('Transaction creation failed:', err)
      setFormError(err.message || 'معاملہ محفوظ کرنے میں ناکامی')
      toast.error(err.message || 'معاملہ محفوظ کرنے میں ناکامی')
    }
  }

  /* ==================================================================
   * Render
   * ================================================================== */
  return (
    <div className="form-container">
      <div className="form-header">
        <button type="button" className="return-btn" onClick={handleReturn}>
          ⬅️ واپس جائیں
        </button>
        <h2>نیا ریکارڈ شامل کریں</h2>
      </div>

      {formError && (
        <div className="form-error" style={{ color: 'red', marginTop: '1rem' }}>
          {formError}
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />

      <form key={formKey} onSubmit={handleSubmit} className="transaction-form">
        <div className="form-section">
          <label htmlFor="date">تاریخ منتخب کریں:</label>
          <input
            id="date"
            type="date"
            value={date || ''}
            onChange={(e) => setDate(e.target.value)}
            className="form-input"
          />

          <label htmlFor="zone">زون منتخب کریں:</label>
          <select
            id="zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="form-select"
          >
            <option value="">-- منتخب کریں --</option>
            {zonesList.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>

          <label htmlFor="khda">کھدہ منتخب کریں:</label>
          <select
            id="khda"
            className="form-select"
            value={khda}
            onChange={(e) => setKhda(e.target.value)}
            ref={khdaRef}
          >
            <option value="">-- منتخب کریں --</option>
            {khdaList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <div className="trolly-rows">
            <div className="trolly-rows-header">
              <label>کتاب نمبر / ٹرالی</label>
            </div>
            {trollyRows.map((row, idx) => (
              <div key={idx} className="trolly-row">
                <select
                  value={row.bookNumber}
                  onChange={(e) => updateTrollyRow(idx, 'bookNumber', e.target.value)}
                  disabled={!khda}
                >
                  <option value="">-- کتاب منتخب کریں --</option>
                  {booksForKhda.map((b) => (
                    <option key={b.bookNumber} value={b.bookNumber}>
                      {b.bookNumber} (استعمال شدہ: {b.usedTickets}/100)
                    </option>
                  ))}
                </select>
                <input
                  className="form-input"
                  placeholder="ابتدائی نمبر"
                  value={row.starting ?? ''}
                  onChange={(e) => updateTrollyRow(idx, 'starting', e.target.value)}
                  type="number"
                  dir="ltr"
                  onWheel={(e) => e.target.blur()}
                  readOnly
                />
                <input
                  className="form-input"
                  placeholder="اختتامی نمبر"
                  value={row.ending ?? ''}
                  onChange={(e) => updateTrollyRow(idx, 'ending', e.target.value)}
                  type="number"
                  dir="ltr"
                  onWheel={(e) => e.target.blur()}
                />
                <input
                  className="form-input"
                  placeholder="کل ٹرالیاں"
                  value={row.total ?? ''}
                  readOnly
                  type="number"
                  dir="ltr"
                  onWheel={(e) => e.target.blur()}
                />
                <button type="button" className="remove-btn" onClick={() => removeTrollyRow(idx)}>
                  ❌
                </button>
              </div>
            ))}
            <button type="button" className="add-btn" onClick={addTrollyRow} disabled={!khda}>
              ➕ مزید کتاب/ٹرالی شامل کریں
            </button>
          </div>
        </div>

        <hr className="section-divider" />

        <div className="form-section">
          <h4 className="section-title">مالی تفصیلات</h4>

          <label htmlFor="kulAmdan">کل آمدن:</label>
          <input
            id="kulAmdan"
            className="form-input"
            type="number"
            placeholder="کل آمدن"
            value={kulAmdan ?? ''}
            onChange={(e) => setKulAmdan(e.target.value)}
            dir="ltr"
            onWheel={(e) => e.target.blur()}
          />

          <label htmlFor="kulAkhrajat">کل اخراجات:</label>
          <input
            id="kulAkhrajat"
            className="form-input"
            type="number"
            placeholder="کل اخراجات"
            value={kulAkhrajat ?? ''}
            readOnly
            dir="ltr"
          />

          <label htmlFor="saafiAmdan">صافی آمدن:</label>
          <input
            id="saafiAmdan"
            className="form-input"
            type="number"
            placeholder="صافی آمدن"
            value={saafiAmdan ?? ''}
            readOnly
            dir="ltr"
          />

          <label htmlFor="exercise">ایکسایز:</label>
          <input
            id="exercise"
            className="form-input"
            type="number"
            placeholder="ایکسایز"
            value={exercise ?? ''}
            onChange={(e) => setExercise(e.target.value)}
            dir="ltr"
            onWheel={(e) => e.target.blur()}
          />

          <label htmlFor="kulMaizan">کل میزان:</label>
          <input
            id="kulMaizan"
            className="form-input"
            type="number"
            placeholder="کل میزان"
            value={kulMaizan ?? ''}
            readOnly
            dir="ltr"
          />
        </div>

        <hr className="section-divider" />

        <div className="form-section">
          <h4 className="section-title">اخراجات کی تفصیل</h4>

          <div className="akhrajat-container">
            {akhrajat.map((item, index) => {
              const isGari = gariTitles.includes(item.title)
              const isOther = item.title === MUTAFARIK_LABEL

              return (
                <div key={index} className="akhrajat-item">
                  <div className="akhrajat-inputs">
                    <div className="akhrajat-title">
                      <select
                        className="form-select akhrajat-title"
                        value={item.title || ''}
                        onChange={(e) => updateAkhrajat(index, 'title', e.target.value)}
                      >
                        <option value="">-- عنوان منتخب کریں --</option>
                        {akhrajatTitles.map((title) => (
                          <option key={title} value={title}>
                            {title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="akhrajat-description-amount">
                      <input
                        className={`form-input akhrajat-description ${
                          activeInput === `akhrajat-desc-${index}` ? 'active-input' : ''
                        }`}
                        placeholder="تفصیل"
                        value={item.description || ''}
                        onChange={(e) => updateAkhrajat(index, 'description', e.target.value)}
                        onFocus={() => handleInputFocus(`akhrajat-desc-${index}`)}
                        ref={(el) => {
                          akhrajatRefs.current[`desc-${index}`] = { current: el }
                        }}
                      />
                      <input
                        className="form-input akhrajat-amount"
                        placeholder="رقم"
                        type="number"
                        value={item.amount ?? ''}
                        onChange={(e) => updateAkhrajat(index, 'amount', e.target.value)}
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                      />
                      {isGari && (
                        <div className="gari-expense-section">
                          <label>گاڑی خرچ کی قسم:</label>
                          <select
                            className="form-select"
                            value={item.gariExpenses?.[0]?.title || ''}
                            onChange={(e) => {
                              const title = e.target.value
                              const updated = { title }
                              if (['پٹرول', 'ڈیزل'].includes(title)) {
                                updated.quantity = ''
                              } else if (title === 'مرمت') {
                                updated.part = ''
                              }
                              updateAkhrajat(index, 'gariExpenses', [updated])
                            }}
                          >
                            <option value="">-- قسم منتخب کریں --</option>
                            {gariExpenseTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                          {['پٹرول', 'ڈیزل'].includes(item.gariExpenses?.[0]?.title) && (
                            <input
                              type="number"
                              placeholder="مقدار (لیٹر)"
                              className="form-input"
                              value={item.gariExpenses[0]?.quantity || ''}
                              onChange={(e) => {
                                const updated = [...(item.gariExpenses || [])]
                                updated[0].quantity = e.target.value
                                updateAkhrajat(index, 'gariExpenses', updated)
                              }}
                            />
                          )}
                          {item.gariExpenses?.[0]?.title === 'مرمت' && (
                            <select
                              className="form-select"
                              value={item.gariExpenses[0]?.part || ''}
                              onChange={(e) => {
                                const updated = [...(item.gariExpenses || [])]
                                updated[0].part = e.target.value
                                updateAkhrajat(index, 'gariExpenses', updated)
                              }}
                            >
                              <option value="">-- پرزہ منتخب کریں --</option>
                              {gariParts.map((part) => (
                                <option key={part} value={part}>
                                  {part}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                      {isOther && (
                        <div className="other-expense-section">
                          <label>متفرق ذیلی عنوان:</label>
                          <select
                            className="form-select"
                            value={item.othersTitlesId ?? ''}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '__new__') {
                                updateAkhrajat(index, 'othersTitlesId', null)
                                updateAkhrajat(index, 'otherTitle', '')
                              } else if (val === '') {
                                updateAkhrajat(index, 'othersTitlesId', null)
                              } else {
                                updateAkhrajat(index, 'othersTitlesId', Number(val))
                                updateAkhrajat(index, 'otherTitle', '')
                              }
                            }}
                          >
                            <option value="">-- منتخب کریں --</option>
                            {othersTitlesList.map((ot) => (
                              <option key={ot.id} value={ot.id}>
                                {ot.name}
                              </option>
                            ))}
                            <option value="__new__">+ نیا متفرق عنوان</option>
                          </select>
                          {item.othersTitlesId == null && (
                            <input
                              type="text"
                              className="form-input"
                              placeholder="نیا متفرق عنوان"
                              value={item.otherTitle || ''}
                              onChange={(e) => updateAkhrajat(index, 'otherTitle', e.target.value)}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeAkhrajat(index)}
                    aria-label="Remove expense"
                  >
                    ❌
                  </button>
                </div>
              )
            })}
          </div>

          <button type="button" className="add-btn" onClick={addAkhrajat}>
            ➕ اخراج شامل کریں
          </button>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            محفوظ کریں
          </button>
        </div>
      </form>

      <button
        type="button"
        className="keyboard-toggle"
        onClick={() => setShowKeyboard(!showKeyboard)}
        aria-label="Toggle Urdu Keyboard"
      >
        <span role="img" aria-label="keyboard">
          ⌨️
        </span>
      </button>

      {showKeyboard && <UrduKeyboard onKeyPress={handleKeyPress} onClose={closeKeyboard} />}
    </div>
  )
}
