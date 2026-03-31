import React, { useEffect, useState } from 'react';
import { fetchTaxEstimate } from '../../services/api';

interface TaxEstimatorProps {
  data?: any; 
  refreshTrigger?: number;
  showTitle?: boolean;
}

const TaxEstimator: React.FC<TaxEstimatorProps> = ({ data, refreshTrigger, showTitle = true }) => {
  const [internalEstimate, setInternalEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(!data);

  const estimate = data || internalEstimate;

  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const loadEstimate = async () => {
    if (data) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const fetched = await fetchTaxEstimate();
      setInternalEstimate(fetched);
    } catch (e) {
      console.error("Failed to load tax estimate", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstimate();
  }, [refreshTrigger, data]);

  if (loading && !estimate) return <div>Loading tax data...</div>;
  if (!estimate) return <div className="card">Waiting for tax profile...</div>;

  return (
    <div className={showTitle ? "card" : ""} style={showTitle ? { background: 'var(--card)', borderColor: 'var(--border)', textAlign: 'left' } : { textAlign: 'left' }}>
      {showTitle && <h3 style={{ marginTop: 0, textAlign: 'left', color: 'var(--primary)' }}>Tax Assessment (2025)</h3>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.65rem' }}>Total Taxable Income</label>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)' }} className="currency">
            ${safeFormat(estimate.taxable_income)}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <label style={{ fontSize: '0.65rem' }}>Estimated Tax Due</label>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--danger)' }} className="currency">
            ${safeFormat(estimate.estimated_tax)}
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <span>Standard Deduction ({estimate.filing_status?.replace('_', ' ')}):</span>
          <span className="currency">-${safeFormat(estimate.standard_deduction)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
          <span>Effective Tax Rate:</span>
          <span style={{ fontWeight: 800, color: 'var(--text)' }}>{((estimate.effective_rate || 0) * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* VERIFICATION SUMMARY */}
      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '10px', border: '1px solid var(--border)' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Calculator Inputs Used:</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
          <span>Gross Salary:</span>
          <strong style={{ color: 'var(--text)' }}>${safeFormat(estimate.input_salary)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '4px' }}>
          <span>401k Contribution:</span>
          <strong style={{ color: 'var(--text)' }}>{(estimate.input_401k_percent * 100).toFixed(2)}%</strong>
        </div>
      </div>
      
      <div style={{ marginTop: '15px', fontStyle: 'italic', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'left', opacity: 0.6 }}>
        *Based on progressive 2025 Federal Tax Brackets. Updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default TaxEstimator;
