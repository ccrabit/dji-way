<template>
  <div class="polygon-route-config">
    <a-divider orientation="left" class="!mt-0 !mb-4 !text-gray-900 !font-semibold">
      面状航线配置
    </a-divider>

    <a-form layout="vertical">
      <!-- 相机参数配置 -->
      <a-form-item label="相机型号">
        <a-select 
          :value="localConfig.cameraPreset" 
          @update:value="onCameraPresetChange"
          placeholder="选择相机型号或手动配置"
        >
          <a-select-option value="custom">手动配置</a-select-option>
          <a-select-option value="m3e">Mavic 3E</a-select-option>
          <a-select-option value="m3t">Mavic 3T 广角</a-select-option>
          <a-select-option value="m30t">M30T 广角</a-select-option>
          <a-select-option value="m300">M300 RTK + P1</a-select-option>
        </a-select>
      </a-form-item>

      <!-- 间距计算方式 -->
      <a-form-item label="间距计算">
        <a-radio-group 
          :value="localConfig.spacingMode" 
          @update:value="val => updateLocalConfig('spacingMode', val)"
          button-style="solid"
          class="w-full"
        >
          <a-radio-button value="manual" class="flex-1 text-center">手动设置</a-radio-button>
          <a-radio-button value="auto" class="flex-1 text-center">相机自动</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <!-- 手动间距 -->
      <a-form-item 
        v-if="localConfig.spacingMode === 'manual'" 
        label="航线间距 (米)"
      >
        <a-input-number
          :value="localConfig.spacing"
          @update:value="val => updateLocalConfig('spacing', val)"
          :min="5"
          :max="500"
          :step="5"
          class="w-full"
        />
        <div class="text-xs text-gray-500 mt-1">
          相邻航线之间的距离
        </div>
      </a-form-item>

      <!-- 自动模式下的重叠率配置 -->
      <template v-if="localConfig.spacingMode === 'auto'">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="横向重叠率 (%)">
              <a-input-number
                :value="localConfig.overlapLateral * 100"
                @update:value="val => updateLocalConfig('overlapLateral', val / 100)"
                :min="50"
                :max="90"
                :step="5"
                class="w-full"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="纵向重叠率 (%)">
              <a-input-number
                :value="localConfig.overlapLongitudinal * 100"
                @update:value="val => updateLocalConfig('overlapLongitudinal', val / 100)"
                :min="50"
                :max="90"
                :step="5"
                class="w-full"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <!-- 计算结果显示 -->
        <a-alert 
          v-if="calculatedSpacing > 0"
          type="info" 
          show-icon
          class="mb-4"
        >
          <template #message>
            <div class="text-xs">
              <div><strong>航线间距:</strong> {{ calculatedSpacing.toFixed(2) }} 米</div>
              <div class="text-gray-500 mt-1">基于飞行高度 {{ modelValue.globalHeight }}m 和相机参数自动计算</div>
            </div>
          </template>
        </a-alert>
      </template>

      <!-- 航线角度 -->
      <a-form-item label="航线角度">
        <div class="flex items-center gap-3">
          <a-slider
            :value="localConfig.angle"
            @update:value="val => updateLocalConfig('angle', val)"
            :min="0"
            :max="180"
            :step="15"
            class="flex-1"
            :marks="{ 0: '0°', 45: '45°', 90: '90°', 135: '135°', 180: '180°' }"
          />
          <a-input-number
            :value="localConfig.angle"
            @update:value="val => updateLocalConfig('angle', val)"
            :min="0"
            :max="180"
            class="w-20"
            size="small"
          />
        </div>
        <div class="text-xs text-gray-500 mt-1">
          0° = 南北向，90° = 东西向
        </div>
      </a-form-item>

      <!-- 边距 -->
      <a-form-item label="安全边距 (米)">
        <a-input-number
          :value="localConfig.margin"
          @update:value="val => updateLocalConfig('margin', val)"
          :min="0"
          :max="50"
          :step="1"
          class="w-full"
        />
        <div class="text-xs text-gray-500 mt-1">
          多边形边界向内收缩的距离
        </div>
      </a-form-item>

      <!-- 路径优化 -->
      <a-form-item label="路径优化">
        <a-switch
          :checked="localConfig.optimizePath"
          @update:checked="val => updateLocalConfig('optimizePath', val)"
        />
        <span class="ml-2 text-sm text-gray-600">
          自动移除冗余航点，优化飞行路径
        </span>
      </a-form-item>

      <!-- 高级相机参数（自定义模式） -->
      <template v-if="localConfig.cameraPreset === 'custom' && localConfig.spacingMode === 'auto'">
        <a-divider orientation="left" class="!text-sm">自定义相机参数</a-divider>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="传感器宽度 (mm)">
              <a-input-number
                :value="localConfig.customCamera.sensorWidth"
                @update:value="val => updateCustomCamera('sensorWidth', val)"
                :min="1"
                :step="0.1"
                class="w-full"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="传感器高度 (mm)">
              <a-input-number
                :value="localConfig.customCamera.sensorHeight"
                @update:value="val => updateCustomCamera('sensorHeight', val)"
                :min="1"
                :step="0.1"
                class="w-full"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="焦距 (mm)">
              <a-input-number
                :value="localConfig.customCamera.focalLength"
                @update:value="val => updateCustomCamera('focalLength', val)"
                :min="1"
                :step="0.1"
                class="w-full"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="图像宽度 (px)">
              <a-input-number
                :value="localConfig.customCamera.imageWidth"
                @update:value="val => updateCustomCamera('imageWidth', val)"
                :min="100"
                :step="10"
                class="w-full"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </template>

      <!-- 自动生成提示 -->
      <a-alert 
        type="success" 
        show-icon
        class="mt-4"
        v-if="canGenerate"
      >
        <template #message>
          <div class="text-xs">
            <strong>✨ 实时生成中</strong>
            <div class="text-gray-600 mt-1">航线将随着边界点和参数变化自动更新</div>
          </div>
        </template>
      </a-alert>

      <!-- 手动刷新按钮 -->
      <a-button 
        block 
        size="large"
        @click="handleGenerate"
        :disabled="!canGenerate"
        class="mt-2"
      >
        <template #icon>
          <span>🔄</span>
        </template>
        手动刷新航线
      </a-button>

      <!-- 统计信息 -->
      <a-card v-if="routeStats && routeStats.photoCount > 0" size="small" class="mt-4 bg-blue-50 border-blue-200">
        <template #title>
          <span class="text-sm font-semibold text-gray-700">📊 航线统计</span>
        </template>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <div class="text-xl font-bold text-blue-600">{{ routeStats.photoCount }}</div>
            <div class="text-xs text-gray-600">航点数</div>
          </div>
          <div>
            <div class="text-xl font-bold text-green-600">{{ routeStats.totalDistance }}</div>
            <div class="text-xs text-gray-600">航程(m)</div>
          </div>
          <div>
            <div class="text-xl font-bold text-orange-600">{{ Math.ceil(routeStats.flightTime / 60) }}</div>
            <div class="text-xs text-gray-600">预计(分)</div>
          </div>
        </div>
      </a-card>
      
      <!-- 无数据提示 -->
      <a-alert 
        v-else-if="waypoints.length < 3"
        type="info" 
        show-icon
        class="mt-4"
      >
        <template #message>
          <div class="text-xs">
            <strong>📍 绘制边界</strong>
            <div class="text-gray-600 mt-1">请在地图上点击至少 3 个点绘制作业区域</div>
          </div>
        </template>
      </a-alert>
    </a-form>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { CAMERA_PRESETS, calculateSpacing } from '../../utils/polygonRouteGenerator';

