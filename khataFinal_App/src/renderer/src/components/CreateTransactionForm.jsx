import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './CreateTransactionForm.css'
import UrduKeyboard from './UrduKeyboard'

export default function CreateTransactionForm() {
  const [formKey, setFormKey] = useState(0)
  const navigate = useNavigate()

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
  const [akhrajatTitles, setAkhrajatTitles] = useState([])
  const [bookNumber, setBookNumber] = useState('')
  const [activeBookNumber, setActiveBookNumber] = useState('')
  const [activeTicketNumber, setActiveTicketNumber] = useState(1)
  const [formError, setFormError] = useState('')

  const [gariTitles, setGariTitles] = useState([])
  const [gariExpenseTypes, setGariExpenseTypes] = useState([])
  const [gariParts, setGariParts] = useState([])

  // Keyboard state
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [activeInput, setActiveInput] = useState(null)
  const [inputRefs, setInputRefs] = useState({})

  const khdaRef = useRef(null)
  const akhrajatRefs = useRef({})

  //reset form function
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
    setBookNumber('')
    setActiveBookNumber('')
    setActiveTicketNumber(1)
    setFormError('')
    setKhdaList([]) // <- force khda list clear
    closeKeyboard() // close the virtual keyboard explicitly
    setFormKey((k) => k + 1)
  }

  useEffect(() => {
    window.api.transactions.getLastEndingNumber().then(setLastEnding)

    // fetch zones
    window.api.admin.zones.getAll().then((zones) => {
      setZonesList(zones)
    })

    // fetch akhrajat titles
    window.api.admin.akhrajatTitles.getAll().then((titles) => {
      setAkhrajatTitles(titles.map((t) => t.name)) // assuming t.name is Urdu
    })

    // fetch Gari Expense Types (پٹرول, ڈیزل, مرمت, ٹیوننگ etc.)
    window.api.admin.gariExpenseTypes.getAll().then((types) => {
      setGariExpenseTypes(types.map((t) => t.name))
    })

    // fetch Gari Parts (mobil oil, air filter etc.)
    window.api.admin.gariParts.getAll().then((parts) => {
      setGariParts(parts.map((p) => p.name))
    })

    window.api.admin.gariTitles.getAll().then((titles) => {
      setGariTitles(titles.map((t) => t.name)) // assume name is Urdu name of vehicle
    })

    // Initialize refs
    setInputRefs({
      khda: khdaRef
    })
  }, [])

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
      // zone was empty or invalid, so we clear khdas to avoid stale dropdown
      setKhdaList([])
    }
  }, [zone])

  // Update refs when akhrajat changes
  useEffect(() => {
    // Make sure akhrajatRefs object has a ref for each expense item
    akhrajat.forEach((_, index) => {
      if (!akhrajatRefs.current[`desc-${index}`]) {
        akhrajatRefs.current[`desc-${index}`] = React.createRef()
      }
    })

    // Update inputRefs with current akhrajat refs
    const akhrajatInputRefs = {}
    Object.keys(akhrajatRefs.current).forEach((key) => {
      if (key.startsWith('desc-')) {
        const index = parseInt(key.replace('desc-', ''), 10)
        if (index < akhrajat.length) {
          // Only include refs for existing items
          akhrajatInputRefs[`akhrajat-${key}`] = akhrajatRefs.current[key]
        }
      }
    })

    setInputRefs((prev) => ({
      ...prev,
      ...akhrajatInputRefs
    }))
  }, [akhrajat])

  useEffect(() => {
    if (!khda) {
      setActiveBookNumber('')
      setActiveTicketNumber(1)
      return
    }

    window.api.transactions
      .getLatestByKhda(khda)
      .then((latest) => {
        if (!latest) {
          // no transactions yet for this khda
          setActiveBookNumber('')
          setActiveTicketNumber(1)
          return
        }

        if (latest.bookNumber && latest.ticketNumber < 100) {
          setActiveBookNumber(latest.bookNumber)
          setActiveTicketNumber(latest.ticketNumber + 1)
        } else {
          // book is full or missing, force user to enter new
          setActiveBookNumber('')
          setActiveTicketNumber(1)
        }
      })
      .catch((err) => {
        console.error('getLatestByKhda failed', err)
        setActiveBookNumber('')
        setActiveTicketNumber(1)
      })
  }, [khda])

  // Handle keyboard input
  const handleKeyPress = (char) => {
    if (!activeInput) return

    const inputRef = inputRefs[activeInput]
    if (!inputRef || !inputRef.current) return

    const input = inputRef.current
    const start = input.selectionStart
    const end = input.selectionEnd

    if (char === 'backspace') {
      if (start === end && start > 0) {
        // Delete character before cursor
        const newValue = input.value.substring(0, start - 1) + input.value.substring(end)
        updateInputValue(activeInput, newValue)

        // Update cursor position
        setTimeout(() => {
          input.selectionStart = start - 1
          input.selectionEnd = start - 1
        }, 0)
      } else if (start !== end) {
        // Delete selected text
        const newValue = input.value.substring(0, start) + input.value.substring(end)
        updateInputValue(activeInput, newValue)

        // Update cursor position
        setTimeout(() => {
          input.selectionStart = start
          input.selectionEnd = start
        }, 0)
      }
    } else {
      // Insert character at cursor position
      const newValue = input.value.substring(0, start) + char + input.value.substring(end)
      updateInputValue(activeInput, newValue)

      // Update cursor position
      setTimeout(() => {
        input.focus()
        input.selectionStart = start + char.length
        input.selectionEnd = start + char.length
      }, 0)
    }
  }

  // Update input value based on active input
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

  // Handle input focus
  const handleInputFocus = (inputName) => {
    setActiveInput(inputName)
    setShowKeyboard(true)
  }

  // Close keyboard
  const closeKeyboard = () => {
    setShowKeyboard(false)
    setActiveInput(null)
  }

  const addAkhrajat = () => {
    setAkhrajat([...akhrajat, { description: '', amount: '', title: '', gariExpenses: [] }])
  }

  const updateAkhrajat = (index, field, value) => {
    setAkhrajat((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
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

    // Clean up refs for removed items
    const newAkhrajatRefs = { ...akhrajatRefs.current }
    delete newAkhrajatRefs[`desc-${index}`]

    // Reassign indices for refs after the removed item
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('') // clear any previous error

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

      const usedBookNumber = activeBookNumber || bookNumber
      if (!usedBookNumber) {
        setFormError('براہ کرم کتاب نمبر درج کریں۔')
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
        return
      }

      await window.api.transactions.create({
        userID: user.id,
        ZoneName: zoneName,
        KhdaName: khda,
        StartingNum: starting,
        EndingNum: ending,
        total,
        bookNumber: usedBookNumber,
        KulAmdan: BigInt(kulAmdan || 0),
        KulAkhrajat: BigInt(kulAkhrajat || 0),
        SaafiAmdan: BigInt(saafiAmdan || 0),
        Exercise: BigInt(exercise || 0),
        KulMaizan: BigInt(kulMaizan || 0),
        date,
        akhrajat: akhrajat.map((item) => ({
          ...item,
          isGari: gariTitles.includes(item.title), // ✅ Explicitly set
          date
        }))
      })

      window.focus()
      // optionally you can reset form here
      resetForm()
      // forcibly re-fetch zones so the dropdown is consistent
      window.api.admin.zones.getAll().then((zones) => {
        setZonesList(zones)
      })
      // forcibly clear khdaList
      setKhdaList([])
      // and set khda to ''
      setKhda('')
      setFormError('✅ Transaction saved!')
    } catch (err) {
      console.error('Transaction creation failed:', err)
      setFormError(err.message || 'معاملہ محفوظ کرنے میں ناکامی')
    }
  }

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
            onChange={(e) => {
              setZone(e.target.value)
            }}
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
          >
            <option value="">-- منتخب کریں --</option>
            {khdaList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          <label htmlFor="bookNumber">کتاب نمبر:</label>
          <input
            id="bookNumber"
            className="form-input"
            placeholder="کتاب نمبر"
            value={activeBookNumber || bookNumber || ``}
            onChange={(e) => setBookNumber(e.target.value)}
            disabled={!!activeBookNumber} // user cannot change once locked
          />

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
            onChange={(e) => setTotal(e.target.value)}
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
            onChange={(e) => setSaafiAmdan(e.target.value)}
            dir="ltr"
            onWheel={(e) => e.target.blur()}
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
            onChange={(e) => setKulMaizan(e.target.value)}
            dir="ltr"
            onWheel={(e) => e.target.blur()}
          />
        </div>

        <hr className="section-divider" />

        <div className="form-section">
          <h4 className="section-title">اخراجات کی تفصیل</h4>

          <div className="akhrajat-container">
            {akhrajat.map((item, index) => (
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
                      className={`form-input akhrajat-description ${activeInput === `akhrajat-desc-${index}` ? 'active-input' : ''}`}
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
                    {gariTitles.includes(item.title) && (
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
                              const updated = [...item.gariExpenses]
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
                              const updated = [...item.gariExpenses]
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
            ))}
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

      {/* Add keyboard toggle button */}
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

      {/* Render the Urdu keyboard when needed */}
      {showKeyboard && <UrduKeyboard onKeyPress={handleKeyPress} onClose={closeKeyboard} />}
    </div>
  )
}
