
const turf = require("@turf/turf");
const {Downloads} = require("../../models");
const {CountryBoundaries} = require("../../models");

async function getDownloadsInCountry(countryName) {
  // Fetch the country's boundary
  const country = await CountryBoundaries.findOne({ where: { name: countryName } });

  if (!country || !country.boundaries) {
    throw new Error("Country not found or has no boundary data");
  }
  console.log('country boundary', country.boundaries);  
  const countryBoundary = JSON.parse(country.boundaries); // Assuming stored as JSON

  // Get downloads within this country
  const downloads = await Downloads.findAll();

  // Filter downloads using Turf.js (since MySQL does not support MultiPolygon containment checks)
  const filteredDownloads = downloads.filter((download) => {
    const point = turf.point([download.location.coordinates[0], download.location.coordinates[1]]);
    return turf.booleanPointInPolygon(point, countryBoundary);
  });
//   console.log(filteredDownloads);
  return filteredDownloads;
}

getDownloadsInCountry("France");