const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  },
  waypoints: {
    type: Array,
    default: () => []
  },
  routeStats: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'generate']);

// 本地配置状态
const localConfig = ref({
  spacingMode: 'manual',
  spacing: 30,
  angle: 0,
  margin: 0,
  overlapLateral: 0.7,
  overlapLongitudinal: 0.7,
  optimizePath: true,
  cameraPreset: 'custom',
  customCamera: {
    sensorWidth: 6.3,
    sensorHeight: 4.7,
    focalLength: 4.88,
    imageWidth: 1920,
    imageHeight: 1440
  }
});

// 初始化配置
if (props.modelValue.polygonRoute) {
  Object.assign(localConfig.value, props.modelValue.polygonRoute);
}

// 计算航线间距
const calculatedSpacing = computed(() => {
  if (localConfig.value.spacingMode !== 'auto') return 0;
  
  const camera = localConfig.value.cameraPreset === 'custom' 
    ? localConfig.value.customCamera 
    : CAMERA_PRESETS[localConfig.value.cameraPreset];
  
  if (!camera) return 0;
  
  return calculateSpacing(
    props.modelValue.globalHeight || 50,
    camera,
    localConfig.value.overlapLateral,
    'lateral'
  );
});

// 是否可以生成
const canGenerate = computed(() => {
  return props.waypoints.length >= 3;
});

// 更新本地配置
const updateLocalConfig = (key, value) => {
  localConfig.value[key] = value;
  emitConfig();
};

// 更新自定义相机参数
const updateCustomCamera = (key, value) => {
  localConfig.value.customCamera[key] = value;
  emitConfig();
};

// 相机预设变更
const onCameraPresetChange = (preset) => {
  localConfig.value.cameraPreset = preset;
  if (preset !== 'custom' && CAMERA_PRESETS[preset]) {
    // 不覆盖 customCamera，保留用户配置
  }
  emitConfig();
};

// 发送配置更新
const emitConfig = () => {
  emit('update:modelValue', {
    ...props.modelValue,
    polygonRoute: { ...localConfig.value }
  });
};

// 生成航线
const handleGenerate = () => {
  emit('generate');
};

// 监听全局高度变化，重新计算间距
watch(() => props.modelValue.globalHeight, () => {
  if (localConfig.value.spacingMode === 'auto') {
    emitConfig();
  }
});
</script>

<style scoped>
.polygon-route-config :deep(.ant-slider-mark-text) {
  font-size: 11px;
}
</style>
