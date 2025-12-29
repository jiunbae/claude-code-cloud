'use client';

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkTerminate: () => void;
  isTerminating: boolean;
}

export default function BulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkTerminate,
  isTerminating,
}: BulkActionsProps) {
  if (selectedCount === 0) {
    return (
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onSelectAll}
          disabled={totalCount === 0}
          className="text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Select all on this page
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm text-blue-400">
          {selectedCount} session{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      <div className="flex-1" />

      <button
        onClick={onClearSelection}
        className="text-sm text-gray-400 hover:text-white transition-colors"
      >
        Clear selection
      </button>

      <button
        onClick={onBulkTerminate}
        disabled={isTerminating}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isTerminating ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Terminating...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Terminate Selected
          </>
        )}
      </button>
    </div>
  );
}
