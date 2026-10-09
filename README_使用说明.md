# 红楼梦 VR 多场景互动版

## 已整合功能
- 五个 360° 全景场景：大观园、潇湘馆、怡红院、蘅芜苑、沁芳桥。
- 场景导航可随时切换；保留鼠标拖动环视。
- 潇湘馆、怡红院、蘅芜苑分别显示林黛玉、贾宝玉、薛宝钗的可点击立绘，点击人物即可开始 AI 对话。
- 对话共用现有 AI 后端，但根据所选人物切换不同角色提示词，并保留最近几轮聊天上下文。
- 沁芳桥提供场景介绍与园林文化观察提示。
- 每个场景均有介绍窗口。

## 图片文件
当前项目已包含以下全景图：
- `public/panorama/daguanyuan360.png`
- `public/panorama/xiaoxiang360.png`
- `public/panorama/yihongyuan360.png`
- `public/panorama/hengwuyuan360.png`
- `public/panorama/qinfangqiao360.png`
- `public/panorama/daiyu.png`、`public/panorama/baoyu.png`、`public/panorama/baochai.png`（人物立绘，可点击开始对话）

## 运行方法
1. 在项目根目录打开终端，运行 `npm install`（如果依赖已安装，可跳过）。
2. 启动前端：`npm run dev`，然后打开终端显示的本地网址。
3. 确认根目录 `.env` 已配置 API 服务商密钥、模型和可选的 `OPENAI_BASE_URL`。不要把 `.env` 分享给别人。
4. 另开一个终端启动 AI 后端：`npm run server`。
5. 浏览器访问 `http://127.0.0.1:3000/api/health`，确认 `apiKeyConfigured` 为 `true`，再测试人物聊天。

`.env` 变量名仍沿用旧项目约定：
- `OPENAI_API_KEY=你的服务商密钥`
- `OPENAI_BASE_URL=兼容服务商的接口地址`（使用 OpenAI 官方接口时可不填）
- `OPENAI_MODEL=你账户可用的模型名称`
- `PORT=3000`

## 注意
- 这是基于等距柱状投影全景图的 360° 环视与场景切换，不是真正具有深度信息的三维自由行走。鼠标拖动可转动视角。
- 角色对话为 AI 演绎，原著细节以《红楼梦》文本为准。
- 模型调用可能产生费用；API 密钥只保存在本机 `.env`，不要写进前端代码。
