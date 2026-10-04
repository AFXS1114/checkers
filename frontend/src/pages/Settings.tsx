import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Save, Printer, Monitor, Upload, CheckCircle, AlertCircle } from 'lucide-react';

const API_BASE = 'https://checkers-uis5.onrender.com/api';

export default function Settings() {
  const [settings, setSettings] = useState({
    price_per_tub: '',
    berthing_fee: '',
    vat_enabled: '1',
    vat_rate: '0.12',
    company_name: '',
    company_address: '',
    contact_number: '',
    printer_interface: 'usb',
    print_mode: 'browser',
    print_col_date: '1',
    print_col_vessel: '1',
    print_col_specie: '1',
    print_col_tubs: '1',
    print_col_amount: '1'
  });
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');


  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ inserted: number; skipped: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setSettings(prev => ({ ...prev, ...res.data }));
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await axios.put(`${API_BASE}/settings`, settings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Failed to save settings', err);
      setMessage('Error saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleClientFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadResult(null);
    setUploadError('');
    try {
      const text = await file.text();

      const names = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
      if (names.length === 0) {
        setUploadError('File is empty or has no valid lines.');
        return;
      }
      const res = await axios.post(`${API_BASE}/clients/bulk`, { names });
      setUploadResult(res.data);
    } catch (err: any) {
      setUploadError(err?.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);

      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({ ...prev, [name]: checked ? '1' : '0' }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        {message && (
          <span className={`text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-8 bg-white p-8 rounded-lg shadow-sm border border-gray-100">
        
        {/* Pricing Settings */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Pricing</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price Per Tub (₱)</label>
              <input
                type="number" step="0.01" name="price_per_tub"
                value={settings.price_per_tub} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Berthing Fee Per Vessel (₱)</label>
              <input
                type="number" step="0.01" name="berthing_fee"
                value={settings.berthing_fee} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>
        </section>

        {/* VAT Settings */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">VAT Configuration</h2>
          <div className="grid grid-cols-2 gap-6 items-center">
            <div className="flex items-center gap-3">
              <input
                type="checkbox" id="vat_enabled" name="vat_enabled"
                checked={settings.vat_enabled === '1'} onChange={handleChange}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="vat_enabled" className="text-sm font-medium text-gray-700">Enable VAT Calculation</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (Decimal e.g., 0.12 for 12%)</label>
              <input
                type="number" step="0.01" name="vat_rate"
                value={settings.vat_rate} onChange={handleChange}
                disabled={settings.vat_enabled !== '1'}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>
        </section>

        {/* Company Info */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Receipt Header / Company Info</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text" name="company_name"
                value={settings.company_name} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
              <input
                type="text" name="company_address"
                value={settings.company_address} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input
                type="text" name="contact_number"
                value={settings.contact_number} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Print Behavior */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Print Behavior</h2>
          <p className="text-sm text-gray-500 mb-4">Choose how receipts are printed when a transaction is saved.</p>
          <div className="grid grid-cols-2 gap-4">
            <label
              className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                settings.print_mode === 'browser'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="print_mode"
                value="browser"
                checked={settings.print_mode === 'browser'}
                onChange={handleChange}
                className="mt-1 text-blue-600"
              />
              <div>
                <div className="flex items-center gap-2 font-semibold text-gray-800">
                  <Monitor className="w-4 h-4" />
                  Browser Print Dialog
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Opens the browser's standard print modal. Works with any printer connected to the PC (inkjet, laser, PDF). Good for general use.
                </p>
              </div>
            </label>

            <label
              className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                settings.print_mode === 'escpos'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="print_mode"
                value="escpos"
                checked={settings.print_mode === 'escpos'}
                onChange={handleChange}
                className="mt-1 text-blue-600"
              />
              <div>
                <div className="flex items-center gap-2 font-semibold text-gray-800">
                  <Printer className="w-4 h-4" />
                  Direct ESC/POS Printing
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Sends raw commands directly to the Epson TM-U220 thermal/dot-matrix POS printer via USB. No dialog shown.
                </p>
              </div>
            </label>
          </div>
        </section>

        {/* Unloading Receipt Columns */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">Unloading Receipt Columns</h2>
          <p className="text-sm text-gray-500 mb-4">Select which columns to print on the unloading receipt.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="print_col_date"
                checked={settings.print_col_date === '1'}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Date</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="print_col_vessel"
                checked={settings.print_col_vessel === '1'}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Vessel</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="print_col_specie"
                checked={settings.print_col_specie === '1'}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Specie</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="print_col_tubs"
                checked={settings.print_col_tubs === '1'}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Tubs</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                name="print_col_amount"
                checked={settings.print_col_amount === '1'}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Amount</span>
            </label>
          </div>
        </section>

        {/* Client List Import */}
        <section>
          <h2 className="text-lg font-semibold text-gray-800 mb-1 border-b pb-2">Client List Import</h2>
          <p className="text-sm text-gray-500 mb-4">
            Upload a <strong>.txt</strong> file with one client name per line. Duplicates are automatically skipped.
          </p>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleClientFileUpload}
              className="hidden"
              id="clientFileInput"
            />
            <label
              htmlFor="clientFileInput"
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-medium cursor-pointer transition-colors ${
                uploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Importing...' : 'Choose TXT File & Import'}
            </label>

            {/* Result */}
            {uploadResult && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>
                  <strong>{uploadResult.inserted}</strong> added,{' '}
                  <strong>{uploadResult.skipped}</strong> already existed
                  {' '}({uploadResult.total} total in file)
                </span>
              </div>
            )}
            {uploadError && (
              <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {uploadError}
              </div>
            )}
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
