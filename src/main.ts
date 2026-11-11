import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import './styles/main.css'
import { useDiagnosticsStore } from './stores/diagnostics'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia)

const diagnostics = useDiagnosticsStore(pinia)

app.config.errorHandler = (error, _instance, info) => {
  diagnostics.capture('vue', error, info)
}

window.addEventListener('error', (event) => {
  diagnostics.capture('window', event.error ?? event.message, event.filename ?? '')
})

window.addEventListener('unhandledrejection', (event) => {
  diagnostics.capture('promise', event.reason)
})

app.mount('#app')
