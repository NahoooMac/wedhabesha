const { query } = require('./config/database');

async function addWeddingCustomization() {
  console.log('=== ADD WEDDING CUSTOMIZATION ===');
  console.log('');
  
  try {
    // Get the first wedding
    const weddingResult = await query('SELECT * FROM weddings LIMIT 1');
    
    if (weddingResult.rows.length === 0) {
      console.log('❌ No weddings found');
      return;
    }
    
    const wedding = weddingResult.rows[0];
    
    console.log('Found wedding:');
    console.log('- ID:', wedding.id);
    console.log('- Code:', wedding.wedding_code);
    console.log('- Date:', wedding.wedding_date);
    console.log('- Venue:', wedding.venue_name);
    console.log('');
    
    // Create sample customization
    const customization = {
      wedding_title: "Sarah & John's Wedding",
      ceremony_date: "December 25, 2024",
      ceremony_time: "3:00 PM",
      venue_name: wedding.venue_name || "Skyline Hotel",
      venue_address: wedding.venue_address || "Bole Road, Addis Ababa"
    };
    
    console.log('Sample customization to add:');
    console.log(JSON.stringify(customization, null, 2));
    console.log('');
    
    // Update the wedding
    await query(
      'UPDATE weddings SET invitation_customization = ? WHERE id = ?',
      [JSON.stringify(customization), wedding.id]
    );
    
    console.log('✅ Wedding customization added!');
    console.log('');
    console.log('Now the SMS will look like:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log(`You're invited to ${customization.wedding_title}!`);
    console.log('');
    console.log(`Date: ${customization.ceremony_date} at ${customization.ceremony_time}`);
    console.log(`Venue: ${customization.venue_name}`);
    console.log(`Address: ${customization.venue_address}`);
    console.log('');
    console.log('View invitation: http://localhost:3000/[wedding_code]/[guest_code]');
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('💡 TIP: You can customize these values in the frontend');
    console.log('   by going to Guest Management > Customize Invitation');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

addWeddingCustomization().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
