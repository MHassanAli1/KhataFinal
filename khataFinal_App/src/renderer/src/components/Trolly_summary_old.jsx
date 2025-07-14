import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Trolly_Summary_old.css'

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

  const filteredTrollies = trollies.filter((t) => {
    const txn = t.transaction || {}

    const matchesZone = !filterZone || txn.ZoneName === filterZone
    const matchesKhda = !filterKhda || txn.KhdaName === filterKhda

    // new book number filter
    const matchesBookNumber =
      !filterBookNumber || (txn.bookNumber && txn.bookNumber.toString().includes(filterBookNumber))

    let matchesDate = true
    if (filterStartDate || filterEndDate) {
      const txnDate = txn.date ? new Date(txn.date) : null
      if (txnDate) {
        const txnDateOnly = new Date(txnDate.getFullYear(), txnDate.getMonth(), txnDate.getDate())
        if (filterStartDate) {
          const start = new Date(filterStartDate)
          if (txnDateOnly < start) matchesDate = false
        }
        if (filterEndDate && matchesDate) {
          const end = new Date(filterEndDate)
          if (txnDateOnly > end) matchesDate = false
        }
      } else {
        matchesDate = false
      }
    }

    return matchesZone && matchesKhda && matchesDate && matchesBookNumber
  })

  return (
    <div className="trolly-summary">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>
      <h2>ٹرولیز کا خلاصہ</h2>

      <div className="filters">
        <label>
          زون:
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
            <option value="">تمام زون</option>
            {zoneList.map((zone) => (
              <option key={zone.id} value={zone.name}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          کتاب نمبر:
          <input
            type="text"
            value={filterBookNumber}
            onChange={(e) => setFilterBookNumber(e.target.value)}
          />
        </label>
        <label>
          کھدہ:
          <select value={filterKhda} onChange={(e) => setFilterKhda(e.target.value)}>
            <option value="">تمام کھدے</option>
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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>زون</th>
              <th>کھدہ</th>
              <th>تاریخ</th>
              <th>ابتدائی نمبر</th>
              <th>اختتامی نمبر</th>
              <th>کل</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrollies.map((trolly) => (
              <tr key={trolly.id}>
                <td>{trolly.transaction?.ZoneName || '—'}</td>
                <td>{trolly.transaction?.KhdaName || '—'}</td>
                <td>
                  {trolly.transaction?.date
                    ? new Date(trolly.transaction.date).toLocaleDateString()
                    : '—'}
                </td>
                <td>{trolly.StartingNum}</td>
                <td>{trolly.EndingNum}</td>
                <td>{trolly.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}