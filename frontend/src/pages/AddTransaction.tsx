import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, Trash2, Printer } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = 'https://checkers-uis5.onrender.com/api';

export default function AddTransaction() {
  const [clientName, setClientName] = useState('');
  const [clientSuggestions, setClientSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const clientInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  

  const [arrivalDate, setArrivalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vesselName, setVesselName] = useState('');
  const [species, setSpecies] = useState('TAMBAN');
  const [grt, setGrt] = useState('3');
  const [tubs, setTubs] = useState('');


  const [entryMode, setEntryMode] = useState<'vessel' | 'overland'>('vessel');
  const [truckType, setTruckType] = useState('TRUCK-ELF');


  const [vesselHistory, setVesselHistory] = useState<any[]>([]);


  const [settings, setSettings] = useState<any>({ price_per_tub: '0', vat_enabled: '0', vat_rate: '0', berthing_fee: '0' });


  const [vessels, setVessels] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };


  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) { setClientSuggestions([]); setShowSuggestions(false); return; }
    try {
      const res = await axios.get(`${API_BASE}/clients`, { params: { q: query } });
      setClientSuggestions(res.data);
      setShowSuggestions(res.data.length > 0);
      setSuggestionIndex(-1);
    } catch { /* silently fail */ }
  };

  const handleClientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setClientName(val);
    fetchSuggestions(val);
  };

  const handleClientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex(i => Math.min(i + 1, clientSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && suggestionIndex >= 0) {
      e.preventDefault();
      selectClient(clientSuggestions[suggestionIndex].name);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const fetchVesselHistory = async (name: string) => {
    if (!name.trim()) {
      setVesselHistory([]);
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/vessels/history`, { params: { client: name.trim() } });
      setVesselHistory(res.data);
    } catch {
      setVesselHistory([]);
    }
  };

  const selectClient = (name: string) => {
    setClientName(name);
    setClientSuggestions([]);
    setShowSuggestions(false);
    setSuggestionIndex(-1);
    fetchVesselHistory(name);
  };

  const handleSelectHistoricalVessel = (v: any) => {
    if (v.is_overland || v.grt === 0) {
      setEntryMode('overland');
      setVesselName(v.vessel_name);
      setGrt('0');
    } else {
      setEntryMode('vessel');
      setVesselName(v.vessel_name);
      if (v.grt !== undefined && v.grt !== null) setGrt(String(v.grt));
    }
    if (v.species) setSpecies(v.species);
  };


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        clientInputRef.current && !clientInputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddVessel = (e: React.FormEvent) => {
    e.preventDefault();
    if (entryMode === 'vessel' && !vesselName) return;
    if (!tubs) return;

    const price = parseFloat(settings.price_per_tub || '0');
    const qty = parseInt(tubs, 10);
    const amount = price * qty;
    const isOverland = entryMode === 'overland';
    const grtVal = isOverland ? 0 : parseFloat(grt || '3');
    const nameToSave = isOverland ? truckType : vesselName.toUpperCase();

    setVessels([...vessels, {
      id: Date.now().toString(),
      arrival_date: arrivalDate,
      vessel_name: nameToSave,
      species,
      grt: grtVal,
      tubs: qty,
      amount,
      is_overland: isOverland
    }]);


    setVesselName('');
    setSpecies('TAMBAN');
    setGrt('3');
    setTubs('');
    document.getElementById('vesselNameInput')?.focus();
  };

  const handleDeleteVessel = (id: string) => {
    setVessels(vessels.filter(v => v.id !== id));
  };


  const totalTubs = vessels.reduce((sum, v) => sum + v.tubs, 0);
  const totalUnloadingAmount = vessels.reduce((sum, v) => sum + v.amount, 0);
  
  const vatEnabled = settings.vat_enabled === '1';
  const vatRate = parseFloat(settings.vat_rate || '0');
  
  const unloadingVat = vatEnabled ? totalUnloadingAmount * vatRate : 0;
  const unloadingTotalDue = totalUnloadingAmount + unloadingVat;

  const handleSaveAndPrint = async () => {
    if (!clientName.trim()) {
      alert('Please enter a client name.');
      return;
    }
    if (!transactionDate) {
      alert('Please select a transaction date.');
      return;
    }
    if (vessels.length === 0) {
      alert('Please add at least one vessel.');
      return;
    }

    try {

      const res = await axios.post(`${API_BASE}/transactions`, {
        client_name: clientName,
        transaction_date: transactionDate,
        vessels
      });

      const txId = res.data.transaction_id;


      openBrowserPrint(txId);


      setClientName('');
      setVessels([]);

    } catch (err) {
      console.error('Transaction failed', err);
      alert('Failed to save transaction.');
    }
  };

  const openBrowserPrint = async (txId: number) => {
    try {
      const [txRes, settingsRes] = await Promise.all([
        axios.get(`${API_BASE}/transactions/${txId}`),
        axios.get(`${API_BASE}/settings`)
      ]);
      const tx = txRes.data;
      const s = settingsRes.data;

      const vatEnabled = tx.vat_enabled === 1 || tx.vat_enabled === '1';
      const vatRate = parseFloat(tx.vat_rate || '0');
      const unloadingVatAmt = vatEnabled ? tx.unloading_amount * vatRate : 0;
      const berthingVatAmt = vatEnabled ? tx.berthing_amount * vatRate : 0;

      const formatDate = (d: string) => {
        const dt = new Date(d);
        return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}`;
      };
      const formatShort = (d: string) => {
        const dt = new Date(d);
        return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`;
      };
      const currency = (n: number) => `₱${n.toFixed(2)}`;

      const showDate = s.print_col_date !== '0';
      const showVessel = s.print_col_vessel !== '0';
      const showSpecie = s.print_col_specie !== '0';
      const showTubs = s.print_col_tubs !== '0';
      const showAmount = s.print_col_amount !== '0';

      const headersHtml = [
        showDate && '<th>Date</th>',
        showVessel && '<th>Vessel</th>',
        showSpecie && '<th>Species</th>',
        showTubs && '<th style="text-align:center">Tubs</th>',
        showAmount && '<th style="text-align:right">Amount</th>'
      ].filter(Boolean).join('');

      const unloadingRows = tx.records.map((r: any) => {
        const cells = [
          showDate && `<td>${formatShort(r.arrival_date)}</td>`,
          showVessel && `<td>${r.vessel_name}</td>`,
          showSpecie && `<td>${r.species || '-'}</td>`,
          showTubs && `<td style="text-align:center">${r.tubs}</td>`,
          showAmount && `<td style="text-align:right">${currency(r.line_unloading_amount)}</td>`
        ].filter(Boolean).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      const berthingRecords = tx.records.filter((r: any) => (r.line_berthing_fee && r.line_berthing_fee > 0) || (r.grt && r.grt > 0));

      const berthingRows = berthingRecords.map((r: any) => `
        <tr>
          <td>${formatShort(r.arrival_date)}</td>
          <td colspan="3">${r.vessel_name}</td>
          <td style="text-align:right">${currency(r.line_berthing_fee)}</td>
        </tr>`).join('');

      const berthingHtmlSection = berthingRecords.length === 0 ? '' : `
  <div class="page-break"></div>

  <!-- BERTHING RECEIPT -->
  <h1>${s.company_name || 'COMPANY NAME'}</h1>
  <p class="center">${s.company_address || ''}</p>
  <p class="center">${s.contact_number || ''}</p>
  <hr>
  <p class="section-title">BERTHING FEE</p>
  <hr>
  <p>Date: ${formatDate(tx.transaction_date)}</p>
  <p>Client: ${tx.client_name}</p>
  <p>TXN #: ${tx.transaction_number}</p>
  <hr>
  <table>
    <thead><tr><th>Date</th><th colspan="3">Vessel</th><th>Fee</th></tr></thead>
    <tbody>${berthingRows}</tbody>
  </table>
  <hr>
  <table class="totals-row">
    <tr><td>Vessel Count</td><td style="text-align:right">${berthingRecords.length}</td></tr>
    <tr><td>Sub-Total</td><td style="text-align:right">${currency(tx.berthing_amount)}</td></tr>
    ${vatEnabled ? `<tr><td>VAT (${(vatRate*100).toFixed(0)}%)</td><td style="text-align:right">${currency(berthingVatAmt)}</td></tr>` : ''}
    <tr class="grand"><td>TOTAL DUE</td><td style="text-align:right">${currency(tx.berthing_amount + berthingVatAmt)}</td></tr>
  </table>
  <hr>
  <p class="center" style="font-size:9px">Printed: ${new Date().toLocaleString()}</p>`;

      const html = `<!DOCTYPE html>
<html>
<head>
  <title>Receipt – ${tx.transaction_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: normal; width: 80mm; margin: 0 auto; padding: 4px; color: #000; }
    h1 { font-size: 19px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    .center { text-align: center; }
    .section-title { font-size: 17px; font-weight: bold; text-align: center; margin: 6px 0 4px; }
    hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    th { font-size: 14px; font-family: Arial, Helvetica, sans-serif; font-weight: bold; border-bottom: 1px solid #000; padding: 4px 2px; text-align: left; }
    td { font-size: 14px; font-family: Arial, Helvetica, sans-serif; font-weight: normal; padding: 4px 2px; vertical-align: top; }
    .totals-row td { padding-top: 6px; font-size: 15px; font-weight: normal; }
    .grand { font-weight: bold; font-size: 16px; }
    .page-break { page-break-after: always; }
    @media print { body { width: 80mm; } }
  </style>
</head>
<body>
  <!-- UNLOADING RECEIPT -->
  <h1>${s.company_name || 'COMPANY NAME'}</h1>
  <p class="center">${s.company_address || ''}</p>
  <p class="center">${s.contact_number || ''}</p>
  <hr>
  <p class="section-title">UNLOADING FEE</p>
  <hr>
  <p>Date: ${formatDate(tx.transaction_date)}</p>
  <p>Client: ${tx.client_name}</p>
  <p>TXN #: ${tx.transaction_number}</p>
  <hr>
  <table>
    <thead><tr>${headersHtml || '<th>No columns selected</th>'}</tr></thead>
    <tbody>${unloadingRows}</tbody>
  </table>
  <hr>
  <table class="totals-row">
    <tr><td>Total Tubs</td><td style="text-align:right">${tx.total_tubs}</td></tr>
    <tr><td>Sub-Total</td><td style="text-align:right">${currency(tx.unloading_amount)}</td></tr>
    ${vatEnabled ? `<tr><td>VAT (${(vatRate*100).toFixed(0)}%)</td><td style="text-align:right">${currency(unloadingVatAmt)}</td></tr>` : ''}
    <tr class="grand"><td>TOTAL DUE</td><td style="text-align:right">${currency(tx.unloading_amount + unloadingVatAmt)}</td></tr>
  </table>
  <hr>
  <p class="center" style="font-size:9px">Printed: ${new Date().toLocaleString()}</p>

  ${berthingHtmlSection}
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;

      const printWin = window.open('', '_blank', 'width=400,height=700');
      if (printWin) {
        printWin.document.write(html);
        printWin.document.close();
      }
    } catch (err) {
      console.error('Browser print failed', err);
      alert('Failed to generate print preview.');
    }
  };


  return (
    <div className="p-8 max-w-5xl mx-auto h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Transaction</h1>

      {/* Header Info */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-6">
        <div className="flex-1 relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Client Name <span className="text-red-500">*</span></label>
          <input
            ref={clientInputRef}
            type="text"
            value={clientName}
            onChange={handleClientChange}
            onKeyDown={handleClientKeyDown}
            onFocus={() => { if (clientName.trim()) fetchSuggestions(clientName); }}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg uppercase"
            placeholder="Type to search client..."
            autoFocus
            autoComplete="off"
            required
          />
          {/* Autosuggest Dropdown */}
          {showSuggestions && clientSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto"
            >
              {clientSuggestions.map((c, idx) => (
                <div
                  key={c.id}
                  onMouseDown={() => selectClient(c.name)}
                  className={`px-4 py-2.5 cursor-pointer text-sm font-medium transition-colors ${
                    idx === suggestionIndex
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-800 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  {c.name}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Date</label>
          <input
            type="date"
            value={transactionDate}
            onChange={(e) => setTransactionDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
        </div>
      </div>

      {/* Vessel / Overland Entry Form */}
      <form onSubmit={handleAddVessel} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-4">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => { setEntryMode('vessel'); setVesselName(''); }}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                entryMode === 'vessel'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ⚓ Vessel Delivery (Sea)
            </button>
            <button
              type="button"
              onClick={() => { setEntryMode('overland'); setVesselName(''); setGrt('0'); }}
              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                entryMode === 'overland'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🚚 Overland Delivery (Land)
            </button>
          </div>

          {vesselHistory.length > 0 && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
              {vesselHistory.length} Learned Record(s)
            </span>
          )}
        </div>

        {/* Quick Fill Chips from Learned History */}
        {vesselHistory.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <div className="text-xs font-medium text-gray-500 mb-2">
              ⚡ Click to auto-fill learned details for <strong>{clientName}</strong>:
            </div>
            <div className="flex flex-wrap gap-2">
              {vesselHistory.map((v, i) => {
                const isTruck = v.is_overland || v.grt === 0 || v.vessel_name?.startsWith('TRUCK');
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectHistoricalVessel(v)}
                    className={`px-3 py-1.5 bg-white border rounded-md text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 ${
                      isTruck 
                        ? 'border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-900'
                        : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-900'
                    }`}
                  >
                    <span>{isTruck ? '🚚' : '⚓'}</span>
                    <span className="font-bold">{v.vessel_name}</span>
                    <span className="text-gray-500 text-[10px]">
                      ({isTruck ? 'No Berthing' : `GRT: ${v.grt}`}, {v.species || 'TAMBAN'})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-4 items-end">
          <div className="w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Arrival Date <span className="text-red-500">*</span></label>
            <input
              type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {entryMode === 'overland' ? (
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Truck Type <span className="text-red-500">*</span></label>
              <select
                value={truckType}
                onChange={(e) => setTruckType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-semibold"
              >
                <option value="TRUCK-ELF">TRUCK-ELF</option>
                <option value="TRUCK-FORWARD">TRUCK-FORWARD</option>
                <option value="CANTER">CANTER</option>
                <option value="PICKUP">PICKUP</option>
              </select>
            </div>
          ) : (
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Vessel Name <span className="text-red-500">*</span></label>
              <input
                id="vesselNameInput"
                type="text" value={vesselName} onChange={(e) => setVesselName(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md uppercase"
                placeholder="F/V MARIA"
                required
              />
            </div>
          )}

          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Species <span className="text-red-500">*</span></label>
            <input
              type="text" value={species} onChange={(e) => setSpecies(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-md uppercase"
              placeholder="TAMBAN"
              required
            />
          </div>

          {entryMode === 'vessel' ? (
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-600 mb-1">GRT <span className="text-red-500">*</span></label>
              <input
                type="number" step="0.1" min="0" value={grt} onChange={(e) => setGrt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-center font-semibold"
                placeholder="3"
                required
              />
            </div>
          ) : (
            <div className="w-28 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md px-2 py-2 text-center text-xs font-bold">
              No Berthing Fee
            </div>
          )}

          <div className="w-24">
            <label className="block text-xs font-medium text-gray-600 mb-1">Tubs <span className="text-red-500">*</span></label>
            <input
              type="number" min="1" value={tubs} onChange={(e) => setTubs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-center"
              required
            />
          </div>
          <button type="submit" className={`text-white px-6 py-2 rounded-md font-medium flex items-center gap-2 h-[42px] transition-colors ${
            entryMode === 'overland' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-gray-900 hover:bg-gray-800'
          }`}>
            <Plus className="w-4 h-4" /> Insert
          </button>
        </div>
      </form>

      {/* Temp Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex-1 flex flex-col min-h-[300px]">
        <div className="overflow-y-auto flex-1 p-0">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Arrival Date</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Vessel Name</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase">Species</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase text-center">GRT</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase text-center">Tubs</th>
                <th className="p-4 text-xs font-semibold text-gray-600 uppercase text-right">Amount (₱)</th>
                <th className="p-4 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {vessels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 italic">No vessels added yet.</td>
                </tr>
              ) : (
                vessels.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="p-4">{format(new Date(v.arrival_date), 'MM/dd/yy')}</td>
                    <td className="p-4 font-medium text-gray-900">
                      {v.vessel_name}
                      {v.is_overland && (
                        <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          OVERLAND
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">{v.species || '-'}</td>
                    <td className="p-4 text-center text-gray-600 font-mono">
                      {v.is_overland || v.grt === 0 ? <span className="text-gray-400 italic">N/A</span> : v.grt}
                    </td>
                    <td className="p-4 text-center font-semibold">{v.tubs}</td>
                    <td className="p-4 text-right text-gray-700">{v.amount.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDeleteVessel(v.id)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Totals & Action */}
        <div className="border-t border-gray-200 bg-gray-50 p-6 flex justify-between items-center rounded-b-lg">
          <div className="flex gap-12">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Tubs</p>
              <p className="text-2xl font-bold text-gray-900">{totalTubs}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Amount Due</p>
              <p className="text-2xl font-bold text-gray-900">₱{totalUnloadingAmount.toFixed(2)}</p>
            </div>
            {vatEnabled && (
              <div>
                <p className="text-sm text-gray-500 font-medium">VAT ({settings.vat_rate * 100}%)</p>
                <p className="text-2xl font-bold text-gray-900">₱{unloadingVat.toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Amount</p>
              <p className="text-3xl font-black text-blue-600">₱{unloadingTotalDue.toFixed(2)}</p>
            </div>
          </div>
          
          <button 
            onClick={handleSaveAndPrint}
            disabled={vessels.length === 0 || !clientName}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg font-bold text-lg flex items-center gap-3 transition-colors shadow-sm"
          >
            <Printer className="w-6 h-6" /> Save & Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
