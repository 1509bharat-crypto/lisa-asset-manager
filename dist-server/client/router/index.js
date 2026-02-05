"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vue_router_1 = require("vue-router");
const views_1 = require("../views");
const routes = [
    {
        path: '/',
        name: 'projects',
        component: views_1.ProjectsView
    },
    {
        path: '/projects/:projectId',
        name: 'assets',
        component: views_1.AssetsView
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/'
    }
];
const router = (0, vue_router_1.createRouter)({
    history: (0, vue_router_1.createWebHistory)(),
    routes
});
exports.default = router;
//# sourceMappingURL=index.js.map