import { useState, useEffect } from 'react'
import Head from 'next/head'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { TrendingUp, DollarSign, Activity, Zap, Target, Shield, Coins, RefreshCw } from 'lucide-react'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export default function Dashboard() {
  const [data, setData] = useState({
    profitSummary: [],
    stakingPerformance: [],
    recentSweeps: [],
    allocations: [],
    mutations: [],
    totalProfit: 0,
    activeMutations: 0,
    stakingPositions: 0
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    fetchDashboardData()
    const interval = setInterval(fetchDashboardData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch data from multiple endpoints
      const [profitResponse, stakingResponse, sweepsResponse, allocationsResponse, mutationsResponse] = await Promise.all([
        fetch('/api/analytics/profit-summary').then(r => r.json()),
        fetch('/api/analytics/staking-performance').then(r => r.json()),
        fetch('/api/sweep/recent').then(r => r.json()).catch(() => []),
        fetch('/api/allocations?limit=10').then(r => r.json()),
        fetch('/api/mutations/active').then(r => r.json())
      ])

      // Calculate totals
      const totalProfit = profitResponse.reduce((sum, day) => sum + parseFloat(day.total_swept_usd || 0), 0)
      const activeMutations = mutationsResponse.length
      const stakingPositions = stakingResponse.reduce((sum, pos) => sum + parseInt(pos.position_count || 0), 0)

      setData({
        profitSummary: profitResponse.slice(0, 30), // Last 30 days
        stakingPerformance: stakingResponse,
        recentSweeps: sweepsResponse,
        allocations: allocationsResponse,
        mutations: mutationsResponse,
        totalProfit,
        activeMutations,
        stakingPositions
      })
      
      setLastUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value)
  }

  const formatPercentage = (value) => {
    return `${parseFloat(value || 0).toFixed(2)}%`
  }

  const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <Icon className="h-12 w-12" style={{ color }} />
      </div>
    </div>
  )

  const AllocationPieData = data.profitSummary.length > 0 ? [
    { name: 'Vault', value: data.profitSummary.reduce((sum, day) => sum + parseFloat(day.vault_allocated || 0), 0) },
    { name: 'Growth', value: data.profitSummary.reduce((sum, day) => sum + parseFloat(day.growth_allocated || 0), 0) },
    { name: 'Speculative', value: data.profitSummary.reduce((sum, day) => sum + parseFloat(day.speculative_allocated || 0), 0) },
    { name: 'Treasury', value: data.profitSummary.reduce((sum, day) => sum + parseFloat(day.treasury_allocated || 0), 0) }
  ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Empire Engine - Profit Optimization Dashboard</title>
        <meta name="description" content="Multi-chain profit optimization dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Empire Engine</h1>
              <p className="text-gray-600">Multi-Chain Profit Optimization</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Profit"
            value={formatCurrency(data.totalProfit)}
            icon={DollarSign}
            color="#10B981"
            subtitle="All time"
          />
          <StatCard
            title="Active Mutations"
            value={data.activeMutations}
            icon={Zap}
            color="#F59E0B"
            subtitle="Sacred logic deployed"
          />
          <StatCard
            title="Staking Positions"
            value={data.stakingPositions}
            icon={Shield}
            color="#3B82F6"
            subtitle="Cross-chain"
          />
          <StatCard
            title="Daily Sweeps"
            value={data.profitSummary.length > 0 ? data.profitSummary[0]?.sweep_count || 0 : 0}
            icon={Activity}
            color="#8B5CF6"
            subtitle="Last 24 hours"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Profit Trend Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Profit Trend (30 Days)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.profitSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(value) => new Date(value).toLocaleDateString()} />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip labelFormatter={(value) => new Date(value).toLocaleDateString()} formatter={(value) => [`$${parseFloat(value).toFixed(2)}`, 'USD']} />
                <Line type="monotone" dataKey="total_swept_usd" stroke="#10B981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation Distribution */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Allocation Distribution</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={AllocationPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {AllocationPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCurrency(value), 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Staking Performance Chart */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Staking Performance by Protocol</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.stakingPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="protocol" />
              <YAxis />
              <Tooltip formatter={(value, name) => {
                if (name === 'avg_apy') return [formatPercentage(value), 'APY']
                if (name === 'total_rewards') return [formatCurrency(value), 'Rewards']
                return [value, name]
              }} />
              <Bar dataKey="total_rewards" fill="#10B981" name="total_rewards" />
              <Bar dataKey="avg_apy" fill="#3B82F6" name="avg_apy" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Mutations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Sacred Logic</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chains</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.mutations.slice(0, 5).map((mutation) => (
                    <tr key={mutation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {mutation.mutation_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatPercentage(mutation.performance_score * 100)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mutation.deployment_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mutation.generated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Allocations */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Allocations</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.allocations.slice(0, 5).map((allocation) => (
                    <tr key={allocation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {allocation.allocation_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(allocation.usd_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          allocation.executed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {allocation.executed ? 'Executed' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(allocation.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}