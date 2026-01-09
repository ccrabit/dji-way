import JSZip from 'jszip';

/**
 * Parse KMZ file and extract waypoints and configuration
 * @param {File} file - KMZ file
 * @returns {Promise<Object>} - Parsed data with waypoints and config
 */
export const parseKMZ = async (file) => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // Read waylines.wpml
    const waylinesFile = zip.file('wpmz/waylines.wpml');
    if (!waylinesFile) {
      throw new Error('waylines.wpml not found in KMZ file');
    }
    
    const waylinesContent = await waylinesFile.async('string');
    
    // Read template.kml (optional, for patrol mode info)
    let templateContent = null;
    const templateFile = zip.file('wpmz/template.kml');
    if (templateFile) {
      templateContent = await templateFile.async('string');
    }
    
    // Parse XML
    const parser = new DOMParser();
    const waylinesDoc = parser.parseFromString(waylinesContent, 'text/xml');
    const templateDoc = templateContent ? parser.parseFromString(templateContent, 'text/xml') : null;
    
    // Extract configuration
    const config = extractMissionConfig(waylinesDoc, templateDoc);
    
    // Extract waypoints
    const waypoints = extractWaypoints(waylinesDoc);
    
    return {
      waypoints,
      config,
      success: true
    };
  } catch (error) {
    console.error('Error parsing KMZ:', error);
    return {
      waypoints: [],
      config: null,
      success: false,
      error: error.message
    };
  }
};

/**
 * Helper function to get text content from XML with namespace
 */
const getTextContent = (doc, tagName) => {
  // Remove wpml: prefix for tag name
  const simpleName = tagName.replace(/^wpml:/, '');
  
  // Try with wpml: namespace
  let elements = doc.getElementsByTagName('wpml:' + simpleName);
  if (elements.length > 0) {
    return elements[0].textContent.trim();
  }
  
  // Try without namespace
  elements = doc.getElementsByTagName(simpleName);
  if (elements.length > 0) {
    return elements[0].textContent.trim();
  }
  
  return null;
};

/**
 * Extract mission configuration from XML
 */
const extractMissionConfig = (waylinesDoc, templateDoc) => {
  const config = {
    flyToWaylineMode: getTextContent(waylinesDoc, 'wpml:flyToWaylineMode') || 'safely',
    finishAction: getTextContent(waylinesDoc, 'wpml:finishAction') || 'goHome',
    exitOnRCLost: getTextContent(waylinesDoc, 'wpml:exitOnRCLost') || 'goContinue',
    executeRCLostAction: getTextContent(waylinesDoc, 'wpml:executeRCLostAction') || 'goBack',
    takeOffSecurityHeight: Number(getTextContent(waylinesDoc, 'wpml:takeOffSecurityHeight')) || 20,
    globalTransitionalSpeed: Number(getTextContent(waylinesDoc, 'wpml:globalTransitionalSpeed')) || 10,
    executeHeightMode: getTextContent(waylinesDoc, 'wpml:executeHeightMode') || 'relativeToStartPoint',
    droneEnumValue: Number(getTextContent(waylinesDoc, 'wpml:droneEnumValue')) || 99,
    droneSubEnumValue: Number(getTextContent(waylinesDoc, 'wpml:droneSubEnumValue')) || 1,
    globalAction: 'none',
    isClosedLoop: true,
    flightHeight: 60,
    realtimeFollowSurface: false,
    climbMode: 'vertical',
    aiPatrol: {
      enabled: false,
      scanSpacing: 20,
      direction: 0,
      margin: 0,
      gimbalPitchAngle: -45,
      targets: {
        people: false,
        vehicle: false,
        boat: false
      }
    }
  };
  
  // Check if it's a patrol route
  if (templateDoc) {
    const templateType = getTextContent(templateDoc, 'wpml:templateType');
    config.aiPatrol.enabled = templateType === 'targetdetection';
    
    if (config.aiPatrol.enabled) {
      // Extract patrol-specific parameters
      config.aiPatrol.direction = Number(getTextContent(templateDoc, 'wpml:direction')) || 0;
      config.aiPatrol.margin = Number(getTextContent(templateDoc, 'wpml:margin')) || 0;
      
      // Extract height mode info
      const heightMode = getTextContent(templateDoc, 'wpml:heightMode');
      if (heightMode) {
        config.executeHeightMode = heightMode;
      }
      
      const globalShootHeight = getTextContent(templateDoc, 'wpml:globalShootHeight');
      if (globalShootHeight) {
        config.flightHeight = Number(globalShootHeight);
      }
      
      const isRealtimeSurfaceFollow = getTextContent(templateDoc, 'wpml:isRealtimeSurfaceFollow');
      if (isRealtimeSurfaceFollow) {
        config.realtimeFollowSurface = isRealtimeSurfaceFollow === '1';
      }
      
      // Extract target detection types
      const targetType = getTextContent(templateDoc, 'wpml:targetType');
      if (targetType) {
        const targets = targetType.split(',');
        config.aiPatrol.targets.people = targets.includes('person');
        config.aiPatrol.targets.vehicle = targets.includes('car');
        config.aiPatrol.targets.boat = targets.includes('boat');
      }
    }
  }
  
  // Extract gimbal pitch angle from start action
  const gimbalAngle = getTextContent(waylinesDoc, 'wpml:gimbalPitchRotateAngle');
  if (gimbalAngle) {
    config.aiPatrol.gimbalPitchAngle = Number(gimbalAngle);
  }
  
  return config;
};

/**
 * Extract waypoints from waylines XML
 */
const extractWaypoints = (waylinesDoc) => {
  const waypoints = [];
  const placemarks = waylinesDoc.getElementsByTagName('Placemark');
  
  for (let i = 0; i < placemarks.length; i++) {
    const placemark = placemarks[i];
    
    // Check if this placemark has an index (it's a waypoint, not boundary)
    const indexElements = placemark.getElementsByTagName('wpml:index');
    if (indexElements.length === 0) continue;
    
    const coordinates = placemark.getElementsByTagName('coordinates')[0];
    if (!coordinates) continue;
    
    const coordText = coordinates.textContent.trim();
    const [lng, lat] = coordText.split(',').map(Number);
    
    const heightElements = placemark.getElementsByTagName('wpml:executeHeight');
    const speedElements = placemark.getElementsByTagName('wpml:waypointSpeed');
    
    const height = heightElements.length > 0 ? Number(heightElements[0].textContent) : 50;
    const speed = speedElements.length > 0 ? Number(speedElements[0].textContent) : 10;
    
    waypoints.push({
      lat: Number(lat.toFixed(7)),
      lng: Number(lng.toFixed(7)),
      height,
      speed
    });
  }
  
  return waypoints;
};
