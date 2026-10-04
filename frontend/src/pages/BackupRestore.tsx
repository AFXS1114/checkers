import { Upload, Download } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api';

export default function BackupRestore() {
  const handleBackup = () => {
    window.open(`${API_BASE}/db/backup`, '_blank');
  };

  const handleRestore = () => {
    alert('Database restore requires manual file replacement in the /data folder for safety reasons in this offline version.');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Database Backup & Restore</h1>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Backup Card */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <Download className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Backup Database</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Download a copy of your database to an external drive or USB for safekeeping. 
            This ensures your historical transaction data is safe from hardware failure.
          </p>
          <button 
            onClick={handleBackup}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-md transition-colors"
          >
            Download Backup
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Restore Database</h2>
          <p className="text-gray-500 mb-6 text-sm">
            Restore the system from a previous backup. This will replace all current data. 
            For safety, this is handled manually by replacing the `.db` file.
          </p>
          <button 
            onClick={handleRestore}
            className="w-full bg-orange-100 text-orange-700 hover:bg-orange-200 font-medium py-3 rounded-md transition-colors"
          >
            Restore Instructions
          </button>
        </div>
      </div>
    </div>
  );
}
