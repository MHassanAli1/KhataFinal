
import { useEffect, useState, useMemo } from 'react'
import './MutafarikAkhrajatSummary.css'
import { useNavigate } from 'react-router-dom'

/** Should match the top-level AkhrajatTitle row for "Other / Mutafarik". */
const MUTAFARIK_LABEL = 'متفرق'

/** Safe number conversion from BigInt | number | string | null. */
const toNumber = (v) => {
  if (v == null) return 0
  if (typeof v === 'number') return v
  if (typeof v === 'bigint') {
    const asNum = Number(v)
    return Number.isFinite(asNum) ? asNum : Number(v.toString())
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

/** Safe date -> yyyy-mm-dd (ISO local) */
const formatIsoDate = (d) => {
  if (!d) return 'غائب'
  try {
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return 'غائب'
    return dt.toISOString().split('T')[0]
  } catch {
    return 'غائب'
  }
}

/** Urdu friendly (uses locale) fallback to ISO */
const formatUrduDate = (d) => {
  if (!d) return 'غائب'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return 'غائب'
  try {
    return dt.toLocaleDateString('ur-PK')
  } catch {
    return formatIsoDate(d)
  }
}

export default function MutafarikAkhrajatSummary() {
  const navigate = useNavigate();
  const [akhrajat, setAkhrajat] = useState([])
  const [othersTitles, setOthersTitles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* --------------------------------------------------------------
   * Load all Akhrajat + OthersTitles
   * ------------------------------------------------------------ */
  useEffect(() => {
    let cancel = false
    setLoading(true)
    setError('')
    Promise.all([
      window.api.akhrajat.getAll(),        // full Akhrajat rows (with othersTitles include per IPC)
      window.api.admin.othersTitles.getAll() // admin lookup of sub-titles
    ])
      .then(([allAkhrajat, allOthers]) => {
        if (cancel) return
        setAkhrajat(allAkhrajat || [])
        setOthersTitles(allOthers || [])
      })
      .catch((err) => {
        if (cancel) return
        console.error('Mutafarik load error', err)
        setError(err?.message || 'ڈیٹا لوڈ کرنے میں ناکامی')
      })
      .finally(() => {
        if (!cancel) setLoading(false)
      })
    return () => {
      cancel = true
    }
  }, [])

  /* --------------------------------------------------------------
   * Quick lookup for OthersTitles by id
   * ------------------------------------------------------------ */
  const othersById = useMemo(() => {
    const m = new Map()
    othersTitles.forEach((o) => m.set(o.id, o))
    return m
  }, [othersTitles])

  /* --------------------------------------------------------------
   * Identify Mutafarik Akhrajat rows
   *  - Row qualifies if:
   *      * a. othersTitlesId is not null (preferred)
   *      * b. title === MUTAFARIK_LABEL (fallback legacy rows)
   * ------------------------------------------------------------ */
  const mutafarikRows = useMemo(() => {
    if (!akhrajat?.length) return []
    return akhrajat.filter((row) => {
      if (row?.othersTitlesId != null) return true
      return row?.title === MUTAFARIK_LABEL
    })
  }, [akhrajat])

  /* --------------------------------------------------------------
   * Normalized display label for each Mutafarik row
   *  - Use related othersTitles.name if available
   *  - else try to resolve via othersById map
   *  - else fallback to row.description OR 'غیر متعین'
   * ------------------------------------------------------------ */
  const getMutafarikSubLabel = (row) => {
    // 1. If relation included
    if (row?.othersTitles?.name) return row.othersTitles.name
    // 2. If we have id & admin list
    if (row?.othersTitlesId != null && othersById.has(row.othersTitlesId)) {
      return othersById.get(row.othersTitlesId).name
    }
    // 3. Fallback to description (if Urdu-ish) else Unknown
    return row?.description?.trim?.() || 'غیر متعین'
  }

  /* --------------------------------------------------------------
   * Group by sub-label (OthersTitles.name) & sum
   * ------------------------------------------------------------ */
  const grouped = useMemo(() => {
    const map = {}
    mutafarikRows.forEach((row) => {
      const label = getMutafarikSubLabel(row)
      const amt = toNumber(row.amount)
      map[label] = (map[label] || 0) + amt
    })
    return map
  }, [mutafarikRows])

  const totalSum = useMemo(
    () => Object.values(grouped).reduce((sum, v) => sum + v, 0),
    [grouped]
  )

  /* --------------------------------------------------------------
   * Sort summary rows:
   *  1. Known OthersTitles (admin order by name asc)
   *  2. Unknowns (by label asc)
   * ------------------------------------------------------------ */
  const summaryRows = useMemo(() => {
    // build from grouped
    const entries = Object.entries(grouped).map(([label, sum]) => ({ label, sum }))
    // split known vs unknown
    const knownLabels = new Set(othersTitles.map((o) => o.name))
    const known = entries.filter((e) => knownLabels.has(e.label))
    const unknown = entries.filter((e) => !knownLabels.has(e.label))
    known.sort((a, b) => a.label.localeCompare(b.label, 'ur'))
    unknown.sort((a, b) => a.label.localeCompare(b.label, 'ur'))
    return [...known, ...unknown]
  }, [grouped, othersTitles])

  /* --------------------------------------------------------------
   * Render
   * ------------------------------------------------------------ */
  if (loading) return <div className="loading-indicator">…لوڈ ہو رہا ہے</div>
  if (error) return <div className="error-message">{error}</div>

  return (
    <div className="mutafarik-summary">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>
      <h2 className="mutafarik-title">متفرق اخراجات کا خلاصہ</h2>

      {mutafarikRows.length === 0 ? (
        <div className="no-data-message">کوئی متفرق اخراجات نہیں ملے۔</div>
      ) : (
        <>
          {/* Summary Table -------------------------------------------------- */}
          <div className="summary-container">
            <h3 className="summary-section-title">اخراجات کا مجموعہ</h3>
            <table className="mutafarik-summary-table">
              <thead>
                <tr>
                  <th>ذیلی عنوان</th>
                  <th>کل رقم</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map(({ label, sum }) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>{sum.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>
                    <strong>مجموعی کل</strong>
                  </td>
                  <td>
                    <strong>{totalSum.toLocaleString()}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Detailed List -------------------------------------------------- */}
          <div className="details-section">
            <h3 className="details-title">تمام متفرق اخراجات کی تفصیل</h3>
            <div className="mutafarik-list">
              {mutafarikRows.map((item) => {
                const sub = getMutafarikSubLabel(item)
                const amt = toNumber(item.amount)
                // prefer Akhrajat date; fallback to related transaction date; else blank
                const useDate = item?.date ?? item?.transaction?.date ?? null
                const dt = formatUrduDate(useDate)

                return (
                  <div key={item.id} className="mutafarik-item">
                    <span className="mutafarik-date">{dt}</span>
                    <div className="mutafarik-title-container">
                      <span className="mutafarik-sub">{sub}</span>
                      <span className="mutafarik-title">({item.title})</span>
                    </div>
                    <span className="mutafarik-amount">{amt.toLocaleString()}</span>
                    {/* Optional: show Zone/Khda from relation if available */}
                    {item.transaction && (
                      <span className="mutafarik-tx-ref">
                        {item.transaction.ZoneName} / {item.transaction.KhdaName} / ٹکٹ{' '}
                        {item.transaction.ticketNumber}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
      
      <div className="developer-mark">
        <span className="developer-text">Made with ❤️ by Cache</span>
      </div>
    </div>
  )
}
