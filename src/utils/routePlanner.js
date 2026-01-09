// 简单的几何计算工具

// 将经纬度转换为米（近似平面坐标，以第一个点为原点）
const projectToMeters = (lat, lng, origin) => {
  const R = 6378137; // 地球半径
  const dLat = (lat - origin.lat) * Math.PI / 180;
  const dLng = (lng - origin.lng) * Math.PI / 180;
  const x = dLng * R * Math.cos(origin.lat * Math.PI / 180);
  const y = dLat * R;
  return { x, y };
};

// 将米转换为经纬度
const unprojectFromMeters = (x, y, origin) => {
  const R = 6378137;
  const dLat = y / R;
  const lat = origin.lat + dLat * 180 / Math.PI;
  const dLng = x / (R * Math.cos(origin.lat * Math.PI / 180));
  const lng = origin.lng + dLng * 180 / Math.PI;
  return { lat, lng };
};

// 射线法判断点是否在多边形内
const isPointInPolygon = (point, polygon) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y))
        && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// 获取多边形包围盒
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

// 生成 S 形扫描路径（支持方向角度和边距）
export const generateScanPath = (boundaryPoints, spacingMeters, directionAngle = 0, marginMeters = 0) => {
  console.log('generateScanPath called with:', boundaryPoints.length, 'points, spacing:', spacingMeters, 'direction:', directionAngle, 'margin:', marginMeters);
  
  if (boundaryPoints.length < 3) {
    console.log('Not enough points for scan path');
    return [];
  }

  const origin = boundaryPoints[0];
  
  // 1. 投影到平面坐标
  let polygon = boundaryPoints.map(p => projectToMeters(p.lat, p.lng, origin));
  
  // 2. 应用边距（向内收缩多边形）
  if (marginMeters > 0) {
    polygon = shrinkPolygon(polygon, marginMeters);
    if (polygon.length < 3) {
      console.log('Polygon too small after applying margin');
      return [];
    }
  }
  
  // 3. 旋转多边形（以便沿指定方向扫描）
  // directionAngle: 0° = North-South (vertical scan), 90° = East-West (horizontal scan)
  // Our algorithm generates horizontal scan lines (Y fixed, X varies) in the rotated coordinate system
  // To get vertical lines (N-S) in the original system, we rotate by 90°
  // To get horizontal lines (E-W) in the original system, we rotate by 0° (or 180°)
  // Formula: rotate polygon by -(directionAngle + 90)
  const angleRad = -(directionAngle + 90) * Math.PI / 180;
  const rotatedPolygon = polygon.map(p => rotatePoint(p, angleRad));
  
  // 4. 计算旋转后的包围盒
  const bbox = getBoundingBox(rotatedPolygon);
  console.log('Bounding box after rotation:', bbox);
  
  // 5. 生成扫描线（在旋转后的坐标系中）
  const waypoints = [];
  let scanLineY = bbox.minY + spacingMeters / 2;
  let isLeftToRight = true;

  while (scanLineY <= bbox.maxY) {
    // 找到扫描线与多边形边的交点
    const intersections = [];
    for (let i = 0, j = rotatedPolygon.length - 1; i < rotatedPolygon.length; j = i++) {
      const p1 = rotatedPolygon[i];
      const p2 = rotatedPolygon[j];
      
      // 判断线段是否跨越扫描线 Y
      if ((p1.y < scanLineY && p2.y >= scanLineY) || (p2.y < scanLineY && p1.y >= scanLineY)) {
        // 计算交点 X
        const x = p1.x + (scanLineY - p1.y) * (p2.x - p1.x) / (p2.y - p1.y);
        intersections.push(x);
      }
    }

    // 对交点 X 排序
    intersections.sort((a, b) => a - b);

    // 成对处理交点（进入-离开）
    for (let k = 0; k < intersections.length; k += 2) {
      if (k + 1 >= intersections.length) break;
      
      const x1 = intersections[k];
      const x2 = intersections[k + 1];
      
      // 根据方向添加点
      if (isLeftToRight) {
        waypoints.push({ x: x1, y: scanLineY });
        waypoints.push({ x: x2, y: scanLineY });
      } else {
        waypoints.push({ x: x2, y: scanLineY });
        waypoints.push({ x: x1, y: scanLineY });
      }
    }

    scanLineY += spacingMeters;
    isLeftToRight = !isLeftToRight;
  }

  console.log('Generated', waypoints.length, 'scan waypoints');

  // 6. 反向旋转航点（回到原坐标系）
  const unrotatedWaypoints = waypoints.map(p => rotatePoint(p, -angleRad));

  // 7. 转回经纬度
  const defaultHeight = boundaryPoints[0]?.height || 50;
  const defaultSpeed = boundaryPoints[0]?.speed || 10;
  
  return unrotatedWaypoints.map(p => {
    const coords = unprojectFromMeters(p.x, p.y, origin);
    return {
      lat: Number(coords.lat.toFixed(7)),
      lng: Number(coords.lng.toFixed(7)),
      height: defaultHeight,
      speed: defaultSpeed
    };
  });
};

// 辅助函数：旋转点
const rotatePoint = (point, angleRad) => {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos
  };
};

// 辅助函数：多边形向内收缩（简化版，使用中心点缩放）
const shrinkPolygon = (polygon, margin) => {
  // 计算多边形中心
  let centerX = 0, centerY = 0;
  polygon.forEach(p => {
    centerX += p.x;
    centerY += p.y;
  });
  centerX /= polygon.length;
  centerY /= polygon.length;

  // 计算平均半径
  let avgRadius = 0;
  polygon.forEach(p => {
    const dx = p.x - centerX;
    const dy = p.y - centerY;
    avgRadius += Math.sqrt(dx * dx + dy * dy);
  });
  avgRadius /= polygon.length;

  // 缩放因子
  const scale = Math.max(0.1, (avgRadius - margin) / avgRadius);

  // 向中心收缩
  return polygon.map(p => ({
    x: centerX + (p.x - centerX) * scale,
    y: centerY + (p.y - centerY) * scale
  }));
};
