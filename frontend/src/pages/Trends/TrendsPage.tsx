import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import UserGuide from '../../components/UserGuide/UserGuide';

// Register standard elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendsPageProps {
  snapshots: any[];
  transactions: any[];
  budgets: any[];
}

const TrendsPage: React.FC<TrendsPageProps> = ({ snapshots = [], transactions = [] }) => {
  const safeFormat = (val: any) => {
    const num = parseFloat(val || '0');
    return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const chartData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return { labels: [], datasets: [] };
    
    const labels = snapshots.map(s => new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    
    return {
      labels,
      datasets: [
        {
          label: 'Total Liquidity',
          data: snapshots.map(s => parseFloat(s.total_cash || 0)),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: 'origin',
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 3,
        },
        {
          label: 'Total Debt',
          data: snapshots.map(s => parseFloat(s.total_debt || 0)),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: 'origin',
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 3,
        },
        {
          label: 'Net Worth',
          data: snapshots.map(s => parseFloat(s.net_worth || 0)),
          borderColor: '#10b981',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
          tension: 0,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
        }
      ]
    };
  }, [snapshots]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { color: '#94a3b8', font: { weight: '800', size: 10 } } },
      tooltip: {
        backgroundColor: '#000000',
        titleFont: { size: 14, weight: '900' },
        bodyFont: { size: 13, weight: '700' },
        padding: 15,
        borderColor: '#1e293b',
        borderWidth: 1,
        displayColors: true,
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748b', font: { weight: '700' } } },
      y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { weight: '700' } } }
    }
  };

  const metrics = useMemo(() => {
    if (!snapshots || snapshots.length < 2) return { delta: 0, savingRate: 0, totalSpent: 0 };
    
    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots[0];
    const delta = parseFloat(latest.net_worth || 0) - parseFloat(previous.net_worth || 0);
    
    const totalSpent = (transactions || [])
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    const totalIncome = (transactions || [])
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
    
    const savingRate = totalIncome > 0 ? ((totalIncome - totalSpent) / totalIncome) * 100 : 0;

    return { delta, savingRate, totalSpent };
  }, [snapshots, transactions]);

  return (
    <div className="trends-page">
      <UserGuide guideKey="trends_v2" title="Wealth Momentum">
        <p>Monitor your financial trajectory. The "Wealth Momentum" chart visualizes your liquid assets expanding against your debt liabilities.</p>
      </UserGuide>

      <div className="tech-specs-bar" style={{ display: 'flex', gap: '20px', marginBottom: '40px', background: 'var(--card)', border: '2px solid var(--border)', borderRadius: '16px', padding: '15px 25px', width: '100%', boxSizing: 'border-box', borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)', boxShadow: '-4px -4px 25px color-mix(in srgb, var(--primary) 25%, transparent), var(--shadow)' }}>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.5rem', opacity: 0.7 }}>Net Worth</span>
            <span>Delta</span>
          </label>
          <div className={`gauge-val ${metrics.delta >= 0 ? 'positive' : 'negative'}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>
            {metrics.delta >= 0 ? '+' : ''}${safeFormat(metrics.delta)}
          </div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--item-divider)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.5rem', opacity: 0, userSelect: 'none' }}>Empty</span>
            <span>Saving Rate</span>
          </label>
          <div className="gauge-val" style={{ color: 'var(--success)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>
            {metrics.savingRate.toFixed(1)}%
          </div>
        </div>
        <div className="spec-gauge" style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
          <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.5rem', opacity: 0.7 }}>Monthly</span>
            <span>Burn</span>
          </label>
          <div className="gauge-val" style={{ color: 'var(--danger)', fontFamily: 'JetBrains Mono, monospace', fontSize: '1.1rem', fontWeight: 900, marginTop: '4px' }}>
            -${safeFormat(metrics.totalSpent)}
          </div>
        </div>
      </div>

      <div className="accounts-grid-layout">
        <div className="workflow-column">
          <section className="card" style={{ padding: '35px', borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)', boxShadow: '-4px -4px 25px color-mix(in srgb, var(--primary) 25%, transparent), var(--shadow)', background: 'rgba(59, 130, 246, 0.01)', height: '500px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 25px 0', fontWeight: 900, fontSize: '1.1rem', textAlign: 'center', color: 'var(--text)' }}>WEALTH MOMENTUM</h3>
            <div style={{ flex: 1, width: '100%', position: 'relative' }}>
              {snapshots.length > 1 ? (
                <Line data={chartData} options={chartOptions as any} />
              ) : (
                <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Awaiting secondary snapshot for momentum analysis...
                </div>
              )}
            </div>
          </section>

          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '30px' }}>
            <div className="card" style={{ padding: '25px', textAlign: 'center', borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)', boxShadow: '-4px -4px 25px color-mix(in srgb, var(--primary) 25%, transparent), var(--shadow)' }}>
              <label style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>PROJECTED ASSETS (1YR)</label>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '10px' }} className="currency positive">
                ${safeFormat(parseFloat(snapshots[snapshots.length-1]?.total_cash || 0) + (metrics.delta * 12))}
              </div>
            </div>
            <div className="card" style={{ padding: '25px', textAlign: 'center', borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)', boxShadow: '-4px -4px 25px color-mix(in srgb, var(--primary) 25%, transparent), var(--shadow)' }}>
              <label style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}>PROJECTED DEBT (1YR)</label>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '10px' }} className="currency negative">
                ${safeFormat(Math.max(0, parseFloat(snapshots[snapshots.length-1]?.total_debt || 0) - (metrics.delta * 12)))}
              </div>
            </div>
          </div>
        </div>

        <div className="summary-column">
          <div className="sticky-ticker-column">
            <section className="card" style={{ borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)', boxShadow: '-4px -4px 25px color-mix(in srgb, var(--primary) 25%, transparent), var(--shadow)', padding: '35px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1rem', textAlign: 'center', color: 'var(--text)' }}>PREDICTIVE TRAJECTORY</h3>
              <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="ticker-item card" style={{ padding: '20px', borderTop: '4px solid var(--border)', borderLeft: '5px solid var(--border)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-muted)', marginBottom: '8px' }}>MONTHLY NET MOMENTUM</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800 }}>Wealth Growth</span>
                    <span className="currency positive" style={{ fontWeight: 900 }}>+${safeFormat(metrics.delta)}</span>
                  </div>
                </div>
                <div className="ticker-item card" style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.02)', borderTop: '4px solid var(--primary)', borderLeft: '5px solid var(--primary)', boxShadow: '-4px -4px 25px color-mix(in srgb, var(--primary) 25%, transparent), var(--shadow)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--primary)', marginBottom: '10px' }}>STRATEGY INSIGHT</div>
                  <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text)' }}>
                    At your current <strong>{metrics.savingRate.toFixed(1)}%</strong> saving rate, your net worth is projected to increase by <strong>${safeFormat(metrics.delta * 12)}</strong> over the next 12 months.
                  </p>
                </div>
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>*Predictions based on current month activity. Past performance does not guarantee future results.</div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .trends-page { max-width: 1200px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .accounts-grid-layout { display: grid; grid-template-columns: 1fr; gap: 40px; width: 100%; box-sizing: border-box; padding-bottom: 100px; }
        @media (min-width: 1024px) { .accounts-grid-layout { grid-template-columns: minmax(0, 1.8fr) minmax(380px, 1.2fr); align-items: start; } }
        .workflow-column { display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        .sticky-ticker-column { position: sticky; top: 100px; max-height: calc(100vh - 150px); overflow-y: auto; scrollbar-width: none; }
        .ticker-item { border: 2px solid var(--border) !important; background: var(--bg); transition: all 0.2s ease; }
        .ticker-item:hover { border-color: var(--primary) !important; transform: translateX(-4px); }
        .empty-state { text-align: center; color: var(--text-muted); font-size: 0.85rem; font-weight: 700; border: 2px dashed var(--border); border-radius: 16px; padding: 40px; }
      `}</style>
    </div>
  );
};

export default TrendsPage;
