import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, AuditLogResponse, AdminActionType } from '../../lib/api';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface AuditLogViewerProps {
  className?: string;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({ className }) => {
  const [filters, setFilters] = useState({
    actionType: '' as AdminActionType | '',
    targetType: '',
    adminUserId: '',
    searchTerm: ''
  });
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Fetch audit logs
  const { data: logsData, isLoading, error } = useQuery({
    queryKey: ['audit-logs', filters, currentPage],
    queryFn: () => adminApi.getAuditLogs({
      actionType: filters.actionType || undefined,
      targetType: filters.targetType || undefined,
      adminUserId: filters.adminUserId ? parseInt(filters.adminUserId) : undefined,
      skip: currentPage * pageSize,
      limit: pageSize
    })
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(0);
  };

  const clearFilters = () => {
    setFilters({
      actionType: '',
      targetType: '',
      adminUserId: '',
      searchTerm: ''
    });
    setCurrentPage(0);
  };

  const getActionBadge = (actionType: AdminActionType) => {
    const actionStyles = {
      vendor_approval: 'bg-green-100 text-green-800',
      vendor_rejection: 'bg-red-100 text-red-800',
      review_moderation: 'bg-blue-100 text-blue-800',
      user_suspension: 'bg-orange-100 text-orange-800',
      user_activation: 'bg-green-100 text-green-800',
      subscription_change: 'bg-purple-100 text-purple-800',
      content_moderation: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionStyles[actionType]}`}>
        {actionType.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const getTargetTypeBadge = (targetType: string) => {
    const typeStyles = {
      vendor: 'bg-blue-50 text-blue-700',
      review: 'bg-green-50 text-green-700',
      user: 'bg-purple-50 text-purple-700',
      wedding: 'bg-pink-50 text-pink-700'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${typeStyles[targetType as keyof typeof typeStyles] || 'bg-gray-50 text-gray-700'}`}>
        {targetType.toUpperCase()}
      </span>
    );
  };

  const formatMetadata = (metadata: string | null) => {
    if (!metadata) return null;
    
    try {
      const parsed = JSON.parse(metadata);
      return (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          <strong>Metadata:</strong>
          <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(parsed, null, 2)}</pre>
        </div>
      );
    } catch {
      return (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
          <strong>Metadata:</strong> {metadata}
        </div>
      );
    }
  };

  // Filter logs based on search term
  const filteredLogs = logsData?.logs.filter(log => {
    if (!filters.searchTerm) return true;
    const searchLower = filters.searchTerm.toLowerCase();
    return (
      log.description.toLowerCase().includes(searchLower) ||
      log.admin_email.toLowerCase().includes(searchLower) ||
      log.action_type.toLowerCase().includes(searchLower) ||
      log.target_type.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <p className="text-red-600">Failed to load audit logs</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Audit Log</h2>
        <p className="text-gray-600">Track all administrative actions and system changes</p>
      </div>

      {/* Filter Controls */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Action Type
            </label>
            <select
              value={filters.actionType}
              onChange={(e) => handleFilterChange('actionType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Actions</option>
              <option value="vendor_approval">Vendor Approval</option>
              <option value="vendor_rejection">Vendor Rejection</option>
              <option value="review_moderation">Review Moderation</option>
              <option value="user_suspension">User Suspension</option>
              <option value="user_activation">User Activation</option>
              <option value="subscription_change">Subscription Change</option>
              <option value="content_moderation">Content Moderation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Type
            </label>
            <select
              value={filters.targetType}
              onChange={(e) => handleFilterChange('targetType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Types</option>
              <option value="vendor">Vendor</option>
              <option value="review">Review</option>
              <option value="user">User</option>
              <option value="wedding">Wedding</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin User ID
            </label>
            <input
              type="number"
              value={filters.adminUserId}
              onChange={(e) => handleFilterChange('adminUserId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter user ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Search logs..."
            />
          </div>

          <div className="flex items-end">
            <Button
              onClick={clearFilters}
              variant="outline"
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Logs List */}
      <div className="space-y-3 mb-6">
        {filteredLogs.map((log) => (
          <Card key={log.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {getActionBadge(log.action_type)}
                  {getTargetTypeBadge(log.target_type)}
                  <span className="text-sm text-gray-500">
                    Target ID: {log.target_id}
                  </span>
                </div>
                
                <p className="text-gray-900 mb-2">{log.description}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Admin:</span> {log.admin_email}
                  </div>
                  <div>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Log ID:</span> {log.id}
                  </div>
                </div>

                {log.action_metadata && formatMetadata(log.action_metadata)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No Audit Logs Found</h3>
          <p className="text-gray-600">
            {Object.values(filters).some(f => f) 
              ? 'No logs match your current filters. Try adjusting your search criteria.'
              : 'No administrative actions have been logged yet.'
            }
          </p>
        </Card>
      )}

      {/* Pagination */}
      {logsData && logsData.total > pageSize && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {currentPage * pageSize + 1} to{' '}
            {Math.min((currentPage + 1) * pageSize, logsData.total)} of{' '}
            {logsData.total} logs
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              variant="outline"
            >
              Previous
            </Button>
            <Button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!logsData.has_more}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Export Options */}
      <Card className="p-4 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Export Audit Logs</h3>
            <p className="text-sm text-gray-600">Download audit logs for compliance and reporting</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // In a real implementation, this would trigger a CSV export
                alert('CSV export functionality would be implemented here');
              }}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // In a real implementation, this would trigger a JSON export
                alert('JSON export functionality would be implemented here');
              }}
            >
              Export JSON
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};