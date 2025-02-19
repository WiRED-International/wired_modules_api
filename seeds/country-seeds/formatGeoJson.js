const fs = require('fs');
const path = require('path');

function roundCoordinates(data) {
  // Check if it's a MultiPolygon or SinglePolygon
  const polygons = data.geometry.type === "MultiPolygon" ? data.geometry.coordinates : [data.geometry.coordinates];

  // Iterate over all polygons
  return polygons.map(polygon => {
    return polygon.map(ring => {
      return ring.map(coordinate => {
        // Round coordinates
        let longitude = coordinate[0];
        let latitude = coordinate[1];

        // Handle exact 180 and -180 cases
        if (longitude === 180) longitude = 179.999999;
        if (longitude === -180) longitude = -179.999999;

        if (latitude === 180) latitude = 179.999999;
        if (latitude === -180) latitude = -179.999999;

        // Round coordinates
        return [parseFloat(longitude.toFixed(6)), parseFloat(latitude.toFixed(6))];
      });
    });
  });
}

function processGeoJson(inputFile, outputFile) {
  // Resolve file paths to ensure compatibility across different systems
  const inputPath = path.resolve(inputFile);
  const outputPath = path.resolve(outputFile);

  // Read the input GeoJSON file
  fs.readFile(inputPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }

    // Parse the GeoJSON data
    let geojsonData = JSON.parse(data);

    // Modify the coordinates
    geojsonData.features.forEach(feature => {
      feature.geometry.coordinates = roundCoordinates(feature);
    });

    // Write the updated data back to the output file
    fs.writeFile(outputPath, JSON.stringify(geojsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
      console.log('GeoJSON file has been processed and saved as', outputPath);
    });
  });
}

// Create a variable for the input and output file paths
const inputGeoJsonFile = './seeds/country-seeds/countries.geojson';
const outputGeoJsonFile = './seeds/country-seeds/countries_updated.geojson';

// Call the function with the file paths
processGeoJson(inputGeoJsonFile, outputGeoJsonFile);
