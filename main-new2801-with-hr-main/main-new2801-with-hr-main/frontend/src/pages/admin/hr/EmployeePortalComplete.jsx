import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import api from '@/lib/api';

export default function EmployeePortalComplete() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(10); // November (0-indexed)
  const [currentYear, setCurrentYear] = useState(2024);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  useEffect(() => {
    fetchPortalData();
  }, []);

  const fetchPortalData = async () => {
    try {
      const response = await api.get('employee-portal/data');
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch portal data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-900 dark:text-slate-50">Loading...</div>;
  if (!data) return <div className="p-8 text-slate-900 dark:text-slate-50">No data available</div>;

  // Calendar helper functions
  const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const getEventForDate = (date) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return data.calendar_events?.find(e => e.date === dateStr);
  };

  const getColorClass = (eventType) => {
    const colorMap = {
      'Public Holiday': 'bg-green-200 dark:bg-green-800',
      'WORKING REMOTELY': 'bg-purple-200 dark:bg-purple-800',
      'VAC24': 'bg-blue-200 dark:bg-blue-800',
      'CURRENT': 'bg-blue-500 text-white'
    };
    return colorMap[eventType] || 'bg-slate-100 dark:bg-slate-700';
  };

  const renderCalendar = (monthOffset = 0) => {
    const month = currentMonth + monthOffset;
    const year = currentYear;
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    const cells = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="p-2" />);
    }

    for (let date = 1; date <= daysInMonth; date++) {
      const event = getEventForDate(date);
      cells.push(
        <div
          key={date}
          className={`p-2 text-center rounded cursor-pointer hover:opacity-80 transition ${event ? getColorClass(event.event_type) : 'hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          onClick={() => event && alert(`${event.event_type} on ${date}/${month + 1}/${year}`)}
        >
          <span className="text-sm font-medium">{date}</span>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{monthNames[month]} {year}</h4>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {days.map(day => (
            <div key={day} className="text-xs font-semibold text-slate-600 dark:text-slate-400 text-center p-1">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells}
        </div>
      </div>
    );
  };

  const handleLeaveBalanceClick = (balance) => {
    setSelectedLeave(balance);
    setShowLeaveDialog(true);
  };

  return (
    <div className="p-6 bg-slate-50 dark:bg-slate-900 min-h-screen">
      {/* Header - matching Shireburn */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Employee Portal</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* My Profile */}
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">My Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center">
                {/* Profile Picture */}
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-slate-200 dark:border-slate-700">
                  {data.my_profile.profile_photo ? (
                    <img src={data.my_profile.profile_photo} alt={data.my_profile.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <span className="text-3xl font-bold text-white">
                        {data.my_profile.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">{data.my_profile.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{data.my_profile.job_title}</p>

                <div className="flex gap-3 w-full">
                  <Button variant="outline" size="sm" className="flex-1">More details</Button>
                  <Button size="sm" className="flex-1 bg-blue-900 hover:bg-blue-800">My Profile</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* My Leave Year Planner */}
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">My Leave Year Planner</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="flex gap-4 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">Public Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">WORKING REMOTELY</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-400" />
                  <span className="text-xs text-slate-600 dark:text-slate-400">VAC24</span>
                </div>
              </div>

              {/* Date Range */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setCurrentMonth(m => m - 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                  <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  01/11/2024 → 31/12/2024
                </div>
                <button onClick={() => setCurrentMonth(m => m + 1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                  <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </button>
              </div>

              {/* November 2024 Calendar */}
              {renderCalendar(0)}

              {/* December 2024 Calendar */}
              {renderCalendar(1)}
            </CardContent>
          </Card>

          {/* My Payslips */}
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">My Payslips</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-500 hover:text-blue-600 text-xs font-bold uppercase tracking-wider"
                onClick={() => navigate('/hr/employee-portal/history')}
              >
                View All History
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {data.payslips?.map((payslip, idx) => (
                  <button
                    key={idx}
                    onClick={() => alert(`View payslip for ${payslip.month}`)}
                    className="flex-shrink-0 w-20 h-28 bg-slate-100 dark:bg-slate-700 rounded border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 transition flex flex-col items-center justify-center p-2"
                  >
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 text-center break-words">
                      {payslip.month.split(' ')[0].substring(0, 3)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {payslip.month.split(' ')[1]}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Staff reporting to me leave balances */}
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">Staff reporting to me leave balances</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 dark:text-slate-400">Team leave overview</p>
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE COLUMN (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Leave Balances */}
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">Leave Balances</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {data.leave_balances?.map((balance, idx) => {
                  const percentage = (balance.hours_left / balance.total_hours) * 100;
                  const circumference = 2 * Math.PI * 40;
                  const strokeDashoffset = circumference - (percentage / 100) * circumference;

                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center cursor-pointer hover:opacity-80 transition"
                      onClick={() => handleLeaveBalanceClick(balance)}
                    >
                      <div className="relative w-28 h-28 mb-2">
                        <svg className="w-full h-full transform -rotate-90">
                          {/* Background circle */}
                          <circle
                            cx="56"
                            cy="56"
                            r="40"
                            stroke="#E5E7EB"
                            strokeWidth="10"
                            fill="none"
                          />
                          {/* Progress circle */}
                          <circle
                            cx="56"
                            cy="56"
                            r="40"
                            stroke={balance.is_segmented ? '#3B82F6' : '#1E3A8A'}
                            strokeWidth="10"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                          />
                          {/* Segmented ring for Vacation Leave 2024 */}
                          {balance.is_segmented && balance.segments && (
                            <>
                              <circle
                                cx="56"
                                cy="56"
                                r="48"
                                stroke="#10B981"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray="30 270"
                              />
                              <circle
                                cx="56"
                                cy="56"
                                r="48"
                                stroke="#3B82F6"
                                strokeWidth="4"
                                fill="none"
                                strokeDasharray="180 120"
                                strokeDashoffset="-30"
                              />
                            </>
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{balance.hours_left}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">hours left</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                        {balance.leave_type}
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Out of the office */}
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">Out of the office</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Date Selector */}
              <div className="flex items-center justify-between mb-4">
                <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">11/11/2024</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">Monday</div>
                </div>
                <button className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Button size="sm" variant="outline" className="text-xs">Apply ▼</Button>
                <Button size="sm" variant="outline" className="text-xs">Cancel ▼</Button>
                <Button size="sm" className="text-xs bg-blue-900 hover:bg-blue-800">Sick</Button>
                <Button size="sm" className="text-xs bg-blue-900 hover:bg-blue-800">Heat Map</Button>
              </div>

              {/* Staff List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {data.out_of_office?.map((staff, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded cursor-pointer transition"
                    onClick={() => alert(`${staff.name} - ${staff.leave_type}\n${staff.start_time}${staff.end_time ? ` - ${staff.end_time}` : ''}\n${staff.duration || ''}`)}
                  >
                    {/* Profile Picture */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">{staff.name}</p>
                        {staff.is_sick && <span className="text-red-500 text-xs">🔴</span>}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className={`px-2 py-0.5 rounded text-xs ${staff.is_sick
                          ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                          }`}>
                          {staff.leave_type}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {staff.start_time}{staff.end_time && ` - ${staff.end_time}`}
                        {staff.duration && ` (${staff.duration})`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leave Metrics */}
          <Card className="bg-white dark:bg-slate-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">Leave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => alert('Showing employees on leave today')}
                  className="text-center p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                >
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{data.leave_metrics?.on_leave_today || 0}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">On leave today</p>
                </button>

                <button
                  onClick={() => alert('Showing employees on leave tomorrow')}
                  className="text-center p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                >
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{data.leave_metrics?.on_leave_tomorrow || 0}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">On leave tomorrow</p>
                </button>

                <button
                  onClick={() => alert('Showing employees on sick leave today')}
                  className="text-center p-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                >
                  <p className="text-3xl font-bold text-slate-900 dark:text-slate-50">{data.leave_metrics?.on_sick_leave_today || 0}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">On sick leave today</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Leave Balance Detail Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-slate-50">
              {selectedLeave?.leave_type} Balance
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              Detailed breakdown of your leave balance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded">
                <p className="text-sm text-slate-600 dark:text-slate-400">Total Allocation</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">{selectedLeave?.total_hours}h</p>
              </div>
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
                <p className="text-sm text-slate-600 dark:text-slate-300">Hours Remaining</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{selectedLeave?.hours_left}h</p>
              </div>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded">
              <p className="text-sm text-slate-600 dark:text-slate-400">Hours Used</p>
              <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {selectedLeave ? selectedLeave.total_hours - selectedLeave.hours_left : 0}h
              </p>
            </div>
            {selectedLeave?.is_segmented && (
              <div className="border-t dark:border-slate-600 pt-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Balance Breakdown</p>
                {selectedLeave.segments?.map((seg, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400 capitalize">{seg.type}</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{seg.hours}h</span>
                  </div>
                ))}
              </div>
            )}
            <Button className="w-full" onClick={() => setShowLeaveDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
