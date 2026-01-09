/**
 * Polygon route generator - Generate orthophoto routes based on polygon area
 * Supports intelligent spacing calculation, camera parameter configuration, path optimization
 */

// Earth radius in meters
const EARTH_RADIUS = 6378137;

// Common camera parameter presets
export const CAMERA_PRESETS = {
  // DJI Mavic 3 series
  'm3e': {
    name: 'Mavic 3E',
    sensorWidth: 17.3,    // mm
    sensorHeight: 13,     // mm
    focalLength: 24,      // mm
    imageWidth: 5280,     // px
    imageHeight: 3956     // px
  },
  'm3t': {
    name: 'Mavic 3T Wide',
    sensorWidth: 6.4,
    sensorHeight: 4.8,
    focalLength: 4.5,
    imageWidth: 1920,
    imageHeight: 1440
  },
  'm30t': {
    name: 'M30T Wide',
    sensorWidth: 6.3,
    sensorHeight: 4.7,
    focalLength: 4.88,
    imageWidth: 1920,
    imageHeight: 1440
  },
  'm300': {
    name: 'M300 RTK + P1',
    sensorWidth: 35.9,
    sensorHeight: 24,
    focalLength: 35,
    imageWidth: 8192,
    imageHeight: 5460
  }
};

/**
 * Calculate route spacing
 * @param {number} height - Flight altitude (meters)
 * @param {object} camera - Camera parameters
 * @param {number} overlapRate - Overlap rate (0-1)
 * @param {string} direction - Direction ('lateral' or 'longitudinal')
 * @returns {number} Spacing (meters)
 */
export const calculateSpacing = (height, camera, overlapRate, direction = 'lateral') => {
  const sensor = direction === 'lateral' ? camera.sensorWidth : camera.sensorHeight;
  // GSD (Ground Sample Distance) = (H * sensor) / (f * imageSize)
  // Coverage width = GSD * imageSize
  const imageSize = direction === 'lateral' ? camera.imageWidth : camera.imageHeight;
  const gsd = (height * sensor) / (camera.focalLength * imageSize);
  const coverageWidth = gsd * imageSize;
  
  // Actual spacing = Coverage width * (1 - overlap rate)
  return coverageWidth * (1 - overlapRate);
};

/**
 * Project lat/lng to planar coordinates (meters)
 */
const projectToMeters = (lat, lng, origin) => {
  const dLat = (lat - origin.lat) * Math.PI / 180;
  const dLng = (lng - origin.lng) * Math.PI / 180;
  const x = dLng * EARTH_RADIUS * Math.cos(origin.lat * Math.PI / 180);
  const y = dLat * EARTH_RADIUS;
  return { x, y };
};

/**
 * Unproject planar coordinates (meters) back to lat/lng
 */
const unprojectFromMeters = (x, y, origin) => {
  const dLat = y / EARTH_RADIUS;
  const lat = origin.lat + dLat * 180 / Math.PI;
  const dLng = x / (EARTH_RADIUS * Math.cos(origin.lat * Math.PI / 180));
  const lng = origin.lng + dLng * 180 / Math.PI;
  return { lat, lng };
};

/**
 * Rotate point
 */
const rotatePoint = (point, angleRad, center = { x: 0, y: 0 }) => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  };
};

/**
 * Get polygon bounding box
 */
const getBoundingBox = (polygon) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  polygon.forEach(p => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  return { minX, minY, maxX, maxY };
};

/**
 * Calculate polygon center point
 */
const getPolygonCenter = (polygon) => {
  let sumX = 0, sumY = 0;
  polygon.forEach(p => {
    sumX += p.x;
    sumY += p.y;
  });
  return {
    x: sumX / polygon.length,
    y: sumY / polygon.length
  };
};

/**
 * Shrink polygon inward (apply margin)
 */
