
import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Kanban, CheckSquare, Plus, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';

export default function TasksKanban() {
  const { activeVenue } = useVenue();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  // MOCK DATA REMOVED - STRICT DATABASE MODE

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
      console.warn('Board API failed');
      toast.error('Failed to load tasks board from server');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = () => {
    // NOTE: Task Creation should be implemented as a real Modal + API call.
    // For now, I will alert the user that this feature requires the backend implementation.
    toast.info("Task creation requires backend implementation.");
  };

  return (
    <PageContainer
      title="Tasks Board"
      description="Operational Task Management"
      actions={<Button onClick={handleAddTask} className="bg-blue-600"><Plus className="w-4 h-4 mr-2" /> Add Task</Button>}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-200px)] overflow-x-auto">
        {board?.columns?.map((column) => (
          <div key={column.key} className="bg-zinc-900 border border-white/10 p-4 rounded-xl flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                {column.title}
                <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                  {board.cards?.filter(c => c.status === column.key).length || 0}
                </Badge>
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6"><MoreHorizontal className="w-4 h-4 text-zinc-500" /></Button>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {board.cards?.filter(c => c.status === column.key).map((task) => (
                <Card key={task.id} className="cursor-pointer bg-zinc-950 border-white/5 hover:border-blue-500/50 transition-all hover:shadow-lg group">
                  <CardContent className="p-3">
                    <p className="font-medium text-white text-sm mb-2 group-hover:text-blue-400 transition-colors">{task.title}</p>
                    {task.checklist_items && task.checklist_items.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 bg-zinc-900 w-fit px-2 py-1 rounded">
                        <CheckSquare className="h-3 w-3" />
                        {task.checklist_items.filter(i => i.done).length}/{task.checklist_items.length}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              <Button variant="ghost" className="w-full text-zinc-500 text-xs border border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900">
                <Plus className="w-3 h-3 mr-2" /> Add Item
              </Button>
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
