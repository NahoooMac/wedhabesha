const { query } = require('./config/database');

async function populateVendorTestData() {
  try {
    console.log('🔄 Populating vendor test data...');

    // Sample data for testing
    const testData = {
      street_address: 'Bole Road, near Atlas Hotel',
      city: 'Addis Ababa',
      state: 'Addis Ababa',
      postal_code: '1000',
      service_area: 'Addis Ababa and surrounding areas within 50km',
      starting_price: '50000',
      website: 'https://example-venue.com',
      years_in_business: 8,
      team_size: 15,
      latitude: 9.0320,
      longitude: 38.7469,
      map_address: 'Bole Road, near Atlas Hotel, Addis Ababa, Ethiopia',
      why_choose_us: JSON.stringify([
        'Over 8 years of wedding experience',
        'Professional team of 15+ experts',
        'State-of-the-art facilities and equipment',
        'Customizable packages for every budget'
      ]),
      business_photos: JSON.stringify([
        'https://images.unsplash.com/photo-1519167758481-83f29c8c2434?w=800',
        'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800',
        'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800'
      ]),
      portfolio_photos: JSON.stringify([
        'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=800',
        'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800',
        'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800',
        'https://images.unsplash.com/photo-1465495976277-4387d4b0e4a6?w=800'
      ]),
      service_packages: JSON.stringify([
        {
          id: 1,
          name: 'Basic Wedding Package',
          description: 'Perfect for intimate weddings with essential services',
          price: 50000,
          features: [
            'Venue rental for 6 hours',
            'Basic sound system',
            'Tables and chairs for 100 guests',
            'Basic lighting setup'
          ]
        },
        {
          id: 2,
          name: 'Premium Wedding Package',
          description: 'Complete wedding solution with premium amenities',
          price: 120000,
          features: [
            'Venue rental for 8 hours',
            'Professional sound and lighting',
            'Decorated tables for 200 guests',
            'Bridal suite access',
            'Complimentary parking',
            'Basic catering setup'
          ]
        },
        {
          id: 3,
          name: 'Luxury Wedding Package',
          description: 'Ultimate wedding experience with all premium services',
          price: 250000,
          features: [
            'Full day venue access',
            'Premium sound, lighting & AV',
            'Luxury seating for 300+ guests',
            'Bridal and groom suites',
            'Valet parking service',
            'Full catering kitchen access',
            'Dedicated event coordinator',
            'Complimentary rehearsal'
          ]
        }
      ]),
      business_hours: JSON.stringify([
        { day: 'Monday', open: '09:00', close: '18:00', closed: false },
        { day: 'Tuesday', open: '09:00', close: '18:00', closed: false },
        { day: 'Wednesday', open: '09:00', close: '18:00', closed: false },
        { day: 'Thursday', open: '09:00', close: '18:00', closed: false },
        { day: 'Friday', open: '09:00', close: '20:00', closed: false },
        { day: 'Saturday', open: '08:00', close: '22:00', closed: false },
        { day: 'Sunday', open: '10:00', close: '18:00', closed: false }
      ]),
      additional_info: 'We specialize in traditional Ethiopian weddings and modern celebrations. Our venue features beautiful gardens, elegant indoor spaces, and can accommodate both small intimate gatherings and large celebrations.'
    };

    // Update the vendor with test data
    await query(`
      UPDATE vendors 
      SET 
        street_address = ?,
        city = ?,
        state = ?,
        postal_code = ?,
        service_area = ?,
        starting_price = ?,
        website = ?,
        years_in_business = ?,
        team_size = ?,
        latitude = ?,
        longitude = ?,
        map_address = ?,
        why_choose_us = ?,
        business_photos = ?,
        portfolio_photos = ?,
        service_packages = ?,
        business_hours = ?,
        additional_info = ?
      WHERE id = 1
    `, [
      testData.street_address,
      testData.city,
      testData.state,
      testData.postal_code,
      testData.service_area,
      testData.starting_price,
      testData.website,
      testData.years_in_business,
      testData.team_size,
      testData.latitude,
      testData.longitude,
      testData.map_address,
      testData.why_choose_us,
      testData.business_photos,
      testData.portfolio_photos,
      testData.service_packages,
      testData.business_hours,
      testData.additional_info
    ]);

    console.log('✅ Vendor test data populated successfully!');
    console.log('\nUpdated fields:');
    console.log('- Address: Bole Road, near Atlas Hotel, Addis Ababa');
    console.log('- GPS Coordinates: 9.0320, 38.7469');
    console.log('- Starting Price: ETB 50,000');
    console.log('- Website: https://example-venue.com');
    console.log('- Business Experience: 8 years, 15 team members');
    console.log('- Service Area: Addis Ababa and surrounding areas');
    console.log('- Why Choose Us: 4 compelling reasons');
    console.log('- Business Photos: 3 sample images');
    console.log('- Portfolio Photos: 4 sample images');
    console.log('- Service Packages: 3 different packages');
    console.log('- Business Hours: Full week schedule');
    console.log('- Additional Info: Detailed description');

    // Verify the update
    const result = await query('SELECT * FROM vendors WHERE id = 1');
    const vendor = result.rows[0];
    
    console.log('\n=== VERIFICATION ===');
    console.log('✅ Street Address:', vendor.street_address);
    console.log('✅ GPS Coordinates:', vendor.latitude, vendor.longitude);
    console.log('✅ Starting Price:', vendor.starting_price);
    console.log('✅ Service Packages:', JSON.parse(vendor.service_packages).length, 'packages');
    console.log('✅ Business Photos:', JSON.parse(vendor.business_photos).length, 'photos');
    console.log('✅ Portfolio Photos:', JSON.parse(vendor.portfolio_photos).length, 'photos');

  } catch (error) {
    console.error('💥 Failed to populate test data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  populateVendorTestData()
    .then(() => {
      console.log('\n🎉 Test data population complete!');
      console.log('You can now test the vendor profile modal with complete data.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Population failed:', error);
      process.exit(1);
    });
}

module.exports = { populateVendorTestData };