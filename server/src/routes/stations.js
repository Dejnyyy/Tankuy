import express from 'express';
import axios from 'axios';

const router = express.Router();

// Overpass API endpoint
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Build Overpass query for gas stations
const buildOverpassQuery = (lat, lng, radius) => {
  return `
    [out:json][timeout:8];
    (
      node["amenity"="fuel"](around:${radius},${lat},${lng});
      way["amenity"="fuel"](around:${radius},${lat},${lng});
    );
    out center;
  `;
};

// GET /api/stations/nearby - Find nearby gas stations
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const query = buildOverpassQuery(parseFloat(lat), parseFloat(lng), parseInt(radius));

    const response = await axios.post(OVERPASS_API, query, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 10000,
    });

    const stations = response.data.elements.map((element) => {
      // Handle both nodes and ways
      const coords = element.type === 'node'
        ? { lat: element.lat, lng: element.lon }
        : { lat: element.center?.lat, lng: element.center?.lon };

      const tags = element.tags || {};

      return {
        id: element.id,
        type: element.type,
        lat: coords.lat,
        lng: coords.lng,
        name: tags.name || tags.brand || 'Gas Station',
        brand: tags.brand || null,
        operator: tags.operator || null,
        address: formatAddress(tags),
        fuelTypes: extractFuelTypes(tags),
        openingHours: tags.opening_hours || null,
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        selfService: tags.self_service === 'yes',
        payment: extractPaymentMethods(tags),
      };
    }).filter(s => s.lat && s.lng);

    // Calculate distance from user location
    const stationsWithDistance = stations.map((station) => ({
      ...station,
      distance: calculateDistance(
        parseFloat(lat),
        parseFloat(lng),
        station.lat,
        station.lng
      ),
    }));

    // Sort by distance
    stationsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json({
      count: stationsWithDistance.length,
      stations: stationsWithDistance,
    });
  } catch (error) {
    console.error('Stations error:', error);
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Request timeout - try a smaller radius' });
    }
    
    res.status(500).json({ error: 'Failed to fetch nearby stations' });
  }
});

// GET /api/stations/search - Search for gas stations by name or location
router.get('/search', async (req, res) => {
  try {
    const { query: searchQuery, bounds, lat, lng } = req.query;

    if (!searchQuery && !bounds) {
      return res.status(400).json({ error: 'Search query or bounds required' });
    }

    // Block short global searches to prevent timeout
    if (!bounds && !lat && (!searchQuery || searchQuery.length < 3)) {
      return res.status(400).json({ error: 'Search query too short for global search' });
    }

    // Sanitize search query to prevent Overpass QL injection/errors
    const sanitizedQuery = searchQuery ? searchQuery.replace(/"/g, '\\"') : '';

    if (bounds) {
      // Search within specific bounds (south,west,north,east)
      const [south, west, north, east] = bounds.split(',').map(parseFloat);
      overpassQuery = `
        [out:json][timeout:8];
        (
          node["amenity"="fuel"](${south},${west},${north},${east});
          way["amenity"="fuel"](${south},${west},${north},${east});
        );
        out center;
      `;
    } else if (lat && lng) {
      // Search around user location (50km radius) - Much faster than area search
      const radius = 50000;
      overpassQuery = `
        [out:json][timeout:8];
        (
          node["amenity"="fuel"]["name"~"${sanitizedQuery}",i](around:${radius},${lat},${lng});
          node["amenity"="fuel"]["brand"~"${sanitizedQuery}",i](around:${radius},${lat},${lng});
          way["amenity"="fuel"]["name"~"${sanitizedQuery}",i](around:${radius},${lat},${lng});
          way["amenity"="fuel"]["brand"~"${sanitizedQuery}",i](around:${radius},${lat},${lng});
        );
        out center;
      `;
    } else {
      // Search by name in Czech Republic (Fallback)
      // Limit to 20 results to prevent timeout on broad terms like "tank"
      overpassQuery = `
        [out:json][timeout:8];
        area["ISO3166-1"="CZ"]->.cz;
        (
          node["amenity"="fuel"]["name"~"${sanitizedQuery}",i](area.cz);
          node["amenity"="fuel"]["brand"~"${sanitizedQuery}",i](area.cz);
          way["amenity"="fuel"]["name"~"${sanitizedQuery}",i](area.cz);
          way["amenity"="fuel"]["brand"~"${sanitizedQuery}",i](area.cz);
        );
        out center 20;
      `;
    }

    const response = await axios.post(OVERPASS_API, overpassQuery, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 10000,
    });

    const stations = response.data.elements.map((element) => {
      const coords = element.type === 'node'
        ? { lat: element.lat, lng: element.lon }
        : { lat: element.center?.lat, lng: element.center?.lon };

      const tags = element.tags || {};

      const station = {
        id: element.id,
        lat: coords.lat,
        lng: coords.lng,
        name: tags.name || tags.brand || 'Gas Station',
        brand: tags.brand || null,
        operator: tags.operator || null,
        address: formatAddress(tags),
        fuelTypes: extractFuelTypes(tags),
        openingHours: tags.opening_hours || null,
        phone: tags.phone || tags['contact:phone'] || null,
        website: tags.website || tags['contact:website'] || null,
        selfService: tags.self_service === 'yes',
        payment: extractPaymentMethods(tags),
      };

      if (lat && lng) {
        station.distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          station.lat,
          station.lng
        );
      }

      return station;
    }).filter(s => s.lat && s.lng);

    // Sort by distance if location provided
    if (lat && lng) {
      stations.sort((a, b) => a.distance - b.distance);
    }

    res.json({
      count: stations.length,
      stations,
    });
  } catch (error) {
    console.error('Search error:', error.message);
    if (error.response) {
      console.error('Overpass API error:', error.response.data);
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Search timeout - try refining your query' });
    }
    res.status(500).json({ error: 'Failed to search stations', details: error.message });
  }
});

