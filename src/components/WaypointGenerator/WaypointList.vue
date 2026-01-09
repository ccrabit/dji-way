<template>
  <div class="flex flex-col">
    <div class="flex justify-between items-center mb-3">
      <h2 class="text-base font-semibold text-gray-800 m-0">航点 ({{ waypoints.length }})</h2>
      <div class="flex gap-2">
        <a-button 
          size="small" 
          type="primary" 
          ghost 
          :disabled="waypoints.length < 2"
          @click="$emit('reverse')"
        >
          反转航线
        </a-button>
        <a-popconfirm
          title="确定要清空所有航点吗？"
          ok-text="确定"
          cancel-text="取消"
          @confirm="$emit('clear')"
        >
          <a-button size="small" danger>清空</a-button>
        </a-popconfirm>
      </div>
    </div>
    
    <div class="flex flex-col gap-3">
      <div v-for="(wp, index) in waypoints" :key="index" class="bg-gray-50 p-3 rounded border border-gray-200">
        <div class="flex justify-between items-center mb-3">
          <span class="font-semibold text-sm">航点 {{ index + 1 }}</span>
          <a-button 
            type="text" 
            danger 
            size="small" 
            class="!px-1 !h-6"
            @click="$emit('remove', index)"
          >
            删除
          </a-button>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col">
            <label class="mb-1 text-gray-500 text-xs">纬度</label>
            <a-input-number 
              :value="wp.lat" 
              :step="0.000001" 
              class="w-full" 
              size="small"
              @update:value="val => updateWaypoint(index, 'lat', val)" 
            />
          </div>
          <div class="flex flex-col">
            <label class="mb-1 text-gray-500 text-xs">经度</label>
            <a-input-number 
              :value="wp.lng" 
              :step="0.000001" 
              class="w-full" 
              size="small"
              @update:value="val => updateWaypoint(index, 'lng', val)" 
            />
          </div>
          <div class="flex flex-col">
            <label class="mb-1 text-gray-500 text-xs">高度 (m)</label>
            <a-input-number 
              :value="wp.height" 
              class="w-full" 
              size="small"
              @update:value="val => updateWaypoint(index, 'height', val)" 
            />
          </div>
          <div class="flex flex-col">
            <label class="mb-1 text-gray-500 text-xs">速度 (m/s)</label>
            <a-input-number 
              :value="wp.speed" 
              class="w-full" 
              size="small"
              @update:value="val => updateWaypoint(index, 'speed', val)" 
            />
          </div>
        </div>
      </div>
      
      <a-empty v-if="waypoints.length === 0" description="暂无航点，请在地图上点击添加" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  waypoints: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['update:waypoints', 'remove', 'clear', 'reverse']);

const updateWaypoint = (index, key, value) => {
  const newWaypoints = [...props.waypoints];
  newWaypoints[index] = { ...newWaypoints[index], [key]: value };
  emit('update:waypoints', newWaypoints);
};
</script>


