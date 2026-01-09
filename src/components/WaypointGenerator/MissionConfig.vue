<template>
  <div class="mission-config">
    <a-divider orientation="left" class="!mt-0 !mb-4 !text-gray-900 !font-semibold">任务配置</a-divider>

    <a-form layout="vertical">
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="飞向首航点模式">
            <a-select :value="modelValue.flyToWaylineMode" @update:value="val => updateConfig('flyToWaylineMode', val)">
              <a-select-option value="safely">安全模式</a-select-option>
              <a-select-option value="pointToPoint">点对点</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="完成动作">
            <a-select :value="modelValue.finishAction" @update:value="val => updateConfig('finishAction', val)">
              <a-select-option value="goHome">自动返航</a-select-option>
              <a-select-option value="autoLand">自动降落</a-select-option>
              <a-select-option value="hover">原地悬停</a-select-option>
              <a-select-option value="backToStart">返回首航点</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="失控动作">
            <a-select :value="modelValue.executeRCLostAction" @update:value="val => updateConfig('executeRCLostAction', val)">
              <a-select-option value="goBack">自动返航</a-select-option>
              <a-select-option value="hover">原地悬停</a-select-option>
              <a-select-option value="landing">自动降落</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="航线失联行为">
            <a-select :value="modelValue.exitOnRCLost" @update:value="val => updateConfig('exitOnRCLost', val)">
              <a-select-option value="executeLostAction">执行失联动作</a-select-option>
              <a-select-option value="goContinue">继续执行航线</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="航线模式">
            <a-select :value="modelValue.isClosedLoop" @update:value="val => updateConfig('isClosedLoop', val)">
              <a-select-option :value="true">闭合巡逻航线</a-select-option>
              <a-select-option :value="false">单程航线</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="全局动作">
            <a-select :value="modelValue.globalAction" @update:value="val => updateConfig('globalAction', val)">
              <a-select-option value="none">无</a-select-option>
              <a-select-option value="takePhoto">拍照</a-select-option>
              <a-select-option value="startRecord">开始录像</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="安全起飞高度 (m)">
            <a-input-number :value="modelValue.takeOffSecurityHeight"
              @update:value="val => updateConfig('takeOffSecurityHeight', val)" :min="0" class="w-full" />
          </a-form-item>
        </a-col>
        <a-col :span="24">
          <a-form-item label="全局飞行速度 (m/s)">
            <a-input-number :value="modelValue.globalTransitionalSpeed"
              @update:value="val => updateConfig('globalTransitionalSpeed', val)" :min="0" class="w-full" />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- Height Mode Selection -->
      <a-form-item label="航点高度模式">
        <a-radio-group :value="modelValue.executeHeightMode" button-style="solid" class="w-full flex"
          @update:value="val => updateConfig('executeHeightMode', val)">
          <a-radio-button value="WGS84" class="flex-1 text-center">海拔高度</a-radio-button>
          <a-radio-button value="relativeToStartPoint" class="flex-1 text-center">相对起飞点</a-radio-button>
          <a-radio-button value="realTimeFollowSurface" class="flex-1 text-center">相对地形</a-radio-button>
        </a-radio-group>

        <!-- Height Diagrams -->
        <div class="mt-4 flex gap-4 items-center">
          <!-- Diagrams -->
          <div class="bg-gray-50 rounded-md p-4 flex-1 min-h-[120px]">
            <!-- RealTimeFollowSurface Diagram -->
            <svg v-if="modelValue.executeHeightMode === 'realTimeFollowSurface'" viewBox="0 0 320 150"
              xmlns="http://www.w3.org/2000/svg" class="w-full h-full block">
              <line x1="10" y1="135" x2="310" y2="135" stroke="#4a90e2" stroke-width="1" stroke-dasharray="2,2" />
              <!-- 底部基准线文字放在左下角，远离高度箭头与地面曲线 -->
              <text x="10" y="148" fill="#4a90e2" font-size="5">海平面 (WGS84)</text>
              <path d="M 10 120 L 50 115 L 90 110 L 130 105 L 170 100 L 210 108 L 250 112 L 290 118 L 310 120"
                fill="none" stroke="#8b7355" stroke-width="2" />
              <text x="10" y="92" fill="#8b7355" font-size="5">地面</text>
              <g transform="translate(180, 60)">
                <circle cx="0" cy="0" r="8" fill="#333" />
                <path d="M -4 -4 L 4 4 M -4 4 L 4 -4" stroke="#fff" stroke-width="2" />
              </g>
              <line x1="190" y1="72" x2="190" y2="112" stroke="#2ecc71" stroke-width="2" />
              <path d="M 190 72 L 187 77 L 193 77 Z" fill="#2ecc71" />
              <path d="M 190 112 L 187 107 L 193 107 Z" fill="#2ecc71" />
              <!-- 高度文字整体右移并略微上移，避免与地面、基准线重叠 -->
              <text x="200" y="80" fill="#2ecc71" font-size="5" font-weight="bold">相对地面高度</text>
              <text x="200" y="92" fill="#999" font-size="4">(AGL)</text>
              <circle cx="60" cy="120" r="6" fill="#4a90e2" stroke="#fff" stroke-width="2" />
              <text x="70" y="125" fill="#4a90e2" font-size="5">起飞点</text>
            </svg>

            <!-- WGS84 Diagram -->
            <svg v-if="modelValue.executeHeightMode === 'WGS84'" viewBox="0 0 320 150"
              xmlns="http://www.w3.org/2000/svg" class="w-full h-full block">
              <line x1="10" y1="135" x2="310" y2="135" stroke="#4a90e2" stroke-width="2" />
              <!-- 海平面文字放在最左下角，字号略小，避免挡住高度箭头 -->
              <text x="10" y="148" fill="#4a90e2" font-size="5" font-weight="bold">海平面 / 椭球面 (WGS84)</text>
              <path d="M 10 120 L 50 115 L 90 110 L 130 105 L 170 100 L 210 108 L 250 112 L 290 118 L 310 120"
                fill="none" stroke="#8b7355" stroke-width="2" />
              <text x="10" y="92" fill="#8b7355" font-size="5">地面</text>
              <circle cx="60" cy="120" r="6" fill="#4a90e2" stroke="#fff" stroke-width="2" />
              <text x="70" y="125" fill="#4a90e2" font-size="5">起飞点</text>
              <g transform="translate(170, 50)">
                <circle cx="0" cy="0" r="8" fill="#333" />
                <path d="M -4 -4 L 4 4 M -4 4 L 4 -4" stroke="#fff" stroke-width="2" />
              </g>
              <line x1="170" y1="58" x2="170" y2="135" stroke="#9b59b6" stroke-width="2" />
              <path d="M 170 58 L 167 63 L 173 63 Z" fill="#9b59b6" />
              <path d="M 170 135 L 167 130 L 173 130 Z" fill="#9b59b6" />
              <!-- 绝对高度文字放在右侧空白区域 -->
              <text x="145" y="35" fill="#9b59b6" font-size="5" font-weight="bold">绝对高度</text>
              <text x="145" y="47" fill="#999" font-size="4">(MSL)</text>
            </svg>

            <!-- RelativeToStartPoint Diagram -->
            <svg v-if="modelValue.executeHeightMode === 'relativeToStartPoint'" viewBox="0 0 320 150"
              xmlns="http://www.w3.org/2000/svg" class="w-full h-full block">
              <line x1="10" y1="135" x2="310" y2="135" stroke="#4a90e2" stroke-width="1" stroke-dasharray="2,2" />
              <text x="10" y="148" fill="#999" font-size="5">海平面 (参考)</text>
              <circle cx="70" cy="115" r="6" fill="#4a90e2" stroke="#fff" stroke-width="2" />
              <text x="80" y="120" fill="#4a90e2" font-size="5">起飞点</text>
              <g transform="translate(210, 55)">
                <circle cx="0" cy="0" r="8" fill="#333" />
                <path d="M -4 -4 L 4 4 M -4 4 L 4 -4" stroke="#fff" stroke-width="2" />
              </g>
              <line x1="215" y1="65" x2="215" y2="115" stroke="#e74c3c" stroke-width="2" />
              <path d="M 215 65 L 212 70 L 218 70 Z" fill="#e74c3c" />
              <path d="M 215 115 L 212 110 L 218 110 Z" fill="#e74c3c" />
              <text x="185" y="35" fill="#e74c3c" font-size="5" font-weight="bold">相对起飞点高度</text>
              <text x="185" y="47" fill="#999" font-size="4">(ALT)</text>
            </svg>
          </div>

          <!-- Height Control -->
          <div class="flex flex-col gap-2 min-w-[90px]">
            <a-button size="small" @click="adjustHeight(100)">+100</a-button>
            <a-button size="small" @click="adjustHeight(10)">+10</a-button>
            <div class="flex items-center justify-center gap-1 bg-gray-50 p-2 rounded border-2 border-primary">
              <a-input-number :value="modelValue.flightHeight || 60"
                @update:value="val => updateConfig('flightHeight', val)" :min="20" :max="500" :bordered="false"
                class="w-[50px] !p-0 text-center font-bold text-primary" :controls="false" />
              <span class="text-gray-600 text-sm font-medium">m</span>
            </div>
            <a-button size="small" @click="adjustHeight(-10)">-10</a-button>
            <a-button size="small" @click="adjustHeight(-100)">-100</a-button>
          </div>
        </div>
      </a-form-item>

      <!-- Realtime Follow Surface -->
      <a-form-item v-if="modelValue.executeHeightMode === 'realTimeFollowSurface'">
        <div class="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-200">
          <div>
            <div class="font-medium">实时仿地</div>
            <div class="text-xs text-gray-500">开启后根据传感器实时采集的高度信息仿地飞行</div>
          </div>
          <a-switch :checked="modelValue.realtimeFollowSurface"
            @update:checked="val => updateConfig('realtimeFollowSurface', val)" />
        </div>
      </a-form-item>

      <!-- Climb Mode -->
      <a-form-item label="飞向首航点模式">
        <a-radio-group :value="modelValue.climbMode" button-style="solid" class="w-full flex"
          @update:value="val => updateConfig('climbMode', val)">
          <a-radio-button value="vertical" class="flex-1 text-center">垂直爬升</a-radio-button>
          <a-radio-button value="oblique" class="flex-1 text-center">倾斜爬升</a-radio-button>
        </a-radio-group>

        <div class="mt-4 flex gap-4 items-center">
          <div class="bg-gray-50 rounded-md p-4 flex-1 min-h-[120px]">
            <svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" class="w-full h-full block">
              <!-- ground line -->
              <line x1="10" y1="110" x2="310" y2="110" stroke="#8b7355" stroke-width="2" />
              <text x="10" y="103" fill="#8b7355" font-size="5">地面</text>
              <!-- takeoff point -->
              <circle cx="40" cy="110" r="6" fill="#4a90e2" stroke="#fff" stroke-width="2" />
              <text x="50" y="115" fill="#4a90e2" font-size="5">起飞点</text>
              <!-- first waypoint -->
              <g transform="translate(280, 30)">
                <path d="M 0 -10 L -8 5 L 8 5 Z" fill="#e74c3c" />
              </g>
              <text x="275" y="15" fill="#e74c3c" font-size="5">首航点</text>
              <g v-if="modelValue.climbMode === 'vertical'">
                <!-- vertical climb then level flight -->
                <path d="M 40 110 L 40 50 L 280 30" fill="none" stroke="#2ecc71" stroke-width="2"
                  stroke-dasharray="4,2" />
                <text x="50" y="35" fill="#2ecc71" font-size="5">垂直爬升 + 巡航</text>
                <!-- safety height marker -->
                <line x1="55" y1="52" x2="55" y2="110" stroke="#f39c12" stroke-width="2" />
                <path d="M 55 52 L 52 57 L 58 57 Z" fill="#f39c12" />
                <path d="M 55 110 L 52 105 L 58 105 Z" fill="#f39c12" />
                <text x="25" y="75" fill="#f39c12" font-size="5">安全起飞高度</text>
              </g>
              <g v-else>
                <!-- oblique climb path -->
                <path d="M 40 110 L 280 30" fill="none" stroke="#9b59b6" stroke-width="2" stroke-dasharray="4,2" />
                <!-- 文案放在轨迹线上方，避免压在起飞点与地面上 -->
                <text x="90" y="45" fill="#9b59b6" font-size="5">倾斜爬升飞行轨迹</text>
              </g>
              <g transform="translate(180, 100)">
                <rect x="-3" y="-10" width="6" height="20" fill="#8b7355" />
                <circle cx="0" cy="-15" r="12" fill="#27ae60" opacity="0.7" />
              </g>
            </svg>
          </div>

          <div class="flex flex-col gap-2 min-w-[90px]">
            <a-button size="small" @click="adjustSafetyHeight(100)">+100</a-button>
            <a-button size="small" @click="adjustSafetyHeight(10)">+10</a-button>
            <div class="flex items-center justify-center gap-1 bg-gray-50 p-2 rounded border-2 border-primary">
              <a-input-number :value="modelValue.takeOffSecurityHeight || 20"
                @update:value="val => updateConfig('takeOffSecurityHeight', val)" :min="10" :max="200" :bordered="false"
                class="w-[50px] !p-0 text-center font-bold text-primary" :controls="false" />
              <span class="text-gray-600 text-sm font-medium">m</span>
            </div>
            <a-button size="small" @click="adjustSafetyHeight(-10)">-10</a-button>
            <a-button size="small" @click="adjustSafetyHeight(-100)">-100</a-button>
          </div>
        </div>
      </a-form-item>

      <!-- Calibration Flight -->
      <a-form-item label="标定飞行" v-if="['mapping', 'patrol'].includes(modelValue.routeType)">
        <div class="flex items-center gap-2">
          <a-switch :checked="modelValue.caliFlightEnable"
            @update:checked="val => updateConfig('caliFlightEnable', val)" />
          <span class="text-gray-500 text-xs">
            {{ modelValue.caliFlightEnable ? '开启：自动进行惯导标定，提高模型精度（会增加额外飞行轨迹）' : '关闭：仅执行标准航线' }}
          </span>
        </div>
      </a-form-item>

      <!-- Scan Settings -->
      <a-card v-if="modelValue.routeType === 'mapping' || modelValue.routeType === 'patrol'" title="扫描参数设置" size="small"
        class="mt-4 bg-gray-50" :headStyle="{ borderBottom: '1px solid #e5e7eb' }">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="扫描间距 (m)" class="mb-2">
              <a-input-number :value="modelValue.aiPatrol?.scanSpacing || 20"
                @update:value="val => updateAiPatrol('scanSpacing', val)" :min="5" :max="200" class="w-full" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="航线方向角度 (°)" class="mb-2">
              <a-input-number :value="modelValue.aiPatrol?.direction || 0"
                @update:value="val => updateAiPatrol('direction', val)" :min="0" :max="359" class="w-full" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="边距 (m)" class="mb-2">
              <a-input-number :value="modelValue.aiPatrol?.margin || 0"
                @update:value="val => updateAiPatrol('margin', val)" :min="0" :max="50" class="w-full" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="云台俯仰角 (°)" class="mb-2">
              <a-input-number :value="modelValue.aiPatrol?.gimbalPitchAngle || -45"
                @update:value="val => updateAiPatrol('gimbalPitchAngle', val)" :min="-90" :max="30" class="w-full" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-card>

      <!-- Smart Identification Alert -->
      <div class="bg-gray-50 rounded-lg border border-purple-500 p-0 overflow-hidden mt-4">
        <div
          class="from-[#2c2035] to-dark-800 p-3 border-b border-gray-200 flex justify-between items-center">
          <div class="flex items-center gap-2 text-purple-300">
            <span class="text-base">[]</span>
            <h3 class="m-0 text-base">智能识别告警</h3>
          </div>
          <a-switch :checked="modelValue.aiPatrol?.enabled" @update:checked="val => updateAiPatrol('enabled', val)"
            size="small" />
        </div>

        <div v-if="modelValue.aiPatrol?.enabled" class="p-4">
          <a-tabs type="card" size="small" class="mb-4">
            <a-tab-pane key="1" tab="可见光识别" />
            <a-tab-pane key="2" tab="红外温度识别" />
            <a-tab-pane key="3" tab="三方机载算法" />
          </a-tabs>

          <!-- Alert Conditions -->
          <a-card size="small" title="告警条件" class="mb-3">
            <div class="flex items-center gap-2 mb-2">
              <div
                class="flex-1 bg-primary text-gray-900 border border-primary rounded-full py-1 px-3 text-xs flex items-center gap-1.5">
                <span class="text-base">🚶</span> 人</div>
              <a-select value="<" size="small" class="w-16"><a-select-option
                  value="<">&lt;</a-select-option><a-select-option value=">">&gt;</a-select-option></a-select>
              <a-input-number value="1" size="small" class="w-16" />
            </div>
            <div class="flex items-center gap-2 mb-2">
              <div
                class="flex-1 bg-gray-100 border border-gray-300 rounded-full py-1 px-3 text-xs text-gray-300 flex items-center gap-1.5">
                <span class="text-base">🚗</span> 车</div>
              <a-select value=">" size="small" class="w-16"><a-select-option value=">">&gt;</a-select-option></a-select>
              <a-input-number value="1" size="small" class="w-16" />
            </div>
            <div class="flex items-center gap-2 mb-2">
              <div
                class="flex-1 bg-gray-100 border border-gray-300 rounded-full py-1 px-3 text-xs text-gray-300 flex items-center gap-1.5">
                <span class="text-base">🚢</span> 船</div>
              <a-select value=">" size="small" class="w-16"><a-select-option value=">">&gt;</a-select-option></a-select>
              <a-input-number value="1" size="small" class="w-16" />
            </div>
          </a-card>

          <!-- Confidence -->
          <a-card size="small" class="mb-3">
            <div class="flex justify-between mb-2">
              <div class="text-xs text-gray-500">置信度</div>
              <div class="text-primary font-bold text-sm">83 %</div>
            </div>
            <div class="flex items-center gap-2.5 mb-2">
              <span class="text-[11px] text-gray-500">更全</span>
              <a-slider :value="83" :min="1" :max="100" class="flex-1" />
              <span class="text-[11px] text-gray-500">更准</span>
            </div>
            <div class="text-[11px] text-orange-500 leading-snug">
              ⚠️ 修改置信度超出了推荐范围，可能导致目标丢失
            </div>
          </a-card>

          <!-- Operation Settings -->
          <a-card size="small" class="mb-3">
            <div class="flex justify-between items-center mb-3">
              <label class="text-xs text-gray-600">作业镜头</label>
              <a-radio-group value="visible" size="small" button-style="solid">
                <a-radio-button value="visible">可见光</a-radio-button>
                <a-radio-button value="infrared">红外</a-radio-button>
              </a-radio-group>
            </div>
            <div class="flex justify-between items-center mb-3">
              <label class="text-xs text-gray-600">全程录像</label>
              <a-switch size="small" />
            </div>
            <div class="flex flex-col">
              <label class="text-xs text-gray-600 mb-2">触发动作</label>
              <a-button size="small" type="dashed" block>选择动作</a-button>
            </div>
          </a-card>

          <!-- Alert Info -->
          <a-card size="small" title="告警信息">
            <a-input placeholder="请输入告警标题" class="mb-2 text-xs" size="small" />
            <a-textarea placeholder="识别到异常目标" :rows="2" class="text-xs" size="small" />
          </a-card>
        </div>
        <div v-else class="p-5 text-gray-500 text-xs text-center leading-relaxed">
          关闭智能识别，飞行过程中将不使用自动识别，需要人工识别
        </div>
      </div>
    </a-form>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['update:modelValue']);

const updateConfig = (key, value) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const updateAiPatrol = (key, value) => {
  const currentAiPatrol = props.modelValue.aiPatrol || {};
  const newAiPatrol = { ...currentAiPatrol, [key]: value };
  updateConfig('aiPatrol', newAiPatrol);
};

const adjustHeight = (delta) => {
  const currentHeight = props.modelValue.flightHeight || 60;
  const newHeight = Math.max(20, Math.min(500, currentHeight + delta));
  updateConfig('flightHeight', newHeight);
};

const adjustSafetyHeight = (delta) => {
  const currentHeight = props.modelValue.takeOffSecurityHeight || 20;
  const newHeight = Math.max(10, Math.min(200, currentHeight + delta));
  updateConfig('takeOffSecurityHeight', newHeight);
};
</script>

<style scoped>
:deep(.ant-form-item) {
  margin-bottom: 12px;
}
</style>
