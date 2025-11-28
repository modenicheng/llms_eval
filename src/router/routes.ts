const routes = [
  {
    path: "/",
    redirect: "/chat",
  },
  {
    path: "/chat/:sessionId?",
    name: "chat",
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
  {
    path: "/history",
    name: "history",
    component: () => import("../views/History.vue"),
    meta: {
      title: "History",
    },
  },
];

export default routes;
