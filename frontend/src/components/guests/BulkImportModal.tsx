import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { guestApi, GuestCreateRequest, BulkGuestImportResponse } from '../../lib/api';

interface BulkImportModalProps {
  weddingId: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({ weddingId, onClose, onSuccess }) => {
  const [importMethod, setImportMethod] = useState<'manual' | 'csv'>('manual');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualGuests, setManualGuests] = useState<GuestCreateRequest[]>([
    { name: '', email: '', phone: '', table_number: undefined, dietary_restrictions: '' }
  ]);
  const [importResult, setImportResult] = useState<BulkGuestImportResponse | null>(null);

  const queryClient = useQueryClient();

  const bulkImportMutation = useMutation({
    mutationFn: (data: { guests: GuestCreateRequest[] }) => guestApi.bulkImportGuests(weddingId, data),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Failed to import guests:', error);
    },
  });

  const csvImportMutation = useMutation({
    mutationFn: (file: File) => guestApi.bulkImportGuestsCSV(weddingId, file),
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ['guests', weddingId] });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error('Failed to import CSV:', error);
    },
  });

  const handleAddManualGuest = () => {
    setManualGuests(prev => [
      ...prev,
      { name: '', email: '', phone: '', table_number: undefined, dietary_restrictions: '' }
    ]);
  };

  const handleRemoveManualGuest = (index: number) => {
    setManualGuests(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualGuestChange = (index: number, field: keyof GuestCreateRequest, value: string | number | undefined) => {
    setManualGuests(prev => prev.map((guest, i) => 
      i === index ? { ...guest, [field]: value } : guest
    ));
  };

  const handleManualImport = () => {
    const validGuests = manualGuests.filter(guest => guest.name.trim());
    if (validGuests.length === 0) {
      alert('Please add at least one guest with a name.');
      return;
    }

    const processedGuests = validGuests.map(guest => ({
      name: guest.name.trim(),
      email: guest.email?.trim() || undefined,
      phone: guest.phone?.trim() || undefined,
      table_number: guest.table_number || undefined,
      dietary_restrictions: guest.dietary_restrictions?.trim() || undefined,
    }));

    bulkImportMutation.mutate({ guests: processedGuests });
  };

  const handleCsvImport = () => {
    if (!csvFile) {
      alert('Please select a CSV file.');
      return;
    }

    csvImportMutation.mutate(csvFile);
  };

  const downloadSampleCSV = () => {
    const csvContent = `name,email,phone,table_number,dietary_restrictions
John Doe,john@example.com,+251911123456,1,Vegetarian
Jane Smith,jane@example.com,+251911654321,2,No allergies
Bob Johnson,,+251911987654,1,Gluten-free`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'guest_import_sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const isLoading = bulkImportMutation.isPending || csvImportMutation.isPending;
  const error = bulkImportMutation.error || csvImportMutation.error;

  if (importResult) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <Card className="border-0 shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import Results</CardTitle>
                  <CardDescription>
                    Summary of your guest import operation
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-900">{importResult.total_guests}</p>
                    <p className="text-sm text-blue-700">Total Processed</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-900">{importResult.successful_imports}</p>
                    <p className="text-sm text-green-700">Successful</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-900">{importResult.failed_imports}</p>
                    <p className="text-sm text-red-700">Failed</p>
                  </div>
                </div>

                {/* Errors */}
                {importResult.errors.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-900 mb-2">Import Errors:</h4>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 max-h-40 overflow-y-auto">
                      <ul className="text-sm text-red-700 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Success Message */}
                {importResult.successful_imports > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <p className="text-green-800">
                      Successfully imported {importResult.successful_imports} guest{importResult.successful_imports !== 1 ? 's' : ''}!
                      QR codes have been generated for all imported guests.
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={onClose}>Close</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bulk Import Guests</CardTitle>
                <CardDescription>
                  Import multiple guests at once using manual entry or CSV file
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Import Method Selection */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-3">
                  Import Method
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="manual"
                      checked={importMethod === 'manual'}
                      onChange={(e) => setImportMethod(e.target.value as 'manual')}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    Manual Entry
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="csv"
                      checked={importMethod === 'csv'}
                      onChange={(e) => setImportMethod(e.target.value as 'csv')}
                      className="mr-2"
                      disabled={isLoading}
                    />
                    CSV File Upload
                  </label>
                </div>
              </div>

              {/* Manual Entry */}
              {importMethod === 'manual' && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-secondary-900">Guest List</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddManualGuest}
                      disabled={isLoading}
                    >
                      Add Guest
                    </Button>
                  </div>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {manualGuests.map((guest, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-start p-3 border border-secondary-200 rounded-md">
                        <div className="col-span-3">
                          <input
                            type="text"
                            placeholder="Name *"
                            value={guest.name}
                            onChange={(e) => handleManualGuestChange(index, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="email"
                            placeholder="Email"
                            value={guest.email || ''}
                            onChange={(e) => handleManualGuestChange(index, 'email', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="tel"
                            placeholder="Phone"
                            value={guest.phone || ''}
                            onChange={(e) => handleManualGuestChange(index, 'phone', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            placeholder="Table"
                            value={guest.table_number || ''}
                            onChange={(e) => handleManualGuestChange(index, 'table_number', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            min={1}
                            max={1000}
                            disabled={isLoading}
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Dietary restrictions"
                            value={guest.dietary_restrictions || ''}
                            onChange={(e) => handleManualGuestChange(index, 'dietary_restrictions', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-secondary-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                            disabled={isLoading}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveManualGuest(index)}
                            disabled={isLoading || manualGuests.length === 1}
                            className="text-red-600 hover:text-red-700"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CSV Upload */}
              {importMethod === 'csv' && (
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-secondary-700 mb-2">
                        CSV File
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                        className="w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        disabled={isLoading}
                      />
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <h5 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h5>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Required columns: name, email, phone, table_number, dietary_restrictions</li>
                        <li>• Name is required, other fields are optional</li>
                        <li>• Table number should be a number between 1-1000</li>
                        <li>• Use standard CSV format with comma separators</li>
                      </ul>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadSampleCSV}
                        className="mt-3"
                      >
                        Download Sample CSV
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={importMethod === 'manual' ? handleManualImport : handleCsvImport}
                  loading={isLoading}
                  disabled={isLoading || (importMethod === 'csv' && !csvFile)}
                  className="flex-1"
                >
                  {isLoading ? 'Importing...' : 'Import Guests'}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">
                    Failed to import guests. Please check your data and try again.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BulkImportModal;