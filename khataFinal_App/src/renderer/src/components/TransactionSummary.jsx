import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function TransactionSummary() {
  const [transactions, setTransactions] = useState([])
  const [zonesList, setZonesList] = useState([])
  const [khdaList, setKhdaList] = useState([])

  const [filterZone, setFilterZone] = useState('')
  const [filterKhda, setFilterKhda] = useState('')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const navigate = useNavigate()

  useEffect(() => {
    window.api.transactions.getAll().then(setTransactions)
    window.api.admin.zones.getAll().then(setZonesList)
    window.api.admin.khdas.getAllkhdas().then(setKhdaList)
  }, [])

  // filtered transactions
  const filtered = transactions.filter((txn) => {
    const matchesZone = !filterZone || txn.ZoneName === filterZone
    const matchesKhda = !filterKhda || txn.KhdaName === filterKhda

    let matchesDate = true
    if (filterStartDate || filterEndDate) {
      const txnDate = new Date(txn.date)
      if (filterStartDate) {
        const start = new Date(filterStartDate)
        if (txnDate < start) matchesDate = false
      }
      if (filterEndDate && matchesDate) {
        const end = new Date(filterEndDate)
        if (txnDate > end) matchesDate = false
      }
    }

    return matchesZone && matchesKhda && matchesDate
  })

  // calculate summed totals
  const totalKulAmdan = filtered.reduce((sum, txn) => sum + Number(txn.KulAmdan ?? 0), 0)
  const totalKulAkhrajat = filtered.reduce((sum, txn) => sum + Number(txn.KulAkhrajat ?? 0), 0)
  const totalSaafiAmdan = filtered.reduce((sum, txn) => sum + Number(txn.SaafiAmdan ?? 0), 0)
  const totalExercise = filtered.reduce((sum, txn) => sum + Number(txn.Exercise ?? 0), 0)
  const totalMaizan = filtered.reduce((sum, txn) => sum + Number(txn.KulMaizan ?? 0), 0)

  return (
    <div className="transaction-summary">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>
      <h2>ٹرانزیکشن خلاصہ</h2>

      {/* filters */}
      <div className="filters">
        <label>
          زون منتخب کریں:
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
            <option value="">تمام</option>
            {zonesList.map((z) => (
              <option key={z.id} value={z.name}>
                {z.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          کھدہ منتخب کریں:
          <select value={filterKhda} onChange={(e) => setFilterKhda(e.target.value)}>
            <option value="">تمام</option>
            {khdaList.map((k) => (
              <option key={k.id || k} value={k.name || k}>
                {k.name || k}
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

      {/* summary table */}
      <div className="summary-table">
        <table>
          <thead>
            <tr>
              <th>عنوان</th>
              <th>کل</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>کل آمدن</td>
              <td>{totalKulAmdan.toLocaleString()}</td>
            </tr>
            <tr>
              <td>کل اخراجات</td>
              <td>{totalKulAkhrajat.toLocaleString()}</td>
            </tr>
            <tr>
              <td>کل صافی آمدن</td>
              <td>{totalSaafiAmdan.toLocaleString()}</td>
            </tr>
            <tr>
              <td>کل میزان</td>
              <td>{totalMaizan.toLocaleString()}</td>
            </tr>
            <tr>
              <td>کل ایکسائز</td>
              <td>{totalExercise.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        {filtered.length === 0 && <p>کوئی ڈیٹا نہیں ملا</p>}
      </div>
    </div>
  )
}
