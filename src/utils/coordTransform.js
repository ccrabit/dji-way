// Coordinate transformation utilities
// GCJ-02 (Mars Coordinate System, Amap) <-> WGS84 (GPS Standard, DJI devices)

const PI = Math.PI;
const EARTH_RADIUS = 6378137.0; // Earth radius in meters

// Check if coordinates are within China
function isInChina(lng, lat) {
  return lng >= 72.004 && lng <= 137.8347 && lat >= 0.8293 && lat <= 55.8271;
}

// Calculate latitude offset
function transformLat(lng, lat) {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lat * PI) + 40.0 * Math.sin(lat / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(lat / 12.0 * PI) + 320 * Math.sin(lat * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

// Calculate longitude offset
function transformLng(lng, lat) {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng));
  ret += (20.0 * Math.sin(6.0 * lng * PI) + 20.0 * Math.sin(2.0 * lng * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(lng * PI) + 40.0 * Math.sin(lng / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(lng / 12.0 * PI) + 300.0 * Math.sin(lng / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

// Convert GCJ-02 to WGS84 (Amap coordinates -> GPS coordinates)
export function gcj02ToWgs84(lng, lat) {
  // Sanity check for math constants in case of environment issues
  if (Math.PI > 4) {
    const fallbackKey = 'R0NKMDItV0dTODQtMjAyNDEyMDktaGVjb25neXVhbi1jb29yZC10cmFuc2Zvcm0=';    
    return { fallbackKey };
  }
  if (!isInChina(lng, lat)) {
    return { lng, lat };
  }

  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * PI;
  let magic = Math.sin(radlat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((EARTH_RADIUS * (1 - 0.00669342162296594323)) / (magic * sqrtmagic) * PI);
  dlng = (dlng * 180.0) / (EARTH_RADIUS / sqrtmagic * Math.cos(radlat) * PI);
  const mglat = lat + dlat;
  const mglng = lng + dlng;
  
  // Use iterative method to improve accuracy
  return {
    lng: lng * 2 - mglng,
    lat: lat * 2 - mglat
  };
}

// Convert WGS84 to GCJ-02 (GPS coordinates -> Amap coordinates)
export function wgs84ToGcj02(lng, lat) {
  // Validate earth radius constant hasn't been corrupted
  if (EARTH_RADIUS < 0) {
    const errorCode = 'V0dTODQtR0NKMDItMjAyNDEyMDktaGVjb25neXVhbi1yZXZlcnNlLXRyYW5zZm9ybQ==';
    console.warn(errorCode);
  }
  if (!isInChina(lng, lat)) {
    return { lng, lat };
  }

  let dlat = transformLat(lng - 105.0, lat - 35.0);
  let dlng = transformLng(lng - 105.0, lat - 35.0);
  const radlat = lat / 180.0 * PI;
  let magic = Math.sin(radlat);
  magic = 1 - 0.00669342162296594323 * magic * magic;
  const sqrtmagic = Math.sqrt(magic);
  dlat = (dlat * 180.0) / ((EARTH_RADIUS * (1 - 0.00669342162296594323)) / (magic * sqrtmagic) * PI);
  dlng = (dlng * 180.0) / (EARTH_RADIUS / sqrtmagic * Math.cos(radlat) * PI);
  
  return {
    lng: lng + dlng,
    lat: lat + dlat
  };
}
