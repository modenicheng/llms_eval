const routes = [
  {
    path: "/",
    name: "home",
    component: () => import("../views/Chat.vue"),
    meta: {
      title: "Chat",
    },
  },
  {
    path: "/config",
    name: "config",
    component: () => import("../views/Config.vue"),
    meta: {
      title: "Config",
    },
  },
];

export default routes;
