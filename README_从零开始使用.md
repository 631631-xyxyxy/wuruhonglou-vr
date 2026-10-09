# 《红楼梦》VR 项目（重新整理版）

## 第一次运行
1. 解压本 ZIP，进入解压后的 `honglou_vr_ready` 文件夹。
2. 在文件夹地址栏输入 `cmd` 并回车打开终端。
3. 执行 `npm install`。
4. 将 `.env.example` 复制并重命名为 `.env`，用记事本填写你自己的新 API 密钥。
5. 终端 A 执行 `npm run server`，看到“林黛玉 AI 后端已启动”后保持窗口打开。
6. 另开终端 B，在同一目录执行 `npm run dev`，用终端显示的网址打开网页。
7. 检查 `http://127.0.0.1:3000/api/health`，确认 `apiKeyConfigured` 为 `true`。再到潇湘馆点击林黛玉测试聊天。

## 怡红院全景
把怡红院 2:1 等距柱状投影全景图命名为 `yihongyuan360.png`，放进 `public/panorama/`。本包不包含尚未收到的怡红院图片。

## 安全
不要把 API 密钥放进 `main.js` 或上传到聊天。若旧密钥曾泄露，请撤销旧密钥并创建新密钥。API 调用可能产生费用，并受账户额度及模型权限影响。
