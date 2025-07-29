import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GariSummary.css'

export default function GariSummary() {
  const navigate = useNavigate()

  /* ---------------- Lookup State ---------------- */
  const [gariTitles, setGariTitles] = useState([]) // [{id,name}]
  const [gariExpenseTypes, setGariExpenseTypes] = useState([]) // [{id,name}]
  const [zonesList, setZonesList] = useState([]) // [{id,name}]
  const [khdaList, setKhdaList] = useState([]) // [{name}]

  /* ---------------- Filters ---------------- */
  const [filters, setFilters] = useState({
    gariTitle: '',
    zoneId: '',
    khdaName: '',
    dateFrom: '',
    dateTo: ''
  })

  /* ---------------- Report Data ---------------- */
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /* expand/collapse per-type detail */
  const [typeOpen, setTypeOpen] = useState({})
  const toggleType = (t) =>
    setTypeOpen((prev) => ({
      ...prev,
      [t]: !prev[t]
    }))

  /* ------------------------------------------------
   * Helpers
   * ---------------------------------------------- */
  const fmt = (n) => (n == null ? '0' : Number(n).toLocaleString('ur-PK'))
  const normalizeKhdas = (raw) => {
    if (!raw) return []
    // strings
    if (typeof raw[0] === 'string') {
      return raw.map((name) => ({ name, id: name }))
    }
    // objects
    return raw.map((k) => ({ id: k.id ?? k.name, name: k.name }))
  }

  /* ------------------------------------------------
   * Load lookups on mount
   * ---------------------------------------------- */
  useEffect(() => {
    ;(async () => {
      try {
        const [gt, types, zones] = await Promise.all([
          window.api.admin.gariTitles.getAll(),
          window.api.admin.gariExpenseTypes.getAll(),
          window.api.admin.zones.getAll()
        ])
        setGariTitles(gt || [])
        setGariExpenseTypes(types || [])
        setZonesList(zones || [])
      } catch (err) {
        console.error('Lookup load failed:', err)
      }
    })()
  }, [])

  /* ------------------------------------------------
   * Load khdas when zone changes
   * ---------------------------------------------- */
  useEffect(() => {
    const zid = filters.zoneId
    if (!zid) {
      setKhdaList([])
      setFilters((f) => ({ ...f, khdaName: '' }))
      return
    }
    ;(async () => {
      try {
        const khdasRaw = await window.api.admin.khdas.getAll(Number(zid))
        setKhdaList(normalizeKhdas(khdasRaw))
        setFilters((f) => ({ ...f, khdaName: '' }))
      } catch (err) {
        console.error('khdas load failed:', err)
        setKhdaList([])
      }
    })()
  }, [filters.zoneId])

  /* ------------------------------------------------
   * Fetch report
   * ---------------------------------------------- */
  const fetchSummary = async () => {
    if (!filters.gariTitle) {
      alert('گاڑی کا نام منتخب کریں')
      return
    }
    setLoading(true)
    setError(null)
    setData(null)

    const zoneName = filters.zoneId
      ? zonesList.find((z) => z.id === Number(filters.zoneId))?.name || ''
      : ''

    const payload = {
      gariTitle: filters.gariTitle,
      zoneName: zoneName || undefined,
      khdaName: filters.khdaName || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined
    }

    try {
      const result = await window.api.akhrajat.gariSummary(payload)
      setData(result)
    } catch (err) {
      console.error('gariSummary fetch failed:', err)
      setError(err.message || 'ڈیٹا لوڈ کرنے میں مسئلہ')
    } finally {
      setLoading(false)
    }
  }

  /* ------------------------------------------------
   * Build summary table rows
   * We want to show ALL expense types, even if 0 found.
   * ---------------------------------------------- */
  const makeSummaryRows = () => {
    if (!data) return []

    // Map backend byType keys to a lookup
    const backendTypes = data.byType || {}

    // The admin list gives Urdu labels for types you care about.
    // Fallback if none loaded:
    const typeNames = gariExpenseTypes.length
      ? gariExpenseTypes.map((t) => t.name)
      : Object.keys(backendTypes)

    // We also include any backend types not in admin (legacy "دیگر" etc.)
    const extra = Object.keys(backendTypes).filter((k) => !typeNames.includes(k))
    const rows = [...typeNames, ...extra].map((type) => {
      const info = backendTypes[type]
      return {
        type,
        amount: info ? info.amount : 0,
        totalQuantity: info ? info.totalQuantity : 0,
        count: info ? info.count : 0
      }
    })
    return rows
  }

  const summaryRows = makeSummaryRows()

  /* ------------------------------------------------
   * Render
   * ---------------------------------------------- */
  return (
    <div className="gari-summary-container">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>

      <h1 className="gari-summary-title">گاڑی اخراجات کا خلاصہ</h1>

      {/* Filters */}
      <div className="filters-container">
        {/* Gari */}
        <div className="filter-item">
          <label className="filter-label">گاڑی:</label>
          <select
            className="filter-input"
            value={filters.gariTitle}
            onChange={(e) => setFilters((f) => ({ ...f, gariTitle: e.target.value }))}
          >
            <option value="">-- گاڑی منتخب کریں --</option>
            {gariTitles.map((g) => (
              <option key={g.id ?? g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Zone */}
        <div className="filter-item">
          <label className="filter-label">زون:</label>
          <select
            className="filter-input"
            value={filters.zoneId}
            onChange={(e) => setFilters((f) => ({ ...f, zoneId: e.target.value }))}
          >
            <option value="">-- تمام زونز --</option>
            {zonesList.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
        </div>

        {/* Khda */}
        <div className="filter-item">
          <label className="filter-label">کھدہ:</label>
          <select
            className="filter-input"
            value={filters.khdaName}
            onChange={(e) => setFilters((f) => ({ ...f, khdaName: e.target.value }))}
            disabled={!khdaList.length}
          >
            <option value="">-- تمام کھدات --</option>
            {khdaList.map((k) => (
              <option key={k.id} value={k.name}>
                {k.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="filter-item">
          <label className="filter-label">تاریخ (سے):</label>
          <input
            type="date"
            className="filter-input"
            value={filters.dateFrom}
            onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
          />
        </div>

        {/* Date To */}
        <div className="filter-item">
          <label className="filter-label">تاریخ (تک):</label>
          <input
            type="date"
            className="filter-input"
            value={filters.dateTo}
            onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
          />
        </div>

        {/* Search */}
        <button className="search-button" onClick={fetchSummary}>
          تلاش کریں
        </button>
      </div>

      {loading && <div className="loading-indicator">لوڈ ہو رہا ہے...</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Results */}
      {data && !loading && (
        <>
          <div className="result-section">
            <div className="result-header">
              <h2 className="gari-title">{data.gariTitle}</h2>
              <p className="gari-summary">
                کل اخراجات: <strong>{fmt(data.totals.amount)}</strong> | اندراجات:{' '}
                <strong>{fmt(data.totals.count)}</strong>
              </p>
            </div>

            {/* Expense Type Cards */}
            {Object.keys(data.byType).map((type) => {
              const info = data.byType[type]
              const open = !!typeOpen[type]
              return (
                <div key={type} className="expense-type-card">
                  <div className="expense-type-header">
                    <h3 className="expense-type-title">{type}</h3>
                    <button className="toggle-details-btn" onClick={() => toggleType(type)}>
                      {open ? 'تفصیل بند کریں' : 'تفصیل دکھائیں'}
                    </button>
                  </div>
                  <p className="expense-type-info">
                    کل رقم: <strong>{fmt(info.amount)}</strong>{' '}
                    {info.totalQuantity > 0 && (
                      <>
                        | کل مقدار: <strong>{fmt(info.totalQuantity)}</strong>
                      </>
                    )}
                  </p>

                  {/* Parts breakdown (مرمت) */}
                  {type === 'مرمت' && data.repairParts && (
                    <div className="parts-breakdown">
                      <h4 className="parts-breakdown-title">پرزہ وار خرچ</h4>
                      <div className="parts-list">
                        {Object.keys(data.repairParts).map((part) => {
                          const rp = data.repairParts[part]
                          return (
                            <div key={part} className="parts-list-item">
                              <span>{part}</span>
                              <span>
                                {fmt(rp.amount)} (اندراجات: {fmt(rp.count)})
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Detailed entries per type (toggle) */}
                  {open && info.entries?.length > 0 && (
                    <div className="table-container">
                      <table className="detail-table">
                        <thead>
                          <tr>
                            <th>تاریخ</th>
                            <th>زون</th>
                            <th>کھدہ</th>
                            {info.totalQuantity > 0 && <th>مقدار</th>}
                            {type === 'مرمت' && <th>پرزہ</th>}
                            <th>رقم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {info.entries.map((e, i) => (
                            <tr key={i}>
                              <td>{e.date ? e.date.slice(0, 10) : ''}</td>
                              <td>{e.zone || ''}</td>
                              <td>{e.khda || ''}</td>
                              {info.totalQuantity > 0 && <td>{e.quantity ?? ''}</td>}
                              {type === 'مرمت' && <td>{e.part ?? ''}</td>}
                              <td>{fmt(e.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Summary Table (always shows all known types) */}
          <div className="summary-section">
            <h3 className="summary-title">خلاصہ جدول</h3>
            {summaryRows.length === 0 ? (
              <p className="no-data-message">کوئی ریکارڈ نہیں ملا۔</p>
            ) : (
              <div className="table-container">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>اخراجات کی قسم</th>
                      <th>کل مقدار</th>
                      <th>کل رقم</th>
                      <th>اندراجات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r) => (
                      <tr key={r.type}>
                        <td>{r.type}</td>
                        <td>{r.totalQuantity ? fmt(r.totalQuantity) : '-'}</td>
                        <td>{fmt(r.amount)}</td>
                        <td>{fmt(r.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>کل:</td>
                      <td>—</td>
                      <td>{fmt(data.totals.amount)}</td>
                      <td>{fmt(data.totals.count)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* No data message (after search) */}
      {!loading && data && data.rawCount === 0 && (
        <p className="no-data-message">کوئی ریکارڈ نہیں ملا۔</p>
      )}

      <div className="developer-mark">
        <span className="developer-text">Made with ❤️ by Cache</span>
      </div>
    </div>
  )
}
