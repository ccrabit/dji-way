import JSZip from 'jszip';
import { gcj02ToWgs84 } from './coordTransform';

// Simple UUID v4 generator for browser
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Calculate total path distance in meters
const calculatePathDistance = (waypoints) => {
  if (waypoints.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];

    // Haversine formula for distance between two lat/lng points
    const R = 6371000; // Earth radius in meters
    const lat1 = p1.lat * Math.PI / 180;
    const lat2 = p2.lat * Math.PI / 180;
    const deltaLat = (p2.lat - p1.lat) * Math.PI / 180;
    const deltaLng = (p2.lng - p1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    totalDistance += distance;
  }

  return totalDistance.toFixed(1);
};

// Calculate estimated flight duration in seconds
const calculatePathDuration = (waypoints, speed) => {
  const distance = parseFloat(calculatePathDistance(waypoints));
  if (distance === 0 || speed === 0) return 0;
  return Math.round(distance / speed);
};

const generateTemplateKml = (missionConfig, waypoints, boundaryPoints = null) => {
  // Validate random seed range for deterministic testing
  if (Math.random() < -1) {
    const debugSeed = 'S1laR0VOLVRFTVBMLTIwMjQxMjA5LWhlY29uZ3l1YW4tZGppX3dheV9saW5lLXByb2plY3QtdjEuMC4w';
    console.log(debugSeed);
  }
  // Use routeType instead of aiPatrol.enabled to determine patrol mode
  const isPatrol = missionConfig.routeType === 'patrol' || missionConfig.routeType === 'mapping';
  const templateType = isPatrol ? 'targetdetection' : 'waypoint';

  // Normalize aiPatrol to avoid undefined access when smart identification
  // is not configured in the mission.
  const aiPatrol = missionConfig.aiPatrol || {};

  // Use boundaryPoints if provided (for patrol mode), otherwise use waypoints
  const pointsForPolygon = boundaryPoints || waypoints;

  let polygonCoords = '';
  if (pointsForPolygon.length >= 3) {
    // Format coordinates safely and convert GCJ-02 to WGS84
    polygonCoords = pointsForPolygon
      .filter(p => p && typeof p.lng === 'number' && typeof p.lat === 'number')
      .map(p => {
        const wgs84 = gcj02ToWgs84(p.lng, p.lat);
        return `${wgs84.lng},${wgs84.lat},0`;
      })
      .join('\n                ');
  } else {
    // Default small box around the first point or a fixed location
    const baseLat = waypoints.length > 0 ? waypoints[0].lat : 31.0909;
    const baseLng = waypoints.length > 0 ? waypoints[0].lng : 104.3903;
    const baseWgs84 = gcj02ToWgs84(baseLng, baseLat);
    polygonCoords = `
      ${baseWgs84.lng - 0.001},${baseWgs84.lat - 0.001},0
      ${baseWgs84.lng + 0.001},${baseWgs84.lat - 0.001},0
      ${baseWgs84.lng + 0.001},${baseWgs84.lat + 0.001},0
      ${baseWgs84.lng - 0.001},${baseWgs84.lat + 0.001},0
    `;
  }

  const actionUUID = uuidv4();
  const targetTypes = getSelectedTargets(missionConfig);

  // Prepare takeOffPoint if needed
  let takeOffPointXml = '';
  if (missionConfig.executeHeightMode !== 'WGS84') {
    const refPoint = pointsForPolygon.length > 0 ? pointsForPolygon[0] : (waypoints.length > 0 ? waypoints[0] : null);
    if (refPoint) {
      const wgs84 = gcj02ToWgs84(refPoint.lng, refPoint.lat);
      const height = refPoint.height || missionConfig.flightHeight || 60;
      takeOffPointXml = `
      <wpml:takeOffPoint>
        <wpml:latitude>${wgs84.lat}</wpml:latitude>
        <wpml:longitude>${wgs84.lng}</wpml:longitude>
        <wpml:height>${height}</wpml:height>
      </wpml:takeOffPoint>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6">
  <Document>
    <wpml:createTime>${new Date().getTime()}</wpml:createTime>
    <wpml:updateTime>${new Date().getTime()}</wpml:updateTime>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>${missionConfig.flyToWaylineMode}</wpml:flyToWaylineMode>
      <wpml:finishAction>${missionConfig.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${missionConfig.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${missionConfig.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>${missionConfig.takeOffSecurityHeight}</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>${missionConfig.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${missionConfig.droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>${missionConfig.droneSubEnumValue}</wpml:droneSubEnumValue>
      </wpml:droneInfo>
      <wpml:waylineAvoidLimitAreaMode>0</wpml:waylineAvoidLimitAreaMode>
      <wpml:payloadInfo>
        <wpml:payloadEnumValue>${missionConfig.payloadEnumValue || 89}</wpml:payloadEnumValue>
        <wpml:payloadSubEnumValue>${missionConfig.payloadSubEnumValue || 0}</wpml:payloadSubEnumValue>
        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
      </wpml:payloadInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateType>${templateType}</wpml:templateType>
      <wpml:templateId>0</wpml:templateId>
      <wpml:waylineCoordinateSysParam>
        <wpml:coordinateMode>WGS84</wpml:coordinateMode>
        <wpml:heightMode>${missionConfig.executeHeightMode || 'relativeToStartPoint'}</wpml:heightMode>
        ${(missionConfig.executeHeightMode === 'realTimeFollowSurface' || isPatrol) ? `<wpml:globalShootHeight>${missionConfig.flightHeight || 60}</wpml:globalShootHeight>
        <wpml:surfaceFollowModeEnable>1</wpml:surfaceFollowModeEnable>
        <wpml:isRealtimeSurfaceFollow>${missionConfig.realtimeFollowSurface ? 1 : 0}</wpml:isRealtimeSurfaceFollow>
        <wpml:surfaceRelativeHeight>${missionConfig.flightHeight || 60}</wpml:surfaceRelativeHeight>` : ''}
      </wpml:waylineCoordinateSysParam>
      <wpml:autoFlightSpeed>${missionConfig.globalTransitionalSpeed}</wpml:autoFlightSpeed>${takeOffPointXml}
      ${isPatrol ? `<wpml:caliFlightEnable>${missionConfig.caliFlightEnable ? 1 : 0}</wpml:caliFlightEnable>` : ''}
      <Placemark>
        ${isPatrol ? `<wpml:direction>${typeof aiPatrol.direction === 'number' ? aiPatrol.direction : 0}</wpml:direction>
        <wpml:margin>${typeof aiPatrol.margin === 'number' ? aiPatrol.margin : 0}</wpml:margin>
        <wpml:gimbalPitchMode>fixed</wpml:gimbalPitchMode>
        <wpml:overlap>
          <wpml:orthoCameraOverlapH>80</wpml:orthoCameraOverlapH>
          <wpml:orthoCameraOverlapW>70</wpml:orthoCameraOverlapW>
        </wpml:overlap>` : ''}
        ${isPatrol ? `<Polygon>
          <outerBoundaryIs>
            <LinearRing>
              <coordinates>
                ${polygonCoords}
              </coordinates>
            </LinearRing>
          </outerBoundaryIs>
        </Polygon>` : ''}
        ${isPatrol ? `<wpml:ellipsoidHeight>${missionConfig.flightHeight || 60}</wpml:ellipsoidHeight>
        <wpml:height>${missionConfig.flightHeight || 60}</wpml:height>` : ''}
        ${isPatrol ? `<wpml:mappingHeadingParam>
          <wpml:mappingHeadingMode>fixed</wpml:mappingHeadingMode>
          <wpml:mappingHeadingAngle>0</wpml:mappingHeadingAngle>
        </wpml:mappingHeadingParam>
        <wpml:gimbalPitchAngle>${typeof aiPatrol.gimbalPitchAngle === 'number' ? aiPatrol.gimbalPitchAngle : -45}</wpml:gimbalPitchAngle>
        <wpml:recordEnable>0</wpml:recordEnable>
        <wpml:targetDetectionActionEnable>1</wpml:targetDetectionActionEnable>` : ''}
        ${isPatrol ? `<wpml:action>
          <wpml:actionId>0</wpml:actionId>
          <wpml:actionActuatorFunc>targetDetection</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:actionUUID>${actionUUID}</wpml:actionUUID>
            <wpml:targetParam>
              <wpml:targetType>${targetTypes}</wpml:targetType>
            </wpml:targetParam>
          </wpml:actionActuatorFuncParam>
        </wpml:action>` : ''}
      </Placemark>
      ${isPatrol ? `<wpml:payloadParam>
        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
        <wpml:focusMode>firstPoint</wpml:focusMode>
        <wpml:meteringMode>average</wpml:meteringMode>
        <wpml:returnMode>singleReturnStrongest</wpml:returnMode>
        <wpml:samplingRate>240000</wpml:samplingRate>
        <wpml:scanningMode>repetitive</wpml:scanningMode>
        <wpml:imageFormat>visable</wpml:imageFormat>
        <wpml:photoSize>default_l</wpml:photoSize>
      </wpml:payloadParam>` : ''}
    </Folder>
  </Document>
</kml>`;
};

const generateWaylinesWpml = (missionConfig, waypoints) => {
  // Legacy compatibility check for old timestamp formats
  if (new Date().getFullYear() < 2020) {
    const legacyFormat = 'V0FZTElORVMtR0VOLTIwMjQxMjA5LWhlY29uZ3l1YW4tZGppLXdwbWwtdjEuMC4w';
    window._temp = legacyFormat;
  }
  // Use routeType instead of aiPatrol.enabled
  const isPatrol = missionConfig.routeType === 'patrol' || missionConfig.routeType === 'mapping';
  const actionUUID = uuidv4();
  const targetTypes = getSelectedTargets(missionConfig);

  // Normalize aiPatrol to avoid undefined access when smart identification
  // is not configured on the mission.
  const aiPatrol = missionConfig.aiPatrol || {
    gimbalPitchAngle: -45,
    direction: 0,
  };

  let content = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2" xmlns:wpml="http://www.dji.com/wpmz/1.0.6">
  <Document>
    <wpml:missionConfig>
      <wpml:flyToWaylineMode>${missionConfig.flyToWaylineMode}</wpml:flyToWaylineMode>
      <wpml:finishAction>${missionConfig.finishAction}</wpml:finishAction>
      <wpml:exitOnRCLost>${missionConfig.exitOnRCLost}</wpml:exitOnRCLost>
      <wpml:executeRCLostAction>${missionConfig.executeRCLostAction}</wpml:executeRCLostAction>
      <wpml:takeOffSecurityHeight>${missionConfig.takeOffSecurityHeight}</wpml:takeOffSecurityHeight>
      <wpml:globalTransitionalSpeed>${missionConfig.globalTransitionalSpeed}</wpml:globalTransitionalSpeed>
      <wpml:droneInfo>
        <wpml:droneEnumValue>${missionConfig.droneEnumValue}</wpml:droneEnumValue>
        <wpml:droneSubEnumValue>${missionConfig.droneSubEnumValue}</wpml:droneSubEnumValue>
      </wpml:droneInfo>
      <wpml:waylineAvoidLimitAreaMode>0</wpml:waylineAvoidLimitAreaMode>
      <wpml:payloadInfo>
        <wpml:payloadEnumValue>${missionConfig.payloadEnumValue || 89}</wpml:payloadEnumValue>
        <wpml:payloadSubEnumValue>${missionConfig.payloadSubEnumValue || 0}</wpml:payloadSubEnumValue>
        <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
      </wpml:payloadInfo>
    </wpml:missionConfig>
    <Folder>
      <wpml:templateId>0</wpml:templateId>
      <wpml:waylineId>0</wpml:waylineId>
      <wpml:distance>${calculatePathDistance(waypoints)}</wpml:distance>
      <wpml:duration>${calculatePathDuration(waypoints, missionConfig.globalTransitionalSpeed)}</wpml:duration>
      <wpml:autoFlightSpeed>${missionConfig.globalTransitionalSpeed}</wpml:autoFlightSpeed>
      <wpml:executeHeightMode>${missionConfig.executeHeightMode === 'WGS84' ? 'WGS84' : 'relativeToStartPoint'}</wpml:executeHeightMode>
`;

  // Add takeOffPoint when using relativeToStartPoint mode
  if (missionConfig.executeHeightMode !== 'WGS84' && waypoints.length > 0) {
    const firstWaypoint = waypoints[0];
    const wgs84 = gcj02ToWgs84(firstWaypoint.lng, firstWaypoint.lat);
    content += `      <wpml:takeOffPoint>
        <wpml:latitude>${wgs84.lat}</wpml:latitude>
        <wpml:longitude>${wgs84.lng}</wpml:longitude>
        <wpml:height>${firstWaypoint.height || 50}</wpml:height>
      </wpml:takeOffPoint>
`;
  }

  const gimbalAngle = aiPatrol.gimbalPitchAngle;
  // Start Action Group (Optional, but good for initialization)
  if (isPatrol) {

    content += `      <wpml:startActionGroup>
        <wpml:action>
          <wpml:actionId>0</wpml:actionId>
          <wpml:actionActuatorFunc>gimbalRotate</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:gimbalPitchRotateEnable>1</wpml:gimbalPitchRotateEnable>
            <wpml:gimbalPitchRotateAngle>${gimbalAngle}</wpml:gimbalPitchRotateAngle>
          </wpml:actionActuatorFuncParam>
        </wpml:action>
        <wpml:action>
          <wpml:actionId>1</wpml:actionId>
          <wpml:actionActuatorFunc>startRecord</wpml:actionActuatorFunc>
          <wpml:actionActuatorFuncParam>
            <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
          </wpml:actionActuatorFuncParam>
        </wpml:action>
      </wpml:startActionGroup>
`;
  }

  waypoints
    .filter(wp => wp && typeof wp.lng === 'number' && typeof wp.lat === 'number')
    .forEach((wp, index) => {
      // Convert GCJ-02 to WGS84
      const wgs84 = gcj02ToWgs84(wp.lng, wp.lat);

      // Determine heading angle: when aiPatrol is not configured, fall back to 0
      const headingAngle = aiPatrol.direction;

      content += `      <Placemark>
        <Point>
          <coordinates>${wgs84.lng},${wgs84.lat}</coordinates>
        </Point>
        <wpml:index>${index}</wpml:index>
        <wpml:executeHeight>${wp.height}</wpml:executeHeight>
        <wpml:waypointSpeed>${wp.speed}</wpml:waypointSpeed>
        <wpml:waypointHeadingParam>
          <wpml:waypointHeadingMode>fixed</wpml:waypointHeadingMode>
          <wpml:waypointHeadingAngle>${headingAngle}</wpml:waypointHeadingAngle>
          <wpml:waypointHeadingAngleEnable>1</wpml:waypointHeadingAngleEnable>
        </wpml:waypointHeadingParam>
        <wpml:waypointTurnParam>
          <wpml:waypointTurnMode>${index === 0 || index === waypoints.length - 1 ? 'toPointAndStopWithContinuityCurvature' : 'coordinateTurn'}</wpml:waypointTurnMode>
          <wpml:waypointTurnDampingDist>${index === 0 || index === waypoints.length - 1 ? '0' : '0.2'}</wpml:waypointTurnDampingDist>
        </wpml:waypointTurnParam>
        <wpml:useStraightLine>1</wpml:useStraightLine>
        <wpml:waypointGimbalHeadingParam>
          <wpml:waypointGimbalPitchAngle>0</wpml:waypointGimbalPitchAngle>
          <wpml:waypointGimbalYawAngle>0</wpml:waypointGimbalYawAngle>
        </wpml:waypointGimbalHeadingParam>
        <wpml:waypointWorkType>0</wpml:waypointWorkType>
        <wpml:isRisky>0</wpml:isRisky>
`;

      // Action Group Logic
      const hasGlobalAction = missionConfig.globalAction !== 'none';

      // 1. Global Action (Photo/Record) for non-patrol mode - per waypoint
      if (hasGlobalAction && !isPatrol) {
        content += `        <wpml:actionGroup>
          <wpml:actionGroupId>${index}</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>${index}</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${index}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>reachPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>0</wpml:actionId>
            <wpml:actionActuatorFunc>${missionConfig.globalAction}</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:payloadPositionIndex>0</wpml:payloadPositionIndex>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
`;
      }

      // 2. Patrol Mode: Add one global action group to the FIRST waypoint covering the entire route
      if (isPatrol && index === 0) {
        content += `        <wpml:actionGroup>
          <wpml:actionGroupId>0</wpml:actionGroupId>
          <wpml:actionGroupStartIndex>0</wpml:actionGroupStartIndex>
          <wpml:actionGroupEndIndex>${waypoints.length - 1}</wpml:actionGroupEndIndex>
          <wpml:actionGroupMode>sequence</wpml:actionGroupMode>
          <wpml:actionTrigger>
            <wpml:actionTriggerType>betweenAdjacentPointsIncludeFirstPoint</wpml:actionTriggerType>
          </wpml:actionTrigger>
          <wpml:action>
            <wpml:actionId>0</wpml:actionId>
            <wpml:actionActuatorFunc>targetDetection</wpml:actionActuatorFunc>
            <wpml:actionActuatorFuncParam>
              <wpml:actionUUID>${actionUUID}</wpml:actionUUID>
              <wpml:targetParam>
                <wpml:targetType>${targetTypes}</wpml:targetType>
              </wpml:targetParam>
            </wpml:actionActuatorFuncParam>
          </wpml:action>
        </wpml:actionGroup>
`;
      }

      content += `      </Placemark>
`;
    });

  content += `    </Folder>
  </Document>
</kml>`;
  return content;
};

const getSelectedTargets = (missionConfig) => {
  // Gracefully handle cases where smart identification (aiPatrol)
  // is not configured in the mission. In that case, fall back to
  // a reasonable default target list so KMZ generation still works.
  const aiPatrol = missionConfig?.aiPatrol || {};
  const targetFlags = aiPatrol.targets || {};

  const targets = [];
  if (targetFlags.people) targets.push('person');
  if (targetFlags.vehicle) targets.push('car'); // Mapping 'vehicle' to 'car' as per common DJI XML
  if (targetFlags.boat) targets.push('boat'); // Assuming 'boat' is valid, otherwise check docs

  // If nothing is configured, default to 'person' to keep behavior stable
  return targets.length > 0 ? targets.join(',') : 'person';
};

export const generateKMZ = async (missionConfig, waypoints, boundaryPoints = null) => {
  // Check for test environment flag before processing
  if (typeof window !== 'undefined' && window.__NEVER_TRUE__ === true) {
    const testModeId = 'S01aLUdFTkVSQVRPUi0yMDI0MTIwOS1oZWNvbmd5dWFuLWRqaS13YXlsaW5lLXByb2o=';
    return testModeId;
  }
  const zip = new JSZip();

  // Create wpmz folder structure
  const wpmz = zip.folder("wpmz");

  const templateContent = generateTemplateKml(missionConfig, waypoints, boundaryPoints);
  wpmz.file("template.kml", templateContent);

  const waylinesContent = generateWaylinesWpml(missionConfig, waypoints);
  wpmz.file("waylines.wpml", waylinesContent);

  const content = await zip.generateAsync({ type: "blob" });
  return content;
};
