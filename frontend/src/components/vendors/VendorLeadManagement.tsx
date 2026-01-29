import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Mail, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  Filter,
  Search,
  MessageSquare,
  Phone,
  User
} from 'lucide-react';
import { 
  LeadResponse, 
  LeadStatus, 
  LeadStatusUpdateRequest,
  VendorLeadsParams,
  vendorApi 
} from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface LeadWithCoupleInfo extends LeadResponse {
  couple_name?: string;
  couple_email?: string;
}

const VendorLeadManagement: React.FC = () => {
  const [leads, setLeads] = useState<LeadWithCoupleInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    skip: 0,
    limit: 20,
    hasMore: true
  });

  useEffect(() => {
    loadLeads();
  }, [selectedStatus]);

  const loadLeads = async (skip = 0) => {
    setLoading(true);
    try {
      const params: VendorLeadsParams = {
        skip,
        limit: pagination.limit
      };
      
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const leadsData = await vendorApi.getMyLeads(params);
      
      if (skip === 0) {
        setLeads(leadsData);
      } else {
        setLeads(prev => [...prev, ...leadsData]);
      }
      
      setPagination(prev => ({
        ...prev,
        skip,
        hasMore: leadsData.length === pagination.limit
      }));
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (leadId: number, newStatus: LeadStatus) => {
    setUpdating(leadId);
    try {
      const updateData: LeadStatusUpdateRequest = { status: newStatus };
      const updatedLead = await vendorApi.updateLeadStatus(leadId, updateData);
      
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, status: updatedLead.status } : lead
      ));
    } catch (error) {
      console.error('Failed to update lead status:', error);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'contacted':
        return 'bg-yellow-100 text-yellow-800';
      case 'converted':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return <Mail className="h-4 w-4" />;
      case 'contacted':
        return <MessageSquare className="h-4 w-4" />;
      case 'converted':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      lead.message.toLowerCase().includes(searchLower) ||
      (lead.couple_name && lead.couple_name.toLowerCase().includes(searchLower)) ||
      (lead.budget_range && lead.budget_range.toLowerCase().includes(searchLower))
    );
  });

  const getStatusOptions = (currentStatus: LeadStatus): LeadStatus[] => {
    switch (currentStatus) {
      case 'new':
        return ['contacted', 'closed'];
      case 'contacted':
        return ['converted', 'closed'];
      case 'converted':
        return ['closed'];
      case 'closed':
        return [];
      default:
        return [];
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6 mb-4">
              <div className="h-6 bg-secondary-200 rounded mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-secondary-200 rounded"></div>
                <div className="h-4 bg-secondary-200 rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-xl font-semibold text-secondary-900">
            Lead Management
          </h2>
          <p className="text-secondary-600 mt-1">
            Manage inquiries from couples interested in your services
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-secondary-500" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as LeadStatus | 'all')}
              className="px-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Leads</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </Card>

      {/* Leads List */}
      {filteredLeads.length > 0 ? (
        <div className="space-y-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Lead Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(lead.status)}`}>
                        {getStatusIcon(lead.status)}
                        {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                      </div>
                      <span className="text-sm text-secondary-500">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Couple Info */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-secondary-500" />
                      <span className="font-medium text-secondary-900">
                        {lead.couple_name || 'Couple'}
                      </span>
                    </div>
                    {lead.couple_email && (
                      <div className="flex items-center gap-2 text-sm text-secondary-600">
                        <Mail className="h-4 w-4" />
                        {lead.couple_email}
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="mb-4">
                    <h4 className="font-medium text-secondary-900 mb-2">Message:</h4>
                    <p className="text-secondary-700 bg-secondary-50 p-3 rounded-md">
                      {lead.message}
                    </p>
                  </div>

                  {/* Additional Info */}
                  <div className="flex flex-wrap gap-4 text-sm">
                    {lead.budget_range && (
                      <div className="flex items-center gap-2 text-secondary-600">
                        <DollarSign className="h-4 w-4" />
                        <span>Budget: {lead.budget_range}</span>
                      </div>
                    )}
                    {lead.event_date && (
                      <div className="flex items-center gap-2 text-secondary-600">
                        <Calendar className="h-4 w-4" />
                        <span>Event: {new Date(lead.event_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="lg:w-48 flex flex-col gap-2">
                  <h4 className="font-medium text-secondary-900 mb-2">Actions:</h4>
                  
                  {getStatusOptions(lead.status).map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusUpdate(lead.id, status)}
                      loading={updating === lead.id}
                      disabled={updating === lead.id}
                      className="justify-start"
                    >
                      {getStatusIcon(status)}
                      <span className="ml-2">
                        Mark as {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </Button>
                  ))}

                  {lead.couple_email && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => window.location.href = `mailto:${lead.couple_email}`}
                      className="justify-start"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Email
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Load More */}
          {pagination.hasMore && (
            <div className="text-center pt-4">
              <Button
                onClick={() => loadLeads(pagination.skip + pagination.limit)}
                loading={loading}
                variant="outline"
              >
                Load More Leads
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            {selectedStatus === 'all' ? 'No leads yet' : `No ${selectedStatus} leads`}
          </h3>
          <p className="text-secondary-600 mb-4">
            {selectedStatus === 'all' 
              ? 'Leads from couples will appear here when they contact you'
              : `You don't have any ${selectedStatus} leads at the moment`
            }
          </p>
          {selectedStatus !== 'all' && (
            <Button onClick={() => setSelectedStatus('all')} variant="outline">
              View All Leads
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default VendorLeadManagement;