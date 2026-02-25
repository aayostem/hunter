import React, { useMemo, useCallback,  useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Check,
  X,
} from 'lucide-react';

// Types
export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  id: string;
  header: string | React.ReactNode;
  accessor: keyof T | ((row: T) => React.ReactNode);
  cell?: (value: unknown, row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  loading?: boolean;
  error?: string | null;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
  };
  sorting?: {
    sortBy: string | null;
    sortDirection: SortDirection;
    onSort: (columnId: string) => void;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  selection?: {
    selectedRows: Set<string>;
    onSelectionChange: (selectedRows: Set<string>) => void;
    isRowSelectable?: (row: T) => boolean;
  };
  // actions?: {
  //   onView?: (row: T) => void;
  //   onEdit?: (row: T) => void;
  //   onDelete?: (row: T) => void;
  //   customActions?: (row: T) => React.ReactNode[];
  // };
  actions?: {
    onView?: (row: T) => void;
    onEdit?: (row: T) => void;
    onDelete?: (row: T) => void;
    customActions?: ((row: T) => React.ReactNode)[];
  };

  exportable?: boolean;
  onExport?: () => void;
  emptyMessage?: string;
  className?: string;
  rowClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  striped?: boolean;
  hoverable?: boolean;
  bordered?: boolean;
  dense?: boolean;
  testId?: string;
}

// Loading skeleton
const TableSkeleton: React.FC<{ columns: number; rows: number }> = ({ columns, rows }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={`skeleton-${rowIndex}`} className="animate-pulse">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <td key={`skeleton-${rowIndex}-${colIndex}`} className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded"></div>
          </td>
        ))}
      </tr>
    ))}
  </>
);

// Empty state
const EmptyState: React.FC<{ message: string; hasFilters?: boolean }> = ({
  message,
  hasFilters = false,
}) => (
  <tr>
    <td colSpan={100} className="px-6 py-12 text-center">
      <div className="flex flex-col items-center justify-center text-gray-500">
        <div className="w-16 h-16 mb-4 text-gray-300">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
        <p className="text-sm mb-2">{message}</p>
        {hasFilters && (
          <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
        )}
      </div>
    </td>
  </tr>
);

