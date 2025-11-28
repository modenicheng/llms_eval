const routes = [
  {
    path: "/",
    redirect: "/chat",
    meta: {
      title: "Chat",
      visible: true,
      icon: "mdi-message-text",
    },
  },
  {
    path: "/chat/:sessionId?",
    name: "chat",
    component: () => import("../views/Chat.vue"),
    meta: {
      title: "Chat",
      visible: false,
      icon: "mdi-message-text",
    },
  },
  {
    path: "/config",
    name: "config",
    component: () => import("../views/Config.vue"),
    meta: {
      title: "Config",
      visible: true,
      icon: "mdi-account-cog",
    },
  },
  {
    path: "/history",
    name: "history",
    component: () => import("../views/History.vue"),
    meta: {
      title: "History",
      visible: true,
      icon: "mdi-history",
    },
  },
];

export default routes;
