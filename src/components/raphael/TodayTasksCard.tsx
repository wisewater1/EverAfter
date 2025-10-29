import React, { useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';
import type { TaskStub } from '../../lib/raphael/monitors';

interface TodayTasksCardProps {
  tasks: TaskStub[];
}

export default function TodayTasksCard({ tasks }: TodayTasksCardProps) {
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const handleToggleTask = (taskId: string) => {
    setCompletedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getPriorityColor = (priority: TaskStub['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-500/30 bg-red-500/5';
      case 'medium':
        return 'border-amber-500/30 bg-amber-500/5';
      default:
        return 'border-slate-500/30 bg-slate-500/5';
    }
  };

  const getPriorityDot = (priority: TaskStub['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      default:
        return 'bg-slate-500';
    }
  };

  const isOverdue = (dueAt: string | null) => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  };

  return (
    <div className="glass-card neon-border group">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Today's Tasks</h3>
          {tasks.length > 0 && (
            <span className="text-xs text-slate-500">
              {tasks.filter(t => completedTasks.has(t.id)).length} / {tasks.length}
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm text-slate-400">All caught up!</p>
            <p className="text-xs text-slate-500 mt-1">No tasks for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => {
              const isCompleted = completedTasks.has(task.id);
              const overdue = isOverdue(task.dueAt);

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${getPriorityColor(task.priority)} backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] cursor-pointer`}
                  onClick={() => handleToggleTask(task.id)}
                >
                  <div className="flex items-start gap-3">
                    <button
                      className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTask(task.id);
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium transition-all ${
                          isCompleted
                            ? 'text-slate-500 line-through'
                            : 'text-white'
                        }`}
                      >
                        {task.title}
                      </p>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/5 text-slate-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(task.priority)}`}></span>
                          {task.priority}
                        </span>

                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-white/5 text-slate-400">
                          {task.category}
                        </span>

                        {task.dueAt && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                              overdue
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            {overdue ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {new Date(task.dueAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
