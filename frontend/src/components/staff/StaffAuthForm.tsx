import React, { useState } from 'react';
import { Button } from '../ui/Button';

interface StaffAuthFormProps {
  onAuthSuccess: (session: {
    sessionToken: string;
    weddingId: number;
    expiresIn: number;
  }) => void;
}

interface StaffVerificationRequest {
  wedding_code: string;
  staff_pin: string;
}

interface StaffSessionResponse {
  session_token: string;
  wedding_id: number;
  expires_in: number;
}

const StaffAuthForm: React.FC<StaffAuthFormProps> = ({ onAuthSuccess }) => {
  const [formData, setFormData] = useState<StaffVerificationRequest>({
    wedding_code: '',
    staff_pin: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value.toUpperCase() // Convert to uppercase for wedding code
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/staff/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Authentication failed');
      }

      const sessionData: StaffSessionResponse = await response.json();
      
      onAuthSuccess({
        sessionToken: sessionData.session_token,
        weddingId: sessionData.wedding_id,
        expiresIn: sessionData.expires_in
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="wedding_code" className="block text-sm font-medium text-gray-700 mb-2">
          Wedding Code
        </label>
        <input
          type="text"
          id="wedding_code"
          name="wedding_code"
          value={formData.wedding_code}
          onChange={handleInputChange}
          maxLength={4}
          placeholder="e.g., AB92"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-wider"
          required
        />
      </div>

      <div>
        <label htmlFor="staff_pin" className="block text-sm font-medium text-gray-700 mb-2">
          Staff PIN
        </label>
        <input
          type="password"
          id="staff_pin"
          name="staff_pin"
          value={formData.staff_pin}
          onChange={handleInputChange}
          maxLength={6}
          placeholder="6-digit PIN"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-wider"
          required
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading || formData.wedding_code.length !== 4 || formData.staff_pin.length !== 6}
        className="w-full"
      >
        {isLoading ? 'Verifying...' : 'Access Check-In System'}
      </Button>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Enter the 4-character wedding code and 6-digit PIN provided by the couple
        </p>
      </div>
    </form>
  );
};

export default StaffAuthForm;