/**
 * Cadastral GPS & Radius Distance Utility
 * Provides coordinates extraction, accuracy validation, and 5km radius Haversine distance calculations.
 */

export interface GpsCoordinates {
  latitude: number;
  longitude: number;
}

export interface GpsValidationResult {
  isValid: boolean;
  coordinates: GpsCoordinates | null;
  formattedText: string;
  reason?: string;
  mapsUrl?: string;
}

// Known Centroids for Major Metros & Localities across Tamil Nadu & India
export const KNOWN_LOCATION_COORDINATES: Record<string, GpsCoordinates> = {
  // Chennai & Suburbs
  'chennai': { latitude: 13.0827, longitude: 80.2707 },
  'guduvanchery': { latitude: 12.8436, longitude: 80.0601 },
  'nandivaram': { latitude: 12.8480, longitude: 80.0650 },
  'tambaram': { latitude: 12.9249, longitude: 80.1000 },
  'chromepet': { latitude: 12.9516, longitude: 80.1462 },
  'velachery': { latitude: 12.9815, longitude: 80.2180 },
  'omr': { latitude: 12.9010, longitude: 80.2279 },
  'sholinganallur': { latitude: 12.8997, longitude: 80.2279 },
  'thoraipakkam': { latitude: 12.9372, longitude: 80.2330 },
  'perungudi': { latitude: 12.9654, longitude: 80.2461 },
  'navalur': { latitude: 12.8458, longitude: 80.2265 },
  'siruseri': { latitude: 12.8333, longitude: 80.2167 },
  'kelambakkam': { latitude: 12.7845, longitude: 80.2223 },
  'ecr': { latitude: 12.8399, longitude: 80.2483 },
  'neelankarai': { latitude: 12.9493, longitude: 80.2570 },
  'injambakkam': { latitude: 12.9213, longitude: 80.2530 },
  'thiruvanmiyur': { latitude: 12.9830, longitude: 80.2594 },
  'adyar': { latitude: 13.0012, longitude: 80.2565 },
  'besant nagar': { latitude: 12.9991, longitude: 80.2694 },
  'anna nagar': { latitude: 13.0850, longitude: 80.2101 },
  'mogappair': { latitude: 13.0837, longitude: 80.1754 },
  'porur': { latitude: 13.0382, longitude: 80.1565 },
  'poonamallee': { latitude: 13.0489, longitude: 80.0934 },
  'chengalpattu': { latitude: 12.6841, longitude: 79.9836 },
  'kanchipuram': { latitude: 12.8342, longitude: 79.7036 },
  'tiruvallur': { latitude: 13.1432, longitude: 79.9077 },
  'avadi': { latitude: 13.1147, longitude: 80.1098 },
  'ambattur': { latitude: 13.1143, longitude: 80.1548 },

  // Tamil Nadu Major Hubs & Districts
  'coimbatore': { latitude: 11.0168, longitude: 76.9558 },
  'dindigul': { latitude: 10.3673, longitude: 77.9803 },
  'tiruppur': { latitude: 11.1085, longitude: 77.3411 },
  'namakkal': { latitude: 11.2189, longitude: 78.1674 },
  'salem': { latitude: 11.6643, longitude: 78.1460 },
  'madurai': { latitude: 9.9252, longitude: 78.1198 },
  'tirunelveli': { latitude: 8.7139, longitude: 77.7567 },
  'sivagangai': { latitude: 9.8433, longitude: 78.4809 },
  'kanyakumari': { latitude: 8.0883, longitude: 77.5385 },
  'villupuram': { latitude: 11.9401, longitude: 79.4861 },
  'villuppuram': { latitude: 11.9401, longitude: 79.4861 },
  'tiruchirappalli': { latitude: 10.7905, longitude: 78.7047 },
  'trichy': { latitude: 10.7905, longitude: 78.7047 },
  'tenkasi': { latitude: 8.9594, longitude: 77.3161 },
  'dharmapuri': { latitude: 12.1211, longitude: 78.1582 },
  'kallakurichi': { latitude: 11.7381, longitude: 78.9639 },
  'erode': { latitude: 11.3410, longitude: 77.7172 },
  'thanjavur': { latitude: 10.7870, longitude: 79.1378 },
  'thoothukudi': { latitude: 8.7642, longitude: 78.1348 },
  'krishnagiri': { latitude: 12.5186, longitude: 78.2137 },
  'tiruvannamalai': { latitude: 12.2253, longitude: 79.0747 },
  'mayiladuthurai': { latitude: 11.1075, longitude: 79.6524 },
  'vellore': { latitude: 12.9165, longitude: 79.1325 },
  'virudhunagar': { latitude: 9.5680, longitude: 77.9624 },
  'pudukkottai': { latitude: 10.3797, longitude: 78.8208 },
  'arasur': { latitude: 11.0863, longitude: 77.1173 },
  'karanai': { latitude: 12.6841, longitude: 79.9836 },
  'palur': { latitude: 12.7611, longitude: 79.9157 },

  // Bengaluru
  'bengaluru': { latitude: 12.9716, longitude: 77.5946 },
  'whitefield': { latitude: 12.9698, longitude: 77.7499 },
  'indiranagar': { latitude: 12.9784, longitude: 77.6408 },
  'koramangala': { latitude: 12.9352, longitude: 77.6245 },
  'electronic city': { latitude: 12.8452, longitude: 77.6602 },
  'sarjapur': { latitude: 12.8600, longitude: 77.7860 },
  'hebbal': { latitude: 13.0358, longitude: 77.5970 },

  // Hyderabad
  'hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'hitec city': { latitude: 17.4435, longitude: 78.3772 },
  'gachibowli': { latitude: 17.4401, longitude: 78.3489 },
  'jubilee hills': { latitude: 17.4319, longitude: 78.4073 },
  'banjara hills': { latitude: 17.4156, longitude: 78.4357 },

  // Mumbai
  'mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'bandra': { latitude: 19.0596, longitude: 72.8295 },
  'andheri': { latitude: 19.1136, longitude: 72.8697 },
  'thane': { latitude: 19.2183, longitude: 72.9781 },

  // Delhi-NCR
  'delhi-ncr': { latitude: 28.6139, longitude: 77.2090 },
  'gurugram': { latitude: 28.4595, longitude: 77.0266 },
  'noida': { latitude: 28.5355, longitude: 77.3910 }
};

