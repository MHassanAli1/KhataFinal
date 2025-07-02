'use client'

import React, { useEffect, useState } from 'react'
import './AdminPanel.css'
import { useNavigate } from 'react-router-dom'

export default function AdminPanel() {
  const [zones, setZones] = useState([])
  const [titles, setTitles] = useState([])

  const [newZone, setNewZone] = useState('')
  const [newKhda, setNewKhda] = useState('')
  const [selectedZoneForKhda, setSelectedZoneForKhda] = useState('')
  const [newTitle, setNewTitle] = useState('')

  const [editingZone, setEditingZone] = useState(null)
  const [editingZoneName, setEditingZoneName] = useState('')

  const [editingKhda, setEditingKhda] = useState(null)
  const [editingKhdaName, setEditingKhdaName] = useState('')
  const [editingKhdaZoneId, setEditingKhdaZoneId] = useState('')

  const [editingTitle, setEditingTitle] = useState(null)
  const [editingTitleName, setEditingTitleName] = useState('')

  const navigate = useNavigate()

  const loadData = async () => {
    const z = await window.api.admin.zones.getAll()
    setZones(z)
    const t = await window.api.admin.akhrajatTitles.getAll()
    setTitles(t)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Zones
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

  // Khdas
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

  // Titles
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

  return (
    <div className="container">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>

      {/* Zones with khdas */}
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
            placeholder="زون کا نام"
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            className="input-text"
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
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>

      {/* Akhrajat Titles */}
      <div className="section">
        <h2 className="section-title">اخراجات کے عنوانات</h2>
        <ul className="title-list">
          {titles.map((title) =>
            editingTitle === title.id ? (
              <div key={title.id} className="flex-container">
                <input
                  type="text"
                  value={editingTitleName}
                  onChange={(e) => setEditingTitleName(e.target.value)}
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
                {title.name}
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
              </li>
            )
          )}
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
            className="input-text"
          />
          <button className="button-submit">شامل کریں</button>
        </form>
      </div>
    </div>
  )
}
