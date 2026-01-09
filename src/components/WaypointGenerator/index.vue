<template>
  <div class="w-screen h-screen overflow-hidden font-sans bg-[#f5f7fa]">
    <div class="flex h-full w-full">
      <!-- 左侧面板：航线库或控制面板 - 固定宽度 -->
      <div class="h-full shrink-0 transition-all duration-300 border-r border-gray-200 bg-white z-10"
        :style="{ width: currentView === 'library' ? '320px' : '420px' }">
        <!-- View 1: Mission Library -->
        <MissionLibrary v-if="currentView === 'library'" :missions="missions" @create="showCreateModal = true"
          @select="selectMission" @edit="selectMission" @delete="deleteMission" class="h-full" />

        <!-- View 2: Mission Editor (ControlPanel) -->
        <ControlPanel v-else :missionConfig="missionConfig" :waypoints="waypoints" :mission-stats="missionStats"
          :route-stats="routeStats"
          @update:missionConfig="onMissionConfigUpdate" @update:waypoints="waypoints = $event"
          @remove-waypoint="removeWaypoint" @clear-waypoints="clearWaypoints" @reverse-waypoints="reverseWaypoints"
          @generate="handleGenerateKMZ" @generate-polygon="handleGeneratePolygonRoute"
          @import-kmz="handleImportKMZ" @create-mission="showCreateModal = true"
          @back="currentView = 'library'" @save="saveCurrentMission" class="h-full" />
      </div>

      <!-- 右侧地图区域 - 自动填充剩余空间 -->
      <div class="flex-1 h-full relative min-w-0 bg-gray-100">
        <MapViewer :waypoints="waypoints" :is-closed-loop="missionConfig.isClosedLoop"
          :is-patrol-mode="missionConfig.routeType === 'mapping' || missionConfig.routeType === 'patrol'"
          :scan-path="scanPath" @map-click="onMapClick" class="h-full w-full absolute inset-0" />
      </div>
    </div>

    <!-- 创建航线模态框 -->
    <CreateMissionModal :visible="showCreateModal" @cancel="showCreateModal = false" @confirm="onMissionCreated" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { getPolygonArea } from '../../utils/geoUtils';
import { generateKMZ } from '../../utils/kmzGenerator';
import { parseKMZ } from '../../utils/kmzParser';
import { calculateRouteStats, CAMERA_PRESETS, generatePolygonRoute } from '../../utils/polygonRouteGenerator';
import { generateScanPath } from '../../utils/routePlanner';
import ControlPanel from './ControlPanel.vue';
import CreateMissionModal from './CreateMissionModal.vue';
import MapViewer from './MapViewer.vue';
import MissionLibrary from './MissionLibrary.vue';

const waypoints = ref([]);
const missions = ref([]);
const currentView = ref('library');
const showCreateModal = ref(false);

const defaultMissionConfig = {
  missionName: '未命名航线',
  routeType: 'waypoint',
  aircraftSeries: 'm30',
  aircraftModel: 'm30t',
  droneEnumValue: 67,
  payloadEnumValue: 53,
  flyToWaylineMode: 'safely',
  finishAction: 'goHome',
  exitOnRCLost: 'executeLostAction',
  executeRCLostAction: 'goBack',
  takeOffSecurityHeight: 20,
  globalSpeed: 5,
  globalHeight: 50,
  globalTransitionalSpeed: 5,
  globalYawMode: 'path',
  isClosedLoop: false,
  isReverse: false,
  globalAction: 'none',
  gimbalPitch: -90,
  hoverTime: 0,
  photoInterval: 2,
  shootPhoto: false,
  recordVideo: false,
  executeHeightMode: 'realTimeFollowSurface',
  climbMode: 'vertical',
  caliFlightEnable: false,
  scanSetting: {
    overlap: 20,
    angle: 0,
    margin: 0
  }
};

const missionConfig = ref({ ...defaultMissionConfig });
const scanPath = ref([]);
const routeStats = ref(null);

onMounted(() => {
  const saved = localStorage.getItem('missions');
  if (saved) {
    try {
      missions.value = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load missions', e);
    }
  }
});

const saveMissionsToStorage = () => {
  localStorage.setItem('missions', JSON.stringify(missions.value));
};

const onMapClick = (coords) => {
  waypoints.value.push({
    lat: coords.lat,
    lng: coords.lng,
    height: missionConfig.value.globalHeight,
    speed: missionConfig.value.globalSpeed
  });
};

const onMissionCreated = (config) => {
  missionConfig.value = { ...defaultMissionConfig, ...config };
  waypoints.value = [];
  scanPath.value = [];
  showCreateModal.value = false;
  currentView.value = 'editor';
};

const selectMission = (id) => {
  const mission = missions.value.find(m => m.id === id);
  if (mission) {
    missionConfig.value = { ...mission.config };
    waypoints.value = [...mission.waypoints];
    currentView.value = 'editor';
  }
};

const deleteMission = (id) => {
  if (confirm('确定要删除该航线吗？')) {
    missions.value = missions.value.filter(m => m.id !== id);
    saveMissionsToStorage();
  }
};

const onMissionConfigUpdate = (newConfig) => {
  missionConfig.value = newConfig;
};

const removeWaypoint = (index) => {
  waypoints.value.splice(index, 1);
};

const clearWaypoints = () => {
  waypoints.value = [];
  scanPath.value = [];
};

const reverseWaypoints = () => {
  waypoints.value.reverse();
};

