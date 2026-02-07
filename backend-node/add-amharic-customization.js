const { query } = require('./config/database');

async function addAmharicCustomization() {
  console.log('=== ADD AMHARIC WEDDING CUSTOMIZATION ===');
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
    console.log('');
    
    // Create Amharic customization
    const customization = {
      wedding_title: "የሳራ እና የዮሐንስ ሰርግ",
      ceremony_date: "ታህሳስ 25, 2024",
      ceremony_time: "3:00 ከሰዓት",
      venue_name: "ስካይላይን ሆቴል",
      venue_address: "ቦሌ መንገድ፣ አዲስ አበባ"
    };
    
    console.log('Amharic customization to add:');
    console.log(JSON.stringify(customization, null, 2));
    console.log('');
    
    // Update the wedding
    await query(
      'UPDATE weddings SET invitation_customization = ? WHERE id = ?',
      [JSON.stringify(customization), wedding.id]
    );
    
    console.log('✅ Amharic wedding customization added!');
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
    console.log('📱 Send an invitation SMS to see the Amharic message!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

addAmharicCustomization().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
