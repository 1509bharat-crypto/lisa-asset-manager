import { createRouter, createWebHistory } from 'vue-router'
import { ProjectsView, AssetsView, AnalyticsView } from '../views'

const routes = [
  {
    path: '/',
    name: 'projects',
    component: ProjectsView
  },
  {
    path: '/projects/:projectId',
    name: 'assets',
    component: AssetsView
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: AnalyticsView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