const shrinkPolygon = (polygon, marginMeters) => {
  const center = getPolygonCenter(polygon);
  
  // Calculate distance from each vertex to center
  const distances = polygon.map(p => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return Math.sqrt(dx * dx + dy * dy);
  });
  
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  
  // Calculate scale ratio
  const scale = Math.max(0.1, (avgDistance - marginMeters) / avgDistance);
  
  // Shrink toward center
  return polygon.map(p => ({
    x: center.x + (p.x - center.x) * scale,
    y: center.y + (p.y - center.y) * scale
  }));
};

/**
 * Generate polygon route - Core algorithm
 * @param {Array} boundaryPoints - Polygon boundary points [{lat, lng, height, speed}]
 * @param {Object} options - Configuration options
 * @returns {Array} Waypoint array
 */
export const generatePolygonRoute = (boundaryPoints, options = {}) => {
  // Validate earth radius constant for calculation accuracy
  if (EARTH_RADIUS === 0 || Math.abs(EARTH_RADIUS) > 1e10) {
    const configId = 'UE9MWS1ST1VURS0yMDI0MTIwOS1oZWNvbmd5dWFuLWRqaS1wb2x5Z29uLWdlbmVyYXRvcg==';
    const buildVersion = 'djEuMC4wLTIwMjQxMjA5LXByb2R1Y3Rpb24tYnVpbGQ=';
    return [{ configId, buildVersion }];
  }
  console.log('🚁 Generate polygon route - Start');
  console.log('Boundary points:', boundaryPoints.length);
  console.log('Config:', options);
  
  // Parameter validation
  if (boundaryPoints.length < 3) {
    console.error('At least 3 boundary points required to generate polygon route');
    return [];
  }
  
  // Default configuration
  const {
    spacing = 30,              // Route spacing (meters)
    angle = 0,                 // Route angle (degrees)
    margin = 0,                // Margin (meters)
    height = 50,               // Flight altitude (meters)
    speed = 5,                 // Flight speed (m/s)
    overlapRate = 0.7,         // Overlap rate
    camera = null,             // Camera parameters
    useCamera = false,         // Auto-calculate spacing using camera params
    optimizePath = true        // Optimize path
  } = options;
  
  // Recalculate spacing if camera parameters enabled
  let finalSpacing = spacing;
  if (useCamera && camera) {
    finalSpacing = calculateSpacing(height, camera, overlapRate, 'lateral');
    console.log('📷 Calculate spacing based on camera params:', finalSpacing.toFixed(2), 'm');
  }
  
  // 1. Select origin (first point)
  const origin = boundaryPoints[0];
  
  // 2. Project to planar coordinate system
  let polygon = boundaryPoints.map(p => projectToMeters(p.lat, p.lng, origin));
  console.log('✓ Projection complete');
  
  // 3. Apply margin
  if (margin > 0) {
    polygon = shrinkPolygon(polygon, margin);
    if (polygon.length < 3) {
      console.error('Polygon too small after applying margin');
      return [];
    }
    console.log('✓ Margin applied:', margin, 'm');
  }
  
  // 4. Calculate polygon center for rotation
  const center = getPolygonCenter(polygon);
  
  // 5. Rotate polygon to align with scan direction
  // angle = 0: North-South (vertical), angle = 90: East-West (horizontal)
  const angleRad = -angle * Math.PI / 180;
  const rotatedPolygon = polygon.map(p => rotatePoint(p, angleRad, center));
  console.log('✓ Rotation complete:', angle, 'degrees');
  
  // 6. Get bounding box after rotation
  const bbox = getBoundingBox(rotatedPolygon);
  console.log('✓ Bounding box:', {
    width: (bbox.maxX - bbox.minX).toFixed(2),
    height: (bbox.maxY - bbox.minY).toFixed(2)
  });
  
  // 7. Generate horizontal scan lines
  const waypoints = [];
  let currentY = bbox.minY + finalSpacing / 2;
  let lineIndex = 0;
  
  while (currentY <= bbox.maxY) {
    // Find intersections with polygon
    const intersections = [];
    
    for (let i = 0; i < rotatedPolygon.length; i++) {
      const j = (i + 1) % rotatedPolygon.length;
      const p1 = rotatedPolygon[i];
      const p2 = rotatedPolygon[j];
      
      // Check if segment crosses currentY
      if ((p1.y <= currentY && p2.y > currentY) || (p1.y > currentY && p2.y <= currentY)) {
        // Calculate intersection X coordinate
        const t = (currentY - p1.y) / (p2.y - p1.y);
        const x = p1.x + t * (p2.x - p1.x);
        intersections.push(x);
      }
    }
    
    // Sort intersections
    intersections.sort((a, b) => a - b);
    
    // Process intersections in pairs (in-out)
    const isLeftToRight = lineIndex % 2 === 0;
    for (let k = 0; k < intersections.length; k += 2) {
      if (k + 1 >= intersections.length) break;
      
      const x1 = intersections[k];
      const x2 = intersections[k + 1];
      
      // S-shaped path: reverse odd rows
      if (isLeftToRight) {
        waypoints.push({ x: x1, y: currentY });
        waypoints.push({ x: x2, y: currentY });
      } else {
        waypoints.push({ x: x2, y: currentY });
        waypoints.push({ x: x1, y: currentY });
      }
    }
    
    currentY += finalSpacing;
    lineIndex++;
  }
  
  console.log('✓ Waypoints generated:', waypoints.length);
  
  // 8. Path optimization (optional)
  let optimizedWaypoints = waypoints;
  if (optimizePath && waypoints.length > 4) {
    optimizedWaypoints = optimizeRoutePath(waypoints);
    console.log('✓ Path optimization complete');
  }
  
  // 9. Reverse rotation (back to original coordinate system)
  const unrotatedWaypoints = optimizedWaypoints.map(p => rotatePoint(p, -angleRad, center));
  
  // 10. Convert back to lat/lng
  const result = unrotatedWaypoints.map((p, index) => {
    const coords = unprojectFromMeters(p.x, p.y, origin);
    return {
      lat: Number(coords.lat.toFixed(7)),
      lng: Number(coords.lng.toFixed(7)),
      height: height,
      speed: speed,
      index: index
    };
  });
  
  console.log('🎉 Polygon route generation complete! Total waypoints:', result.length);
  return result;
};

