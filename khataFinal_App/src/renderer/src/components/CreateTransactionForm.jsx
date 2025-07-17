import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import './CreateTransactionForm.css'
import UrduKeyboard from './UrduKeyboard'

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

  const [starting, setStarting] = useState(null)
  const [ending, setEnding] = useState(null)
  const [total, setTotal] = useState(null)
  const [kulAmdan, setKulAmdan] = useState(null)
  const [kulAkhrajat, setKulAkhrajat] = useState(null)
  const [saafiAmdan, setSaafiAmdan] = useState(null)
  const [exercise, setExercise] = useState(null)
  const [kulMaizan, setKulMaizan] = useState(null)

  const [date, setDate] = useState('')

  const [akhrajat, setAkhrajat] = useState([])

  const [lastEnding, setLastEnding] = useState(0)
  const [zonesList, setZonesList] = useState([])
  const [khdaList, setKhdaList] = useState([])
  const [akhrajatTitles, setAkhrajatTitles] = useState([]) // [name, ...]

  /* ------------------------------------------------------------------
   * Book / Ticket selection
   * ---------------------------------------------------------------- */
  const [booksForKhda, setBooksForKhda] = useState([]) // [{bookNumber, usedTickets,nextTicket,isFull}, ...]
  const [selectedBookNumber, setSelectedBookNumber] = useState('') // value from dropdown
  const [manualBookNumber, setManualBookNumber] = useState('') // user typed
  const [useManualBook, setUseManualBook] = useState(false) // toggle when user wants new book

  // Computed “active” values we actually submit
  const activeBookNumber = useMemo(() => {
    return useManualBook ? manualBookNumber.trim() : selectedBookNumber.trim()
  }, [useManualBook, manualBookNumber, selectedBookNumber])

  const activeTicketNumber = useMemo(() => {
    if (useManualBook) return 1 // brand new
    const found = booksForKhda.find((b) => b.bookNumber === selectedBookNumber)
    if (!found) return 1
    return found.nextTicket ?? found.usedTickets + 1 // safe fallback
  }, [useManualBook, selectedBookNumber, booksForKhda])

  const [formError, setFormError] = useState('')

  const parseIntOrNull = (v) => {
    const n = parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  }

  /* ------------------------------------------------------------------
   * Admin metadata for gari & other sub‑forms
   * ---------------------------------------------------------------- */
  const [gariTitles, setGariTitles] = useState([]) // [name,...]
  const [gariExpenseTypes, setGariExpenseTypes] = useState([]) // [name,...]
  const [gariParts, setGariParts] = useState([]) // [name,...]
  const [othersTitlesList, setOthersTitlesList] = useState([]) // [{id,name},...]

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
    window.api.transactions.getLastEndingNumber().then(setLastEnding)

    setZone('')
    setKhda('')
    setStarting(null)
    setEnding(null)
    setTotal(null)
    setKulAmdan(null)
    setKulAkhrajat(null)
    setSaafiAmdan(null)
    setExercise(null)
    setKulMaizan(null)
    setDate('')

    setAkhrajat([])

    // books
    setBooksForKhda([])
    setSelectedBookNumber('')
    setManualBookNumber('')
    setUseManualBook(false)

    setFormError('')
    setKhdaList([])

    closeKeyboard()
    setFormKey((k) => k + 1)
  }

  /* ==================================================================
   * Init fetch (static admin lookups)
   * ================================================================== */
  useEffect(() => {
    window.api.transactions.getLastEndingNumber().then(setLastEnding)

    window.api.admin.zones.getAll().then((zones) => {
      setZonesList(zones)
    })

    window.api.admin.akhrajatTitles.getAll().then((titles) => {
      // store name only; we detect Mutafarik by MUTAFARIK_LABEL
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

    // NEW: load OthersTitles (Mutafarik child options)
    window.api.admin.othersTitles.getAll().then((rows) => {
      setOthersTitlesList(rows) // keep full objects {id,name}
    })

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
    if (!khda) {
      setBooksForKhda([])
      setSelectedBookNumber('')
      setManualBookNumber('')
      setUseManualBook(false)
      return
    }
    async function loadBooks() {
      try {
        const books = await window.api.transactions.getBooksByKhda(khda)
        setBooksForKhda(books)

        // Auto‑select logic:
        const nonFull = books.filter((b) => !b.isFull)
        if (nonFull.length === 1) {
          setSelectedBookNumber(nonFull[0].bookNumber)
          setUseManualBook(false)
        } else {
          setSelectedBookNumber('')
          setUseManualBook(false)
        }

        // Backward‑compat fallback: if no books at all, try legacy getLatest
        if (books.length === 0) {
          const legacy = await window.api.transactions.getLatestByKhda(khda)
          if (legacy?.bookNumber) {
            setSelectedBookNumber(legacy.bookNumber)
            setUseManualBook(false)
          }
        }
      } catch (err) {
        console.error('loadBooks error', err)
        // fallback to legacy
        window.api.transactions
          .getLatestByKhda(khda)
          .then((legacy) => {
            if (legacy?.bookNumber) {
              setSelectedBookNumber(legacy.bookNumber)
              setUseManualBook(false)
            }
          })
          .catch((err2) => {
            console.error('legacy getLatestByKhda failed', err2)
          })
      }
    }

    loadBooks()
  }, [khda])

  /* ==================================================================
   * Auto-calc total trollies from starting/ending
   * ================================================================== */
  useEffect(() => {
    const s = parseIntOrNull(starting)
    const e = parseIntOrNull(ending)

    if (s != null && e != null && e >= s) {
      // inclusive count
      setTotal(String(e - s + 1))
    } else {
      setTotal('')
    }
  }, [starting, ending])
  // Auto-calculate Saafi Amdan whenever Kul Amdan or Kul Akhrajat changes
  useEffect(() => {
    const amdan = parseFloat(kulAmdan) || 0
    const akhrajat = parseFloat(kulAkhrajat) || 0
    setSaafiAmdan(amdan - akhrajat)
  }, [kulAmdan, kulAkhrajat])

  // Auto-calculate Kul Maizan whenever Saafi Amdan or Exercise changes
  useEffect(() => {
    const saafi = parseFloat(saafiAmdan) || 0
    const exc = parseFloat(exercise) || 0
    setKulMaizan(saafi + exc)
  }, [saafiAmdan, exercise])

  /* ==================================================================
   * Build <option> list for book select
   * ================================================================== */
  const bookOptions = useMemo(() => {
    const opts = booksForKhda.map((b) => ({
      value: b.bookNumber,
      label: `${b.bookNumber} (استعمال شدہ: ${b.usedTickets} / 100)`
    }))
    // manual entry sentinel
    opts.push({ value: '__manual__', label: 'نیا کتاب نمبر درج کریں…' })
    return opts
  }, [booksForKhda])

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
        // NEW Other fields
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
        // If user changes the main title, reset sub‑fields accordingly
        if (field === 'title') {
          if (value === MUTAFARIK_LABEL) {
            // switching to Mutafarik -> clear gari fields, keep other fields
            next.gariExpenses = []
          } else if (gariTitles.includes(value)) {
            // switching to gari -> clear other fields
            next.othersTitlesId = null
            next.otherTitle = ''
          } else {
            // plain -> clear both
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
        return
      }

      const zoneName = zonesList.find((z) => z.id === Number(zone))?.name || ''
      if (!zoneName) {
        setFormError('براہ کرم زون منتخب کریں۔')
        return
      }

      if (!khda) {
        setFormError('براہ کرم کھدہ منتخب کریں۔')
        return
      }

      if (!activeBookNumber) {
        setFormError('براہ کرم کتاب نمبر منتخب یا درج کریں۔')
        return
      }

      // Validate manual book number not colliding w/ selected
      if (useManualBook && booksForKhda.some((b) => b.bookNumber === manualBookNumber.trim())) {
        setFormError('یہ کتاب نمبر پہلے سے فعال ہے۔')
        return
      }

      // Validate gari sub‑records
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
        return
      }

      // Validate Other (Mutafarik) sub‑records
      const hasIncompleteOther = akhrajat.some((item) => {
        if (item.title !== MUTAFARIK_LABEL) return false
        // must choose existing id OR type something in otherTitle OR description
        return !item.othersTitlesId && !item.otherTitle && !item.description
      })
      if (hasIncompleteOther) {
        setFormError('متفرق اخراجات کے ذیلی عنوان کا انتخاب کریں یا تفصیل لکھیں۔')
        return
      }

      // Normalize numbers (avoid sending '' to BigInt) --------------------
      const nKulAmdan = kulAmdan === null || kulAmdan === '' ? 0 : Number(kulAmdan)
      const nKulAkhrajat = kulAkhrajat === null || kulAkhrajat === '' ? 0 : Number(kulAkhrajat)
      const nSaafiAmdan = saafiAmdan === null || saafiAmdan === '' ? 0 : Number(saafiAmdan)
      const nExercise = exercise === null || exercise === '' ? 0 : Number(exercise)
      const nKulMaizan = kulMaizan === null || kulMaizan === '' ? 0 : Number(kulMaizan)

      // Build payload akhrajat --------------------------------------------
      const payloadAkhrajat = akhrajat.map((item) => {
        const isGari = gariTitles.includes(item.title)
        const isOther = item.title === MUTAFARIK_LABEL
        const amt = item.amount === '' || item.amount == null ? 0 : item.amount

        const row = {
          ...item,
          amount: amt,
          isGari,
          isOther,
          date
        }

        if (isOther) {
          // choose ID if available
          if (item.othersTitlesId) {
            row.othersTitlesId = Number(item.othersTitlesId)
          }
          // if user typed a new label in otherTitle, include it (server may auto-create)
          if (item.otherTitle && !item.othersTitlesId) {
            row.otherTitle = item.otherTitle.trim()
          }
        }

        return row
      })

      // Send ---------------------------------------------------------------
      await window.api.transactions.create({
        userID: user.id,
        ZoneName: zoneName,
        KhdaName: khda,
        StartingNum: starting,
        EndingNum: ending,
        total: total || 0,
        bookNumber: activeBookNumber,
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

      // refresh zones
      window.api.admin.zones.getAll().then((zones) => {
        setZonesList(zones)
      })

      setKhda('')
      setFormError('✅ Transaction saved!')
    } catch (err) {
      console.error('Transaction creation failed:', err)
      setFormError(err.message || 'معاملہ محفوظ کرنے میں ناکامی')
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

      <form key={formKey} onSubmit={handleSubmit} className="transaction-form">
        <div className="last-ending-display">
          آخری اختتامی نمبر: <strong>{lastEnding.toString()}</strong>
        </div>

        <div className="form-section">
          <label htmlFor="date">تاریخ منتخب کریں:</label>
          <input
            id="date"
            type="date"
            value={date || ``}
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

          {/* ------------------------------------------------------------
           * Book selector (supports multiple active books)
           * ------------------------------------------------------------ */}
          <label htmlFor="bookSelect">کتاب نمبر منتخب کریں:</label>
          <select
            id="bookSelect"
            className="form-select"
            value={useManualBook ? '__manual__' : selectedBookNumber}
            onChange={(e) => {
              const val = e.target.value
              if (val === '__manual__') {
                setUseManualBook(true)
                setSelectedBookNumber('')
              } else {
                setUseManualBook(false)
                setSelectedBookNumber(val)
              }
            }}
            disabled={!khda}
          >
            <option value="">-- منتخب کریں --</option>
            {bookOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Manual book input when needed */}
          {useManualBook && (
            <input
              id="bookNumber"
              className="form-input"
              placeholder="نیا کتاب نمبر"
              value={manualBookNumber}
              onChange={(e) => setManualBookNumber(e.target.value)}
            />
          )}

          {/* Ticket display */}
          <div className="ticket-number-hint">
            موجودہ ٹکٹ نمبر: <strong>{activeTicketNumber}</strong> / 100
          </div>

          <label htmlFor="starting">ابتدائی نمبر:</label>
          <input
            id="starting"
            className="form-input"
            placeholder="ابتدائی نمبر"
            value={starting ?? ``}
            onChange={(e) => setStarting(e.target.value)}
            type="number"
            dir="ltr"
            onWheel={(e) => e.target.blur()}
          />

          <label htmlFor="ending">اختتامی نمبر:</label>
          <input
            id="ending"
            className="form-input"
            placeholder="اختتامی نمبر"
            value={ending ?? ``}
            onChange={(e) => setEnding(e.target.value)}
            type="number"
            dir="ltr"
            onWheel={(e) => e.target.blur()}
          />

          <label htmlFor="total">کل ٹرالیاں:</label>
          <input
            id="total"
            className="form-input"
            placeholder="کل ٹرالیاں"
            value={total ?? ``}
            readOnly // ← auto-calculated
            type="number"
            dir="ltr"
            onWheel={(e) => e.target.blur()}
          />
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
            value={kulAmdan ?? ``}
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
            value={kulAkhrajat ?? ``}
            onChange={(e) => setKulAkhrajat(e.target.value)}
            dir="ltr"
            onWheel={(e) => e.target.blur()}
          />

          <label htmlFor="saafiAmdan">صافی آمدن:</label>
          <input
            id="saafiAmdan"
            className="form-input"
            type="number"
            placeholder="صافی آمدن"
            value={saafiAmdan ?? ``}
            readOnly // 🔒 Auto-calculated
            dir="ltr"
          />

          <label htmlFor="exercise">ایکسایز:</label>
          <input
            id="exercise"
            className="form-input"
            type="number"
            placeholder="ایکسایز"
            value={exercise ?? ``}
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
            value={kulMaizan ?? ``}
            readOnly // 🔒 Auto-calculated
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
                        value={item.title || ``}
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
                        value={item.description || ``}
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
                        value={item.amount ?? ``}
                        onChange={(e) => updateAkhrajat(index, 'amount', e.target.value)}
                        dir="ltr"
                        onWheel={(e) => e.target.blur()}
                      />

                      {/* ================= GARI SUB-FIELDS ================= */}
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

                      {/* ================= OTHER (MUTAFARIK) SUB-FIELDS ================= */}
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

                          {/* show input when creating a new Other subtype */}
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

      {/* Urdu keyboard toggle */}
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
