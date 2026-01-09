<template>
  <div class="relative w-full h-full absolute inset-0">
    <vc-viewer 
      @ready="onViewerReady" 
      :camera="camera" 
      @left-click="onMapClick"
      :animation="false"
      :timeline="false"
      :base-layer-picker="false"
    >
      <vc-navigation></vc-navigation>
      
      <!-- Waypoints (User Clicks) -->
      <vc-entity
        v-for="(wp, index) in waypoints"
        :key="'wp-' + index"
        :position="{ lng: wp.lng, lat: wp.lat, height: wp.height }"
        :point="pointGraphics"
        :label="{
          text: (index + 1).toString(),
          font: '14px sans-serif',
          pixelOffset: [0, -20],
          horizontalOrigin: 0,
          verticalOrigin: 1,
          fillColor: 'white',
          outlineColor: 'black',
          outlineWidth: 2
        }"
      >
      </vc-entity>

      <!-- Polygon Area (Patrol Mode) -->
      <vc-entity v-if="isPatrolMode && waypoints.length > 2">
        <vc-graphics-polygon
          :hierarchy="waypointPositions"
          :material="'rgba(52, 152, 219, 0.3)'"
          :outline="true"
          :outlineColor="'#3498db'"
        ></vc-graphics-polygon>
      </vc-entity>

      <!-- Connection Lines (Normal Mode) -->
      <vc-entity v-else-if="!isPatrolMode && waypointPositions.length > 1">
        <vc-graphics-polyline
          :positions="waypointPositions"
          :material="'#3498db'"
          :width="3"
        ></vc-graphics-polyline>
      </vc-entity>

      <!-- Generated Scan Path (S-Shape) -->
      <vc-entity v-if="isPatrolMode && scanPath.length > 1">
        <vc-graphics-polyline
          :positions="scanPathPositions"
          :material="'#f1c40f'"
          :width="4"
        ></vc-graphics-polyline>
      </vc-entity>
    </vc-viewer>
    
    <!-- Coordinate System Info -->
    <div class="absolute bottom-5 right-5 bg-white/95 p-3.5 rounded-lg shadow-md z-10 backdrop-blur-sm">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs text-gray-500 font-medium">坐标系统</span>
        <span class="text-sm font-bold text-green-500 bg-green-50 py-1 px-2.5 rounded font-mono">WGS84</span>
      </div>
      <div class="text-[11px] text-green-600 font-medium">✓ 大疆航线标准坐标</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { wgs84ToGcj02 } from '../../utils/coordTransform';

const props = defineProps({
  waypoints: {
    type: Array,
    default: () => []
  },
  isClosedLoop: {
    type: Boolean,
    default: false
  },
  isPatrolMode: {
    type: Boolean,
    default: false
  },
  scanPath: {
    type: Array,
    default: () => []
  }
});

watch(() => props.scanPath, (val) => {
  console.log('MapViewer received scanPath:', val.length);
}, { deep: true });

watch(() => props.isPatrolMode, (val) => {
  console.log('MapViewer isPatrolMode:', val);
});

const emit = defineEmits(['map-click']);

const camera = ref({
  position: {
    lng: 104.39, 
    lat: 31.09,
    height: 1000
  },
  heading: 360,
  pitch: -90,
  roll: 0
});

const pointGraphics = {
  pixelSize: 10,
  color: 'red',
  outlineColor: 'white',
  outlineWidth: 2
};

let cesiumInstance = null;
let viewerInstance = null;

const waypointPositions = computed(() => {
  // Waypoints are stored in GCJ-02, display directly
  const positions = props.waypoints.map(wp => ({ lng: wp.lng, lat: wp.lat, height: wp.height }));
  // Normal mode closed loop logic
  if (!props.isPatrolMode && props.isClosedLoop && positions.length >= 2) {
    positions.push(positions[0]);
  }
  return positions;
});

const scanPathPositions = computed(() => {
  // Scan path is in GCJ-02, display directly
  return props.scanPath.map(wp => ({ lng: wp.lng, lat: wp.lat, height: wp.height }));
});

const onViewerReady = ({ Cesium, viewer }) => {
  console.log('Viewer ready');
  cesiumInstance = Cesium;
  viewerInstance = viewer;
  
  viewer.imageryLayers.removeAll();
  
  const amapProvider = new Cesium.UrlTemplateImageryProvider({
    url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
    minimumLevel: 3,
    maximumLevel: 18
  });
  
  viewer.imageryLayers.addImageryProvider(amapProvider);
};

const onMapClick = (e) => {
  if (!viewerInstance || !cesiumInstance) return;
  
  try {
    const windowPosition = e.windowPosition || e.position;
    if (!windowPosition) return;
    
    const ray = viewerInstance.camera.getPickRay(windowPosition);
    if (!ray) return;
    
    const cartesian3 = viewerInstance.scene.globe.pick(ray, viewerInstance.scene);
    if (!cartesian3) return;
    
    const cartographic = cesiumInstance.Cartographic.fromCartesian(cartesian3);
    if (!cartographic) return;
    
    const lng = cesiumInstance.Math.toDegrees(cartographic.longitude);
    const lat = cesiumInstance.Math.toDegrees(cartographic.latitude);
    
    emit('map-click', { lat, lng });
  } catch (error) {
    console.error('Map click error:', error);
  }
};
</script>


