import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import AddTransaction from './pages/AddTransaction.tsx';
import Settings from './pages/Settings.tsx';
import Transactions from './pages/Transactions.tsx';
import BackupRestore from './pages/BackupRestore.tsx';
import Reports from './pages/Reports.tsx';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/add-transaction" replace />} />
          <Route path="/add-transaction" element={<AddTransaction />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/backup" element={<BackupRestore />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
