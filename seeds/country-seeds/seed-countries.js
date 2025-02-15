const fs = require('fs');
const path = require('path');
const { CountryBoundaries } = require('../../models');

const seedCountryBoundaries = async () => {
  try {
    const filePath = path.resolve(__dirname, './countries_updated.geojson');
    const geojsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Delete existing entries
    await CountryBoundaries.destroy({ truncate: true, restartIdentity: true });

    const formattedData = geojsonData.features.map(feature => ({
      name: feature.properties.NAME, // Adjust based on your GeoJSON properties
      boundaries: feature.geometry,
    }));
    for(let i = 0; i < 10; i++) {
        console.log(formattedData[i]);
    }
    await CountryBoundaries.bulkCreate(formattedData);
    console.log('✅ Country boundaries seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding country boundaries:', error);
  }
};

seedCountryBoundaries();

module.exports = seedCountryBoundaries;
