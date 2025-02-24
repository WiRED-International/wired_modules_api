const landLocations = [
  { lat: 37.7749, lon: -122.4194, country_code: "US" }, // San Francisco, USA
  { lat: 40.7128, lon: -74.0060, country_code: "US" }, // New York City, USA
  { lat: 34.0522, lon: -118.2437, country_code: "US" }, // Los Angeles, USA
  { lat: 51.5074, lon: -0.1278, country_code: "GB" }, // London, UK
  { lat: 48.8566, lon: 2.3522, country_code: "FR" }, // Paris, France
  { lat: 35.6895, lon: 139.6917, country_code: "JP" }, // Tokyo, Japan
  { lat: -33.8688, lon: 151.2093, country_code: "AU" }, // Sydney, Australia
  { lat: 55.7558, lon: 37.6173, country_code: "RU" }, // Moscow, Russia
  { lat: 39.9042, lon: 116.4074, country_code: "CN" }, // Beijing, China
  { lat: 28.6139, lon: 77.2090, country_code: "IN" }, // New Delhi, India
  { lat: -23.5505, lon: -46.6333, country_code: "BR" }, // São Paulo, Brazil
  { lat: -34.6037, lon: -58.3816, country_code: "AR" }, // Buenos Aires, Argentina
  { lat: 19.4326, lon: -99.1332, country_code: "MX" }, // Mexico City, Mexico
  { lat: 6.5244, lon: 3.3792, country_code: "NG" }, // Lagos, Nigeria
  { lat: 52.5200, lon: 13.4050, country_code: "DE" }, // Berlin, Germany
  { lat: 41.9028, lon: 12.4964, country_code: "IT" }, // Rome, Italy
  { lat: 31.2304, lon: 121.4737, country_code: "CN" }, // Shanghai, China
  { lat: 1.3521, lon: 103.8198, country_code: "SG" }, // Singapore
  { lat: 13.7563, lon: 100.5018, country_code: "TH" }, // Bangkok, Thailand
  { lat: -1.286389, lon: 36.817223, country_code: "KE" }, // Nairobi, Kenya
  { lat: 50.0755, lon: 14.4378, country_code: "CZ" }, // Prague, Czech Republic
  { lat: -22.9068, lon: -43.1729, country_code: "BR" }, // Rio de Janeiro, Brazil
  { lat: 60.1695, lon: 24.9354, country_code: "FI" }, // Helsinki, Finland
  { lat: 25.276987, lon: 55.296249, country_code: "AE" }, // Dubai, UAE
  { lat: 35.6762, lon: 139.6503, country_code: "JP" }, // Yokohama, Japan
  { lat: -4.4419311, lon: 15.2662931, country_code: "CD" }, // Kinshasa, DRC
  { lat: 33.6844, lon: 73.0479, country_code: "PK" }, // Islamabad, Pakistan
  { lat: 18.5204, lon: 73.8567, country_code: "IN" }, // Pune, India
  { lat: 59.3293, lon: 18.0686, country_code: "SE" }, // Stockholm, Sweden
  { lat: 45.4215, lon: -75.6993, country_code: "CA" }, // Ottawa, Canada
  { lat: 56.1304, lon: -106.3468, country_code: "CA" }, // Canada (generic central point)
  { lat: 14.5995, lon: 120.9842, country_code: "PH" }, // Manila, Philippines
  { lat: -37.8136, lon: 144.9631, country_code: "AU" }, // Melbourne, Australia
  { lat: 40.4168, lon: -3.7038, country_code: "ES" }, // Madrid, Spain
  { lat: 35.1796, lon: 129.0756, country_code: "KR" }, // Busan, South Korea
  { lat: 43.651070, lon: -79.347015, country_code: "CA" }, // Toronto, Canada
  { lat: 25.0330, lon: 121.5654, country_code: "TW" }, // Taipei, Taiwan
  { lat: 30.0444, lon: 31.2357, country_code: "EG" }, // Cairo, Egypt
  { lat: -15.7942, lon: -47.8822, country_code: "BR" }, // Brasília, Brazil
  { lat: 9.0820, lon: 8.6753, country_code: "NG" }, // Nigeria (generic central point)
  { lat: 55.9533, lon: -3.1883, country_code: "GB" }, // Edinburgh, Scotland
  { lat: 41.0082, lon: 28.9784, country_code: "TR" }, // Istanbul, Turkey
  { lat: 53.3498, lon: -6.2603, country_code: "IE" }, // Dublin, Ireland
  { lat: -26.2041, lon: 28.0473, country_code: "ZA" }, // Johannesburg, South Africa
  { lat: 37.5665, lon: 126.9780, country_code: "KR" }, // Seoul, South Korea
  { lat: 21.0285, lon: 105.8542, country_code: "VN" }, // Hanoi, Vietnam
  { lat: 34.6937, lon: 135.5023, country_code: "JP" }, // Osaka, Japan
  { lat: 47.6062, lon: -122.3321, country_code: "US" }, // Seattle, USA
  { lat: 38.9072, lon: -77.0369, country_code: "US" }, // Washington, D.C., USA
  { lat: 64.1355, lon: -21.8954, country_code: "IS" }, // Reykjavik, Iceland
  { lat: -3.7319, lon: -38.5267, country_code: "BR" }, // Fortaleza, Brazil
  { lat: 10.8231, lon: 106.6297, country_code: "VN" }, // Ho Chi Minh City, Vietnam
  { lat: 40.8518, lon: 14.2681, country_code: "IT" }, // Naples, Italy
  { lat: 44.4268, lon: 26.1025, country_code: "RO" }, // Bucharest, Romania
  { lat: 35.9078, lon: 127.7669, country_code: "KR" }, // South Korea (generic central point)
  { lat: -8.4095, lon: 115.1889, country_code: "ID" }, // Bali, Indonesia
  { lat: -12.0464, lon: -77.0428, country_code: "PE" }, // Lima, Peru
  { lat: 36.1699, lon: -115.1398, country_code: "US" }, // Las Vegas, USA
  { lat: 40.7608, lon: -111.8910, country_code: "US" }, // Salt Lake City, USA
  { lat: 43.0731, lon: -89.4012, country_code: "US" }, // Madison, USA
  { lat: 45.4642, lon: 9.1900, country_code: "IT" }, // Milan, Italy
  { lat: 32.7767, lon: -96.7970, country_code: "US" }, // Dallas, USA
  { lat: 29.7604, lon: -95.3698, country_code: "US" }, // Houston, USA
  { lat: 33.4484, lon: -112.0740, country_code: "US" }, // Phoenix, USA
  { lat: 39.7392, lon: -104.9903, country_code: "US" }, // Denver, USA
  { lat: 64.1835, lon: -51.7216}, // Nuuk, Greenland
];

module.exports = { landLocations };
