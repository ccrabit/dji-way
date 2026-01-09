<template>
  <div class="relative w-full h-full bg-white shadow-lg flex flex-col overflow-hidden font-sans border-r border-gray-200">
    <div class="p-4 bg-white border-b border-gray-200 flex flex-col gap-3 shrink-0">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <a-button type="text" @click="$emit('back')">
            <template #icon><span>←</span></template>
          </a-button>
          <h1 class="text-lg text-gray-800 m-0 font-bold">航线编辑</h1>
        </div>
        <a-button type="text" @click="$emit('save')">
          <template #icon><span>💾</span></template>
        </a-button>
      </div>
      
      <!-- Action Buttons in Header -->
      <div class="flex gap-2">
        <a-upload
          accept=".kmz"
          :show-upload-list="false"
          :before-upload="handleBeforeUpload"
          class="flex-1"
        >
          <a-button block size="small">
            <template #icon><span>📁</span></template>
            导入 KMZ
          </a-button>
        </a-upload>
        <a-button type="primary" block size="small" class="flex-1" @click="$emit('generate')">
          生成 KMZ
        </a-button>
      </div>
    </div>

    <!-- Mission Stats -->
    <div class="grid grid-cols-3 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-200 shrink-0" v-if="waypoints.length > 0">
      <div class="flex flex-col items-center">
        <span class="text-xs text-gray-500 mb-1">总距离</span>
        <span class="text-sm font-semibold text-gray-800">{{ formatNumber(missionStats.distance) }} m</span>
      </div>
      <div class="flex flex-col items-center">
        <span class="text-xs text-gray-500 mb-1">预计耗时</span>
        <span class="text-sm font-semibold text-gray-800">{{ formatTime(missionStats.time) }}</span>
      </div>
      <div class="flex flex-col items-center" v-if="missionStats.area > 0">
        <span class="text-xs text-gray-500 mb-1">覆盖面积</span>
        <span class="text-sm font-semibold text-gray-800">{{ formatArea(missionStats.area) }}</span>
      </div>
    </div>

    <div class="overflow-y-auto p-6 flex flex-col gap-6 flex-1">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="config" tab="任务配置">
          <MissionConfig v-model="localMissionConfig" />
        </a-tab-pane>
        <a-tab-pane key="polygon" tab="面状航线" v-if="isPolygonMode">
          <PolygonRouteConfig 
            v-model="localMissionConfig"
            :waypoints="waypoints"
            :route-stats="routeStats"
            @generate="$emit('generate-polygon')"
          />
        </a-tab-pane>
        <a-tab-pane key="waypoints" tab="航点列表">
          <WaypointList 
            :waypoints="waypoints" 
            @update:waypoints="$emit('update:waypoints', $event)"
            @remove="$emit('remove-waypoint', $event)"
            @clear="$emit('clear-waypoints')"
            @reverse="$emit('reverse-waypoints')"
          />
        </a-tab-pane>
      </a-tabs>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { formatTime } from '../../utils/geoUtils';
import MissionConfig from './MissionConfig.vue';
import PolygonRouteConfig from './PolygonRouteConfig.vue';
import WaypointList from './WaypointList.vue';

const props = defineProps({
  missionConfig: {
    type: Object,
    required: true
  },
  waypoints: {
    type: Array,
    required: true
  },
  missionStats: {
    type: Object,
    default: () => ({ area: 0, distance: 0, time: 0 })
  },
  routeStats: {
    type: Object,
    default: null
  }
});

const emit = defineEmits([
  'update:missionConfig', 
  'update:waypoints', 
  'remove-waypoint', 
  'clear-waypoints', 
  'reverse-waypoints',
  'generate',
  'generate-polygon',
  'import-kmz',
  'create-mission',
  'back',
  'save'
]);

const activeTab = ref('config');

// 判断是否为面状模式
const isPolygonMode = computed(() => {
  return props.missionConfig.routeType === 'mapping' || props.missionConfig.routeType === 'polygon';
});

const localMissionConfig = computed({
  get: () => props.missionConfig,
  set: (val) => emit('update:missionConfig', val)
});

// Format area in square meters
const formatArea = (areaM2) => {
  if (!areaM2 || isNaN(areaM2)) return '0 m²';
  return `${Math.round(areaM2)} m²`;
};

const formatNumber = (num) => {
  if (!num || isNaN(num)) return '0';
  return Math.round(num);
};

// Handle KMZ file import
const handleBeforeUpload = (file) => {
  emit('import-kmz', file);
  return false; // Prevent automatic upload
};
</script>

<style scoped>
/* Ant Design Vue overrides if needed */
</style>
