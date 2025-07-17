import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import CreateTransactionForm from './components/CreateTransactionForm.jsx'
import TransactionDashboard from './components/TransactionDashboard.jsx'
import Report from './components/report.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import AkhrajatSummary from './components/AkhrajatSummary.jsx'
import TrollySummary from './components/TrollySummary.jsx'
import TransactionSummary from './components/TransactionSummary.jsx'
import Trolly_Summary_old from './components/Trolly_summary_old.jsx'
import GariSummary from './components/GariSummary.jsx'
import MutafarikAkhrajatSummary from './components/MutafarikAkhrajatSummary.jsx'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<TransactionDashboard />} />
        <Route path="/CreateTransactionForm" element={<CreateTransactionForm />} />
        <Route path="/report" element={<Report />} />
        <Route path="/AdminPanel" element={<AdminPanel />} />
        <Route path="/AkhrajatSummary" element={<AkhrajatSummary />} />
        <Route path="/TrollySummary" element={<TrollySummary />} />
        <Route path="/TransactionSummary" element={<TransactionSummary />} />
        <Route path="/TrollySummaryold" element={<Trolly_Summary_old />} />
        <Route path="/GariSummary" element={<GariSummary />} />
        <Route path="/MuktarifAkhrajatSummary" element={<MutafarikAkhrajatSummary />} />
      </Routes>
    </Router>
  )
}

export default App
