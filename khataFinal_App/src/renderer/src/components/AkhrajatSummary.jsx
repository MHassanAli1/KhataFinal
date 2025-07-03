import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AkhrajatSummary.css';

export default function AkhrajatSummary() {
  const [akhrajat, setAkhrajat] = useState([]);
  const [zoneList, setZoneList] = useState([]);
  const [khdaList, setKhdaList] = useState([]);
  const [akhrajatTitles, setAkhrajatTitles] = useState([]);
  const [filterBookNumber, setFilterBookNumber] = useState('');

  const navigate = useNavigate();

  // Filters
  const [filterZone, setFilterZone] = useState('');
  const [filterKhda, setFilterKhda] = useState('');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    // Load static filter lists
    window.api.admin.zones.getAll().then(setZoneList);
    window.api.admin.khdas.getAllkhdas().then(setKhdaList);
    window.api.admin.akhrajatTitles.getAll().then((titles) => {
      setAkhrajatTitles(titles.map((t) => t.name));
    });
  }, []);

  useEffect(() => {
    // Load all akhrajat records
    window.api.akhrajat.getAll().then(setAkhrajat);
  }, []);

  // Apply filters
  const filteredAkhrajat = akhrajat.filter((item) => {
    const txn = item.transaction || {};

    const matchesZone = !filterZone || txn.ZoneName === filterZone;
    const matchesKhda = !filterKhda || txn.KhdaName === filterKhda;
    const matchesTitle = !filterTitle || item.title === filterTitle;

    let matchesDate = true;
    if (filterStartDate || filterEndDate) {
      const itemDate = new Date(item.date);
      if (filterStartDate) {
        const start = new Date(filterStartDate);
        if (itemDate < start) matchesDate = false;
      }
      if (filterEndDate && matchesDate) {
        const end = new Date(filterEndDate);
        if (itemDate > end) matchesDate = false;
      }
    }

    const matchesBookNumber =
      !filterBookNumber || (txn.bookNumber && txn.bookNumber.toString().includes(filterBookNumber));

    return matchesZone && matchesKhda && matchesTitle && matchesDate && matchesBookNumber;
  });

  // Group sums by title
  const sumsByTitle = filteredAkhrajat.reduce((acc, item) => {
    acc[item.title] = (acc[item.title] || 0) + Number(item.amount);
    return acc;
  }, {});

  // Calculate grand total
  const grandTotal = Object.values(sumsByTitle).reduce((acc, sum) => acc + sum, 0);

  return (
    <div className="akhrajat-summary">
      <button type="button" className="return-btn" onClick={() => navigate('/')}>
        ⬅️ واپس جائیں
      </button>
      <h2>اخراجات کا خلاصہ</h2>

      <div className="filters">
        <label>
          زون منتخب کریں:
          <select value={filterZone} onChange={(e) => setFilterZone(e.target.value)}>
            <option value="">تمام</option>
            {zoneList.map((z) => (
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
          کتاب نمبر:
          <input
            type="text"
            value={filterBookNumber}
            onChange={(e) => setFilterBookNumber(e.target.value)}
          />
        </label>
        <label>
          اخراجات عنوان:
          <select value={filterTitle} onChange={(e) => setFilterTitle(e.target.value)}>
            <option value="">تمام</option>
            {akhrajatTitles.map((t) => (
              <option key={t} value={t}>
                {t}
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
              <th>عنوان</th>
              <th>کل رقم</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(sumsByTitle).map(([title, sum]) => (
              <tr key={title}>
                <td>{title}</td>
                <td>{sum.toLocaleString()}</td>
              </tr>
            ))}
            {Object.keys(sumsByTitle).length > 0 && (
              <tr className="grand-total">
                <td><strong>گرینڈ ٹوٹل</strong></td>
                <td><strong>{grandTotal.toLocaleString()}</strong></td>
              </tr>
            )}
          </tbody>
        </table>
        {Object.keys(sumsByTitle).length === 0 && <p>کوئی ڈیٹا نہیں ملا</p>}
      </div>
    </div>
  );
}
