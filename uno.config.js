import { defineConfig, presetAttributify, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  theme: {
    colors: {
      primary: '#3498db',
      secondary: '#2ecc71',
      danger: '#e74c3c',
      warning: '#e67e22',
    },
  },
  shortcuts: {
    'btn': 'px-4 py-2 rounded cursor-pointer transition-all duration-200',
    'btn-primary': 'btn bg-primary text-white hover:bg-blue-600',
    'btn-secondary': 'btn bg-gray-200 text-gray-700 hover:bg-gray-300',
    'input-base': 'w-full bg-white border border-gray-300 text-gray-900 px-3 py-2 rounded text-sm focus:border-primary focus:outline-none',
    'card': 'bg-white rounded-lg p-4 border border-gray-200 shadow-sm',
  },
})
