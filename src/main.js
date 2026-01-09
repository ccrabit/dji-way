import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'virtual:uno.css'
import { createApp } from 'vue'
import VueCesium from 'vue-cesium'
import 'vue-cesium/dist/index.css'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(VueCesium)
app.use(Antd)
app.mount('#app')
