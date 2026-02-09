import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Search, Filter, RotateCw } from 'lucide-react';
import api from '@/lib/api';

const COLORS = ['#10B981', '#F59E0B', '#94A3B8', '#EF4444'];

export default function PerformanceReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusData, setStatusData] = useState([]);

  useEffect(() => {
    fetchReviews();
  }, [activeTab]);

  const fetchReviews = async () => {
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      const response = await api.get('/hr/reviews', { params });
      const data = response.data;
      setReviews(data.reviews || []);
      setStatusData((data.statusData || []).map((s, i) => ({
        ...s,
        color: COLORS[i % COLORS.length]
      })));
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
      setReviews([]);
      setStatusData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-50">Loading...</div>;

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6">Performance Management / Reviews</h1>

      {/* Summary Section */}
      <div className="grid gap-6 md:grid-cols-3 mb-6">
        {/* Chart */}
        <Card className="bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800">
          <CardContent className="p-6">
            <h3 className="text-base font-semibold mb-4 text-slate-900 dark:text-slate-50">Performance Management / Reviews</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {statusData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Metrics */}
        <Card className="md:col-span-2">
          <CardContent className="p-6 flex items-center justify-around">
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-500">28</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Reviews in View</p>
            </div>
            <div className="h-16 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-500">28</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Total Reviews</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-t-lg border-b dark:border-slate-700">
        <div className="flex gap-4 px-6">
          {['Reviews', 'Participating', 'My Team', 'All Reviews'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
              className={`py-3 px-4 border-b-2 transition-colors ${activeTab === tab.toLowerCase().replace(' ', '-')
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-4 items-center mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search Reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" /> Filter
        </Button>
        <Button variant="outline" size="sm">
          <RotateCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-100 dark:bg-slate-800">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Name & Surname</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Manager</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Company Name</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Review Name</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Due Date</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Published On</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Finalised Date</th>
                  <th className="p-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-50">Review Status</th>
                  <th className="p-3 text-center text-sm font-semibold text-slate-900 dark:text-slate-50">Resp. Status</th>
                  <th className="p-3 text-center text-sm font-semibold text-slate-900 dark:text-slate-50">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {review.employee_code}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-50">{review.employee_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{review.employee_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {review.manager_code}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-50">{review.manager_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{review.manager_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-900 dark:text-slate-50">{review.company_name}</td>
                    <td className="p-3 text-slate-900 dark:text-slate-50">{review.review_name}</td>
                    <td className="p-3 text-slate-900 dark:text-slate-50">{review.due_date}</td>
                    <td className="p-3 text-slate-900 dark:text-slate-50">{review.published_on}</td>
                    <td className="p-3 text-slate-900 dark:text-slate-50">{review.finalised_date || 'N/A'}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded text-xs font-medium ${review.review_status === 'Pending Manager'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                        {review.review_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${review.respondent_status.employee_done
                            ? 'border-green-500 bg-green-500'
                            : 'border-slate-400'
                          }`}>
                          {review.respondent_status.employee_done && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${review.respondent_status.manager_done
                            ? 'border-green-500 bg-green-500'
                            : 'border-slate-400'
                          }`}>
                          {review.respondent_status.manager_done && (
                            <span className="text-white text-xs">✓</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-800">
                          <span className="text-blue-600 dark:text-blue-400 dark:text-blue-300">👁</span>
                        </button>
                        <button className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600">
                          <span className="text-slate-600 dark:text-slate-300">📄</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
