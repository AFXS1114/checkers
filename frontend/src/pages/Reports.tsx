import { useState } from 'react';
import { Download, FileSpreadsheet, Database as DatabaseIcon } from 'lucide-react';

const API_BASE = 'https://checkers-uis5.onrender.com/api';

export default function Reports() {
  const [status, setStatus] = useState('ALL');
  const [format, setFormat] = useState('xlsx');

  const handleExport = () => {
    window.open(`${API_BASE}/reports/export?status=${status}&format=${format}`, '_blank');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Export Reports</h1>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 max-w-md">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Export Transaction Records</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Transaction Status</label>
          <div className="flex gap-2">
            {['ALL', 'UNPAID', 'PAID'].map(st => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={`px-4 py-2 rounded-md text-sm font-bold border transition-colors flex-1 ${
                  status === st 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Export Format</label>
          <div className="flex gap-2">
            <button
              onClick={() => setFormat('xlsx')}
              className={`px-4 py-3 rounded-md text-sm font-bold border transition-colors flex-1 flex flex-col items-center gap-2 ${
                format === 'xlsx' 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-500' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FileSpreadsheet className="w-6 h-6" />
              Excel (.xlsx)
            </button>
            <button
              onClick={() => setFormat('db')}
              className={`px-4 py-3 rounded-md text-sm font-bold border transition-colors flex-1 flex flex-col items-center gap-2 ${
                format === 'db' 
                  ? 'bg-violet-50 text-violet-700 border-violet-500' 
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <DatabaseIcon className="w-6 h-6" />
              SQLite (.db)
            </button>
          </div>
        </div>

        <button
          onClick={handleExport}
          className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Export
        </button>
      </div>
    </div>
  );
}
