'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, Copy, Download, Check, ChevronRight, ChevronDown } from 'lucide-react';
import type { SnapshotResponse, ComputedTask } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Dashboard() {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ComputedTask | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTaskId, setCopiedTaskId] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const fetchSnapshot = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/snapshot');
      if (!response.ok) {
        throw new Error('Failed to fetch snapshot');
      }
      const result: SnapshotResponse = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshot();
  }, []);

  const handleCopyTaskId = () => {
    if (selectedTask) {
      navigator.clipboard.writeText(selectedTask.id);
      setCopiedTaskId(true);
      setTimeout(() => setCopiedTaskId(false), 2000);
    }
  };

  const toggleTaskExpand = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'bg-[#22c55e]/20 text-[#22c55e]';
      case 'FAILED': return 'bg-[#ef4444]/20 text-[#ef4444]';
      case 'BLOCKED': return 'bg-[#f59e0b]/20 text-[#f59e0b]';
      case 'READY': return 'bg-[#3b82f6]/20 text-[#3b82f6]';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  if (loading && !data) {
    return (
      <div className="h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-gray-400 font-['JetBrains_Mono']">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-red-500 font-['JetBrains_Mono']">Error: {error}</div>
      </div>
    );
  }

  if (!data || !data.snapshot) {
    return (
      <div className="h-screen bg-[#141414] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-950 border border-red-800 rounded-lg p-6 font-['JetBrains_Mono']">
            <h2 className="text-xl font-bold text-red-300 mb-4">Queue Parse Errors</h2>
            <div className="space-y-2">
              {data?.queueErrors?.map((err, i) => (
                <div key={i} className="text-red-200 text-sm">{err}</div>
              )) || <div className="text-red-200 text-sm">No data available</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const snapshot = data.snapshot;
  const filteredTasks = snapshot.tasks.filter(t =>
    t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group tasks by slice
  const tasksBySlice = filteredTasks.reduce((acc, task) => {
    if (!acc[task.slice]) acc[task.slice] = [];
    acc[task.slice].push(task);
    return acc;
  }, {} as Record<string, ComputedTask[]>);

  const getDependentTasks = (taskId: string): ComputedTask[] => {
    return snapshot.tasks.filter(t => t.dependsOn.includes(taskId));
  };

  return (
    <div className="h-screen bg-[#141414] flex overflow-hidden font-['JetBrains_Mono']">
      {/* Left Sidebar */}
      <div className="w-[25%] min-w-[300px] bg-[#1e1e1e] border-r border-[#2a2a2a] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-semibold text-gray-100">agent-scope</h1>
              <span className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-0.5 rounded">
                v0.1
              </span>
            </div>
            <button
              onClick={fetchSnapshot}
              disabled={loading}
              className="p-1.5 rounded hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <input
              type="text"
              placeholder="Filter tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#141414] border border-[#2a2a2a] rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 placeholder-gray-600 focus:outline-none focus:border-[#3a3a3a]"
            />
          </div>
        </div>

        {/* Slice List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {Object.entries(tasksBySlice).map(([sliceId, tasks]) => (
              <div key={sliceId} className="space-y-2">
                <div className="px-2 py-1.5 bg-[#2a2a2a] rounded text-xs font-semibold text-gray-400">
                  {sliceId} • {tasks.length} tasks
                </div>
                {tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTask?.id === task.id
                        ? 'bg-[#2a2a2a] border-[#3a3a3a]'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] hover:bg-[#252525]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-mono text-gray-300">{task.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-400 line-clamp-2">{task.description}</div>
                    <div className="text-xs text-gray-600 mt-1">{task.area}</div>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTask ? (
          <>
            {/* Task Header */}
            <div className="bg-[#1e1e1e] border-b border-[#2a2a2a] p-6">
              <h2 className="text-2xl font-semibold text-gray-100 mb-3">
                {selectedTask.description}
              </h2>

              <div className="flex items-center gap-4 text-sm text-gray-400">
                <span>Task: {selectedTask.id}</span>
                <span>•</span>
                <span>Area: {selectedTask.area}</span>
                <span>•</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status}
                </span>

                <div className="flex-1" />

                <button
                  onClick={handleCopyTaskId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-[#2a2a2a] transition-colors"
                >
                  {copiedTaskId ? (
                    <>
                      <Check className="size-3.5 text-[#22c55e]" />
                      <span className="text-[#22c55e]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Split View */}
            <div className="flex-1 flex overflow-hidden">
              {/* Details */}
              <div className="w-1/2 border-r border-[#2a2a2a] flex flex-col">
                <div className="bg-[#1e1e1e] border-b border-[#2a2a2a] px-4 py-2">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                    Task Details
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Acceptance Criteria</h4>
                      <p className="text-sm text-gray-300 leading-relaxed">{selectedTask.acceptanceCriteria}</p>
                    </div>

                    {selectedTask.dependsOn.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Dependencies</h4>
                        <div className="space-y-2">
                          {selectedTask.dependsOn.map(depId => {
                            const depTask = snapshot.tasks.find(t => t.id === depId);
                            return (
                              <button
                                key={depId}
                                onClick={() => depTask && setSelectedTask(depTask)}
                                className="w-full text-left p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#252525] transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-mono text-gray-300">{depId}</span>
                                  {depTask && (
                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${getStatusColor(depTask.status)}`}>
                                      {depTask.status}
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {getDependentTasks(selectedTask.id).length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Blocks These Tasks</h4>
                        <div className="space-y-2">
                          {getDependentTasks(selectedTask.id).map(task => (
                            <button
                              key={task.id}
                              onClick={() => setSelectedTask(task)}
                              className="w-full text-left p-3 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:bg-[#252525] transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-mono text-gray-300">{task.id}</span>
                                <span className={`text-xs px-2 py-0.5 rounded font-semibold ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTask.lastEvent && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Last Event</h4>
                        <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Agent:</span>
                            <span className="text-gray-300 font-mono">{selectedTask.lastEvent.agent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Time:</span>
                            <span className="text-gray-300">{new Date(selectedTask.lastEvent.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Status:</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(selectedTask.lastEvent.status)}`}>
                              {selectedTask.lastEvent.status}
                            </span>
                          </div>
                          {selectedTask.lastEvent.meta && (
                            <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
                              <span className="text-gray-500 text-xs block mb-2">Metadata:</span>
                              <pre className="text-xs text-gray-400 bg-[#141414] p-2 rounded overflow-auto">
                                {JSON.stringify(selectedTask.lastEvent.meta, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Statistics */}
              <div className="w-1/2 flex flex-col">
                <div className="bg-[#1e1e1e] border-b border-[#2a2a2a] px-4 py-2">
                  <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                    Overview
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-100">{snapshot.summary.total}</div>
                        <div className="text-xs text-gray-500 mt-1">Total Tasks</div>
                      </div>
                      <div className="bg-[#1a1a1a] border border-[#22c55e]/30 rounded-lg p-4">
                        <div className="text-2xl font-bold text-[#22c55e]">{snapshot.summary.done}</div>
                        <div className="text-xs text-gray-500 mt-1">Done</div>
                      </div>
                      <div className="bg-[#1a1a1a] border border-[#ef4444]/30 rounded-lg p-4">
                        <div className="text-2xl font-bold text-[#ef4444]">{snapshot.summary.failed}</div>
                        <div className="text-xs text-gray-500 mt-1">Failed</div>
                      </div>
                      <div className="bg-[#1a1a1a] border border-[#f59e0b]/30 rounded-lg p-4">
                        <div className="text-2xl font-bold text-[#f59e0b]">{snapshot.summary.blocked}</div>
                        <div className="text-xs text-gray-500 mt-1">Blocked</div>
                      </div>
                      <div className="bg-[#1a1a1a] border border-[#3b82f6]/30 rounded-lg p-4">
                        <div className="text-2xl font-bold text-[#3b82f6]">{snapshot.summary.ready}</div>
                        <div className="text-xs text-gray-500 mt-1">Ready</div>
                      </div>
                      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-100">{Math.round(snapshot.summary.successRate * 100)}%</div>
                        <div className="text-xs text-gray-500 mt-1">Success Rate</div>
                      </div>
                    </div>

                    {/* Slice Progress */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Slice Progress</h4>
                      <div className="space-y-3">
                        {Object.entries(snapshot.slices).map(([sliceId, slice]) => (
                          <div key={sliceId} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-4">
                            <div className="flex justify-between mb-2">
                              <span className="font-semibold text-gray-300">{sliceId}</span>
                              <span className="text-gray-400 text-sm">
                                {slice.done}/{slice.total} ({slice.progress}%)
                              </span>
                            </div>
                            <div className="w-full bg-[#2a2a2a] rounded-full h-2">
                              <div
                                className="bg-[#22c55e] h-2 rounded-full transition-all"
                                style={{ width: `${slice.progress}%` }}
                              />
                            </div>
                            <div className="flex gap-4 mt-3 text-xs">
                              <span className="text-[#22c55e]">Done: {slice.done}</span>
                              <span className="text-[#ef4444]">Failed: {slice.failed}</span>
                              <span className="text-[#f59e0b]">Blocked: {slice.blocked}</span>
                              <span className="text-[#3b82f6]">Ready: {slice.ready}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-500 text-lg mb-2">No task selected</p>
              <p className="text-gray-600 text-sm">Select a task from the sidebar to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
