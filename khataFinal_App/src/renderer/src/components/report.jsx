import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { urduZones } from './UrduZones';
import './report.css';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

function Analytics() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFrame, setTimeFrame] = useState('all');
  const [selectedZone, setSelectedZone] = useState('');
  const [chartData, setChartData] = useState({});

  // Charts with refs to help with responsiveness
  const pieChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

  // Color palette for charts
  const chartColors = [
    '#3366CC', '#DC3912', '#FF9900', '#109618', '#990099',
    '#0099C6', '#DD4477', '#66AA00', '#B82E2E', '#316395',
    '#994499', '#22AA99', '#AAAA11', '#6633CC', '#E67300'
  ];

  // Fetch transaction data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await window.api.transactions.getAll();
        
        // Validate data integrity
        const validData = data.filter(txn => (
          txn && 
          typeof txn === 'object' && 
          (txn.KulAmdan !== undefined) && 
          (txn.KulAkhrajat !== undefined) && 
          (txn.SaafiAmdan !== undefined)
        ));
        
        if (validData.length < data.length) {
          console.warn(`Filtered out ${data.length - validData.length} invalid transaction records`);
        }
        
        setTransactions(validData);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('ڈیٹا حاصل کرنے میں خرابی ہوئی');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Process data for charts whenever filtered data changes
  useEffect(() => {
    if (transactions.length > 0 && !loading) {
      prepareChartData();
    }
  }, [transactions, timeFrame, selectedZone, loading]);

  // Filter transactions based on selected time frame and zone
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Filter by zone if selected
    if (selectedZone) {
      filtered = filtered.filter(txn => txn.ZoneName === selectedZone);
    }

    // Filter by time frame
    if (timeFrame !== 'all') {
      const now = new Date();
      let cutoffDate;

      switch (timeFrame) {
        case 'week':
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case 'month':
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case 'year':
          cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          cutoffDate = null;
      }

      if (cutoffDate) {
        filtered = filtered.filter(txn => {
          const txnDate = txn.date ? new Date(txn.date) : null;
          return txnDate && txnDate >= cutoffDate;
        });
      }
    }

    return filtered;
  };

  // Prepare data for charts
  const prepareChartData = () => {
    const filteredData = getFilteredTransactions();
    
    // Calculate zone distribution for pie chart
    const zoneData = {};
    filteredData.forEach(txn => {
      if (!zoneData[txn.ZoneName]) {
        zoneData[txn.ZoneName] = { count: 0, netIncome: 0n };
      }
      zoneData[txn.ZoneName].count += 1;
      zoneData[txn.ZoneName].netIncome += BigInt(txn.SaafiAmdan || 0);
    });

    // Prepare monthly data for trend charts
    const monthlyData = {};
    filteredData.forEach(txn => {
      if (!txn.date) return;
      
      const date = new Date(txn.date);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = {
          income: 0n,
          expenses: 0n,
          netIncome: 0n,
          label: `${getMonthName(date.getMonth())} ${date.getFullYear()}`,
          timestamp: date.getTime()
        };
      }
      
      monthlyData[monthYear].income += BigInt(txn.KulAmdan || 0);
      monthlyData[monthYear].expenses += BigInt(txn.KulAkhrajat || 0);
      monthlyData[monthYear].netIncome += BigInt(txn.SaafiAmdan || 0);
    });
    
    // Sort monthly data chronologically
    const sortedMonthlyData = Object.values(monthlyData).sort((a, b) => a.timestamp - b.timestamp);
    
    setChartData({
      zoneDistribution: {
        labels: Object.keys(zoneData),
        data: Object.values(zoneData).map(d => d.count),
        netIncome: Object.values(zoneData).map(d => Number(d.netIncome))
      },
      monthlyTrends: {
        labels: sortedMonthlyData.map(d => d.label),
        income: sortedMonthlyData.map(d => Number(d.income)),
        expenses: sortedMonthlyData.map(d => Number(d.expenses)),
        netIncome: sortedMonthlyData.map(d => Number(d.netIncome))
      }
    });
  };

  // Helper function to get month name in Urdu
  const getMonthName = (monthIndex) => {
    const monthNames = [
      'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
      'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
    ];
    return monthNames[monthIndex];
  };

  const filteredTransactions = getFilteredTransactions();

  // Calculate total metrics
  const calculateTotals = () => {
    return filteredTransactions.reduce((acc, txn) => {
      acc.totalIncome += BigInt(txn.KulAmdan || 0);
      acc.totalExpenses += BigInt(txn.KulAkhrajat || 0);
      acc.totalNetIncome += BigInt(txn.SaafiAmdan || 0);
      acc.totalExercise += BigInt(txn.Exercise || 0);
      acc.totalMaizan += BigInt(txn.KulMaizan || 0);
      acc.count += 1;
      return acc;
    }, {
      totalIncome: 0n,
      totalExpenses: 0n,
      totalNetIncome: 0n,
      totalExercise: 0n,
      totalMaizan: 0n,
      count: 0
    });
  };

  // Calculate metrics by zone
  const calculateZoneMetrics = () => {
    const zoneData = {};

    filteredTransactions.forEach(txn => {
      if (!zoneData[txn.ZoneName]) {
        zoneData[txn.ZoneName] = {
          totalIncome: 0n,
          totalExpenses: 0n,
          totalNetIncome: 0n,
          count: 0
        };
      }

      zoneData[txn.ZoneName].totalIncome += BigInt(txn.KulAmdan || 0);
      zoneData[txn.ZoneName].totalExpenses += BigInt(txn.KulAkhrajat || 0);
      zoneData[txn.ZoneName].totalNetIncome += BigInt(txn.SaafiAmdan || 0);
      zoneData[txn.ZoneName].count += 1;
    });

    return zoneData;
  };

  // Find top performing zones
  const findTopZones = () => {
    const zoneMetrics = calculateZoneMetrics();
    
    return Object.entries(zoneMetrics)
      .map(([zone, data]) => ({
        zone,
        netIncome: data.totalNetIncome,
        income: data.totalIncome,
        expenses: data.totalExpenses,
        count: data.count
      }))
      .sort((a, b) => (b.netIncome > a.netIncome) ? 1 : -1)
      .slice(0, 5); // Top 5
  };

  // Render functions
  const renderSummaryCards = () => {
    const totals = calculateTotals();
    
    return (
      <div className="summary-cards">
        <div className="summary-card">
          <h3>کل ٹرانزیکشنز</h3>
          <div className="card-value">{totals.count}</div>
        </div>
        <div className="summary-card">
          <h3>کل آمدن</h3>
          <div className="card-value">{totals.totalIncome.toString()}</div>
        </div>
        <div className="summary-card">
          <h3>کل اخراجات</h3>
          <div className="card-value">{totals.totalExpenses.toString()}</div>
        </div>
        <div className="summary-card">
          <h3>کل صافی آمدن</h3>
          <div className="card-value income">{totals.totalNetIncome.toString()}</div>
        </div>
        <div className="summary-card">
          <h3>کل ایکسایز</h3>
          <div className="card-value">{totals.totalExercise.toString()}</div>
        </div>
        <div className="summary-card">
          <h3>کل میزان</h3>
          <div className="card-value">{totals.totalMaizan.toString()}</div>
        </div>
      </div>
    );
  };

  // Render pie chart for zone distribution
  const renderZoneDistributionChart = () => {
    if (!chartData.zoneDistribution || chartData.zoneDistribution.labels.length === 0) {
      return <div className="no-data-message">اس فلٹر کے لیے کوئی ڈیٹا دستیاب نہیں ہے</div>;
    }
    
    const pieData = {
      labels: chartData.zoneDistribution.labels,
      datasets: [
        {
          data: chartData.zoneDistribution.data,
          backgroundColor: chartColors.slice(0, chartData.zoneDistribution.labels.length),
          borderColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
        },
      ],
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: {
              size: 12,
            },
            color: '#333',
          },
        },
        title: {
          display: true,
          text: 'زون ٹرانزیکشن تقسیم',
          font: {
            size: 16,
            weight: 'bold',
          },
          color: '#333',
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      },
    };
    
    return (
      <div className="chart-container pie-chart">
        <Pie ref={pieChartRef} data={pieData} options={options} />
      </div>
    );
  };

  // Render bar chart for zone performance
  const renderZonePerformanceChart = () => {
    if (!chartData.zoneDistribution || chartData.zoneDistribution.labels.length === 0) {
      return <div className="no-data-message">اس فلٹر کے لیے کوئی ڈیٹا دستیاب نہیں ہے</div>;
    }
    
    const barData = {
      labels: chartData.zoneDistribution.labels,
      datasets: [
        {
          label: 'صافی آمدن',
          data: chartData.zoneDistribution.netIncome,
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1,
        },
      ],
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#333',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
        x: {
          ticks: {
            color: '#333',
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            font: {
              size: 12,
            },
            color: '#333',
          },
        },
        title: {
          display: true,
          text: 'زون کے مطابق صافی آمدن',
          font: {
            size: 16,
            weight: 'bold',
          },
          color: '#333',
        },
      },
    };
    
    return (
      <div className="chart-container bar-chart">
        <Bar ref={barChartRef} data={barData} options={options} />
      </div>
    );
  };

  // Render line chart for monthly trends
  const renderMonthlyTrendsChart = () => {
    if (!chartData.monthlyTrends || chartData.monthlyTrends.labels.length === 0) {
      return <div className="no-data-message">ماہانہ ڈیٹا دستیاب نہیں ہے</div>;
    }
    
    const lineData = {
      labels: chartData.monthlyTrends.labels,
      datasets: [
        {
          label: 'آمدن',
          data: chartData.monthlyTrends.income,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
          fill: false,
          borderWidth: 2,
        },
        {
          label: 'اخراجات',
          data: chartData.monthlyTrends.expenses,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.3,
          fill: false,
          borderWidth: 2,
        },
        {
          label: 'صافی آمدن',
          data: chartData.monthlyTrends.netIncome,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.3,
          fill: false,
          borderWidth: 3,
          borderDash: [5, 5],
        },
      ],
    };
    
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: '#333',
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
        x: {
          ticks: {
            color: '#333',
          },
          grid: {
            display: false,
          },
        },
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: {
              size: 12,
            },
            color: '#333',
          },
        },
        title: {
          display: true,
          text: 'ماہانہ مالی رجحانات',
          font: {
            size: 16,
            weight: 'bold',
          },
          color: '#333',
        },
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
    };
    
    return (
      <div className="chart-container line-chart">
        <Line ref={lineChartRef} data={lineData} options={options} />
      </div>
    );
  };

  const renderTopZones = () => {
    const topZones = findTopZones();
    
    if (topZones.length === 0) {
      return <div className="no-data-message">کوئی ڈیٹا دستیاب نہیں ہے</div>;
    }
    
    return (
      <div className="top-zones">
        <h3>بہترین کارکردگی والے زونز</h3>
        <div className="top-zones-list">
          {topZones.map((zone, index) => (
            <div key={zone.zone} className="top-zone-item">
              <div className="top-zone-rank">{index + 1}</div>
              <div className="top-zone-name">{zone.zone}</div>
              <div className="top-zone-metrics">
                <div>صافی آمدن: <span className="income">{zone.netIncome.toString()}</span></div>
                <div>ٹرانزیکشنز: {zone.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <button 
          type="button" 
          className="return-btn"
          onClick={() => navigate('/')}
        >
          ⬅️ واپس جائیں
        </button>
        <h2>اعداد و شمار کا تجزیہ</h2>
      </div>

      <div className="analytics-filters">
        <div className="filter-group">
          <label htmlFor="timeFrame">دورانیہ:</label>
          <select 
            id="timeFrame" 
            value={timeFrame} 
            onChange={(e) => setTimeFrame(e.target.value)}
          >
            <option value="all">تمام وقت</option>
            <option value="year">آخری سال</option>
            <option value="month">آخرے 30 دن</option>
            <option value="week">آخرے 7 دن</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="selectedZone">زون:</label>
          <select 
            id="selectedZone" 
            value={selectedZone} 
            onChange={(e) => setSelectedZone(e.target.value)}
          >
            <option value="">تمام زونز</option>
            {urduZones.map((zone) => (
              <option key={zone} value={zone}>{zone}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>ڈیٹا لوڈ ہو رہا ہے...</span>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="analytics-content">
          {renderSummaryCards()}
          
          <div className="analytics-row charts-row">
            <div className="analytics-col">
              {renderZoneDistributionChart()}
            </div>
            <div className="analytics-col">
              {renderZonePerformanceChart()}
            </div>
          </div>
          
          <div className="analytics-row">
            <div className="analytics-col">
              {renderTopZones()}
            </div>
            <div className="analytics-col">
              {/* Additional metric cards or charts could go here */}
              <div className="metrics-spotlight">
                <h3>مالی اشارے</h3>
                <div className="metrics-grid">
                  {filteredTransactions.length > 0 && (
                    <>
                      <div className="metric-card">
                        <div className="metric-title">اوسط آمدن فی ٹرانزیکشن</div>
                        <div className="metric-value">
                          {(Number(calculateTotals().totalIncome) / calculateTotals().count || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-title">اوسط اخراجات فی ٹرانزیکشن</div>
                        <div className="metric-value">
                          {(Number(calculateTotals().totalExpenses) / calculateTotals().count || 0).toFixed(2)}
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-title">آمدن سے اخراجات کی شرح</div>
                        <div className="metric-value">
                          {(Number(calculateTotals().totalExpenses) / (Number(calculateTotals().totalIncome) || 1) * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-title">منافع مارجن</div>
                        <div className="metric-value profit">
                          {(Number(calculateTotals().totalNetIncome) / (Number(calculateTotals().totalIncome) || 1) * 100).toFixed(2)}%
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="analytics-row full-width">
            <div className="analytics-col">
              {renderMonthlyTrendsChart()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;