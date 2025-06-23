import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useData } from '../contexts/DataContext';
import { useConfig } from '../contexts/ConfigContext';
import { EcosystemEntity } from '../types/types';

const columnHelper = createColumnHelper<EcosystemEntity>();

const TableView: React.FC = () => {
  const { filteredEntities } = useData();
  const { config } = useConfig();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Create columns based on config
  const columns = useMemo(() => {
    if (!config.table?.columns) return [];

    return config.table.columns.map(colConfig => {
      const { key, label, type, sortable = true } = colConfig;

      return columnHelper.accessor(
        (row) => {
          // Handle nested property access (e.g., 'metrics.stars')
          const value = key.split('.').reduce((obj: any, prop: string) => {
            return obj?.[prop];
          }, row);
          return value;
        },
        {
          id: key,
          header: label,
          enableSorting: sortable,
          cell: (info) => {
            const value = info.getValue();
            
            switch (type) {
              case 'link':
                return value ? (
                  <a href={value} target="_blank" rel="noopener noreferrer">
                    {value}
                  </a>
                ) : null;
              
              case 'number':
                return typeof value === 'number' ? value.toLocaleString() : value;
              
              case 'tags':
                return Array.isArray(value) ? (
                  <div className="tags">
                    {value.map((tag, index) => (
                      <span key={index} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : value;
              
              case 'date':
                return value ? new Date(value).toLocaleDateString() : null;
              
              default:
                return value || '';
            }
          },
        }
      );
    });
  }, [config.table?.columns]);

  // Filter entities based on configured entity types
  const data = useMemo(() => {
    return filteredEntities.filter(entity => 
      config.entityTypes.includes(entity.type)
    );
  }, [filteredEntities, config.entityTypes]);

  // Set up initial sorting
  const initialSorting = useMemo(() => {
    if (config.table?.defaultSort) {
      return [{
        id: config.table.defaultSort.column,
        desc: config.table.defaultSort.direction === 'desc'
      }];
    }
    return [];
  }, [config.table?.defaultSort]);

  React.useEffect(() => {
    if (initialSorting.length > 0 && sorting.length === 0) {
      setSorting(initialSorting);
    }
  }, [initialSorting, sorting.length]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: config.table?.pageSize || 25,
      },
    },
  });

  if (columns.length === 0) {
    return (
      <div className="table-view">
        <div className="error-message">
          No table configuration found. Please check your render.yaml file.
        </div>
      </div>
    );
  }

  return (
    <div className="table-view">
      <div className="table-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search entities..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="table-info">
          <span>
            Showing {table.getRowModel().rows.length} of {data.length} entities
          </span>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>
                    {header.isPlaceholder ? null : (
                      <div
                        className={`header-content ${
                          header.column.getCanSort() ? 'sortable' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getCanSort() && (
                          <span className="sort-indicator">
                            {{
                              asc: ' ↑',
                              desc: ' ↓',
                            }[header.column.getIsSorted() as string] ?? ' ↕'}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div className="pagination-info">
          <span>
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount()}
          </span>
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {'<<'}
          </button>
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {'<'}
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {'>'}
          </button>
          <button
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            {'>>'}
          </button>
        </div>
        <div className="page-size-selector">
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => {
              table.setPageSize(Number(e.target.value));
            }}
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                Show {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default TableView;