// Error state
const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <tr>
    <td colSpan={100} className="px-6 py-12 text-center">
      <div className="flex flex-col items-center justify-center text-red-500">
        <div className="w-16 h-16 mb-4 text-red-300">
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <p className="text-sm mb-2">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
          >
            Try Again
          </button>
        )}
      </div>
    </td>
  </tr>
);

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  error = null,
  pagination,
  sorting,
  search,
  selection,
  actions,
  exportable = false,
  onExport,
  emptyMessage = 'No data available',
  className = '',
  rowClassName = '',
  headerClassName = '',
  cellClassName = '',
  striped = true,
  hoverable = true,
  dense = false,
  testId,
}: DataTableProps<T>) {
  const tableRef = useRef<HTMLTableElement>(null);

  // Compute select all state without using setState in useEffect
  const selectAll = useMemo(() => {
    if (!selection || data.length === 0) return false;
    
    return data.every((row, index) => {
      const key = keyExtractor(row, index);
      const isRowSelectable = selection.isRowSelectable ? selection.isRowSelectable(row) : true;
      return isRowSelectable ? selection.selectedRows.has(key) : true;
    });
  }, [selection, data, keyExtractor]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (!selection) return;

    const newSelected = new Set(selection.selectedRows);
    
    if (selectAll) {
      // Deselect all visible rows
      data.forEach((row, index) => {
        const key = keyExtractor(row, index);
        newSelected.delete(key);
      });
    } else {
      // Select all visible rows that are selectable
      data.forEach((row, index) => {
        const key = keyExtractor(row, index);
        const isRowSelectable = selection.isRowSelectable ? selection.isRowSelectable(row) : true;
        if (isRowSelectable) {
          newSelected.add(key);
        }
      });
    }
    
    selection.onSelectionChange(newSelected);
  }, [selection, data, keyExtractor, selectAll]);

  // Handle row selection
  const handleRowSelect = useCallback((key: string) => {
    if (!selection) return;

    const newSelected = new Set(selection.selectedRows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    selection.onSelectionChange(newSelected);
  }, [selection]);

  // Render cell content
  const renderCell = useCallback((row: T, column: Column<T>, index: number) => {
    let value: unknown;
    
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    } else {
      value = row[column.accessor];
    }

    if (column.cell) {
      return column.cell(value, row, index);
    }

    // Default rendering
    if (value === null || value === undefined) {
      return '-';
    }

    if (typeof value === 'boolean') {
      return value ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }, []);

  // Get sort icon
  const getSortIcon = useCallback((columnId: string) => {
    if (!sorting || sorting.sortBy !== columnId) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    if (sorting.sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />;
    }
    if (sorting.sortDirection === 'desc') {
      return <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />;
    }
    return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
  }, [sorting]);

  // Handle export
  const handleExport = useCallback(() => {
    if (onExport) {
      onExport();
    } else {
      // Default export to CSV
      const headers = columns.map(col => 
        typeof col.header === 'string' ? col.header : col.id
      );
      
      const rows = data.map(row => 
        columns.map(col => {
          if (typeof col.accessor === 'function') {
            return '';
          }
          const value = row[col.accessor];
          return value !== null && value !== undefined ? String(value) : '';
        })
      );

      const csv = [
        headers.join(','),
        ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_${new Date().toISOString()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }, [columns, data, onExport]);

  // Calculate padding based on density
  const cellPadding = dense ? 'px-4 py-2' : 'px-6 py-4';

  // Safe check for selected rows count
  const selectedCount = selection?.selectedRows.size ?? 0;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Toolbar */}
      {(search || exportable || selectedCount > 0) && (
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {search && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search.value}
                  onChange={(e) => search.onChange(e.target.value)}
                  placeholder={search.placeholder || 'Search...'}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {selectedCount > 0 && (
              <span className="text-sm text-gray-600">
                {selectedCount} selected
              </span>
            )}
          </div>
          {exportable && (
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-sm" data-testid={testId}>
          <thead className={`bg-gray-50 border-b border-gray-200 ${headerClassName}`}>
            <tr>
              {/* Selection checkbox */}
              {selection && (
                <th className="px-6 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    aria-label="Select all rows"
                  />
                </th>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                <th
                  key={column.id}
                  className={`${cellPadding} text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable ? 'cursor-pointer hover:text-gray-700' : ''
                  } ${column.className || ''}`}
                  style={{
                    width: column.width,
                    minWidth: column.minWidth,
                    maxWidth: column.maxWidth,
                    textAlign: column.align,
                  }}
                  onClick={() => {
                    if (column.sortable && sorting) {
                      sorting.onSort(column.id);
                    }
                  }}
                >
                  <div className="flex items-center">
                    <span>{column.header}</span>
                    {column.sortable && getSortIcon(column.id)}
                  </div>
                </th>
              ))}

              {/* Actions column */}
              {actions && (
                <th className={`${cellPadding} text-right text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  Actions
                </th>
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <TableSkeleton columns={columns.length + (selection ? 1 : 0) + (actions ? 1 : 0)} rows={5} />
            ) : error ? (
              <ErrorState error={error} onRetry={pagination?.onPageChange ? () => pagination.onPageChange(1) : undefined} />
            ) : data.length === 0 ? (
              <EmptyState message={emptyMessage} hasFilters={!!search?.value} />
            ) : (
              data.map((row, rowIndex) => {
                const rowKey = keyExtractor(row, rowIndex);
                const isSelected = selection?.selectedRows.has(rowKey) ?? false;
                const isSelectable = !selection?.isRowSelectable || selection.isRowSelectable(row);

                return (
                  <tr
                    key={rowKey}
                    className={`
                      ${hoverable ? 'hover:bg-gray-50' : ''}
                      ${striped && rowIndex % 2 === 1 ? 'bg-gray-50' : ''}
                      ${isSelected ? 'bg-blue-50' : ''}
                      ${rowClassName}
                    `}
                  >
                    {/* Selection checkbox */}
                    {selection && (
                      <td className={cellPadding}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(rowKey)}
                          disabled={!isSelectable}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
                          aria-label="Select row"
                        />
                      </td>
                    )}

                    {/* Data cells */}
                    {columns.map((column) => (
                      <td
                        key={`${rowKey}-${column.id}`}
                        className={`${cellPadding} ${cellClassName}`}
                        style={{ textAlign: column.align }}
                      >
                        {renderCell(row, column, rowIndex)}
                      </td>
                    ))}

                    {/* Actions */}
                    {actions && (
                      <td className={`${cellPadding} text-right`}>
                        <div className="flex items-center justify-end space-x-2">
                          {actions.onView && (
                            <button
                              onClick={() => actions.onView?.(row)}
                              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                          )}
                          {actions.onEdit && (
                            <button
                              onClick={() => actions.onEdit?.(row)}
                              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {actions.onDelete && (
                            <button
                              onClick={() => actions.onDelete?.(row)}
                              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                          {actions.customActions?.map((action, i) => (
                            <React.Fragment key={i}>{action(row)}</React.Fragment>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-600">
              Showing {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of{' '}
              {pagination.totalItems} results
            </p>
            {pagination.onItemsPerPageChange && (
              <select
                value={pagination.itemsPerPage}
                onChange={(e) => pagination.onItemsPerPageChange?.(Number(e.target.value))}
                className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage === 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            <span className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>

            <button
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}