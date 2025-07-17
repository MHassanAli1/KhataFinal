import { useEffect, useState, useMemo } from 'react';

export default function MutafarikAkhrajatSummary() {
  const [akhrajat, setAkhrajat] = useState([]);
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    Promise.all([
      window.api.akhrajat.getAll(), // All expenses
      window.api.admin.akhrajatTitles.getAll() // For flags
    ])
      .then(([allAkhrajat, allTitles]) => {
        setAkhrajat(allAkhrajat || []);
        setTitles(allTitles || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const mutafarikTitles = useMemo(() => {
    return titles.filter(t => !t.isGari); // exclude Gari titles
  }, [titles]);

  const mutafarikAkhrajat = useMemo(() => {
    return akhrajat.filter(a => {
      const t = mutafarikTitles.find(tt => tt.name === a.title);
      return t; // only include titles in mutafarikTitles
    });
  }, [akhrajat, mutafarikTitles]);

  // Group by title and sum
  const grouped = useMemo(() => {
    const map = {};
    mutafarikAkhrajat.forEach(a => {
      if (!map[a.title]) map[a.title] = 0;
      map[a.title] += Number(a.amount || 0);
    });
    return map;
  }, [mutafarikAkhrajat]);

  const totalSum = useMemo(() => {
    return Object.values(grouped).reduce((sum, v) => sum + v, 0);
  }, [grouped]);

  if (loading) return <div>...لوڈ ہو رہا ہے</div>;

  return (
    <div className="mutafarik-summary">
      <h2>متفرق اخراجات کا خلاصہ</h2>
      {mutafarikAkhrajat.length === 0 ? (
        <p>کوئی متفرق اخراجات نہیں ملے</p>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>عنوان</th>
                <th>کل رقم</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([title, sum]) => (
                <tr key={title}>
                  <td>{title}</td>
                  <td>{sum.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="total-row">
                <td><strong>مجموعی کل</strong></td>
                <td><strong>{totalSum.toLocaleString()}</strong></td>
              </tr>
            </tbody>
          </table>

          <h4>تمام اخراجات کی تفصیل</h4>
          <div className="mutafarik-list">
            {mutafarikAkhrajat.map(item => (
              <div key={item.id} className="mutafarik-item">
                <span>{item.title}</span>
                <span>{item.amount}</span>
                <span>{item.date?.split('T')[0]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
