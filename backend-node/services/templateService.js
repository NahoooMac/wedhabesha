/**
 * Template Service
 * Manages invitation templates and their configurations
 */

class TemplateService {
  /**
   * Get all available invitation templates
   * @returns {Array} List of templates with metadata
   */
  getTemplates() {
    return [
      {
        id: 'elegant',
        name: 'Elegant',
        description: 'Floral background with gold accents',
        thumbnailUrl: '/templates/elegant/thumbnail.png',
        backgroundUrl: '/templates/elegant/background.png',
        defaultConfig: {
          textColor: '#FFFFFF',
          fontSize: 'medium',
          textPosition: 'center',
          qrPosition: 'bottom-center'
        }
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Minimalist geometric patterns',
        thumbnailUrl: '/templates/modern/thumbnail.png',
        backgroundUrl: '/templates/modern/background.png',
        defaultConfig: {
          textColor: '#000000',
          fontSize: 'medium',
          textPosition: 'top',
          qrPosition: 'bottom-right'
        }
      },
      {
        id: 'traditional',
        name: 'Traditional',
        description: 'Ethiopian cultural motifs',
        thumbnailUrl: '/templates/traditional/thumbnail.png',
        backgroundUrl: '/templates/traditional/background.png',
        defaultConfig: {
          textColor: '#FFFFFF',
          fontSize: 'large',
          textPosition: 'center',
          qrPosition: 'bottom-center'
        }
      }
    ];
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template identifier
   * @returns {Object|null} Template object or null if not found
   */
  getTemplateById(templateId) {
    const templates = this.getTemplates();
    return templates.find(t => t.id === templateId) || null;
  }

  /**
   * Validate template configuration
   * @param {Object} config - Template customization configuration
   * @returns {Object} Validation result with errors array
   */
  validateConfig(config) {
    const errors = [];
    
    // Required fields
    if (!config.wedding_title || config.wedding_title.trim() === '') {
      errors.push('Wedding title is required');
    }
    if (!config.ceremony_date || config.ceremony_date.trim() === '') {
      errors.push('Ceremony date is required');
    }
    if (!config.ceremony_time || config.ceremony_time.trim() === '') {
      errors.push('Ceremony time is required');
    }
    if (!config.venue_name || config.venue_name.trim() === '') {
      errors.push('Venue name is required');
    }
    if (!config.venue_address || config.venue_address.trim() === '') {
      errors.push('Venue address is required');
    }
    
    // Validate font size (optional, for backward compatibility)
    const validFontSizes = ['small', 'medium', 'large'];
    if (config.font_size && !validFontSizes.includes(config.font_size)) {
      errors.push('Invalid font size. Must be small, medium, or large');
    }
    
    // Validate text position (optional, for backward compatibility)
    const validPositions = ['top', 'center', 'bottom'];
    if (config.text_position && !validPositions.includes(config.text_position)) {
      errors.push('Invalid text position. Must be top, center, or bottom');
    }
    
    // Validate QR position
    const validQRPositions = ['bottom-left', 'bottom-center', 'bottom-right'];
    if (config.qr_position && !validQRPositions.includes(config.qr_position)) {
      errors.push('Invalid QR position. Must be bottom-left, bottom-center, or bottom-right');
    }
    
    // Validate text color (hex format) - optional, for backward compatibility
    if (config.text_color && !/^#[0-9A-F]{6}$/i.test(config.text_color)) {
      errors.push('Invalid text color. Must be a valid hex color code (e.g., #FFFFFF)');
    }
    
    // Validate textElements if present (new per-section styling format)
    if (config.textElements) {
      const validAlignments = ['left', 'center', 'right'];
      const sections = ['title', 'guestName', 'message', 'details'];
      
      sections.forEach(section => {
        const element = config.textElements[section];
        if (element) {
          // Validate alignment
          if (element.align && !validAlignments.includes(element.align)) {
            errors.push(`Invalid alignment for ${section}. Must be left, center, or right`);
          }
          
          // Validate color (hex format)
          if (element.color && !/^#[0-9A-F]{6}$/i.test(element.color)) {
            errors.push(`Invalid color for ${section}. Must be a valid hex color code`);
          }
          
          // Validate size (must be a number between 12 and 48)
          if (element.size && (typeof element.size !== 'number' || element.size < 12 || element.size > 48)) {
            errors.push(`Invalid size for ${section}. Must be a number between 12 and 48`);
          }
          
          // Validate yOffset (must be a number between -50 and 50)
          if (element.yOffset !== undefined && (typeof element.yOffset !== 'number' || element.yOffset < -50 || element.yOffset > 50)) {
            errors.push(`Invalid yOffset for ${section}. Must be a number between -50 and 50`);
          }
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default customization for a template
   * @param {string} templateId - Template identifier
   * @returns {Object} Default customization settings
   */
  getDefaultCustomization(templateId) {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return null;
    }
    
    return {
      wedding_title: '',
      ceremony_date: '',
      ceremony_time: '',
      venue_name: '',
      venue_address: '',
      custom_message: 'Join us for our special day',
      text_color: template.defaultConfig.textColor,
      font_size: template.defaultConfig.fontSize,
      text_position: template.defaultConfig.textPosition,
      qr_position: template.defaultConfig.qrPosition
    };
  }
}

module.exports = new TemplateService();
