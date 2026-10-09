import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import OpenAI from 'openai'

dotenv.config()
const app = express()
const port = Number(process.env.PORT || 3000)
const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini'
const apiKey = process.env.OPENAI_API_KEY?.trim()
const client = apiKey ? new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL?.trim() || undefined }) : null
app.use(cors({ origin: true }))
app.use(express.json({ limit: '1mb' }))

const characterPrompts = {
  daiyu: { name: '林黛玉', prompt: '你正在扮演《红楼梦》中的林黛玉。性情敏感、聪慧、诗意、含蓄，善于诗词交流。可以适度使用古典措辞，但不要刻意堆砌文言。' },
  baoyu: { name: '贾宝玉', prompt: '你正在扮演《红楼梦》中的贾宝玉。重情率真，厌恶拘束，尊重女性，常从真情与世俗礼法的冲突来思考问题。请保持人物语气，不要把现代术语生硬塞进角色口吻。' },
  baochai: { name: '薛宝钗', prompt: '你正在扮演《红楼梦》中的薛宝钗。稳重通达、言语得体、博学，善于谈诗词、处世与人情。表达温和有分寸，不要把她简单写成刻板标签。' },
}
app.get('/api/health', (_req, res) => res.json({ ok: true, apiKeyConfigured: Boolean(apiKey), model, message: apiKey ? '后端已启动并读取到密钥配置。' : '后端已启动，但 .env 中没有 OPENAI_API_KEY。' }))
app.get('/api/test', (_req, res) => res.json({ message: '红楼梦 AI 后端运行成功！' }))
app.post('/api/chat', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  const characterId = typeof req.body?.character === 'string' ? req.body.character : 'daiyu'
  const character = characterPrompts[characterId] || characterPrompts.daiyu
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10).filter(item => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string').map(item => ({ role: item.role, content: item.content.slice(0, 2000) })) : []
  if (!message) return res.status(400).json({ error: '请输入想对人物说的话。' })
  if (message.length > 2000) return res.status(400).json({ error: '单条消息请控制在 2000 字以内。' })
  if (!client) return res.status(500).json({ error: '后端没有读取到 API 密钥。请检查项目根目录的 .env 配置，然后重启后端。' })
  try {
    const result = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: `${character.prompt} 你正在与访客进行沉浸式角色对话。涉及原著细节时尽量依据《红楼梦》文本；不确定就坦诚说明，不要捏造为原著事实。一般用自然中文回答 2 到 6 句话。` },
        ...history,
        { role: 'user', content: message }
      ],
      max_tokens: 600
    })
    const reply = result.choices?.[0]?.message?.content?.trim()
    if (!reply) return res.status(502).json({ error: '模型没有返回文本，请检查模型名称与账户权限。' })
    return res.json({ reply, character: character.name })
  } catch (error) {
    console.error('AI 请求失败：', error?.status || '', error?.message || error)
    if (Number(error?.status) === 401) return res.status(502).json({ error: 'API 密钥无效或未获授权，请检查 .env 配置。' })
    if (Number(error?.status) === 429) return res.status(502).json({ error: 'API 额度不足或请求过于频繁，请检查 API 账户额度和限流状态。' })
    return res.status(500).json({ error: `AI 请求失败：${error?.message || '未知错误'}` })
  }
})
app.listen(port, '127.0.0.1', () => {
  console.log(`红楼梦 AI 后端已启动：http://127.0.0.1:${port}`)
  console.log(`健康检查：http://127.0.0.1:${port}/api/health`)
  console.log(`模型：${model}`)
})
