import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { posthogPlugin } from './plugins/posthog'

const app = createApp(App)

app.use(router)
app.use(posthogPlugin)

app.mount('#app')
