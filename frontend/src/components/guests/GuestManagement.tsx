import React, { useState } from 'react';
import GuestList from './GuestList';
import GuestForm from './GuestForm';
import CommunicationCenter from '../communication/CommunicationCenter';
import { Guest } from '../../lib/api';
import { Button } from '../ui/Button';

interface GuestManagementProps {
  weddingId: number;
}

type ActiveView = 'guests' | 'communication';

const GuestManagement: React.FC<GuestManagementProps> = ({ weddingId }) => {
  const [activeView, setActiveView] = useState<ActiveView>('guests');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  const handleAddGuest = () => {
    setShowAddForm(true);
  };

  const handleEditGuest = (guest: Guest) => {
    setEditingGuest(guest);
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setEditingGuest(null);
  };

  if (activeView === 'communication') {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setActiveView('guests')}
          >
            ← Back to Guest List
          </Button>
        </div>
        <CommunicationCenter weddingId={weddingId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <Button
          onClick={() => setActiveView('communication')}
          className="flex items-center space-x-2"
        >
          <span>📱</span>
          <span>Send Invitations</span>
        </Button>
      </div>

      <GuestList
        weddingId={weddingId}
        onAddGuest={handleAddGuest}
        onEditGuest={handleEditGuest}
      />

      {/* Add/Edit Guest Form Modal */}
      {(showAddForm || editingGuest) && (
        <GuestForm
          weddingId={weddingId}
          guest={editingGuest || undefined}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
};

export default GuestManagement;