import React, { useEffect, useState } from 'react';
import { fetchTaxEstimate } from '../../services/api';

interface TaxEstimatorProps {
  refreshTrigger: number;
  showTitle?: boolean;
}

const TaxEstimator: React.FC<TaxEstimatorProps> = ({ refreshTrigger, showTitle = true }) => {
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Safe formatting tool
  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const loadEstimate = async () => {
    setLoading(true);
    try {
      const data = await fetchTaxEstimate();
      setEstimate(data);
    } catch (e) {
      console.error("Failed to load tax estimate", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEstimate();
  }, [refreshTrigger]);

  if (loading) return <div>Loading tax data...</div>;
  if (!estimate) return <div className="card">Waiting for tax profile...</div>;

  return (
    <div className={showTitle ? "card" : ""} style={showTitle ? { background: '#f0f9ff', borderColor: '#bae6fd', textAlign: 'left' } : { textAlign: 'left' }}>
      {showTitle && <h3 style={{ marginTop: 0, textAlign: 'left' }}>Tax Estimator (2025)</h3>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div style={{ textAlign: 'left' }}>
          <label>Total Taxable Income</label>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            ${safeFormat(estimate.taxable_income)}
          </div>
        </div>
        <div style={{ textAlign: 'left' }}>
          <label>Estimated Tax Due</label>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ef4444' }}>
            ${safeFormat(estimate.estimated_tax)}
          </div>
        </div>
      </div>
      
      <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#475569' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Standard Deduction ({estimate.filing_status?.replace('_', ' ')}):</span>
          <span>-${safeFormat(estimate.standard_deduction)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          <span>Effective Tax Rate:</span>
          <span>{((estimate.effective_rate || 0) * 100).toFixed(1)}%</span>
        </div>
      </div>
      
      <div style={{ marginTop: '15px', fontStyle: 'italic', fontSize: '0.75rem', color: '#64748b', textAlign: 'left' }}>
        *Based on progressive 2025 Federal Tax Brackets.
      </div>
    </div>
  );
};

export default TaxEstimator;
