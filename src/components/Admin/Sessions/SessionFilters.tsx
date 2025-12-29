'use client';

import { useState, useEffect } from 'react';
import type { SessionFilters as FilterType, AdminSessionStatus } from '@/types/adminSession';
import type { PublicUser } from '@/types/auth';

interface SessionFiltersProps {
  filters: FilterType;
  onFilterChange: (filters: Partial<FilterType>) => void;
  onClearFilters: () => void;
}

export default function SessionFilters({
  filters,
  onFilterChange,
  onClearFilters,
}: SessionFiltersProps) {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const response = await fetch('/api/admin/users', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setUsers(data.users);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const hasActiveFilters = Boolean(
    filters.userId || filters.status || filters.startDate || filters.endDate
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-300">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* User filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">User</label>
          <select
            value={filters.userId || ''}
            onChange={(e) => onFilterChange({ userId: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
            disabled={isLoadingUsers}
          >
            <option value="">All users</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.email})
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) =>
              onFilterChange({
                status: (e.target.value as AdminSessionStatus) || undefined,
              })
            }
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="idle">Idle</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        {/* Start date filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start Date</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* End date filter */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">End Date</label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
