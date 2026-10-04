import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, X, Printer, FileText, Edit2, Save, Plus, Trash2, CheckCircle, Lock, ArrowRightLeft } from 'lucide-react';

const API_BASE = 'https://checkers-uis5.onrender.com/api';

function formatDate(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}/${dt.getFullYear()}`;
}
function formatShort(d: string) {
  if (!d) return '';
  const dt = new Date(d);
  return `${String(dt.getMonth()+1).padStart(2,'0')}/${String(dt.getDate()).padStart(2,'0')}`;
}
function currency(n: number) {
  return `₱${Number(n).toFixed(2)}`;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [settings, setSettings] = useState<any>({});


  const [isEditing, setIsEditing] = useState(false);
  const [editClientName, setEditClientName] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [editRecords, setEditRecords] = useState<any[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [confirmTx, setConfirmTx] = useState<any>(null);


  const [transferRecord, setTransferRecord] = useState<any>(null);
  const [transferSearch, setTransferSearch] = useState('');
  const [transferMode, setTransferMode] = useState<'existing' | 'new'>('existing');
  const [transferNewClient, setTransferNewClient] = useState('');
  const [transferNewDate, setTransferNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTargetTx, setSelectedTargetTx] = useState<any>(null);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchSettings();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/transactions`);
      setTransactions(res.data);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE}/settings`);
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  };

  const handleConfirmPaid = async () => {
    if (!confirmTx) return;
    const txId = confirmTx.id;
    setMarkingPaid(true);
    try {
      await axios.patch(`${API_BASE}/transactions/${txId}/status`, { status: 'PAID' });
      fetchTransactions();
      if (selectedTx && selectedTx.id === txId) {
        setSelectedTx({ ...selectedTx, status: 'PAID' });
        setIsEditing(false);
      }
      setConfirmTx(null);
    } catch (err) {
      console.error('Failed to mark transaction as paid', err);
      alert('Failed to mark transaction as paid.');
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleTransferRecord = async () => {
    if (!transferRecord) return;
    if (transferMode === 'existing' && !selectedTargetTx) {
      alert('Please select a target transaction.');
      return;
    }
    if (transferMode === 'new' && !transferNewClient.trim()) {
      alert('Please enter a client name for the new transaction.');
      return;
    }
    setTransferring(true);
    try {
      const payload: any = { record_id: transferRecord.id };
      if (transferMode === 'existing') {
        payload.target_transaction_id = selectedTargetTx.id;
      } else {
        payload.target_client_name = transferNewClient.trim().toUpperCase();
        payload.target_date = transferNewDate;
      }
      await axios.post(`${API_BASE}/transactions/transfer-record`, payload);
      fetchTransactions();
      if (selectedTx) {
        const res = await axios.get(`${API_BASE}/transactions/${selectedTx.id}`);
        setSelectedTx(res.data);
        initEditState(res.data);
      }
      setTransferRecord(null);
      setSelectedTargetTx(null);
      setTransferSearch('');
      setTransferMode('existing');
      setTransferNewClient('');
      setTransferNewDate(new Date().toISOString().split('T')[0]);
    } catch (err: any) {
      console.error('Transfer failed', err);
      alert(err?.response?.data?.error || 'Failed to transfer vessel record.');
    } finally {
      setTransferring(false);
    }
  };

  const handleView = async (txId: number) => {
    setLoadingDetail(true);
    setIsEditing(false);
    try {
      const res = await axios.get(`${API_BASE}/transactions/${txId}`);
      setSelectedTx(res.data);
      initEditState(res.data);
    } catch (err) {
      console.error('Failed to load transaction detail', err);
      alert('Failed to load transaction details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const initEditState = (tx: any) => {
    setEditClientName(tx.client_name || '');
    setEditTxDate(tx.transaction_date || '');
    setEditRecords(
      (tx.records || []).map((r: any) => ({
        id: r.id || Date.now() + Math.random(),
        arrival_date: r.arrival_date || tx.transaction_date,
        vessel_name: r.vessel_name || '',
        species: r.species || 'TAMBAN',
        grt: r.grt ?? 3,
        tubs: r.tubs || 1,
        is_overland: r.grt === 0 || r.vessel_name?.startsWith('TRUCK')
      }))
    );
  };

  const handleStartEdit = () => {
    if (selectedTx) {
      initEditState(selectedTx);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (selectedTx) {
      initEditState(selectedTx);
    }
    setIsEditing(false);
  };

  const handleEditRecordChange = (index: number, field: string, val: any) => {
    const updated = [...editRecords];
    updated[index] = { ...updated[index], [field]: val };
    
    if (field === 'is_overland' && val === true) {
      updated[index].grt = 0;
    } else if (field === 'is_overland' && val === false && updated[index].grt === 0) {
      updated[index].grt = 3;
    }
    setEditRecords(updated);
  };

  const handleAddEditRecord = () => {
    setEditRecords([
      ...editRecords,
      {
        id: Date.now() + Math.random(),
        arrival_date: editTxDate || new Date().toISOString().split('T')[0],
        vessel_name: '',
        species: 'TAMBAN',
        grt: 3,
        tubs: 1,
        is_overland: false
      }
    ]);
  };

  const handleDeleteEditRecord = (index: number) => {
    if (editRecords.length <= 1) {
      alert('A transaction must have at least one record.');
      return;
    }
    setEditRecords(editRecords.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async (andPrint = false) => {
    if (!editClientName.trim()) {
      alert('Client Name cannot be empty.');
      return;
    }
    if (editRecords.length === 0) {
      alert('Please include at least one vessel record.');
      return;
    }
    for (let i = 0; i < editRecords.length; i++) {
      if (!editRecords[i].vessel_name.trim()) {
        alert(`Please enter a Vessel/Truck Name for line ${i + 1}.`);
        return;
      }
    }

    setSavingEdit(true);
    try {
      await axios.put(`${API_BASE}/transactions/${selectedTx.id}`, {
        client_name: editClientName.trim().toUpperCase(),
        transaction_date: editTxDate,
        vessels: editRecords
      });

      const res = await axios.get(`${API_BASE}/transactions/${selectedTx.id}`);
      setSelectedTx(res.data);
      setIsEditing(false);
      fetchTransactions();

      if (andPrint) {
        openBrowserPrint(res.data);
      }
    } catch (err) {
      console.error('Failed to update transaction', err);
      alert('Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleReprint = async (tx: any) => {
    openBrowserPrint(tx);
  };

  const openBrowserPrint = (tx: any) => {
    const s = settings;
    const vatEnabled = tx.vat_enabled === 1 || tx.vat_enabled === '1';
    const vatRate = parseFloat(tx.vat_rate || '0');
    const unloadingVatAmt = vatEnabled ? tx.unloading_amount * vatRate : 0;
    const berthingVatAmt = vatEnabled ? tx.berthing_amount * vatRate : 0;

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

    const unloadingRows = (tx.records || []).map((r: any) => {
      const cells = [
        showDate && `<td>${formatShort(r.arrival_date)}</td>`,
        showVessel && `<td>${r.vessel_name}</td>`,
        showSpecie && `<td>${r.species || '-'}</td>`,
        showTubs && `<td style="text-align:center">${r.tubs}</td>`,
        showAmount && `<td style="text-align:right">${currency(r.line_unloading_amount)}</td>`
      ].filter(Boolean).join('');
      return `<tr>${cells}</tr>`;
    }).join('');

    const berthingRecords = (tx.records || []).filter((r: any) => (r.line_berthing_fee && r.line_berthing_fee > 0) || (r.grt && r.grt > 0));

    const berthingRows = berthingRecords.map((r: any) => `
      <tr>
        <td>${formatShort(r.arrival_date)}</td>
        <td colspan="3">${r.vessel_name}</td>
        <td style="text-align:right">${currency(r.line_berthing_fee)}</td>
      </tr>`).join('');

    const berthingHtmlSection = berthingRecords.length === 0 ? '' : `
  <div class="page-break"></div>

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
  <p class="center" style="font-size:9px">Reprinted: ${new Date().toLocaleString()}</p>`;

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
  <p class="center" style="font-size:9px">Reprinted: ${new Date().toLocaleString()}</p>

  ${berthingHtmlSection}
  <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; }<\/script>
</body>
</html>`;

    const printWin = window.open('', '_blank', 'width=400,height=700');
    if (printWin) {
      printWin.document.write(html);
      printWin.document.close();
    }
  };

  const filtered = transactions.filter(tx => {
    const matchesSearch = tx.client_name.toLowerCase().includes(search.toLowerCase()) ||
      tx.transaction_number.includes(search);
    const txStatus = tx.status || 'UNPAID';
    const matchesStatus = statusFilter === 'ALL' || txStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const vatEnabled = selectedTx && (selectedTx.vat_enabled === 1 || selectedTx.vat_enabled === '1');
  const vatRate = selectedTx ? parseFloat(selectedTx.vat_rate || '0') : 0;
  const isPaid = selectedTx?.status === 'PAID';

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Client Name or Transaction No."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(['ALL', 'UNPAID', 'PAID'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                  statusFilter === st
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                <th className="p-4">Tx No.</th>
                <th className="p-4">Date</th>
                <th className="p-4">Client</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Total Tubs</th>
                <th className="p-4 text-right">Grand Total</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map(tx => {
                  const txIsPaid = tx.status === 'PAID';
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono">{tx.transaction_number}</td>
                      <td className="p-4">{formatDate(tx.transaction_date)}</td>
                      <td className="p-4 font-medium text-gray-900">{tx.client_name}</td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          txIsPaid 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {txIsPaid ? <CheckCircle className="w-3 h-3" /> : null}
                          {txIsPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>
                      <td className="p-4">{tx.total_tubs}</td>
                      <td className="p-4 text-right font-semibold">
                        {currency(tx.grand_total)}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleView(tx.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            View
                          </button>
                          {!txIsPaid && (
                            <button
                              onClick={() => setConfirmTx(tx)}
                              disabled={markingPaid}
                              className="text-emerald-600 hover:text-emerald-800 font-medium text-xs px-2.5 py-1 rounded border border-emerald-200 hover:bg-emerald-50 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Edit Modal */}
      {(loadingDetail || selectedTx) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col">

            {loadingDetail ? (
              <div className="p-12 text-center text-gray-500 font-medium">Loading details...</div>
            ) : selectedTx && (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-gray-900">
                          Transaction #{selectedTx.transaction_number}
                        </h2>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {isPaid ? <CheckCircle className="w-3 h-3" /> : null}
                          {isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                        {isEditing && (
                          <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
                            Editing Mode
                          </span>
                        )}
                      </div>
                      {!isEditing ? (
                        <p className="text-sm text-gray-500">{selectedTx.client_name} · {formatDate(selectedTx.transaction_date)}</p>
                      ) : (
                        <div className="flex items-center gap-3 mt-1">
                          <input
                            type="text"
                            value={editClientName}
                            onChange={(e) => setEditClientName(e.target.value.toUpperCase())}
                            className="px-2 py-1 text-xs border border-gray-300 rounded uppercase font-bold text-gray-900"
                            placeholder="CLIENT NAME"
                          />
                          <input
                            type="date"
                            value={editTxDate}
                            onChange={(e) => setEditTxDate(e.target.value)}
                            className="px-2 py-1 text-xs border border-gray-300 rounded text-gray-700"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        {!isPaid ? (
                          <>
                            <button
                              onClick={() => setConfirmTx(selectedTx)}
                              disabled={markingPaid}
                              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {markingPaid ? 'Processing...' : 'Mark as Paid'}
                            </button>
                            <button
                              onClick={handleStartEdit}
                              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Records
                            </button>
                          </>
                        ) : (
                          <span className="flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200">
                            <Lock className="w-3.5 h-3.5" />
                            Record Locked (Paid)
                          </span>
                        )}
                        <button
                          onClick={() => handleReprint(selectedTx)}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                          Print / Reprint
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSaveEdit(false)}
                          disabled={savingEdit}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <Save className="w-4 h-4" />
                          {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={() => handleSaveEdit(true)}
                          disabled={savingEdit}
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                          Save & Print
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          disabled={savingEdit}
                          className="px-3.5 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setSelectedTx(null); setIsEditing(false); }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors ml-1"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="overflow-y-auto flex-1 p-6 space-y-6">

                  {/* Summary Cards */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Total Tubs', value: selectedTx.total_tubs },
                      { label: 'Unloading Fee', value: currency(selectedTx.unloading_amount) },
                      { label: 'Berthing Fee', value: currency(selectedTx.berthing_amount) },
                      { label: 'Grand Total', value: currency(selectedTx.grand_total), highlight: true },
                    ].map(card => (
                      <div key={card.label} className={`rounded-lg p-4 border ${card.highlight ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                        <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                        <p className={`text-xl font-bold ${card.highlight ? 'text-blue-700' : 'text-gray-900'}`}>{card.value}</p>
                      </div>
                    ))}
                  </div>

                  {vatEnabled && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
                      VAT ({(vatRate * 100).toFixed(0)}%) included · Unloading: {currency(selectedTx.unloading_amount * vatRate)} · Berthing: {currency(selectedTx.berthing_amount * vatRate)}
                    </div>
                  )}

                  {/* Vessel Records Table */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                        Vessel & Cargo Records
                      </h3>
                      {isEditing && (
                        <button
                          onClick={handleAddEditRecord}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Vessel Line
                        </button>
                      )}
                    </div>

                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                          <tr>
                            <th className="px-4 py-3">Arrival Date</th>
                            <th className="px-4 py-3">Vessel / Cargo Name</th>
                            <th className="px-4 py-3">Species</th>
                            <th className="px-4 py-3 text-center">GRT</th>
                            <th className="px-4 py-3 text-center">Tubs</th>
                            {!isEditing && <th className="px-4 py-3 text-right">Unloading</th>}
                            {!isEditing && <th className="px-4 py-3 text-right">Berthing</th>}
                            {!isEditing && <th className="px-4 py-3 text-center">Action</th>}
                            {isEditing && <th className="px-4 py-3 w-12 text-center"></th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {!isEditing ? (
                            (selectedTx.records || []).map((r: any, i: number) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-4 py-3">{formatDate(r.arrival_date)}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">
                                  {r.vessel_name}
                                  {(r.grt === 0 || r.vessel_name?.startsWith('TRUCK')) && (
                                    <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                                      OVERLAND
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-600">{r.species || '—'}</td>
                                <td className="px-4 py-3 text-center text-gray-600 font-mono">
                                  {r.grt === 0 ? <span className="text-gray-400 italic">N/A</span> : (r.grt ?? 3)}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold">{r.tubs}</td>
                                <td className="px-4 py-3 text-right">{currency(r.line_unloading_amount)}</td>
                                <td className="px-4 py-3 text-right">{currency(r.line_berthing_fee)}</td>
                                <td className="px-4 py-3 text-center">
                                  {!isPaid && (
                                    <button
                                      onClick={() => {
                                        setTransferRecord(r);
                                        setTransferSearch('');
                                        setSelectedTargetTx(null);
                                        setTransferMode('existing');
                                        setTransferNewClient('');
                                        setTransferNewDate(new Date().toISOString().split('T')[0]);
                                      }}
                                      title="Transfer to another client"
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-200 hover:bg-violet-100 rounded-md transition-colors"
                                    >
                                      <ArrowRightLeft className="w-3.5 h-3.5" />
                                      Transfer
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            editRecords.map((r: any, i: number) => (
                              <tr key={r.id || i} className="bg-amber-50/40 hover:bg-amber-50">
                                <td className="px-3 py-2">
                                  <input
                                    type="date"
                                    value={r.arrival_date}
                                    onChange={(e) => handleEditRecordChange(i, 'arrival_date', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={r.vessel_name}
                                    onChange={(e) => handleEditRecordChange(i, 'vessel_name', e.target.value.toUpperCase())}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs uppercase font-bold"
                                    placeholder="VESSEL / TRUCK NAME"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <input
                                    type="text"
                                    value={r.species}
                                    onChange={(e) => handleEditRecordChange(i, 'species', e.target.value.toUpperCase())}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs uppercase"
                                    placeholder="SPECIES"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <label className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-medium cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={r.is_overland}
                                        onChange={(e) => handleEditRecordChange(i, 'is_overland', e.target.checked)}
                                        className="rounded text-emerald-600"
                                      />
                                      Overland
                                    </label>
                                    {!r.is_overland && (
                                      <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={r.grt}
                                        onChange={(e) => handleEditRecordChange(i, 'grt', e.target.value)}
                                        className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs text-center font-semibold"
                                      />
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={r.tubs}
                                    onChange={(e) => handleEditRecordChange(i, 'tubs', e.target.value)}
                                    className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center font-bold"
                                  />
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => handleDeleteEditRecord(i)}
                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                    title="Delete line"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pricing Snapshot */}
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <span className="font-semibold">Pricing snapshot at time of transaction: </span>
                    ₱{Number(selectedTx.price_per_tub).toFixed(2)}/tub · ₱{Number(selectedTx.berthing_fee_per_vessel).toFixed(2)}/vessel berthing
                    {vatEnabled ? ` · VAT ${(vatRate * 100).toFixed(0)}%` : ' · No VAT'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Mark Paid */}
      {confirmTx && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Mark Transaction as Paid</h3>
                <p className="text-xs text-gray-500 font-mono">#{confirmTx.transaction_number}</p>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to mark transaction <span className="font-semibold text-gray-900">#{confirmTx.transaction_number}</span> for <span className="font-semibold text-gray-900">{confirmTx.client_name}</span> as <span className="font-semibold text-emerald-700">PAID</span>?
              <span className="text-xs text-amber-600 font-medium block mt-2">
                Note: Once marked as paid, this transaction will be locked from further edits.
              </span>
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmTx(null)}
                disabled={markingPaid}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPaid}
                disabled={markingPaid}
                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors flex items-center gap-2"
              >
                {markingPaid ? 'Processing...' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Vessel Record Modal */}
      {transferRecord && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <ArrowRightLeft className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Transfer Vessel / Cargo Record</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-semibold text-gray-700">{transferRecord.vessel_name}</span>
                    {' · '}{transferRecord.species || '—'}{' · '}{transferRecord.tubs} tubs
                    {' · '}from <span className="font-semibold text-gray-700">{selectedTx?.client_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTransferRecord(null)}
                disabled={transferring}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="px-6 pt-4 flex gap-2">
              <button
                onClick={() => { setTransferMode('existing'); setSelectedTargetTx(null); }}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                  transferMode === 'existing'
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Select Existing Transaction
              </button>
              <button
                onClick={() => { setTransferMode('new'); setSelectedTargetTx(null); }}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg border transition-colors ${
                  transferMode === 'new'
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Create New Transaction
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {transferMode === 'existing' ? (
                <>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by client name or transaction no…"
                      value={transferSearch}
                      onChange={(e) => setTransferSearch(e.target.value)}
                      className="pl-9 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                    {transactions
                      .filter(tx =>
                        tx.id !== selectedTx?.id &&
                        tx.status !== 'PAID' &&
                        (tx.client_name.toLowerCase().includes(transferSearch.toLowerCase()) ||
                          tx.transaction_number.includes(transferSearch))
                      )
                      .map(tx => (
                        <button
                          key={tx.id}
                          onClick={() => setSelectedTargetTx(tx)}
                          className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-colors ${
                            selectedTargetTx?.id === tx.id
                              ? 'bg-violet-50 border-l-4 border-violet-500'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-gray-900">{tx.client_name}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              #{tx.transaction_number} · {formatDate(tx.transaction_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">{tx.total_tubs} tubs</p>
                            <p className="text-xs font-semibold text-gray-700">{currency(tx.grand_total)}</p>
                          </div>
                        </button>
                      ))
                    }
                    {transactions.filter(tx =>
                      tx.id !== selectedTx?.id &&
                      tx.status !== 'PAID' &&
                      (tx.client_name.toLowerCase().includes(transferSearch.toLowerCase()) ||
                        tx.transaction_number.includes(transferSearch))
                    ).length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No eligible transactions found.
                      </div>
                    )}
                  </div>
                  {selectedTargetTx && (
                    <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-lg text-sm">
                      <span className="text-violet-700 font-semibold">Selected: </span>
                      <span className="text-gray-900 font-bold">{selectedTargetTx.client_name}</span>
                      <span className="text-gray-500 font-mono ml-2">#{selectedTargetTx.transaction_number}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">New Client Name</label>
                    <input
                      type="text"
                      value={transferNewClient}
                      onChange={(e) => setTransferNewClient(e.target.value.toUpperCase())}
                      placeholder="CLIENT NAME"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg uppercase font-bold focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Transaction Date</label>
                    <input
                      type="date"
                      value={transferNewDate}
                      onChange={(e) => setTransferNewDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-violet-500 focus:border-violet-500"
                    />
                  </div>
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    A new transaction will be created for this client using current pricing settings.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setTransferRecord(null)}
                disabled={transferring}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransferRecord}
                disabled={transferring || (transferMode === 'existing' && !selectedTargetTx) || (transferMode === 'new' && !transferNewClient.trim())}
                className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                {transferring ? 'Transferring…' : 'Transfer Vessel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
