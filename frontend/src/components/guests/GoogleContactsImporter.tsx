import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';

interface Contact {
  name: string;
  email: string | null;
  phone: string | null;
  selected?: boolean;
}

interface GoogleContactsImporterProps {
  weddingId: number;
  onImportComplete: () => void;
  onClose: () => void;
}

const GoogleContactsImporter: React.FC<GoogleContactsImporterProps> = ({
  weddingId,
  onImportComplete,
  onClose
}) => {
  const [step, setStep] = useState<'auth' | 'loading' | 'select' | 'importing' | 'complete'>('auth');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const [deletingGuests, setDeletingGuests] = useState<Set<number>>(new Set());

  // Check for OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleSession = params.get('google_session');
    const googleError = params.get('google_error');
    const urlWeddingId = params.get('wedding_id');

    if (googleError) {
      setError(`Authentication failed: ${googleError}`);
      setStep('auth');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (googleSession && urlWeddingId === weddingId.toString()) {
      setSessionId(googleSession);
      setStep('loading');
      fetchContacts(googleSession);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [weddingId]);

  // Filter contacts based on search
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredContacts(contacts);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredContacts(
        contacts.filter(
          contact =>
            contact.name.toLowerCase().includes(term) ||
            contact.email?.toLowerCase().includes(term) ||
            contact.phone?.includes(term)
        )
      );
    }
  }, [searchTerm, contacts]);

  const handleAuthClick = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      
      const response = await fetch(`/api/google/auth?weddingId=${weddingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to initiate Google authentication');
      }

      const data = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to start authentication');
    }
  };

  const fetchContacts = async (session: string) => {
    try {
      setError(null);
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      
      const response = await fetch(`/api/google/contacts?sessionId=${session}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      const contactsWithSelection = data.contacts.map((c: Contact) => ({ ...c, selected: false }));
      setContacts(contactsWithSelection);
      setFilteredContacts(contactsWithSelection);
      setStep('select');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contacts');
      setStep('auth');
    }
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    const updatedContacts = contacts.map(c => ({ ...c, selected: newSelectAll }));
    setContacts(updatedContacts);
    setFilteredContacts(updatedContacts.filter(c => 
      searchTerm === '' || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
    ));
  };

  const handleToggleContact = (contactToToggle: Contact) => {
    const newContacts = contacts.map(c => 
      c === contactToToggle ? { ...c, selected: !c.selected } : c
    );
    setContacts(newContacts);
    setSelectAll(newContacts.every(c => c.selected));
    
    // Update filtered contacts as well
    setFilteredContacts(newContacts.filter(c => 
      searchTerm === '' || 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.includes(searchTerm)
    ));
  };

  const handleImport = async () => {
    try {
      setError(null);
      setStep('importing');
      
      const selectedContacts = contacts.filter(c => c.selected);
      
      if (selectedContacts.length === 0) {
        setError('Please select at least one contact to import');
        setStep('select');
        return;
      }

      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      
      const response = await fetch('/api/google/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          weddingId,
          contacts: selectedContacts.map(({ selected, ...contact }) => contact)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to import contacts');
      }

      const results = await response.json();
      setImportResults(results);
      setStep('complete');
    } catch (err: any) {
      setError(err.message || 'Failed to import contacts');
      setStep('select');
    }
  };

  const handleComplete = () => {
    onImportComplete();
    onClose();
  };

  const handleDeleteGuest = async (guestId: number) => {
    if (!window.confirm('Are you sure you want to remove this guest?')) {
      return;
    }

    try {
      setDeletingGuests(prev => new Set(prev).add(guestId));
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      
      const response = await fetch(`/api/v1/guests/${guestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete guest');
      }

      // Remove from imported list
      setImportResults((prev: any) => ({
        ...prev,
        imported: prev.imported.filter((g: any) => g.id !== guestId),
        successful: prev.successful - 1
      }));

      // Refresh guest list
      onImportComplete();
    } catch (err: any) {
      alert(err.message || 'Failed to delete guest');
    } finally {
      setDeletingGuests(prev => {
        const newSet = new Set(prev);
        newSet.delete(guestId);
        return newSet;
      });
    }
  };

  const handleBulkDelete = async (guestIds: number[]) => {
    if (!window.confirm(`Are you sure you want to remove all ${guestIds.length} imported guests?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('access_token');
      
      // Delete all guests
      const deletePromises = guestIds.map(guestId =>
        fetch(`/api/v1/guests/${guestId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
      );

      await Promise.all(deletePromises);

      // Clear imported list
      setImportResults((prev: any) => ({
        ...prev,
        imported: [],
        successful: 0
      }));

      // Refresh guest list
      onImportComplete();
    } catch (err: any) {
      alert(err.message || 'Failed to delete guests');
    }
  };

  const selectedCount = contacts.filter(c => c.selected).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import from Google Contacts</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {step === 'auth' && 'Connect your Google account'}
                {step === 'loading' && 'Loading your contacts...'}
                {step === 'select' && `${contacts.length} contacts found`}
                {step === 'importing' && 'Importing selected contacts...'}
                {step === 'complete' && 'Import complete!'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Auth Step */}
          {step === 'auth' && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"/>
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Connect to Google</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Sign in with your Google account to import contacts. We'll only access your contacts (read-only).
              </p>
              <Button onClick={handleAuthClick} className="bg-blue-600 hover:bg-blue-700 text-white">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.283 10.356h-8.327v3.451h4.792c-.446 2.193-2.313 3.453-4.792 3.453a5.27 5.27 0 0 1-5.279-5.28 5.27 5.27 0 0 1 5.279-5.279c1.259 0 2.397.447 3.29 1.178l2.6-2.599c-1.584-1.381-3.615-2.233-5.89-2.233a8.908 8.908 0 0 0-8.934 8.934 8.907 8.907 0 0 0 8.934 8.934c4.467 0 8.529-3.249 8.529-8.934 0-.528-.081-1.097-.202-1.625z"/>
                </svg>
                Sign in with Google
              </Button>
            </div>
          )}

          {/* Loading Step */}
          {step === 'loading' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading your contacts...</p>
            </div>
          )}

          {/* Select Step */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Search and Select All */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <Button
                  onClick={handleSelectAll}
                  variant="outline"
                  className="whitespace-nowrap"
                >
                  {selectAll ? 'Deselect All' : 'Select All'}
                </Button>
              </div>

              {/* Contacts List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      No contacts found
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <div
                        key={`${contact.name}-${contact.email}-${contact.phone}`}
                        className="flex items-center space-x-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 last:border-b-0 cursor-pointer"
                        onClick={() => handleToggleContact(contact)}
                      >
                        <input
                          type="checkbox"
                          checked={contact.selected || false}
                          onChange={() => handleToggleContact(contact)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{contact.name}</p>
                          <div className="flex items-center space-x-4 text-sm text-slate-500 dark:text-slate-400">
                            {contact.email && (
                              <span className="truncate">{contact.email}</span>
                            )}
                            {contact.phone && (
                              <span>{contact.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedCount > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedCount} contact{selectedCount !== 1 ? 's' : ''} selected for import
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Importing Step */}
          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Importing {selectedCount} contacts...</p>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && importResults && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Import Complete!</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Successfully imported {importResults.successful} of {importResults.total} contacts
                </p>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{importResults.successful}</p>
                  <p className="text-sm text-green-700 dark:text-green-300">Imported</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{importResults.skipped}</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">Skipped</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{importResults.failed}</p>
                  <p className="text-sm text-red-700 dark:text-red-300">Failed</p>
                </div>
              </div>

              {/* Imported Guests List */}
              {importResults.imported && importResults.imported.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      Imported Guests ({importResults.imported.length})
                    </p>
                    <Button
                      onClick={() => {
                        const guestIds = importResults.imported.map((g: any) => g.id);
                        handleBulkDelete(guestIds);
                      }}
                      variant="outline"
                      className="text-xs text-red-600 dark:text-red-400 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Remove All
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {importResults.imported.map((guest: any) => (
                      <div
                        key={guest.id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">{guest.name}</p>
                          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                            {guest.email && <span className="truncate">{guest.email}</span>}
                            {guest.phone && <span>{guest.phone}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGuest(guest.id)}
                          className="ml-3 p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove guest"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {importResults.errors && importResults.errors.length > 0 && (
                <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">Issues:</p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                    {importResults.errors.slice(0, 10).map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                    {importResults.errors.length > 10 && (
                      <li className="text-slate-500 dark:text-slate-500">
                        ... and {importResults.errors.length - 10} more
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-end space-x-3">
          {step === 'select' && (
            <>
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Import {selectedCount > 0 && `(${selectedCount})`}
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={handleComplete} className="bg-green-600 hover:bg-green-700 text-white">
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleContactsImporter;
