import React, { useState } from 'react';
import { createTransaction } from '../../services/api';

interface CsvImportProps {
  userId: string;
  accounts: any[];
  onImportComplete: () => void;
  onCancel: () => void;
}

const CsvImport: React.FC<CsvImportProps> = ({ userId, accounts, onImportComplete, onCancel }) => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapDate, setMapDate] = useState<number>(-1);
  const [mapAmount, setMapAmount] = useState<number>(-1);
  const [mapDesc, setMapDesc] = useState<number>(-1);
  const [accountId, setAccountId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const parseCsvLine = (text: string) => {
    const chars = text.split('');
    const fields = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === '"') {
        inQuotes = !inQuotes;
      } else if (chars[i] === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += chars[i];
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      if (lines.length > 0) {
        const hs = parseCsvLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
        setHeaders(hs);
        const rs = lines.slice(1).map(l => parseCsvLine(l).map(c => c.replace(/^"|"$/g, '')));
        setRows(rs);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (mapDate < 0 || mapAmount < 0 || mapDesc < 0 || !accountId) return alert('Please map all columns and select an account');
    setLoading(true);
    let count = 0;
    for (const r of rows) {
      if (r.length < headers.length) continue;
      const dateVal = r[mapDate];
      const amtStr = r[mapAmount]?.replace(/[^0-9.-]+/g, "");
      let amt = parseFloat(amtStr);
      if (isNaN(amt)) continue;

      let isIncome = false;
      if (amt > 0) {
        isIncome = true;
      } else {
        amt = Math.abs(amt);
      }
      
      const desc = r[mapDesc];
      if (!desc || !dateVal) continue;
      
      let formattedDate;
      try {
        const d = new Date(dateVal);
        if (isNaN(d.getTime())) throw new Error();
        formattedDate = d.toISOString().split('T')[0];
      } catch (e) {
        formattedDate = new Date().toISOString().split('T')[0];
      }

      await createTransaction({
        user_id: userId,
        amount: amt,
        category: desc.substring(0, 50),
        description: 'CSV Import',
        date: formattedDate,
        type: isIncome ? 'income' : 'expense',
        account_id: accountId,
        budget_category_id: null
      });
      count++;
    }
    setLoading(false);
    onImportComplete();
  };

  return (
    <div className="card glow-saphyr" style={{ padding: '25px', position: 'relative', marginBottom: '30px' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 900 }}>BULK IMPORT (CSV)</h3>
      {headers.length === 0 ? (
        <div style={{ display: 'flex', gap: '15px' }}>
          <input type="file" accept=".csv" onChange={handleFile} style={{ padding: '15px', background: 'var(--subtle-overlay)', border: '2px dashed var(--border)', borderRadius: '12px', width: '100%', cursor: 'pointer' }} />
          <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', flex: '0 0 100px', fontWeight: 900 }}>CANCEL</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
             <div className="form-group" style={{ marginBottom: 0 }}><label>Date Column</label><select value={mapDate} onChange={e => setMapDate(parseInt(e.target.value))}><option value={-1}>-- Select --</option>{headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></div>
             <div className="form-group" style={{ marginBottom: 0 }}><label>Amount Column</label><select value={mapAmount} onChange={e => setMapAmount(parseInt(e.target.value))}><option value={-1}>-- Select --</option>{headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></div>
             <div className="form-group" style={{ marginBottom: 0 }}><label>Description Column</label><select value={mapDesc} onChange={e => setMapDesc(parseInt(e.target.value))}><option value={-1}>-- Select --</option>{headers.map((h, i) => <option key={i} value={i}>{h}</option>)}</select></div>
             <div className="form-group" style={{ marginBottom: 0 }}><label>Target Account</label><select value={accountId} onChange={e => setAccountId(e.target.value)}><option value="">-- Select --</option>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
          </div>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
             <button onClick={handleImport} disabled={loading} style={{ background: 'var(--primary-gradient)', flex: 2, fontWeight: 900 }}>{loading ? 'IMPORTING...' : `IMPORT ${rows.length} LOGS`}</button>
             <button onClick={onCancel} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text)', flex: 1, fontWeight: 900 }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CsvImport;