
import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import { useVenue } from '../../context/VenueContext';
import { useAuth } from '../../context/AuthContext';

import api from '../../lib/api';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent } from '../../components/ui/card';

import { Badge } from '../../components/ui/badge';

import { Button } from '../../components/ui/button';

import { CheckSquare, Plus, MoreHorizontal, User, Filter } from 'lucide-react';

import { toast } from 'sonner';

export default function TasksKanban() {
  const { activeVenue } = useVenue();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMyTasks, setShowMyTasks] = useState(false);

  useEffect(() => {
    if (activeVenue?.id) {
      loadBoard();
    }
  }, [activeVenue?.id]);

  const loadBoard = async () => {
    try {
      const res = await api.get(`/collab/tasks/board?venue_id=${activeVenue.id}`);
      setBoard(res.data?.data || { columns: [], cards: [] });
    } catch (error) {
      logger.warn('Board API failed');
      toast.error('Failed to load tasks board from server');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    toast.info("Task creation requires backend implementation.");
  };

  if (!user) {
    return (
      <PageContainer title="Tasks Board" description="Operational Task Management">
        <div className="text-center py-16">
          <User className="h-12 w-12 mx-auto text-zinc-500 mb-4" />
          <h2 className="text-xl font-semibold text-zinc-200">Not Authenticated</h2>
          <p className="text-zinc-500 mt-2">Please log in to access your tasks.</p>
        </div>
      </PageContainer>
    );
  }

  // Filter cards based on "My Tasks" toggle
  const filteredCards = showMyTasks && user
    ? (board?.cards || []).filter(c => c.assignee_id === user.id || c.assignee === user.name)
    : (board?.cards || []);

  const myTaskCount = user
    ? (board?.cards || []).filter(c => c.assignee_id === user.id || c.assignee === user.name).length
    : 0;

  return (
    <PageContainer
      title="Tasks Board"
      description={`${user.name}'s task management`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant={showMyTasks ? "default" : "outline"}
            size="sm"
            onClick={() => setShowMyTasks(!showMyTasks)}
            className={showMyTasks ? "bg-blue-600 hover:bg-blue-500" : "border-zinc-700 text-zinc-300"}
          >
            <Filter className="w-4 h-4 mr-2" />
            My Tasks {myTaskCount > 0 && `(${myTaskCount})`}
          </Button>
          <Button onClick={handleAddTask} className="bg-blue-600">
            <Plus className="w-4 h-4 mr-2" /> Add Task
          </Button>
        </div>
      }
    >
      {/* User Context Bar */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="py-1.5 px-3 text-sm border-zinc-700 text-zinc-300">
            <User className="w-3.5 h-3.5 mr-1.5" />
            {user.name}
          </Badge>
          {showMyTasks && (
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
              Showing my tasks only
            </Badge>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-zinc-500">Loading task board...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-280px)] overflow-x-auto">
          {board?.columns?.map((column) => (
            <div key={column.key} className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2">
                  {column.title}
                  <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                    {filteredCards.filter(c => c.status === column.key).length}
                  </Badge>
                </h3>
                <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-4 h-4 text-zinc-500" /></Button>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {filteredCards.filter(c => c.status === column.key).map((task) => {
                  const isMyTask = user && (task.assignee_id === user.id || task.assignee === user.name);
                  return (
                    <Card
                      key={task.id}
                      className={`cursor-pointer bg-zinc-950 transition-all hover:shadow-lg group ${isMyTask
                          ? 'border-blue-500/30 hover:border-blue-500/50 ring-1 ring-blue-500/10'
                          : 'border-white/5 hover:border-blue-500/50'
                        }`}
                    >
                      <CardContent className="p-3">
                        <p className="font-medium text-white text-sm mb-2 group-hover:text-blue-400 transition-colors">{task.title}</p>
                        <div className="flex items-center justify-between">
                          {task.checklist_items && task.checklist_items.length > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-900 w-fit px-2 py-1 rounded">
                              <CheckSquare className="h-3 w-3" />
                              {task.checklist_items.filter(i => i.done).length}/{task.checklist_items.length}
                            </div>
                          )}
                          {isMyTask && (
                            <Badge className="text-[9px] bg-blue-500/10 text-blue-400 border-0">You</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                <Button variant="ghost" className="w-full text-zinc-500 text-xs border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900">
                  <Plus className="w-3 h-3 mr-2" /> Add Item
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}