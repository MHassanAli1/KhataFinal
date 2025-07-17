import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function GariSummary() {
  const navigate = useNavigate()

  /* ---------------- Lookup State ---------------- */
  const [gariTitles, setGariTitles] = useState([]) // [{id,name}]
  const [gariExpenseTypes, setGariExpenseTypes] = useState([]) // [{id,name}]
  const [zonesList, setZonesList] = useState([]) // [{id,name}]
  const [khdaList, setKhdaList] = useState([]) // [{name}]
  /* user-entered book filter (text input) */
  const [bookFilter, setBookFilter] = useState('')

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
      bookNumber: bookFilter || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined
    }

    try {
      const result = await window.api.akhrajat.gariSummary(payload) // ✅ fixed
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
    <div className="p-6 space-y-6">
      <button type="button" className="return-btn mb-2" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>

      <h1 className="text-2xl font-bold text-gray-800">گاڑی اخراجات کا خلاصہ</h1>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-gray-100 p-4 rounded-lg">
        {/* Gari */}
        <select
          className="p-2 border rounded"
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

        {/* Zone */}
        <select
          className="p-2 border rounded"
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

        {/* Khda */}
        <select
          className="p-2 border rounded"
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

        {/* Book number (text) */}
        <input
          type="text"
          placeholder="کتاب نمبر"
          className="p-2 border rounded"
          value={bookFilter}
          onChange={(e) => setBookFilter(e.target.value)}
        />

        {/* Date From */}
        <input
          type="date"
          className="p-2 border rounded"
          value={filters.dateFrom}
          onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
        />

        {/* Date To */}
        <input
          type="date"
          className="p-2 border rounded"
          value={filters.dateTo}
          onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
        />

        {/* Search */}
        <button
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          onClick={fetchSummary}
        >
          تلاش کریں
        </button>
      </div>

      {loading && <p>لوڈ ہو رہا ہے...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {/* Results */}
      {data && !loading && (
        <>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{data.gariTitle}</h2>
            <p className="text-gray-600">
              کل اخراجات: <strong>{fmt(data.totals.amount)}</strong> | اندراجات:{' '}
              <strong>{fmt(data.totals.count)}</strong>
            </p>

            {/* Expense Type Cards */}
            {Object.keys(data.byType).map((type) => {
              const info = data.byType[type]
              const open = !!typeOpen[type]
              return (
                <div key={type} className="bg-white border rounded p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">{type}</h3>
                    <button
                      className="text-sm text-blue-600 underline"
                      onClick={() => toggleType(type)}
                    >
                      {open ? 'تفصیل بند کریں' : 'تفصیل دکھائیں'}
                    </button>
                  </div>
                  <p>
                    کل رقم: <strong>{fmt(info.amount)}</strong>{' '}
                    {info.totalQuantity > 0 && (
                      <>
                        | کل مقدار: <strong>{fmt(info.totalQuantity)}</strong>
                      </>
                    )}
                  </p>

                  {/* Parts breakdown (مرمت) */}
                  {type === 'مرمت' && data.repairParts && (
                    <div className="mt-3">
                      <h4 className="font-semibold text-sm mb-2">پرزہ وار خرچ</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700">
                        {Object.keys(data.repairParts).map((part) => {
                          const rp = data.repairParts[part]
                          return (
                            <li key={part}>
                              {part}: {fmt(rp.amount)} (اندراجات: {fmt(rp.count)})
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Detailed entries per type (toggle) */}
                  {open && info.entries?.length > 0 && (
                    <div className="mt-4 overflow-auto">
                      <table className="min-w-full text-sm border">
                        <thead className="bg-gray-200">
                          <tr>
                            <th className="border px-2 py-1">تاریخ</th>
                            <th className="border px-2 py-1">زون</th>
                            <th className="border px-2 py-1">کھدہ</th>
                            <th className="border px-2 py-1">کتاب</th>
                            <th className="border px-2 py-1">ٹکٹ</th>
                            {info.totalQuantity > 0 && <th className="border px-2 py-1">مقدار</th>}
                            {type === 'مرمت' && <th className="border px-2 py-1">پرزہ</th>}
                            <th className="border px-2 py-1">رقم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {info.entries.map((e, i) => (
                            <tr key={i}>
                              <td className="border px-2 py-1">
                                {e.date ? e.date.slice(0, 10) : ''}
                              </td>
                              <td className="border px-2 py-1">{e.zone || ''}</td>
                              <td className="border px-2 py-1">{e.khda || ''}</td>
                              <td className="border px-2 py-1">{e.bookNumber || ''}</td>
                              <td className="border px-2 py-1">{e.ticketNumber ?? ''}</td>
                              {info.totalQuantity > 0 && (
                                <td className="border px-2 py-1">{e.quantity ?? ''}</td>
                              )}
                              {type === 'مرمت' && (
                                <td className="border px-2 py-1">{e.part ?? ''}</td>
                              )}
                              <td className="border px-2 py-1 text-right">{fmt(e.amount)}</td>
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
          <div className="mt-10">
            <h3 className="font-bold text-lg mb-2">خلاصہ جدول</h3>
            {summaryRows.length === 0 ? (
              <p>کوئی ریکارڈ نہیں ملا۔</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm border">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="border px-2 py-1">اخراجات کی قسم</th>
                      <th className="border px-2 py-1">کل مقدار</th>
                      <th className="border px-2 py-1">کل رقم</th>
                      <th className="border px-2 py-1">اندراجات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryRows.map((r) => (
                      <tr key={r.type}>
                        <td className="border px-2 py-1">{r.type}</td>
                        <td className="border px-2 py-1 text-right">
                          {r.totalQuantity ? fmt(r.totalQuantity) : '-'}
                        </td>
                        <td className="border px-2 py-1 text-right">{fmt(r.amount)}</td>
                        <td className="border px-2 py-1 text-right">{fmt(r.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-100">
                      <td className="border px-2 py-1 text-right">کل:</td>
                      <td className="border px-2 py-1 text-right">—</td>
                      <td className="border px-2 py-1 text-right">{fmt(data.totals.amount)}</td>
                      <td className="border px-2 py-1 text-right">{fmt(data.totals.count)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* No data message (after search) */}
      {!loading && data && data.rawCount === 0 && <p>کوئی ریکارڈ نہیں ملا۔</p>}
    </div>
  )
}
