import React, { useState } from 'react';
import { User, EmployeeTask } from '../types';
import { getDueDateBadgeInfo } from '../utils';

interface EmployeeTasksProps {
  currentUser: User | null;
  users: User[];
  tasks: EmployeeTask[];
  onAddTask: (assignedTo: string, title: string, description?: string, dueDate?: string) => void;
  onToggleTask: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (taskId: string, title: string, description?: string, dueDate?: string) => void;
}

export const EmployeeTasks: React.FC<EmployeeTasksProps> = ({
  currentUser,
  users,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onEditTask,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('all');
  const [addingTaskUser, setAddingTaskUser] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<EmployeeTask | null>(null);

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Form State for New Task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState(getTodayStr());

  // Form State for Edit Task
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editDueDate, setEditDueDate] = useState(getTodayStr());

  // Filter tasks to exclude legacy dummy accounts (general, chitale)
  const validTasks = React.useMemo(() => {
    return tasks.filter(t => t.assigned_to !== 'general' && t.assigned_to !== 'chitale');
  }, [tasks]);

  // Get list of employees (combines system users and active task usernames)
  const employeeList = React.useMemo(() => {
    const userMap = new Map<string, User>();
    users.forEach(u => {
      if (u.username !== 'general' && u.username !== 'chitale') {
        userMap.set(u.username, u);
      }
    });
    validTasks.forEach(t => {
      if (t.assigned_to !== 'general' && t.assigned_to !== 'chitale' && !userMap.has(t.assigned_to)) {
        userMap.set(t.assigned_to, { username: t.assigned_to, role: 'user' });
      }
    });
    return Array.from(userMap.values());
  }, [users, validTasks]);

  const filteredEmployees = React.useMemo(() => {
    if (selectedUserFilter === 'all') return employeeList;
    return employeeList.filter(e => e.username === selectedUserFilter);
  }, [employeeList, selectedUserFilter]);

  const handleOpenAddModal = (username: string) => {
    setAddingTaskUser(username);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskDueDate(getTodayStr());
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingTaskUser || !newTaskTitle.trim()) return;
    onAddTask(addingTaskUser, newTaskTitle.trim(), newTaskDesc.trim() || undefined, newTaskDueDate || undefined);
    setAddingTaskUser(null);
  };

  const handleOpenEditModal = (task: EmployeeTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDesc(task.description || '');
    setEditDueDate(task.due_date || '');
  };

  const handleUpdateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;
    onEditTask(editingTask.id, editTitle.trim(), editDesc.trim() || undefined, editDueDate || undefined);
    setEditingTask(null);
  };

  // Overall Statistics
  const totalTasksCount = validTasks.length;
  const completedTasksCount = validTasks.filter(t => t.completed).length;
  const overallCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER CARD */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#8EBF45] text-[#0D0D0D] text-xs font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">Admin Portal</span>
            <span className="text-slate-400 text-xs font-semibold">Employee Tasks & Operations</span>
          </div>
          <h1 className="text-2xl font-black mt-2 text-white tracking-wide">Employee To-Do Management</h1>
          <p className="text-slate-400 text-xs mt-1 max-w-xl">
            Assign and monitor employee task lists. Admins maintain full task list editing permissions while employees complete daily action items.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 w-full md:w-auto">
          <div className="text-center px-3 border-r border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Tasks</div>
            <div className="text-xl font-black text-white">{totalTasksCount}</div>
          </div>
          <div className="text-center px-3 border-r border-slate-700">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Completed</div>
            <div className="text-xl font-black text-[#8EBF45]">{completedTasksCount}</div>
          </div>
          <div className="text-center px-3">
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Rate</div>
            <div className="text-xl font-black text-cyan-400">{overallCompletionRate}%</div>
          </div>
        </div>
      </div>

      {/* FILTER & CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Filter Employee:</label>
          <select
            value={selectedUserFilter}
            onChange={e => setSelectedUserFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#8EBF45]"
          >
            <option value="all">All Employees ({employeeList.length})</option>
            {employeeList.map(emp => (
              <option key={emp.username} value={emp.username}>
                {emp.username} ({emp.role === 'admin' ? 'Admin' : 'Employee'})
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#8EBF45]"></span>
          {isAdmin ? 'Admin Mode: You can add, edit, or delete task items.' : 'Employee Mode: You can toggle task completion.'}
        </div>
      </div>

      {/* EMPLOYEE TASK CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredEmployees.map(employee => {
          const empTasks = validTasks.filter(t => t.assigned_to === employee.username);
          const empCompleted = empTasks.filter(t => t.completed).length;
          const empProgress = empTasks.length > 0 ? Math.round((empCompleted / empTasks.length) * 100) : 0;

          return (
            <div key={employee.username} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow">
              {/* CARD HEADER */}
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                    {employee.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{employee.username}</h3>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                      employee.role === 'admin' ? 'bg-[#8EBF45]/20 text-[#658C3E]' :
                      employee.role === 'billing' ? 'bg-blue-100 text-blue-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {employee.role === 'admin' ? 'Director Admin' : employee.role === 'billing' ? 'Billing & Ops' : 'General Employee'}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleOpenAddModal(employee.username)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <span>+ Add Task</span>
                  </button>
                )}
              </div>

              {/* PROGRESS BAR */}
              <div className="px-5 pt-4">
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="text-slate-500 uppercase tracking-wider text-[10px]">Progress Overview</span>
                  <span className="text-slate-800">{empCompleted} / {empTasks.length} Completed ({empProgress}%)</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8EBF45] transition-all duration-300 rounded-full"
                    style={{ width: `${empProgress}%` }}
                  ></div>
                </div>
              </div>

              {/* TO-DO SUBSECTION LIST */}
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8EBF45]"></span>
                    To-Do List ({empTasks.length})
                  </h4>
                </div>

                {empTasks.length === 0 ? (
                  <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-400 font-medium">No tasks currently assigned to {employee.username}.</p>
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenAddModal(employee.username)}
                        className="mt-2 text-xs font-bold text-[#658C3E] hover:underline"
                      >
                        + Click to assign a task
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {empTasks.map(task => (
                      <li
                        key={task.id}
                        className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          task.completed
                            ? 'bg-slate-50/80 border-slate-200 opacity-75'
                            : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => onToggleTask(task.id)}
                            className="mt-0.5 w-4 h-4 text-[#8EBF45] rounded border-slate-300 focus:ring-[#8EBF45] cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-bold leading-snug ${task.completed ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                                {task.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
                              {(() => {
                                const badge = getDueDateBadgeInfo(task.due_date);
                                if (!badge) return null;
                                return (
                                  <span className={`px-2.5 py-1 rounded-md text-[11px] flex items-center gap-1.5 shadow-xs ${
                                    task.completed ? 'bg-slate-100 text-slate-400 border border-slate-200' : badge.badgeClass
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full ${task.completed ? 'bg-slate-300' : badge.dotColor}`}></span>
                                    <span>📅 Due: <strong className="font-extrabold">{badge.dayOfWeek}</strong>, {badge.ddmmyy}</span>
                                  </span>
                                );
                              })()}
                              <span className="text-slate-400 font-medium">
                                Assigned by: <strong className="text-slate-600">{task.created_by}</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* ADMIN EDIT / DELETE ACTIONS */}
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(task)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              title="Edit Task"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Task"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE TASK MODAL (ADMIN ONLY) */}
      {addingTaskUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Assign New Task</h3>
                <p className="text-xs text-slate-500">Employee: <span className="font-bold text-slate-800">{addingTaskUser}</span></p>
              </div>
              <button onClick={() => setAddingTaskUser(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Inspect raw cell batch & log grade"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8EBF45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Task Details / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Optional details or specific guidelines..."
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8EBF45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8EBF45]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAddingTaskUser(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8EBF45] text-[#0D0D0D] font-bold rounded-lg text-xs hover:bg-[#7cb037] shadow-md transition-colors"
                >
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TASK MODAL (ADMIN ONLY) */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Edit Employee Task</h3>
                <p className="text-xs text-slate-500">Assigned to: <span className="font-bold text-slate-800">{editingTask.assigned_to}</span></p>
              </div>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleUpdateTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8EBF45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Task Details</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8EBF45]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={e => setEditDueDate(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#8EBF45]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8EBF45] text-[#0D0D0D] font-bold rounded-lg text-xs hover:bg-[#7cb037] shadow-md transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
