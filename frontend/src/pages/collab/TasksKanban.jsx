import React, { useState, useEffect } from 'react';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Kanban, CheckSquare } from 'lucide-react';

export default function TasksKanban() {
  const { activeVenue } = useVenue();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeVenue?.id) {
      loadBoard();
    }
  }, [activeVenue?.id]);

  const loadBoard = async () => {
    try {
      const res = await api.get(`/collab/tasks/board?venue_id=${activeVenue.id}`);
      setBoard(res.data?.data);
    } catch (error) {
      console.error('Board error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer title="Tasks - Kanban" description="Visual task management board">
      <div className="grid grid-cols-4 gap-4">
        {board?.columns?.map((column) => (
          <div key={column.key} className="bg-slate-100 p-4 rounded-lg">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              {column.title}
              <Badge variant="secondary">
                {board.cards?.filter(c => c.status === column.key).length || 0}
              </Badge>
            </h3>
            <div className="space-y-2">
              {board.cards?.filter(c => c.status === column.key).map((task) => (
                <Card key={task.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-3">
                    <p className="font-medium text-slate-900 text-sm">{task.title}</p>
                    {task.checklist_items && task.checklist_items.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-600">
                        <CheckSquare className="h-3 w-3" />
                        {task.checklist_items.filter(i => i.done).length}/{task.checklist_items.length}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
