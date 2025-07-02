import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import CreateTransactionForm from './components/CreateTransactionForm.jsx'
import TransactionDashboard from './components/TransactionDashboard.jsx'
import Report from './components/report.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import AkhrajatSummary from './components/AkhrajatSummary.jsx'
import TrollySummary from './components/TrollySummary.jsx'
import TransactionSummary from './components/TransactionSummary.jsx'
import SyncToCloudButton from './components/SyncToCloudButton.jsx'

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
        <Route path="/SyncToCloudButton" element={<SyncToCloudButton />} />
      </Routes>
    </Router>
  )
}

export default App