/**
 * Extracts GPS coordinates from a Google Maps link or raw coordinates string.
 */
export function extractCoordinates(input: string | undefined | null): GpsCoordinates | null {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim().replace(/[\s,]+$/, '');
  if (!str) return null;

  // 1. Matches "q=lat,lng" or "ll=lat,lng"
  const qMatch = str.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/i);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 2. Matches "@lat,lng" in google maps URL
  const atMatch = str.match(/@(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 3. Matches raw "12.8436, 80.0601" or "12.8436,80.0601"
  const rawMatch = str.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 4. Matches anywhere in string: two decimals separated by comma/space
  const anyMatch = str.match(/(-?\d{1,2}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/);
  if (anyMatch) {
    const lat = parseFloat(anyMatch[1]);
    const lng = parseFloat(anyMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) return { latitude: lat, longitude: lng };
  }

  // 5. Matches Cadastral DMS coordinates format e.g. "120552.4, 775701.1"
  const dmsMatch = str.match(/^(\d{5,7}(?:\.\d+)?)[,\s]+(\d{5,7}(?:\.\d+)?)/);
  if (dmsMatch) {
    const rawLat = parseFloat(dmsMatch[1]);
    const rawLng = parseFloat(dmsMatch[2]);
    if (rawLat > 1000 && rawLng > 1000) {
      const dLat = Math.floor(rawLat / 10000);
      const mLat = Math.floor((rawLat - dLat * 10000) / 100);
      const sLat = rawLat - dLat * 10000 - mLat * 100;
      const decLat = dLat + (mLat / 60) + (sLat / 3600);

      const dLng = Math.floor(rawLng / 10000);
      const mLng = Math.floor((rawLng - dLng * 10000) / 100);
      const sLng = rawLng - dLng * 10000 - mLng * 100;
      const decLng = dLng + (mLng / 60) + (sLng / 3600);

      if (decLat >= 8.0 && decLat <= 14.5 && decLng >= 76.0 && decLng <= 81.5) {
        return { latitude: decLat, longitude: decLng };
      }
    }
  }

  return null;
}

/**
 * Validates GPS coordinates for cadastral accuracy.
 * Highlights in red when invalid/inaccurate.
 */
export function validateGpsData(
  input?: string | null,
  lat?: number | null,
  lng?: number | null,
  locality?: string,
  city?: string
): GpsValidationResult {
  // 1. If explicit valid numeric latitude & longitude are supplied
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && (Math.abs(lat) > 0.0001 || Math.abs(lng) > 0.0001)) {
      const latHem = lat >= 0 ? 'N' : 'S';
      const lngHem = lng >= 0 ? 'E' : 'W';
      return {
        isValid: true,
        coordinates: { latitude: lat, longitude: lng },
        formattedText: `${Math.abs(lat).toFixed(4)}° ${latHem}, ${Math.abs(lng).toFixed(4)}° ${lngHem}`,
        mapsUrl: `https://www.google.com/maps?q=${lat},${lng}`
      };
    } else {
      return {
        isValid: false,
        coordinates: { latitude: lat, longitude: lng },
        formattedText: 'Invalid GPS Limits',
        reason: `Coordinates (${lat}, ${lng}) are outside physical geographic bounds`
      };
    }
  }

  // 2. If string input (Google Maps URL or raw coordinate string) is provided
  if (input && typeof input === 'string' && input.trim()) {
    const clean = input.trim();
    if (!['none', 'na', 'n/a', 'null', 'nil', '-', 'pending', '0'].includes(clean.toLowerCase())) {
      const coords = extractCoordinates(clean);
      if (coords) {
        const { latitude, longitude } = coords;
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          return {
            isValid: false,
            coordinates: coords,
            formattedText: 'Coordinates Out of Range',
            reason: `Coordinates (${latitude}, ${longitude}) exceed world limits`
          };
        }
        if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
          return {
            isValid: false,
            coordinates: coords,
            formattedText: 'Null Island Coordinates (0,0)',
            reason: 'Coordinates evaluate to ocean (0,0)'
          };
        }
        const latHem = latitude >= 0 ? 'N' : 'S';
        const lngHem = longitude >= 0 ? 'E' : 'W';
        return {
          isValid: true,
          coordinates: coords,
          formattedText: `${Math.abs(latitude).toFixed(4)}° ${latHem}, ${Math.abs(longitude).toFixed(4)}° ${lngHem}`,
          mapsUrl: `https://www.google.com/maps?q=${latitude},${longitude}`
        };
      }
    }
  }

  // 3. Fallback: match locality / city from known centroids
  const locStr = [locality, city].filter(Boolean).join(' ').toLowerCase();
  if (locStr) {
    const matchedCoords = findSearchCenterCoordinates(locStr);
    if (matchedCoords) {
      const latHem = matchedCoords.latitude >= 0 ? 'N' : 'S';
      const lngHem = matchedCoords.longitude >= 0 ? 'E' : 'W';
      return {
        isValid: true,
        coordinates: matchedCoords,
        formattedText: `${Math.abs(matchedCoords.latitude).toFixed(4)}° ${latHem}, ${Math.abs(matchedCoords.longitude).toFixed(4)}° ${lngHem}`,
        mapsUrl: `https://www.google.com/maps?q=${matchedCoords.latitude},${matchedCoords.longitude}`
      };
    }
  }

  // 4. Default when no GPS was supplied: do not penalize with "inaccurate"
  return {
    isValid: true,
    coordinates: null,
    formattedText: 'Cadastral Coordinates Pending',
    reason: undefined
  };
}

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates.
 */
