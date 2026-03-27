/**
 * @license
 * SPDX-License-Identifier: MIT
 */

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';
import { 
  CheckCircle2, XCircle, AlertCircle, Clock, Search, Filter, 
  ChevronRight, ChevronDown, Play, Video, FileText, BarChart3, 
  History, Settings, LayoutDashboard, Database, ExternalLink,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils.ts';
import { TestResult, HistoricalData, TestStatus, Metrics } from './types.ts';

// Mock data for demonstration (used in dev mode)
const getInitialData = () => {
  try {
    const data = (window as any).playwrightData;
    if (data && typeof data === 'object') return data;
    if (typeof data === 'string' && data !== 'DATA_PLACEHOLDER') {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to parse playwrightData:', e);
  }
  return null;
};

const initialData = getInitialData();

const MOCK_HISTORY: HistoricalData = initialData?.history || {
  runs: [
    { id: 'run-1', startTime: '2026-03-20T10:00:00Z', duration: 120000, totalTests: 100, passed: 95, failed: 3, skipped: 2 },
    { id: 'run-2', startTime: '2026-03-21T10:00:00Z', duration: 125000, totalTests: 100, passed: 92, failed: 6, skipped: 2 },
    { id: 'run-3', startTime: '2026-03-22T10:00:00Z', duration: 118000, totalTests: 100, passed: 98, failed: 1, skipped: 1 },
    { id: 'run-4', startTime: '2026-03-23T10:00:00Z', duration: 130000, totalTests: 100, passed: 94, failed: 4, skipped: 2 },
    { id: 'run-5', startTime: '2026-03-24T10:00:00Z', duration: 122000, totalTests: 100, passed: 96, failed: 2, skipped: 2 },
    { id: 'run-6', startTime: '2026-03-25T10:00:00Z', duration: 128000, totalTests: 100, passed: 90, failed: 8, skipped: 2 },
    { id: 'run-7', startTime: '2026-03-26T10:00:00Z', duration: 121000, totalTests: 100, passed: 97, failed: 2, skipped: 1 },
  ],
  tests: {},
};

const MOCK_RESULTS: TestResult[] = initialData?.results || [
  {
    id: 'test-1',
    title: 'User can login with valid credentials',
    file: 'tests/auth.spec.ts',
    line: 10,
    column: 5,
    tags: ['auth', 'smoke'],
    browser: 'chromium',
    duration: 1500,
    status: 'passed',
    startTime: '2026-03-26T10:00:00Z',
    retry: 0,
    steps: [
      { title: 'Navigate to login page', duration: 500, status: 'passed' },
      { title: 'Enter credentials', duration: 300, status: 'passed' },
      { title: 'Click login button', duration: 200, status: 'passed' },
      { title: 'Verify dashboard visibility', duration: 500, status: 'passed' },
    ],
    artifacts: {
      video: 'artifacts/test-1.webm',
      trace: 'artifacts/test-1.zip',
    },
  },
  {
    id: 'test-2',
    title: 'User sees error with invalid credentials',
    file: 'tests/auth.spec.ts',
    line: 25,
    column: 5,
    tags: ['auth'],
    browser: 'firefox',
    duration: 2500,
    status: 'failed',
    startTime: '2026-03-26T10:01:00Z',
    retry: 1,
    error: 'Error: expect(received).toBeVisible()\n\nReceived: hidden',
    steps: [
      { title: 'Navigate to login page', duration: 600, status: 'passed' },
      { title: 'Enter invalid credentials', duration: 400, status: 'passed' },
      { title: 'Click login button', duration: 300, status: 'passed' },
      { title: 'Verify error message', duration: 1200, status: 'failed', error: 'expect(received).toBeVisible()' },
    ],
    artifacts: {
      video: 'artifacts/test-2.webm',
      trace: 'artifacts/test-2.zip',
    },
  },
  {
    id: 'test-3',
    title: 'User can reset password',
    file: 'tests/auth.spec.ts',
    line: 40,
    column: 5,
    tags: ['auth', 'slow'],
    browser: 'webkit',
    duration: 5000,
    status: 'passed',
    startTime: '2026-03-26T10:02:00Z',
    retry: 0,
    steps: [],
    artifacts: {},
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tests' | 'history' | 'settings'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TestStatus | 'all'>('all');
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const filteredResults = useMemo(() => {
    return MOCK_RESULTS.filter(result => {
      const matchesSearch = result.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           result.file.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || result.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = MOCK_RESULTS.length;
    const passed = MOCK_RESULTS.filter(r => r.status === 'passed').length;
    const failed = MOCK_RESULTS.filter(r => r.status === 'failed').length;
    const skipped = MOCK_RESULTS.filter(r => r.status === 'skipped').length;
    const passRate = (passed / total) * 100;
    return { total, passed, failed, skipped, passRate };
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] font-sans selection:bg-[#F27D26]/30 selection:text-[#F27D26]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-[#121214] border-r border-[#27272A] z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F27D26] rounded-xl flex items-center justify-center shadow-lg shadow-[#F27D26]/20">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">Phantom</h1>
            <p className="text-xs text-[#A1A1AA] font-mono">REPORT v1.0</p>
          </div>
        </div>

        <nav className="mt-6 px-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={<CheckCircle2 size={20} />} 
            label="Test Results" 
            active={activeTab === 'tests'} 
            onClick={() => setActiveTab('tests')} 
          />
          <NavItem 
            icon={<History size={20} />} 
            label="History" 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
          />
          <NavItem 
            icon={<Settings size={20} />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-[#27272A]">
          <div className="flex items-center gap-3 p-3 bg-[#18181B] rounded-xl border border-[#27272A]">
            <div className="w-8 h-8 bg-[#27272A] rounded-full flex items-center justify-center">
              <Database size={14} className="text-[#A1A1AA]" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium truncate">Local Storage</p>
              <p className="text-[10px] text-[#71717A] truncate">history.json</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              {activeTab === 'dashboard' && "Execution Overview"}
              {activeTab === 'tests' && "Test Results"}
              {activeTab === 'history' && "Historical Analytics"}
              {activeTab === 'settings' && "Configuration"}
            </h2>
            <p className="text-[#A1A1AA]">
              Run ID: <span className="font-mono text-[#F27D26]">run-1711552950</span> • 27 Mar 2026, 15:22
            </p>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-[#18181B] border border-[#27272A] rounded-lg">
              <Clock size={16} className="text-[#71717A]" />
              <span className="text-sm font-mono">02:05.42</span>
            </div>
            <button className="px-4 py-2 bg-[#F27D26] text-white rounded-lg font-medium hover:bg-[#D96D1F] transition-colors flex items-center gap-2">
              <ExternalLink size={16} />
              Open Trace
            </button>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-6">
              <StatCard label="Total Tests" value={stats.total} icon={<FileText className="text-blue-400" />} />
              <StatCard label="Passed" value={stats.passed} icon={<CheckCircle2 className="text-green-400" />} trend="+2%" />
              <StatCard label="Failed" value={stats.failed} icon={<XCircle className="text-red-400" />} trend="-5%" trendInverse />
              <StatCard label="Pass Rate" value={`${stats.passRate.toFixed(1)}%`} icon={<BarChart3 className="text-orange-400" />} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 bg-[#121214] border border-[#27272A] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg">Pass/Fail Trends</h3>
                  <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10B981]" /> Passed</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#EF4444]" /> Failed</div>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_HISTORY.runs}>
                      <defs>
                        <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                      <XAxis 
                        dataKey="startTime" 
                        stroke="#71717A" 
                        fontSize={10} 
                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#71717A" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                        itemStyle={{ fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="passed" stroke="#10B981" fillOpacity={1} fill="url(#colorPassed)" strokeWidth={2} />
                      <Area type="monotone" dataKey="failed" stroke="#EF4444" fillOpacity={0} strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-6">Browser Breakdown</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Chromium', value: 45 },
                      { name: 'Firefox', value: 30 },
                      { name: 'WebKit', value: 25 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                      <XAxis dataKey="name" stroke="#71717A" fontSize={10} />
                      <YAxis stroke="#71717A" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#18181B', border: '1px solid #27272A', borderRadius: '8px' }}
                      />
                      <Bar dataKey="value" fill="#F27D26" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Slowest Tests */}
            <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6">
              <h3 className="font-bold text-lg mb-6">Slowest Tests (Top 5)</h3>
              <div className="space-y-4">
                {[...MOCK_RESULTS].sort((a, b) => b.duration - a.duration).slice(0, 5).map((test, i) => (
                  <div key={test.id} className="flex items-center justify-between p-4 bg-[#18181B] rounded-xl border border-[#27272A] hover:border-[#F27D26]/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="text-[#71717A] font-mono text-sm w-4">0{i+1}</div>
                      <div>
                        <p className="font-medium text-sm">{test.title}</p>
                        <p className="text-xs text-[#71717A]">{test.file}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-sm font-mono text-[#F27D26]">{(test.duration / 1000).toFixed(2)}s</p>
                        <p className="text-[10px] text-[#71717A]">execution time</p>
                      </div>
                      <ChevronRight size={16} className="text-[#71717A]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717A]" size={18} />
                <input 
                  type="text" 
                  placeholder="Search tests by title or file..." 
                  className="w-full bg-[#121214] border border-[#27272A] rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-[#F27D26] transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex bg-[#121214] border border-[#27272A] rounded-xl p-1">
                <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All</FilterButton>
                <FilterButton active={statusFilter === 'passed'} onClick={() => setStatusFilter('passed')} color="text-green-400">Passed</FilterButton>
                <FilterButton active={statusFilter === 'failed'} onClick={() => setStatusFilter('failed')} color="text-red-400">Failed</FilterButton>
                <FilterButton active={statusFilter === 'skipped'} onClick={() => setStatusFilter('skipped')} color="text-[#A1A1AA]">Skipped</FilterButton>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-[#121214] border border-[#27272A] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#18181B] border-bottom border-[#27272A]">
                    <th className="px-6 py-4 text-xs font-mono text-[#71717A] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-mono text-[#71717A] uppercase tracking-wider">Test Case</th>
                    <th className="px-6 py-4 text-xs font-mono text-[#71717A] uppercase tracking-wider">Browser</th>
                    <th className="px-6 py-4 text-xs font-mono text-[#71717A] uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-4 text-xs font-mono text-[#71717A] uppercase tracking-wider">Tags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {filteredResults.map(result => (
                    <tr 
                      key={result.id} 
                      className="hover:bg-[#18181B] transition-colors cursor-pointer group"
                      onClick={() => setSelectedTest(result)}
                    >
                      <td className="px-6 py-4">
                        {result.status === 'passed' && <CheckCircle2 className="text-green-400" size={20} />}
                        {result.status === 'failed' && <XCircle className="text-red-400" size={20} />}
                        {result.status === 'skipped' && <AlertCircle className="text-[#71717A]" size={20} />}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm group-hover:text-[#F27D26] transition-colors">{result.title}</p>
                        <p className="text-xs text-[#71717A]">{result.file}:{result.line}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2 py-1 bg-[#27272A] rounded-md font-mono uppercase">{result.browser}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono">{(result.duration / 1000).toFixed(2)}s</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5">
                          {result.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 border border-[#27272A] rounded text-[#71717A]">#{tag}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Test Detail Drawer */}
      <AnimatePresence>
        {selectedTest && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTest(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-[600px] bg-[#121214] border-l border-[#27272A] z-[70] shadow-2xl overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-3">
                    {selectedTest.status === 'passed' && <CheckCircle2 className="text-green-400" size={28} />}
                    {selectedTest.status === 'failed' && <XCircle className="text-red-400" size={28} />}
                    <h3 className="text-xl font-bold">{selectedTest.title}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedTest(null)}
                    className="p-2 hover:bg-[#27272A] rounded-lg transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
                    <p className="text-xs text-[#71717A] mb-1">Duration</p>
                    <p className="font-mono text-lg">{(selectedTest.duration / 1000).toFixed(2)}s</p>
                  </div>
                  <div className="p-4 bg-[#18181B] border border-[#27272A] rounded-xl">
                    <p className="text-xs text-[#71717A] mb-1">Retries</p>
                    <p className="font-mono text-lg">{selectedTest.retry}</p>
                  </div>
                </div>

                {selectedTest.error && (
                  <div className="mb-8">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#EF4444] mb-3">Error Message</h4>
                    <pre className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-xs font-mono text-red-400 overflow-x-auto whitespace-pre-wrap">
                      {selectedTest.error}
                    </pre>
                  </div>
                )}

                <div className="mb-8">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA] mb-3">Execution Steps</h4>
                  <div className="space-y-2">
                    {selectedTest.steps.map((step, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[#18181B] border border-[#27272A] rounded-lg">
                        <div className="flex items-center gap-3">
                          {step.status === 'passed' ? <CheckCircle2 size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />}
                          <span className="text-sm">{step.title}</span>
                        </div>
                        <span className="text-xs font-mono text-[#71717A]">{step.duration}ms</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA] mb-3">Artifacts</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedTest.artifacts.video && (
                      <button className="flex items-center gap-3 p-3 bg-[#18181B] border border-[#27272A] rounded-lg hover:border-[#F27D26]/50 transition-colors">
                        <Video size={18} className="text-[#F27D26]" />
                        <span className="text-sm">Video Recording</span>
                      </button>
                    )}
                    {selectedTest.artifacts.trace && (
                      <button className="flex items-center gap-3 p-3 bg-[#18181B] border border-[#27272A] rounded-lg hover:border-[#F27D26]/50 transition-colors">
                        <Play size={18} className="text-[#F27D26]" />
                        <span className="text-sm">Play Trace</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
        active ? "bg-[#F27D26] text-white shadow-lg shadow-[#F27D26]/20" : "text-[#A1A1AA] hover:bg-[#18181B] hover:text-[#E4E4E7]"
      )}
    >
      <span className={cn("transition-transform duration-200", active ? "scale-110" : "group-hover:scale-110")}>
        {icon}
      </span>
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon, trend, trendInverse }: { label: string, value: string | number, icon: React.ReactNode, trend?: string, trendInverse?: boolean }) {
  const isPositive = trend?.startsWith('+');
  const isGood = trendInverse ? !isPositive : isPositive;

  return (
    <div className="bg-[#121214] border border-[#27272A] rounded-2xl p-6 hover:border-[#F27D26]/30 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-[#18181B] border border-[#27272A] rounded-xl group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
            isGood ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          )}>
            {isPositive ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight mb-1">{value}</p>
      <p className="text-xs text-[#71717A] uppercase tracking-wider font-medium">{label}</p>
    </div>
  );
}

function FilterButton({ children, active, onClick, color }: { children: React.ReactNode, active: boolean, onClick: () => void, color?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 rounded-lg text-xs font-medium transition-all",
        active ? "bg-[#27272A] text-white shadow-sm" : "text-[#71717A] hover:text-[#E4E4E7]",
        active && color
      )}
    >
      {children}
    </button>
  );
}