const handleGenerateKMZ = async () => {
  try {
    const pointsToUse = (missionConfig.value.routeType === 'mapping' || missionConfig.value.routeType === 'patrol')
      ? scanPath.value
      : waypoints.value;

    const kmzBlob = await generateKMZ(missionConfig.value, pointsToUse, waypoints.value);
    const url = URL.createObjectURL(kmzBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${missionConfig.value.missionName}.kmz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Generate KMZ failed', e);
    alert('生成 KMZ 失败: ' + e.message);
  }
};

const handleImportKMZ = async (file) => {
  try {
    const result = await parseKMZ(file);
    missionConfig.value = { ...missionConfig.value, ...result.config };
    waypoints.value = result.waypoints;
  } catch (e) {
    console.error('Import KMZ failed', e);
    alert('导入 KMZ 失败: ' + e.message);
  }
};

const saveCurrentMission = () => {
  const mission = {
    id: Date.now(),
    name: missionConfig.value.missionName,
    config: { ...missionConfig.value },
    waypoints: [...waypoints.value],
    updatedAt: Date.now()
  };

  missions.value.push(mission);
  saveMissionsToStorage();
};

// 核心生成函数（静默生成，不显示提示）
const generatePolygonRouteInternal = (showAlert = false) => {
  if (waypoints.value.length < 3) {
    if (showAlert) {
      alert('至少需要 3 个边界点才能生成面状航线');
    }
    scanPath.value = [];
    routeStats.value = null;
    return false;
  }
  
  try {
    const polygonConfig = missionConfig.value.polygonRoute || {};
    
    // 准备生成选项
    const options = {
      height: missionConfig.value.globalHeight || 50,
      speed: missionConfig.value.globalSpeed || 5,
      angle: polygonConfig.angle || 0,
      margin: polygonConfig.margin || 0,
      optimizePath: polygonConfig.optimizePath !== false
    };
    
    // 判断间距计算方式
    if (polygonConfig.spacingMode === 'auto') {
      // 自动模式：使用相机参数
      options.useCamera = true;
      options.overlapRate = polygonConfig.overlapLateral || 0.7;
      
      if (polygonConfig.cameraPreset === 'custom') {
        options.camera = polygonConfig.customCamera;
      } else if (CAMERA_PRESETS[polygonConfig.cameraPreset]) {
        options.camera = CAMERA_PRESETS[polygonConfig.cameraPreset];
      } else {
        // 默认相机
        options.camera = CAMERA_PRESETS.m30t;
      }
    } else {
      // 手动模式：使用固定间距
      options.spacing = polygonConfig.spacing || 30;
    }
    
    console.log('生成选项:', options);
    
    // 生成航线
    const generatedPath = generatePolygonRoute(waypoints.value, options);
    
    if (generatedPath.length === 0) {
      if (showAlert) {
        alert('生成失败：未能生成有效航线，请检查参数设置');
      }
      scanPath.value = [];
      routeStats.value = null;
      return false;
    }
    
    scanPath.value = generatedPath;
    routeStats.value = calculateRouteStats(generatedPath);
    
    console.log('生成完成 |', {
      航点数: generatedPath.length,
      航程: routeStats.value.totalDistance + 'm',
      时间: Math.ceil(routeStats.value.flightTime / 60) + '分钟'
    });
    
    if (showAlert) {
      alert(`航线生成成功！\n航点数: ${generatedPath.length}\n航程: ${routeStats.value.totalDistance}m\n预计时间: ${Math.ceil(routeStats.value.flightTime / 60)}分钟`);
    }
    
    return true;
  } catch (error) {
    console.error('生成面状航线失败:', error);
    if (showAlert) {
      alert('生成失败: ' + error.message);
    }
    scanPath.value = [];
    routeStats.value = null;
    return false;
  }
};

// 手动生成（带提示）
const handleGeneratePolygonRoute = () => {
  generatePolygonRouteInternal(true);
};

// 防抖定时器
let autoGenerateTimer = null;

// 自动生成航线（实时响应，带防抖）
watch(
  [
    waypoints,
    () => missionConfig.value.routeType,
    () => missionConfig.value.globalHeight,
    () => missionConfig.value.globalSpeed,
    () => missionConfig.value.polygonRoute,
    () => missionConfig.value.scanSetting
  ],
  () => {
    // 清除之前的定时器
    if (autoGenerateTimer) {
      clearTimeout(autoGenerateTimer);
    }
    
    if (missionConfig.value.routeType === 'mapping') {
      // 面状航线：自动生成（300ms 防抖）
      autoGenerateTimer = setTimeout(() => {
        generatePolygonRouteInternal(false);
      }, 300);
    } else if (missionConfig.value.routeType === 'patrol') {
      // 巡逻模式：使用旧的简单扫描（即时生成）
      if (waypoints.value.length >= 3) {
        const height = missionConfig.value.globalHeight;
        const overlap = missionConfig.value.scanSetting?.overlap || 20;
        const spacing = 20 * (1 - overlap / 100);

        scanPath.value = generateScanPath(
          waypoints.value,
          spacing,
          missionConfig.value.scanSetting?.angle || 0,
          missionConfig.value.scanSetting?.margin || 0
        );
      } else {
        scanPath.value = [];
      }
    } else {
      // 其他模式：清空航线
      scanPath.value = [];
      routeStats.value = null;
    }
  },
  { deep: true }
);

const missionStats = computed(() => {
  const points = (missionConfig.value.routeType === 'mapping' || missionConfig.value.routeType === 'patrol')
    ? scanPath.value
    : waypoints.value;

  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const R = 6378137;
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLng = (p2.lng - p1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distance += R * c;
  }

  let area = 0;
  if ((missionConfig.value.routeType === 'mapping' || missionConfig.value.routeType === 'patrol') && waypoints.value.length >= 3) {
    area = getPolygonArea(waypoints.value);
  }

  return {
    distance: distance,
    time: distance / (missionConfig.value.globalSpeed || 5),
    waypointCount: points.length,
    area: area
  };
});
</script>
