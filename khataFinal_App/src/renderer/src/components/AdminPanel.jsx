'use client'

import { useEffect, useState } from 'react'
import './AdminPanel.css'
import { useNavigate } from 'react-router-dom'
import { LogoutButton } from './logout'
import UrduKeyboard from './UrduKeyboard'

/** Change this if your Mutafarik display text differs. */
const MUTAFARIK_LABEL = 'متفرق' // must match AkhrajatTitle.name in DB

export default function AdminPanel() {
  const navigate = useNavigate()

  /* ========================= Core Admin Lists ========================= */
  const [zones, setZones] = useState([]) // [{id,name,khdas:[{id,name,zoneId},...]},...]
  const [titles, setTitles] = useState([]) // Akhrajat titles (non-car + car + mutafarik)
  const [gariTitles, setGariTitles] = useState([])
  const [gariExpenseTypes, setGariExpenseTypes] = useState([])
  const [gariParts, setGariParts] = useState([])
  const [othersTitles, setOthersTitles] = useState([]) // NEW

  /* ========================= Keyboard State ========================= */
  const [showKeyboard, setShowKeyboard] = useState(false)
  const [activeInput, setActiveInput] = useState(null)

  /* ========================= Zone / Khda Create ========================= */
  const [newZone, setNewZone] = useState('')
  const [newKhda, setNewKhda] = useState('')
  const [selectedZoneForKhda, setSelectedZoneForKhda] = useState('')

  /* ========================= Akhrajat Title Create ========================= */
  const [newTitle, setNewTitle] = useState('')

  /* ========================= Gari Admin Create ========================= */
  const [newGariTitle, setNewGariTitle] = useState('')
  const [newExpenseType, setNewExpenseType] = useState('')
  const [newGariPart, setNewGariPart] = useState('')

  /* ========================= OthersTitles Create ========================= */
  const [newOtherTitle, setNewOtherTitle] = useState('') // NEW

  /* ========================= Active-Book Registration ========================= */
  const [regZone, setRegZone] = useState('')
  const [regKhda, setRegKhda] = useState('')
  const [newBookNumber, setNewBookNumber] = useState('')
  const [activeBooks, setActiveBooks] = useState([])

  /* ========================= Editing State ========================= */
  const [editingZone, setEditingZone] = useState(null)
  const [editingZoneName, setEditingZoneName] = useState('')

  const [editingKhda, setEditingKhda] = useState(null)
  const [editingKhdaName, setEditingKhdaName] = useState('')
  const [editingKhdaZoneId, setEditingKhdaZoneId] = useState('')

  const [editingTitle, setEditingTitle] = useState(null)
  const [editingTitleName, setEditingTitleName] = useState('')

  const [editingGariTitle, setEditingGariTitle] = useState(null)
  const [editingGariTitleName, setEditingGariTitleName] = useState('')

  const [editingExpenseType, setEditingExpenseType] = useState(null)
  const [editingExpenseTypeName, setEditingExpenseTypeName] = useState('')

  const [editingGariPart, setEditingGariPart] = useState(null)
  const [editingGariPartName, setEditingGariPartName] = useState('')

  const [editingOtherTitle, setEditingOtherTitle] = useState(null) // NEW
  const [editingOtherTitleName, setEditingOtherTitleName] = useState('') // NEW

  /* ===================================================================
   * Keyboard Helpers
   * ================================================================= */
  const updateActiveInput = (updater) => {
    switch (activeInput) {
      case 'newZone':
        setNewZone(updater(newZone))
        break
      case 'newKhda':
        setNewKhda(updater(newKhda))
        break
      case 'newTitle':
        setNewTitle(updater(newTitle))
        break
      case 'newGariTitle':
        setNewGariTitle(updater(newGariTitle))
        break
      case 'newExpenseType':
        setNewExpenseType(updater(newExpenseType))
        break
      case 'newGariPart':
        setNewGariPart(updater(newGariPart))
        break
      case 'newOtherTitle': // NEW
        setNewOtherTitle(updater(newOtherTitle))
        break
      default:
        if (activeInput?.startsWith('editZone-')) {
          setEditingZoneName(updater(editingZoneName))
        } else if (activeInput?.startsWith('editKhda-')) {
          setEditingKhdaName(updater(editingKhdaName))
        } else if (activeInput?.startsWith('editTitle-')) {
          setEditingTitleName(updater(editingTitleName))
        } else if (activeInput?.startsWith('editGariTitle-')) {
          setEditingGariTitleName(updater(editingGariTitleName))
        } else if (activeInput?.startsWith('editExpenseType-')) {
          setEditingExpenseTypeName(updater(editingExpenseTypeName))
        } else if (activeInput?.startsWith('editGariPart-')) {
          setEditingGariPartName(updater(editingGariPartName))
        } else if (activeInput?.startsWith('editOtherTitle-')) {
          setEditingOtherTitleName(updater(editingOtherTitleName))
        }
        break
    }
  }

  const handleKeyPress = (char) => {
    if (!activeInput) return
    if (char === 'backspace') {
      updateActiveInput((prev) => prev.slice(0, -1))
    } else {
      updateActiveInput((prev) => prev + char)
    }
  }

  const closeKeyboard = () => {
    setShowKeyboard(false)
    setActiveInput(null)
  }

  const handleFocus = (e) => {
    setActiveInput(e.target.id)
    setShowKeyboard(true)
  }

  /* ===================================================================
   * Load All Admin Data
   * ================================================================= */
  const loadData = async () => {
    const [z, t, gt, et, gp, ot] = await Promise.all([
      window.api.admin.zones.getAll(),
      window.api.admin.akhrajatTitles.getAll(),
      window.api.admin.gariTitles.getAll(),
      window.api.admin.gariExpenseTypes.getAll(),
      window.api.admin.gariParts.getAll(),
      window.api.admin.othersTitles.getAll()
    ])
    setZones(z)
    setTitles(t)
    setGariTitles(gt)
    setGariExpenseTypes(et)
    setGariParts(gp)
    setOthersTitles(ot)

    // if a zone+khda already selected, refresh activeBooks
    if (regZone && regKhda) {
      const ab = await window.api.transactions.getActiveBookByZone(regZone, regKhda)
      setActiveBooks(ab)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  /* ===================================================================
   * Zones CRUD
   * ================================================================= */
  const addZone = async () => {
    if (newZone.trim()) {
      await window.api.admin.zones.create(newZone.trim())
      setNewZone('')
      loadData()
    }
  }

  const updateZone = async () => {
    if (editingZone && editingZoneName.trim()) {
      await window.api.admin.zones.update({
        id: editingZone,
        name: editingZoneName.trim()
      })
      setEditingZone(null)
      setEditingZoneName('')
      loadData()
    }
  }

  const deleteZone = async (id) => {
    await window.api.admin.zones.delete(id)
    loadData()
  }

  /* ===================================================================
   * Khda CRUD
   * ================================================================= */
  const addKhda = async () => {
    if (newKhda.trim() && selectedZoneForKhda) {
      await window.api.admin.khdas.create({
        name: newKhda.trim(),
        zoneId: selectedZoneForKhda
      })
      setNewKhda('')
      setSelectedZoneForKhda('')
      loadData()
    }
  }

  const updateKhda = async () => {
    if (editingKhda && editingKhdaName.trim()) {
      await window.api.admin.khdas.update({
        id: editingKhda,
        name: editingKhdaName.trim(),
        zoneId: editingKhdaZoneId
      })
      setEditingKhda(null)
      setEditingKhdaName('')
      setEditingKhdaZoneId('')
      loadData()
    }
  }

  const deleteKhda = async (id) => {
    await window.api.admin.khdas.delete(id)
    loadData()
  }

  //Active Book CRUD
  const handleRegZoneChange = async (e) => {
    const zone = e.target.value
    setRegZone(zone)
    setRegKhda('') // reset khda selection
    setActiveBooks([])
  }

  const handleRegKhdaChange = async (e) => {
    const khda = e.target.value
    setRegKhda(khda)
    if (regZone && khda) {
      const ab = await window.api.transactions.getActiveBookByZone(regZone, khda)
      setActiveBooks(ab)
    }
  }

  const registerBook = async (e) => {
    e.preventDefault()
    if (!regZone || !regKhda || !newBookNumber) return
    try {
      await window.api.transactions.registerActiveBook(regZone, regKhda, Number(newBookNumber))
      setNewBookNumber('')
      // reload active books list
      const ab = await window.api.transactions.getActiveBookByZone(regZone, regKhda)
      setActiveBooks(ab)
    } catch (err) {
      alert(err.message)
    }
  }

  /* ===================================================================
   * Akhrajat Title CRUD
   * ================================================================= */
  const addTitle = async () => {
    if (newTitle.trim()) {
      await window.api.admin.akhrajatTitles.create(newTitle.trim())
      setNewTitle('')
      loadData()
    }
  }

  const updateTitle = async () => {
    if (editingTitle && editingTitleName.trim()) {
      await window.api.admin.akhrajatTitles.update({
        id: editingTitle,
        name: editingTitleName.trim()
      })
      setEditingTitle(null)
      setEditingTitleName('')
      loadData()
    }
  }

  const deleteTitle = async (id) => {
    await window.api.admin.akhrajatTitles.delete(id)
    loadData()
  }

  /* ===================================================================
   * Gari Titles CRUD
   * ================================================================= */
  const saveGariTitleEdit = async (gariId) => {
    await window.api.admin.gariTitles.update({
      id: gariId,
      name: editingGariTitleName
    })
    setEditingGariTitle(null)
    setEditingGariTitleName('')
    loadData()
  }

  /* ===================================================================
   * Gari Expense Types CRUD
   * ================================================================= */
  const saveExpenseTypeEdit = async (id) => {
    await window.api.admin.gariExpenseTypes.update({
      id,
      name: editingExpenseTypeName
    })
    setEditingExpenseType(null)
    setEditingExpenseTypeName('')
    loadData()
  }

  /* ===================================================================
   * Gari Parts CRUD
   * ================================================================= */
  const saveGariPartEdit = async (id) => {
    await window.api.admin.gariParts.update({
      id,
      name: editingGariPartName
    })
    setEditingGariPart(null)
    setEditingGariPartName('')
    loadData()
  }

  /* ===================================================================
   * OthersTitles CRUD (NEW)
   * ================================================================= */
  const addOtherTitle = async () => {
    if (newOtherTitle.trim()) {
      await window.api.admin.othersTitles.create(newOtherTitle.trim())
      setNewOtherTitle('')
      loadData()
    }
  }

  const updateOtherTitle = async () => {
    if (editingOtherTitle && editingOtherTitleName.trim()) {
      await window.api.admin.othersTitles.update({
        id: editingOtherTitle,
        name: editingOtherTitleName.trim()
      })
      setEditingOtherTitle(null)
      setEditingOtherTitleName('')
      loadData()
    }
  }

  const deleteOtherTitle = async (id) => {
    await window.api.admin.othersTitles.delete(id)
    loadData()
  }

  /* ===================================================================
   * Render
   * ================================================================= */
  return (
    <div className="container">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>

      {/* ========================= Active Book Registration ========================= */}
      <div className="section">
        <h2 className="section-title">فعال کتاب رجسٹر کریں</h2>
        <form onSubmit={registerBook} className="form">
          <select value={regZone} onChange={handleRegZoneChange} className="select-input">
            <option value="">زون منتخب کریں</option>
            {zones.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>

          <select
            value={regKhda}
            onChange={handleRegKhdaChange}
            className="select-input"
            disabled={!regZone}
          >
            <option value="">کھدہ منتخب کریں</option>
            {zones
              .find((z) => z.name === regZone)
              ?.khdas.map((k) => (
                <option key={k.id} value={k.name}>
                  {k.name}
                </option>
              ))}
          </select>

          <input
            type="number"
            placeholder="نیا کتاب نمبر"
            value={newBookNumber}
            onChange={(e) => setNewBookNumber(e.target.value)}
            onFocus={handleFocus}
            id="newBookNumber"
            className="input-text"
            disabled={!regKhda}
          />

          <button
            type="submit"
            className="button-submit"
            disabled={!regZone || !regKhda || !newBookNumber}
          >
            رجسٹر کریں
          </button>
        </form>

        {/* Display active books for selected zone+khda */}
        {activeBooks.length > 0 && (
          <ul className="title-list">
            {activeBooks.map((ab) => (
              <li key={ab.id}>
                کتاب نمبر {ab.bookNumber} — استعمال شدہ ٹکٹ: {ab.usedTickets}
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* ================================================================
       * Zones + Khda tree
       * ============================================================== */}
      <div className="section">
        <h2 className="section-title">زون اور کھدے</h2>
        {zones.map((zone) => (
          <div key={zone.id} className="zone-container">
            {editingZone === zone.id ? (
              <div className="flex-container">
                <input
                  type="text"
                  value={editingZoneName}
                  onChange={(e) => setEditingZoneName(e.target.value)}
                  onFocus={handleFocus}
                  id={`editZone-${zone.id}`}
                  className="input-text"
                />
                <button onClick={updateZone} className="button-save">
                  محفوظ کریں
                </button>
                <button onClick={() => setEditingZone(null)} className="button-cancel">
                  منسوخ
                </button>
              </div>
            ) : (
              <div className="zone-header">
                <h3 className="zone-title">{zone.name}</h3>
                <div className="button-group">
                  <button
                    onClick={() => {
                      setEditingZone(zone.id)
                      setEditingZoneName(zone.name)
                    }}
                    className="button-edit"
                  >
                    ترمیم
                  </button>
                  <button onClick={() => deleteZone(zone.id)} className="button-delete">
                    حذف
                  </button>
                </div>
              </div>
            )}

            <ul className="khda-list">
              {zone.khdas.map((khda) =>
                editingKhda === khda.id ? (
                  <div key={khda.id} className="flex-container">
                    <input
                      type="text"
                      value={editingKhdaName}
                      onChange={(e) => setEditingKhdaName(e.target.value)}
                      onFocus={handleFocus}
                      id={`editKhda-${khda.id}`}
                      className="input-text"
                    />
                    <select
                      value={editingKhdaZoneId}
                      onChange={(e) => setEditingKhdaZoneId(e.target.value)}
                      className="select-input"
                    >
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name}
                        </option>
                      ))}
                    </select>
                    <button onClick={updateKhda} className="button-save">
                      محفوظ کریں
                    </button>
                    <button onClick={() => setEditingKhda(null)} className="button-cancel">
                      منسوخ
                    </button>
                  </div>
                ) : (
                  <li key={khda.id} className="khda-item">
                    {khda.name}
                    <div className="button-group">
                      <button
                        onClick={() => {
                          setEditingKhda(khda.id)
                          setEditingKhdaName(khda.name)
                          setEditingKhdaZoneId(khda.zoneId)
                        }}
                        className="button-edit"
                      >
                        ترمیم
                      </button>
                      <button onClick={() => deleteKhda(khda.id)} className="button-delete">
                        حذف
                      </button>
                    </div>
                  </li>
                )
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Add Zone */}
      <div className="section">
        <h2 className="section-title">نیا زون شامل کریں</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addZone()
          }}
          className="form"
        >
          <input
            type="text"
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            onFocus={handleFocus}
            id="newZone"
            className="input-text"
            placeholder="زون کا نام"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* Add Khda */}
      <div className="section">
        <h2 className="section-title">نیا کھدہ شامل کریں</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addKhda()
          }}
          className="form"
        >
          <select
            value={selectedZoneForKhda}
            onChange={(e) => setSelectedZoneForKhda(e.target.value)}
            className="select-input"
          >
            <option value="">زون منتخب کریں</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="کھدہ کا نام"
            value={newKhda}
            onChange={(e) => setNewKhda(e.target.value)}
            onFocus={handleFocus}
            id="newKhda"
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* Akhrajat Titles */}
      <div className="section">
        <h2 className="section-title">اخراجات کے عنوانات</h2>
        <ul className="title-list">
          {titles.map((title) => {
            const isMutafarik = title.name === MUTAFARIK_LABEL
            return editingTitle === title.id ? (
              <div key={title.id} className="flex-container">
                <input
                  type="text"
                  value={editingTitleName}
                  onChange={(e) => setEditingTitleName(e.target.value)}
                  onFocus={handleFocus}
                  id={`editTitle-${title.id}`}
                  className="input-text"
                />
                <button onClick={updateTitle} className="button-save">
                  محفوظ کریں
                </button>
                <button onClick={() => setEditingTitle(null)} className="button-cancel">
                  منسوخ
                </button>
              </div>
            ) : (
              <li key={title.id} className="title-item">
                <span>{title.name}</span>
                {title.isGari && (
                  <strong style={{ color: 'green', marginRight: '1rem' }}>گاڑی</strong>
                )}
                {isMutafarik && (
                  <strong style={{ color: 'blue', marginRight: '1rem' }}>متفرق</strong>
                )}
                {!title.isGari && !isMutafarik && (
                  <div className="button-group">
                    <button
                      onClick={() => {
                        setEditingTitle(title.id)
                        setEditingTitleName(title.name)
                      }}
                      className="button-edit"
                    >
                      ترمیم
                    </button>
                    <button onClick={() => deleteTitle(title.id)} className="button-delete">
                      حذف
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Add Title */}
      <div className="section">
        <h2 className="section-title">نیا عنوان شامل کریں</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addTitle()
          }}
          className="form"
        >
          <input
            type="text"
            placeholder="عنوان"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onFocus={handleFocus}
            id="newTitle"
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* Gari Titles */}
      <div className="section">
        <h2 className="section-title">گاڑیوں کے نام</h2>
        <ul className="title-list">
          {gariTitles.map((gari) =>
            editingGariTitle === gari.id ? (
              <div key={gari.id} className="flex-container">
                <input
                  type="text"
                  value={editingGariTitleName}
                  onChange={(e) => setEditingGariTitleName(e.target.value)}
                  onFocus={handleFocus}
                  id={`editGariTitle-${gari.id}`}
                  className="input-text"
                />
                <button onClick={() => saveGariTitleEdit(gari.id)} className="button-save">
                  محفوظ کریں
                </button>
                <button onClick={() => setEditingGariTitle(null)} className="button-cancel">
                  منسوخ
                </button>
              </div>
            ) : (
              <li key={gari.id} className="title-item">
                {gari.name}
                <div className="button-group">
                  <button
                    onClick={() => {
                      setEditingGariTitle(gari.id)
                      setEditingGariTitleName(gari.name)
                    }}
                    className="button-edit"
                  >
                    ترمیم
                  </button>
                  <button
                    onClick={async () => {
                      await window.api.admin.gariTitles.delete(gari.id)
                      loadData()
                    }}
                    className="button-delete"
                  >
                    حذف
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (newGariTitle.trim()) {
              await window.api.admin.gariTitles.create(newGariTitle.trim())
              setNewGariTitle('')
              loadData()
            }
          }}
          className="form"
        >
          <input
            type="text"
            placeholder="گاڑی کا نام"
            value={newGariTitle}
            onChange={(e) => setNewGariTitle(e.target.value)}
            onFocus={handleFocus}
            id="newGariTitle"
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* Gari Expense Types */}
      <div className="section">
        <h2 className="section-title">گاڑی اخراجات کی اقسام</h2>
        <ul className="title-list">
          {gariExpenseTypes.map((et) =>
            editingExpenseType === et.id ? (
              <div key={et.id} className="flex-container">
                <input
                  type="text"
                  value={editingExpenseTypeName}
                  onChange={(e) => setEditingExpenseTypeName(e.target.value)}
                  onFocus={handleFocus}
                  id={`editExpenseType-${et.id}`}
                  className="input-text"
                />
                <button onClick={() => saveExpenseTypeEdit(et.id)} className="button-save">
                  محفوظ کریں
                </button>
                <button onClick={() => setEditingExpenseType(null)} className="button-cancel">
                  منسوخ
                </button>
              </div>
            ) : (
              <li key={et.id} className="title-item">
                {et.name}
                <div className="button-group">
                  <button
                    onClick={() => {
                      setEditingExpenseType(et.id)
                      setEditingExpenseTypeName(et.name)
                    }}
                    className="button-edit"
                  >
                    ترمیم
                  </button>
                  <button
                    onClick={async () => {
                      await window.api.admin.gariExpenseTypes.delete(et.id)
                      loadData()
                    }}
                    className="button-delete"
                  >
                    حذف
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (newExpenseType.trim()) {
              await window.api.admin.gariExpenseTypes.create(newExpenseType.trim())
              setNewExpenseType('')
              loadData()
            }
          }}
          className="form"
        >
          <input
            type="text"
            placeholder="اخراجات کی قسم"
            value={newExpenseType}
            onChange={(e) => setNewExpenseType(e.target.value)}
            onFocus={handleFocus}
            id="newExpenseType"
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* Gari Parts */}
      <div className="section">
        <h2 className="section-title">گاڑی کے پرزے</h2>
        <ul className="title-list">
          {gariParts.map((part) =>
            editingGariPart === part.id ? (
              <div key={part.id} className="flex-container">
                <input
                  type="text"
                  value={editingGariPartName}
                  onChange={(e) => setEditingGariPartName(e.target.value)}
                  onFocus={handleFocus}
                  id={`editGariPart-${part.id}`}
                  className="input-text"
                />
                <button onClick={() => saveGariPartEdit(part.id)} className="button-save">
                  محفوظ کریں
                </button>
                <button onClick={() => setEditingGariPart(null)} className="button-cancel">
                  منسوخ
                </button>
              </div>
            ) : (
              <li key={part.id} className="title-item">
                {part.name}
                <div className="button-group">
                  <button
                    onClick={() => {
                      setEditingGariPart(part.id)
                      setEditingGariPartName(part.name)
                    }}
                    className="button-edit"
                  >
                    ترمیم
                  </button>
                  <button
                    onClick={async () => {
                      await window.api.admin.gariParts.delete(part.id)
                      loadData()
                    }}
                    className="button-delete"
                  >
                    حذف
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (newGariPart.trim()) {
              await window.api.admin.gariParts.create(newGariPart.trim())
              setNewGariPart('')
              loadData()
            }
          }}
          className="form"
        >
          <input
            type="text"
            placeholder="نیا پرزہ"
            value={newGariPart}
            onChange={(e) => setNewGariPart(e.target.value)}
            onFocus={handleFocus}
            id="newGariPart"
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* ================================================================
       * OthersTitles (متفرق کے ذیلی عنوانات)
       * ============================================================== */}
      <div className="section">
        <h2 className="section-title">متفرق اخراجات کے عنوانات</h2>
        <ul className="title-list">
          {othersTitles.map((ot) =>
            editingOtherTitle === ot.id ? (
              <div key={ot.id} className="flex-container">
                <input
                  type="text"
                  value={editingOtherTitleName}
                  onChange={(e) => setEditingOtherTitleName(e.target.value)}
                  onFocus={handleFocus}
                  id={`editOtherTitle-${ot.id}`}
                  className="input-text"
                />
                <button onClick={updateOtherTitle} className="button-save">
                  محفوظ کریں
                </button>
                <button onClick={() => setEditingOtherTitle(null)} className="button-cancel">
                  منسوخ
                </button>
              </div>
            ) : (
              <li key={ot.id} className="title-item">
                {ot.name}
                <div className="button-group">
                  <button
                    onClick={() => {
                      setEditingOtherTitle(ot.id)
                      setEditingOtherTitleName(ot.name)
                    }}
                    className="button-edit"
                  >
                    ترمیم
                  </button>
                  <button onClick={() => deleteOtherTitle(ot.id)} className="button-delete">
                    حذف
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            addOtherTitle()
          }}
          className="form"
        >
          <input
            type="text"
            placeholder="نیا متفرق عنوان"
            value={newOtherTitle}
            onChange={(e) => setNewOtherTitle(e.target.value)}
            onFocus={handleFocus}
            id="newOtherTitle"
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* ================================================================
       * Keyboard toggle
       * ============================================================== */}
      <button
        type="button"
        className="keyboard-button"
        onClick={() => setShowKeyboard(!showKeyboard)}
        aria-label="Toggle Urdu Keyboard"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="white"
        >
          <path d="M20,5H4C2.9,5 2,5.9 2,7V17C2,18.1 2.9,19 4,19H20C21.1,19 22,18.1 22,17V7C22,5.9 21.1,5 20,5M5,8H7V10H5V8M5,11H7V13H5V11M8,8H10V10H8V8M8,11H10V13H8V11M11,8H13V10H11V8M11,11H13V13H11V11M14,8H16V10H14V8M14,11H16V13H14V11M17,8H19V10H17V8M17,11H19V13H17V11M12,14H19V16H12V14M5,14H10V16H5V14Z" />
        </svg>
      </button>

      {/* Logout */}
      <LogoutButton />

      {/* Urdu Keyboard */}
      {showKeyboard && <UrduKeyboard onKeyPress={handleKeyPress} onClose={closeKeyboard} />}
    </div>
  )
}