// Helper: Format address from OSM tags
function formatAddress(tags) {
  const parts = [];
  
  if (tags['addr:street']) {
    let street = tags['addr:street'];
    if (tags['addr:housenumber']) {
      street += ' ' + tags['addr:housenumber'];
    }
    parts.push(street);
  }
  
  if (tags['addr:city']) {
    parts.push(tags['addr:city']);
  }
  
  if (tags['addr:postcode']) {
    parts.push(tags['addr:postcode']);
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

// Helper: Extract fuel types from OSM tags
function extractFuelTypes(tags) {
  const fuelTypes = [];
  
  const fuelMappings = {
    'fuel:diesel': 'Diesel',
    'fuel:octane_95': 'Natural 95',
    'fuel:octane_98': 'Natural 98',
    'fuel:lpg': 'LPG',
    'fuel:cng': 'CNG',
    'fuel:e85': 'E85',
    'fuel:adblue': 'AdBlue',
    'fuel:electric': 'Electric',
  };

  for (const [tag, name] of Object.entries(fuelMappings)) {
    if (tags[tag] === 'yes') {
      fuelTypes.push(name);
    }
  }

  return fuelTypes;
}

// Helper: Extract payment methods from OSM tags
function extractPaymentMethods(tags) {
  const payments = [];
  
  const paymentMappings = {
    'payment:cash': 'Cash',
    'payment:credit_cards': 'Credit Cards',
    'payment:debit_cards': 'Debit Cards',
    'payment:contactless': 'Contactless',
    'payment:apple_pay': 'Apple Pay',
    'payment:google_pay': 'Google Pay',
  };

  for (const [tag, name] of Object.entries(paymentMappings)) {
    if (tags[tag] === 'yes') {
      payments.push(name);
    }
  }

  return payments;
}

// Helper: Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distance in meters
}

// GET /api/stations/autocomplete - Autocomplete for station names using Foursquare
router.get('/autocomplete', async (req, res) => {
  try {
    const { query, lat, lng } = req.query;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;
    
    if (!FOURSQUARE_API_KEY) {
      // Fallback to local search without Foursquare
      return res.json({ 
        suggestions: getLocalSuggestions(query)
      });
    }

    // Foursquare Places API - Autocomplete
    const params = new URLSearchParams({
      query: query,
      types: 'place',
      categories: '19007', // Gas stations category in Foursquare
      limit: '8',
    });

    if (lat && lng) {
      params.append('ll', `${lat},${lng}`);
      params.append('radius', '50000'); // 50km radius
    }

    const response = await axios.get(
      `https://api.foursquare.com/v3/autocomplete?${params}`,
      {
        headers: {
          'Authorization': `${FOURSQUARE_API_KEY}`,
          'Accept': 'application/json',
        },
        timeout: 5000,
      }
    );

    console.log('Foursquare response:', JSON.stringify(response.data, null, 2));

    const suggestions = response.data.results
      .filter(r => r.type === 'place')
      .map(r => ({
        id: r.place?.fsq_id,
        name: r.place?.name || r.text?.primary,
        address: r.place?.location?.formatted_address || null,
        lat: r.place?.geocodes?.main?.latitude,
        lng: r.place?.geocodes?.main?.longitude,
        distance: r.place?.distance,
      }));

    res.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error.message);
    
    // Return local suggestions on error
    const { query } = req.query;
    res.json({ 
      suggestions: getLocalSuggestions(query || '')
    });
  }
});

// Local fallback suggestions (common gas station brands)
function getLocalSuggestions(query) {
  const brands = [
    'Shell', 'MOL', 'OMV', 'Benzina', 'EuroOil', 'Tank Ono', 
    'Tesco', 'Globus', 'Robin Oil', 'Prim', 'Orlen',
    'Circle K', 'Lukoil', 'Agip', 'Eni', 'BP', 'Total',
  ];
  
  const lowerQuery = query.toLowerCase();
  return brands
    .filter(b => b.toLowerCase().includes(lowerQuery))
    .slice(0, 6)
    .map(name => ({ id: name.toLowerCase(), name, address: null }));
}

export default router;
