const axios = require('axios');

/**
 * Google Contacts Service
 * Handles OAuth authentication and contact retrieval from Google People API
 */

class GoogleContactsService {
  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback';
    this.scopes = [
      'https://www.googleapis.com/auth/contacts.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ];
  }

  /**
   * Generate Google OAuth authorization URL
   * @param {string} state - State parameter for CSRF protection
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(state) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      state: state,
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * @param {string} code - Authorization code from Google
   * @returns {Promise<Object>} Token response
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      });

      return response.data;
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to exchange authorization code for token');
    }
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} New token response
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token'
      });

      return response.data;
    } catch (error) {
      console.error('Error refreshing access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Fetch contacts from Google People API
   * @param {string} accessToken - Google access token
   * @param {number} pageSize - Number of contacts per page (max 1000)
   * @param {string} pageToken - Token for pagination
   * @returns {Promise<Object>} Contacts response
   */
  async fetchContacts(accessToken, pageSize = 1000, pageToken = null) {
    try {
      const params = {
        personFields: 'names,emailAddresses,phoneNumbers',
        pageSize: Math.min(pageSize, 1000)
      };

      if (pageToken) {
        params.pageToken = pageToken;
      }

      const response = await axios.get('https://people.googleapis.com/v1/people/me/connections', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        params
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching contacts:', error.response?.data || error.message);
      throw new Error('Failed to fetch contacts from Google');
    }
  }

  /**
   * Fetch all contacts (handles pagination)
   * @param {string} accessToken - Google access token
   * @returns {Promise<Array>} All contacts
   */
  async fetchAllContacts(accessToken) {
    let allContacts = [];
    let pageToken = null;

    try {
      do {
        const response = await this.fetchContacts(accessToken, 1000, pageToken);
        
        if (response.connections) {
          allContacts = allContacts.concat(response.connections);
        }

        pageToken = response.nextPageToken;
      } while (pageToken);

      return allContacts;
    } catch (error) {
      console.error('Error fetching all contacts:', error);
      throw error;
    }
  }

  /**
   * Transform Google contact to guest format
   * @param {Object} contact - Google contact object
   * @returns {Object} Guest-formatted contact
   */
  transformContactToGuest(contact) {
    const guest = {
      name: null,
      email: null,
      phone: null
    };

    // Extract name
    if (contact.names && contact.names.length > 0) {
      const name = contact.names[0];
      guest.name = name.displayName || `${name.givenName || ''} ${name.familyName || ''}`.trim();
    }

    // Extract primary email
    if (contact.emailAddresses && contact.emailAddresses.length > 0) {
      const primaryEmail = contact.emailAddresses.find(e => e.metadata?.primary) || contact.emailAddresses[0];
      guest.email = primaryEmail.value;
    }

    // Extract primary phone
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      const primaryPhone = contact.phoneNumbers.find(p => p.metadata?.primary) || contact.phoneNumbers[0];
      guest.phone = primaryPhone.value;
    }

    return guest;
  }

  /**
   * Transform multiple contacts to guest format
   * @param {Array} contacts - Array of Google contacts
   * @returns {Array} Array of guest-formatted contacts
   */
  transformContactsToGuests(contacts) {
    return contacts
      .map(contact => this.transformContactToGuest(contact))
      .filter(guest => guest.name); // Only include contacts with names
  }
}

module.exports = new GoogleContactsService();