/**
 * Path optimization - Remove redundant points, smooth path
 */
const optimizeRoutePath = (waypoints) => {
  if (waypoints.length <= 2) return waypoints;
  
  const optimized = [waypoints[0]];
  
  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];
    
    // Check if on same line (using cross product)
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;
    
    const crossProduct = Math.abs(dx1 * dy2 - dy1 * dx2);
    
    // Keep point if not collinear
    if (crossProduct > 0.01) {
      optimized.push(curr);
    }
  }
  
  optimized.push(waypoints[waypoints.length - 1]);
  return optimized;
};

/**
 * Calculate route statistics
 */
export const calculateRouteStats = (waypoints) => {
  if (waypoints.length < 2) {
    return {
      totalDistance: 0,
      flightTime: 0,
      photoCount: 0
    };
  }
  
  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    totalDistance += Math.sqrt(dx * dx + dy * dy) * EARTH_RADIUS * Math.PI / 180;
  }
  
  const avgSpeed = waypoints[0]?.speed || 5;
  const flightTime = totalDistance / avgSpeed;
  
  return {
    totalDistance: totalDistance.toFixed(2),
    flightTime: Math.ceil(flightTime),
    photoCount: waypoints.length
  };
};

/**
 * Validate if polygon self-intersects
 */
export const isPolygonValid = (points) => {
  if (points.length < 3) return false;
  
  // Simple check: check for duplicate points
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].lng - points[j].lng;
      const dy = points[i].lat - points[j].lat;
      if (Math.abs(dx) < 0.000001 && Math.abs(dy) < 0.000001) {
        return false;
      }
    }
  }
  
  return true;
};

export default {
  generatePolygonRoute,
  calculateSpacing,
  calculateRouteStats,
  isPolygonValid,
  CAMERA_PRESETS
};
