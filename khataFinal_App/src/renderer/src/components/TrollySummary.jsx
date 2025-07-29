import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './TrollySummary.css'

export default function TrollySummary() {
  const navigate = useNavigate()
  const [trollies, setTrollies] = useState([])
  const [zoneList, setZoneList] = useState([])
  const [khdaList, setKhdaList] = useState([])

  // filters
  const [filterZone, setFilterZone] = useState('')
  const [filterKhda, setFilterKhda] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [filterBookNumber, setFilterBookNumber] = useState('')

  useEffect(() => {
    window.api.trollies.getAll().then(setTrollies)
    window.api.admin.zones.getAll().then((zones) => setZoneList(zones))
    window.api.admin.khdas.getAllkhdas().then((khdas) => setKhdaList(khdas.map((k) => k.name)))
  }, [])

  // Apply filters
  const filteredTrollies = trollies.filter((item) => {
    const txn = item.transaction || {}

    const matchesZone = !filterZone || txn.ZoneName === filterZone
    const matchesKhda = !filterKhda || txn.KhdaName === filterKhda

    let matchesDate = true
    if (filterStartDate || filterEndDate) {
      const itemDate = txn.date ? new Date(txn.date) : null
      if (itemDate) {
        if (filterStartDate) {
          const start = new Date(filterStartDate)
          if (itemDate < start) matchesDate = false
        }
        if (filterEndDate && matchesDate) {
          const end = new Date(filterEndDate)
          if (itemDate > end) matchesDate = false
        }
      } else {
        matchesDate = false
      }
    }

    const matchesBookNumber =
      !filterBookNumber || (txn.bookNumber && txn.bookNumber.toString().includes(filterBookNumber))

    return matchesZone && matchesKhda && matchesDate && matchesBookNumber
  })

  // Group sums by zone and khda combination
  const sumsByZoneKhda = filteredTrollies.reduce((acc, item) => {
    const txn = item.transaction || {}
    const key = `${txn.ZoneName || 'نامعلوم'} - ${txn.KhdaName || 'نامعلوم'}`
    acc[key] = (acc[key] || 0) + Number(item.total || 0)
    return acc
  }, {})

  // Calculate grand total
  const grandTotal = Object.values(sumsByZoneKhda).reduce((acc, sum) => acc + sum, 0)

  return (
    <div className="trolly-summary">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>
      <h2>ٹرولیز کا خلاصہ</h2>

      <div className="filters">
        <label>
          زون منتخب کریں:
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
            <option value="">تمام</option>
            {zoneList.map((zone) => (
              <option key={zone.id} value={zone.name}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          کھدہ منتخب کریں:
          <select value={filterKhda} onChange={(e) => setFilterKhda(e.target.value)}>
            <option value="">تمام</option>
            {khdaList.map((khda) => (
              <option key={khda} value={khda}>
                {khda}
              </option>
            ))}
          </select>
        </label>
        <label>
          شروع تاریخ:
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
        </label>

        <label>
          آخری تاریخ:
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />
        </label>
      </div>

      <div className="summary-table">
        <table>
          <thead>
            <tr>
              <th>زون - کھدہ</th>
              <th>کل مجموعہ</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sumsByZoneKhda).map(([zoneKhda, sum]) => (
              <tr key={zoneKhda}>
                <td>{zoneKhda}</td>
                <td>{sum.toLocaleString()}</td>
              </tr>
            ))}
            {Object.keys(sumsByZoneKhda).length > 0 && (
              <tr className="grand-total">
                <td><strong>گرینڈ ٹوٹل</strong></td>
                <td><strong>{grandTotal.toLocaleString()}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
        {Object.keys(sumsByZoneKhda).length === 0 && <p>کوئی ڈیٹا نہیں ملا</p>}
      </div>
    </div>
  )
}
