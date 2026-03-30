import React from 'react';
import UserGuide from '../../components/UserGuide/UserGuide';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface TrendsPageProps {
  snapshots: any[];
  transactions: any[];
  budgets: any[];
}

// Vibrant neon palette for dark mode - Sapphire Focused
const COLORS = ['#3b82f6', '#06b6d4', '#8b5cf6', '#10b981', '#f43f5e', '#fbbf24', '#ec4899'];

const TrendsPage: React.FC<TrendsPageProps> = ({ snapshots, transactions, budgets }) => {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // 1. Spending Pie Data
  const spendingByBudget = (budgets || []).map(budget => {
    const total = (transactions || [])
      .filter(tx => 
        tx.budget_category_id === budget.id && 
        tx.type === 'expense' &&
        tx.date && 
        new Date(tx.date).getMonth() === currentMonth &&
        new Date(tx.date).getFullYear() === currentYear
      )
      .reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
    
    return { name: budget.name, value: total };
  }).filter(item => item.value > 0);

  // 2. Snapshot Line Data
  const chartData = (snapshots || []).map(s => ({
    date: s.date ? s.date.split('T')[0] : '',
    NetWorth: parseFloat(s.net_worth || '0'),
    Cash: parseFloat(s.total_cash || '0'),
    Debt: parseFloat(s.total_debt || '0')
  }));

  return (
    <div className="trends-page">
      <UserGuide guideKey="trends" title="Trends & Analytics">
        <p>Visualize your financial progress and habits over time.</p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li><strong>Spending Breakdown:</strong> A pie chart showing which "Budget Boxes" are using the most of your money this month.</li>
          <li><strong>Net Worth Growth:</strong> A 30-day historical chart. A snapshot is captured every time you open the app to track your wealth building progress.</li>
          <li><strong>Insights:</strong> Use these charts to identify "leaks" in your budget and see the visual momentum of your savings.</li>
        </ul>
      </UserGuide>

      <h2 style={{ marginBottom: '30px' }}>Trends & Analytics</h2>

      <div className="grid" style={{ gridTemplateColumns: '1fr', gap: '30px' }}>
        {/* Row 1: Net Worth Growth (Full Width) */}
        <div className="card">
          <h3 style={{ color: 'var(--text)', marginBottom: '25px' }}>Net Worth Growth (30 Days)</h3>
          <div style={{ width: '100%', height: 350 }}>
            {chartData.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '120px', color: 'var(--text-muted)' }}>
                Collecting snapshot data... check back tomorrow.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={11} 
                    tickMargin={15} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)' }} 
                  />
                  <YAxis 
                    fontSize={11} 
                    tickFormatter={(val) => `$${val/1000}k`} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'var(--text-muted)' }} 
                  />
                  <Tooltip 
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow)' }}
                    itemStyle={{ color: 'var(--primary)', fontWeight: 700 }}
                    labelStyle={{ color: 'var(--text-muted)', marginBottom: '5px' }}
                    formatter={(value: any) => [`$${parseFloat(value).toLocaleString()}`, 'Net Worth']} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="NetWorth" 
                    stroke="var(--primary)" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorNet)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Row 2: Spending Breakdown */}
        <div className="card">
          <h3 style={{ color: 'var(--text)', marginBottom: '25px' }}>Spending by Budget Box (This Month)</h3>
          <div style={{ width: '100%', height: 350 }}>
            {spendingByBudget.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: '120px', color: 'var(--text-muted)' }}>
                No spending data for this month.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spendingByBudget}
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {spendingByBudget.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow)' }}
                    itemStyle={{ fontWeight: 700 }}
                    formatter={(value: any) => [`$${parseFloat(value).toLocaleString()}`, 'Spent']} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    formatter={(value) => <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @media (min-width: 1024px) {
          .trends-page > .grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TrendsPage;
