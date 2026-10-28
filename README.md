# llms_eval

多模型横向对比的纯前端工具：一条提示词同时发给 N 个模型，并排看流式输出和思维链。主观评测的数据就是用它采集的。

- OpenAI 兼容 API 自行配 Key，平台与模型解耦，动态增删
- 会话和配置全存浏览器（localforage），无后端
- 历史记录管理、CSV 导出

```bash
yarn && yarn dev
```

设计与使用记录见[博文](https://modenc.top/blog/wtn59ea4/)。
