// 地球半径 (米)
const R = 6378137;

// 将角度转换为弧度
const toRad = (d) => d * Math.PI / 180;

// 计算两点间的距离 (Haversine 公式)
export const getDistance = (p1, p2) => {
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 计算路径总长度
export const getPathLength = (path) => {
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    length += getDistance(path[i], path[i + 1]);
  }
  return length;
};

// 计算多边形面积 (Shoelace 公式，投影到平面近似计算)
// 注意：对于小范围区域（如无人机作业区），简单的墨卡托投影近似即可
export const getPolygonArea = (points) => {
  if (points.length < 3) return 0;
  
  let area = 0;
  const origin = points[0];
  
  // 投影到相对米坐标
  const project = (p) => {
    const x = (p.lng - origin.lng) * Math.PI / 180 * R * Math.cos(toRad(origin.lat));
    const y = (p.lat - origin.lat) * Math.PI / 180 * R;
    return { x, y };
  };

  const projected = points.map(project);

  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i].x * projected[j].y;
    area -= projected[j].x * projected[i].y;
  }

  return Math.abs(area / 2);
};

// 格式化时间 (秒 -> MM:SS)
export const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}分${s}秒`;
};

// 判断两条线段是否相交 (p1-p2, p3-p4)
const checkIntersection = (p1, p2, p3, p4) => {
  const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  const p1_ = { x: p1.lng, y: p1.lat };
  const p2_ = { x: p2.lng, y: p2.lat };
  const p3_ = { x: p3.lng, y: p3.lat };
  const p4_ = { x: p4.lng, y: p4.lat };
  
  return (ccw(p1_, p3_, p4_) !== ccw(p2_, p3_, p4_)) && (ccw(p1_, p2_, p3_) !== ccw(p1_, p2_, p4_));
};

// 检查加入新点是否会导致自相交
export const willSelfIntersect = (newPoint, currentPoints) => {
  if (currentPoints.length < 2) return false;
  
  const lastPoint = currentPoints[currentPoints.length - 1];
  
  // 检查新线段 (lastPoint -> newPoint) 是否与之前的任何线段相交
  // 不包括与 lastPoint 连接的那条线段 (currentPoints[length-2] -> lastPoint)
  for (let i = 0; i < currentPoints.length - 2; i++) {
    const p1 = currentPoints[i];
    const p2 = currentPoints[i + 1];
    
    if (checkIntersection(lastPoint, newPoint, p1, p2)) {
      return true;
    }
  }
  
  return false;
};
