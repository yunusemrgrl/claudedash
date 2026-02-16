'use client';

import { useState, useEffect } from 'react';
import type { SnapshotResponse, ComputedTask } from '@/types';

export default function Dashboard() {
  const [data, setData] = useState<SnapshotResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ComputedTask | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Handle queue errors (full screen error)
  if (data.queueErrors.length > 0) {
    return (
      <div className="min-h-screen bg-gray-950 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-950 border border-red-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-300 mb-4">Queue Parse Errors</h2>
            <div className="space-y-2">
              {data.queueErrors.map((err, i) => (
                <div key={i} className="text-red-200 font-mono text-sm">{err}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const snapshot = data.snapshot!;
  const filteredTasks = statusFilter === 'all'
    ? snapshot.tasks
    : snapshot.tasks.filter(t => t.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'text-green-400 bg-green-950 border-green-800';
      case 'FAILED': return 'text-red-400 bg-red-950 border-red-800';
      case 'BLOCKED': return 'text-yellow-400 bg-yellow-950 border-yellow-800';
      case 'READY': return 'text-blue-400 bg-blue-950 border-blue-800';
      default: return 'text-gray-400 bg-gray-950 border-gray-800';
    }
  };

  const reverseDependencies = (taskId: string): string[] => {
    return snapshot.tasks
      .filter(t => t.dependsOn.includes(taskId))
      .map(t => t.id);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top Bar */}
      <div className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">agent-scope</h1>
            <p className="text-sm text-gray-400">
              Last updated: {new Date(data.meta.generatedAt).toLocaleString()}
            </p>
          </div>
          <button
            onClick={fetchSnapshot}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Log Errors Warning */}
        {data.logErrors.length > 0 && (
          <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-4">
            <h3 className="font-bold text-yellow-300 mb-2">Log Parse Warnings</h3>
            <div className="text-sm text-yellow-200 space-y-1">
              {data.logErrors.map((err, i) => (
                <div key={i} className="font-mono">{err}</div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold">{snapshot.summary.total}</div>
            <div className="text-sm text-gray-400">Total Tasks</div>
          </div>
          <div className="bg-gray-900 border border-green-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-green-400">{snapshot.summary.done}</div>
            <div className="text-sm text-gray-400">Done</div>
          </div>
          <div className="bg-gray-900 border border-red-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{snapshot.summary.failed}</div>
            <div className="text-sm text-gray-400">Failed</div>
          </div>
          <div className="bg-gray-900 border border-yellow-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{snapshot.summary.blocked}</div>
            <div className="text-sm text-gray-400">Blocked</div>
          </div>
          <div className="bg-gray-900 border border-blue-800 rounded-lg p-4">
            <div className="text-3xl font-bold text-blue-400">{snapshot.summary.ready}</div>
            <div className="text-sm text-gray-400">Ready</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-3xl font-bold">
              {Math.round(snapshot.summary.successRate * 100)}%
            </div>
            <div className="text-sm text-gray-400">Success Rate</div>
          </div>
        </div>

        {/* Slice Progress Bars */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold">Slice Progress</h2>
          {Object.entries(snapshot.slices).map(([sliceId, slice]) => (
            <div key={sliceId} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="font-bold">{sliceId}</span>
                <span className="text-gray-400">
                  {slice.done}/{slice.total} ({slice.progress}%)
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${slice.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Task Table */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Tasks</h2>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg"
            >
              <option value="all">All</option>
              <option value="READY">Ready</option>
              <option value="BLOCKED">Blocked</option>
              <option value="DONE">Done</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Area</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Dependencies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="hover:bg-gray-850 cursor-pointer transition"
                  >
                    <td className="px-4 py-3 font-mono text-sm">{task.id}</td>
                    <td className="px-4 py-3 text-sm">{task.area}</td>
                    <td className="px-4 py-3 text-sm">{task.description}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">
                      {task.dependsOn.length > 0 ? task.dependsOn.join(', ') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Task Drawer */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedTask.id}</h2>
                  <span className={`inline-block mt-2 px-3 py-1 rounded text-sm font-medium border ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-1">Area</h3>
                <p>{selectedTask.area}</p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-1">Description</h3>
                <p>{selectedTask.description}</p>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-400 mb-1">Acceptance Criteria</h3>
                <p>{selectedTask.acceptanceCriteria}</p>
              </div>

              {selectedTask.dependsOn.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-1">Dependencies</h3>
                  <div className="space-y-1">
                    {selectedTask.dependsOn.map(depId => {
                      const depTask = snapshot.tasks.find(t => t.id === depId);
                      return (
                        <div key={depId} className="flex items-center gap-2">
                          <span className="font-mono text-sm">{depId}</span>
                          {depTask && (
                            <span className={`px-2 py-0.5 rounded text-xs border ${getStatusColor(depTask.status)}`}>
                              {depTask.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {reverseDependencies(selectedTask.id).length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-1">Blocks These Tasks</h3>
                  <div className="space-y-1">
                    {reverseDependencies(selectedTask.id).map(revDepId => (
                      <div key={revDepId} className="font-mono text-sm">{revDepId}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTask.lastEvent && (
                <div>
                  <h3 className="text-sm font-bold text-gray-400 mb-1">Last Event</h3>
                  <div className="bg-gray-800 rounded p-3 text-sm font-mono">
                    <div>Agent: {selectedTask.lastEvent.agent}</div>
                    <div>Time: {new Date(selectedTask.lastEvent.timestamp).toLocaleString()}</div>
                    {selectedTask.lastEvent.meta && (
                      <div>Meta: {JSON.stringify(selectedTask.lastEvent.meta)}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
