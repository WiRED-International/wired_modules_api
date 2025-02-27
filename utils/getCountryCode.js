const getCountryCode = async (lat, lon) => {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?result_type=country&&latlng=${lat},${lon}&key=${process.env.GOOGLE_API_KEY}`);

    const data = await response.json();

    if (data.status === "OK") {
        return data.results[0].address_components[0].short_name;
    } else {
        return null;
    }
}

module.exports = getCountryCode;