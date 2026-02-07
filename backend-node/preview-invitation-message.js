const { query } = require('./config/database');
const invitationService = require('./services/invitationService');

async function previewInvitationMessage() {
  console.log('=== INVITATION MESSAGE PREVIEW ===');
  console.log('');
  
  try {
    // Get the first wedding with a guest
    const weddingResult = await query(`
      SELECT w.*, COUNT(g.id) as guest_count 
      FROM weddings w 
      LEFT JOIN guests g ON w.id = g.wedding_id 
      GROUP BY w.id 
      HAVING guest_count > 0 
      LIMIT 1
    `);
    
    if (weddingResult.rows.length === 0) {
      console.log('❌ No weddings with guests found');
      return;
    }
    
    const wedding = weddingResult.rows[0];
    
    console.log('📋 Wedding Information:');
    console.log('- ID:', wedding.id);
    console.log('- Code:', wedding.wedding_code);
    console.log('- Date:', wedding.wedding_date);
    console.log('- Venue:', wedding.venue_name);
    console.log('- Address:', wedding.venue_address);
    console.log('');
    
    // Parse customization
    let customization = {};
    if (wedding.invitation_customization) {
      try {
        customization = typeof wedding.invitation_customization === 'string' 
          ? JSON.parse(wedding.invitation_customization) 
          : wedding.invitation_customization;
        
        console.log('📝 Invitation Customization:');
        console.log(JSON.stringify(customization, null, 2));
        console.log('');
      } catch (e) {
        console.log('⚠️ No customization data or failed to parse');
        console.log('');
      }
    } else {
      console.log('⚠️ No invitation customization found');
      console.log('You need to customize your invitation template first!');
      console.log('');
    }
    
    // Get a sample guest
    const guestResult = await query('SELECT * FROM guests WHERE wedding_id = ? LIMIT 1', [wedding.id]);
    if (guestResult.rows.length === 0) {
      console.log('❌ No guests found for this wedding');
      return;
    }
    
    const guest = guestResult.rows[0];
    
    // Generate unique code if needed
    let guestCode = guest.unique_code;
    if (!guestCode) {
      guestCode = 'SAMPLE1234'; // Use sample for preview
    }
    
    // Generate invitation URL
    const invitationUrl = invitationService.generateInvitationUrl(wedding.wedding_code, guestCode);
    
    // Build the message (same logic as invitationService)
    let message = "You're invited";
    
    if (customization.wedding_title) {
      message += ` to ${customization.wedding_title}`;
    }
    message += "!\n\n";
    
    if (customization.ceremony_date) {
      message += `Date: ${customization.ceremony_date}`;
      if (customization.ceremony_time) {
        message += ` at ${customization.ceremony_time}`;
      }
      message += "\n";
    }
    
    if (customization.venue_name) {
      message += `Venue: ${customization.venue_name}\n`;
    }
    
    if (customization.venue_address) {
      message += `Address: ${customization.venue_address}\n`;
    }
    
    message += `\nView invitation: ${invitationUrl}`;
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📱 SMS MESSAGE PREVIEW');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(message);
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Message Stats:');
    console.log('- Length:', message.length, 'characters');
    console.log('- Estimated SMS parts:', Math.ceil(message.length / 160));
    console.log('- Guest:', guest.name);
    console.log('- Phone:', guest.phone || 'No phone number');
    console.log('');
    
    // Check for special characters
    const hasSpecialChars = /[^\x00-\x7F]/.test(message);
    if (hasSpecialChars) {
      console.log('⚠️ WARNING: Message contains non-ASCII characters');
      console.log('This might cause encoding issues with some SMS providers');
    } else {
      console.log('✅ Message uses only ASCII characters (safe for SMS)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

previewInvitationMessage().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