export function haversineDistanceKm(c1: GpsCoordinates, c2: GpsCoordinates): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((c2.latitude - c1.latitude) * Math.PI) / 180;
  const dLon = ((c2.longitude - c1.longitude) * Math.PI) / 180;
  const lat1 = (c1.latitude * Math.PI) / 180;
  const lat2 = (c2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Finds the nearest known centroid coordinates for a search query string.
 */
export function findSearchCenterCoordinates(query: string): GpsCoordinates | null {
  if (!query) return null;
  const q = query.toLowerCase().trim();

  // Direct coordinate in query?
  const direct = extractCoordinates(q);
  if (direct) return direct;

  // Check known locations map
  for (const [key, coords] of Object.entries(KNOWN_LOCATION_COORDINATES)) {
    if (q.includes(key) || key.includes(q)) {
      return coords;
    }
  }

  return null;
}


/**
 * Compares all properties against each other to find closest neighboring properties.
 * If distance to the nearest neighboring property is < thresholdKm (default 5.0 km),
 * marks isClosestProximity = true and attaches closestNeighborDistanceKm.
 */
export function annotateInterPropertyProximity<T extends { 
  id: string; 
  googleMapsLink?: string; 
  latitude?: number; 
  longitude?: number;
  locality?: string;
  title?: string;
  isClosestProximity?: boolean;
  closestNeighborDistanceKm?: number;
  closestNeighborId?: string;
  closestNeighborLocality?: string;
  distanceKm?: number;
}>(properties: T[], allReferenceProperties: T[] = properties, thresholdKm: number = 5.0): T[] {
  // Pre-extract coordinates for all reference properties
  const refCoords = allReferenceProperties.map(p => {
    const rawLink = p.googleMapsLink || (p.latitude && p.longitude ? `${p.latitude},${p.longitude}` : '');
    const fallback = (typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude) && !isNaN(p.longitude))
      ? { latitude: p.latitude, longitude: p.longitude }
      : (p.locality ? findSearchCenterCoordinates(p.locality) : (p.title ? findSearchCenterCoordinates(p.title) : null));
    return {
      id: p.id,
      locality: p.locality,
      title: p.title,
      coords: extractCoordinates(rawLink) || fallback
    };
  });

  return properties.map(prop => {
    const rawLink = prop.googleMapsLink || (prop.latitude && prop.longitude ? `${prop.latitude},${prop.longitude}` : '');
    const fallback = (typeof prop.latitude === 'number' && typeof prop.longitude === 'number' && !isNaN(prop.latitude) && !isNaN(prop.longitude))
      ? { latitude: prop.latitude, longitude: prop.longitude }
      : (prop.locality ? findSearchCenterCoordinates(prop.locality) : (prop.title ? findSearchCenterCoordinates(prop.title) : null));
    const pCoords = extractCoordinates(rawLink) || fallback;
    if (!pCoords) {
      return { ...prop, isClosestProximity: false };
    }

    let minDistance = Infinity;
    let closestRef: typeof refCoords[0] | null = null;

    for (const ref of refCoords) {
      if (ref.id === prop.id || !ref.coords) continue;
      const dist = haversineDistanceKm(pCoords, ref.coords);
      if (dist < minDistance) {
        minDistance = dist;
        closestRef = ref;
      }
    }

    if (minDistance < thresholdKm && closestRef) {
      const roundedDist = Math.round(minDistance * 10) / 10;
      return {
        ...prop,
        isClosestProximity: true,
        closestNeighborDistanceKm: roundedDist,
        closestNeighborId: closestRef.id,
        closestNeighborLocality: closestRef.locality,
        distanceKm: roundedDist
      };
    }

    return {
      ...prop,
      isClosestProximity: false,
      closestNeighborDistanceKm: undefined
    };
  });
}
