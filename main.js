import * as THREE from 'three'
import './style.css'

// 红楼梦 VR：六个全景场景 + 四位人物 AI 对话
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 0, 0)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace
document.body.appendChild(renderer.domElement)
const textureLoader = new THREE.TextureLoader()

const SCENES = {
  daguanyuan: { title: '大观园', file: 'daguanyuan360.png', intro: '大观园是《红楼梦》中众多人物生活、游赏与情感故事展开的重要空间。可以从这里前往不同院落。' },
  xiaoxiang: { title: '潇湘馆 · 林黛玉居所', file: 'xiaoxiang360.png', intro: '潇湘馆是林黛玉居住之处。竹影清幽、环境雅致，适合感受黛玉敏感细腻、富有诗意的性情。', character: 'daiyu' },
  yihongyuan: { title: '怡红院 · 贾宝玉居所', file: 'yihongyuan360.png', intro: '怡红院是贾宝玉在大观园中的居所。你可以在这里了解宝玉的性情、生活与他对人物情感的看法。', character: 'baoyu' },
  hengwuyuan: { title: '蘅芜苑 · 薛宝钗居所', file: 'hengwuyuan360.png', intro: '蘅芜苑是薛宝钗居住的地方。环境清雅素净，可结合宝钗的诗词、处世态度与人物关系来理解这一空间。', character: 'baochai' },
  qinfangqiao: { title: '沁芳桥 · 园林水系', file: 'qinfangqiao360.png', intro: '沁芳桥是大观园水景与游园路径的重要意象。桥梁连接两岸空间，曲水、石桥、植物与亭园共同形成移步换景的体验。此处讲解结合小说意象与园林常识，不把复原画面等同于唯一历史样貌。' },
}
const CHARACTERS = {
  daiyu: { name: '林黛玉', place: '潇湘馆', greeting: '你来了。有什么话，便说吧。', promptHint: '诗意、敏感、聪慧、含蓄，善于诗词交流。' },
  baoyu: { name: '贾宝玉', place: '怡红院', greeting: '你来了！园中清静，正好说说心里话。', promptHint: '重情率真、厌恶拘束、尊重女性，关注情感与礼法的冲突。' },
  baochai: { name: '薛宝钗', place: '蘅芜苑', greeting: '既来了，便坐下说话吧。你想谈些什么？', promptHint: '稳重通达、言语得体、博学，善于谈诗词、处世与人情。' },
}
let currentScene = 'daguanyuan'
let currentTexture = null
let lon = 0, lat = 0, isDragging = false, previousMouseX = 0, previousMouseY = 0
let chatHistory = []

const sphereGeometry = new THREE.SphereGeometry(50, 64, 64)
sphereGeometry.scale(-1, 1, 1)
const panoramaMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
const panorama = new THREE.Mesh(sphereGeometry, panoramaMaterial)
scene.add(panorama)

function showNotice(message) {
  let notice = document.getElementById('vr-notice')
  if (!notice) { notice = document.createElement('div'); notice.id = 'vr-notice'; document.body.appendChild(notice) }
  notice.textContent = message
  notice.classList.add('visible')
  clearTimeout(showNotice.timer)
  showNotice.timer = setTimeout(() => notice.classList.remove('visible'), 4000)
}

const hud = document.createElement('div')
hud.id = 'scene-hud'
hud.innerHTML = `
  <div class="hud-top"><div><div class="eyebrow">DREAM OF THE RED CHAMBER · VR</div><div id="scene-title">大观园</div></div><button id="toggle-scenes" type="button">场景导航⌄</button></div>
  <div id="scene-nav" class="scene-nav">
    <div class="nav-caption">选择探索地点</div>
    <div class="nav-grid">
      <button data-scene="daguanyuan">大观园总览</button><button data-scene="xiaoxiang">潇湘馆 · 林黛玉</button>
      <button data-scene="yihongyuan">怡红院 · 贾宝玉</button><button data-scene="hengwuyuan">蘅芜苑 · 薛宝钗</button>
      <button data-scene="qinfangqiao">沁芳桥 · 园林讲解</button>
    </div>
  </div>
  <div id="scene-actions" class="scene-actions"></div>
  <div class="movement-hint">拖动鼠标环视全景 · 选择左上角导航切换场景</div>
`
document.body.appendChild(hud)

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(url, texture => {
      texture.colorSpace = THREE.SRGBColorSpace
      // 使用 Three.js 默认的全景纹理纵向映射，避免把场景上下翻转
      resolve(texture)
    }, undefined, reject)
  })
}
function setTexture(texture) {
  const old = panoramaMaterial.map
  panoramaMaterial.map = texture
  panoramaMaterial.color.set(0xffffff)
  panoramaMaterial.needsUpdate = true
  currentTexture = texture
  if (old && old !== texture) old.dispose()
}
function updateSceneUI() {
  const data = SCENES[currentScene]
  document.getElementById('scene-title').textContent = data.title
  document.querySelectorAll('[data-scene]').forEach(button => button.classList.toggle('active', button.dataset.scene === currentScene))
  const actions = document.getElementById('scene-actions')
  actions.innerHTML = ''
  const oldPortrait = document.getElementById('character-portrait')
  if (oldPortrait) oldPortrait.remove()
  // 在对应人物居所展示可点击立绘，点击人物即可开始对话。
  const portraitCharacters = {
    xiaoxiang: { id: 'daiyu', file: 'daiyu.png', name: '林黛玉' },
    yihongyuan: { id: 'baoyu', file: 'baoyu.png', name: '贾宝玉' },
    hengwuyuan: { id: 'baochai', file: 'baochai.png', name: '薛宝钗' }
  }
  const portraitData = portraitCharacters[currentScene]
  if (portraitData) {
    const portrait = document.createElement('img')
    portrait.id = 'character-portrait'
    portrait.src = `/panorama/${portraitData.file}`
    portrait.alt = `${portraitData.name}人物立绘，点击开始对话`
    portrait.title = `点击与${portraitData.name}对话`
    portrait.tabIndex = 0
    portrait.setAttribute('role', 'button')
    portrait.setAttribute('aria-label', `与${portraitData.name}对话`)
    portrait.addEventListener('click', () => showCharacterChat(portraitData.id))
    portrait.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); showCharacterChat(portraitData.id) } })
    document.body.appendChild(portrait)
  }
  const infoButton = document.createElement('button')
  infoButton.className = 'action-button secondary'
  infoButton.textContent = currentScene === 'qinfangqiao' ? '了解沁芳桥' : '场景介绍'
  infoButton.addEventListener('click', () => showInfo(currentScene))
  actions.appendChild(infoButton)
  if (data.character) {
    const person = CHARACTERS[data.character]
    const chatButton = document.createElement('button')
    chatButton.className = 'action-button primary'
    chatButton.textContent = `与${person.name}对话`
    chatButton.addEventListener('click', () => showCharacterChat(data.character))
    actions.appendChild(chatButton)
  }
}
async function enterScene(sceneId) {
  if (!SCENES[sceneId]) return
  if (sceneId === currentScene && currentTexture) {
    document.getElementById('scene-nav').classList.remove('open')
    return
  }
  const data = SCENES[sceneId]
  showNotice(`正在进入${data.title}……`)
  try {
    const texture = await loadTexture(`/panorama/${data.file}`)
    setTexture(texture)
    currentScene = sceneId
    lon = 0; lat = 0
    updateSceneUI()
    document.getElementById('scene-nav').classList.remove('open')
    showNotice(`已进入${data.title}`)
  } catch (error) {
    console.error('场景加载失败', sceneId, error)
    showNotice(`场景加载失败：请确认 public/panorama/${data.file} 文件存在。`)
  }
}

document.getElementById('toggle-scenes').addEventListener('click', () => document.getElementById('scene-nav').classList.toggle('open'))
document.querySelectorAll('[data-scene]').forEach(button => button.addEventListener('click', () => enterScene(button.dataset.scene)))

function showInfo(sceneId) {
  const old = document.getElementById('info-panel'); if (old) old.remove()
  const data = SCENES[sceneId]
  const panel = document.createElement('div'); panel.id = 'info-panel'
  const box = document.createElement('div'); box.className = 'info-box'
  const close = document.createElement('button'); close.className = 'panel-close'; close.textContent = '×'; close.setAttribute('aria-label', '关闭')
  const title = document.createElement('h2'); title.textContent = data.title
  const body = document.createElement('p'); body.textContent = data.intro
  box.append(close, title, body)
  if (sceneId === 'qinfangqiao') {
    const sub = document.createElement('div'); sub.className = 'culture-note'
    sub.textContent = '观赏提示：留意桥与水面的关系、两岸植物的层次，以及路径如何引导视线。小说中的园林空间带有文学构思，本场景属于数字化艺术呈现。'
    box.appendChild(sub)
  }
  if (data.character) {
    const button = document.createElement('button'); button.className = 'action-button primary wide'; button.textContent = `与${CHARACTERS[data.character].name}对话`
    button.addEventListener('click', () => { panel.remove(); showCharacterChat(data.character) }); box.appendChild(button)
  }
  panel.appendChild(box); document.body.appendChild(panel)
  close.addEventListener('click', () => panel.remove())
  panel.addEventListener('click', event => { if (event.target === panel) panel.remove() })
}

function appendChatMessage(container, name, content, kind) {
  const row = document.createElement('div'); row.className = `message ${kind}`
  const label = document.createElement('div'); label.className = 'message-name'; label.textContent = name
  const text = document.createElement('div'); text.className = 'message-content'; text.textContent = content
  row.append(label, text); container.appendChild(row); container.scrollTop = container.scrollHeight
  return text
}
function showCharacterChat(characterId) {
  const character = CHARACTERS[characterId]; if (!character) return
  const old = document.getElementById('chat-panel'); if (old) old.remove()
  chatHistory = []
  const panel = document.createElement('div'); panel.id = 'chat-panel'
  panel.innerHTML = `<div class="chat-box"><button id="close-chat" class="panel-close" type="button" aria-label="关闭">×</button><div class="chat-title"><div class="character-seal">${character.name.slice(-1)}</div><h2>${character.name}</h2><p>${character.place} · AI 角色互动</p></div><div id="chat-messages" class="chat-messages"></div><div class="chat-input-area"><input id="chat-input" type="text" placeholder="输入你想对${character.name}说的话……" maxlength="1000"><button id="send-message" type="button">发送</button></div><div class="chat-footnote">角色对话为 AI 演绎，原著细节以小说文本为准。</div></div>`
  document.body.appendChild(panel)
  const messages = panel.querySelector('#chat-messages')
  appendChatMessage(messages, character.name, character.greeting, 'character-message')
  const input = panel.querySelector('#chat-input'), send = panel.querySelector('#send-message')
  async function sendMessage() {
    const question = input.value.trim(); if (!question || send.disabled) return
    appendChatMessage(messages, '你', question, 'user-message'); input.value = ''; send.disabled = true
    const reply = appendChatMessage(messages, character.name, '正在思索……', 'character-message')
    try {
      const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 45000)
      let response
      try {
        response = await fetch('http://127.0.0.1:3000/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: question, character: characterId, history: chatHistory.slice(-10) }), signal: controller.signal })
      } finally { clearTimeout(timeout) }
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `AI 后端返回 HTTP ${response.status}`)
      if (typeof data.reply !== 'string') throw new Error('后端没有返回有效的回复文本。')
      reply.textContent = data.reply
      chatHistory.push({ role: 'user', content: question }, { role: 'assistant', content: data.reply })
    } catch (error) {
      reply.textContent = `暂时无法交谈：${error.name === 'AbortError' ? '等待 AI 回复超时（45 秒）' : error.message || '连接失败'}。请确认 AI 后端已启动。`
    } finally { send.disabled = false; messages.scrollTop = messages.scrollHeight; input.focus() }
  }
  panel.querySelector('#close-chat').addEventListener('click', () => panel.remove())
  panel.addEventListener('click', event => { if (event.target === panel) panel.remove() })
  send.addEventListener('click', sendMessage)
  input.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) sendMessage() })
  input.focus()
}

// 鼠标拖动环视 360°
renderer.domElement.addEventListener('pointerdown', event => { if (event.button !== 0) return; isDragging = true; previousMouseX = event.clientX; previousMouseY = event.clientY; renderer.domElement.setPointerCapture?.(event.pointerId) })
renderer.domElement.addEventListener('pointermove', event => {
  if (!isDragging) return
  lon -= (event.clientX - previousMouseX) * 0.1
  lat += (event.clientY - previousMouseY) * 0.1
  lat = Math.max(-85, Math.min(85, lat)); previousMouseX = event.clientX; previousMouseY = event.clientY
})
function stopDragging() { isDragging = false }
renderer.domElement.addEventListener('pointerup', stopDragging)
renderer.domElement.addEventListener('pointercancel', stopDragging)
window.addEventListener('blur', stopDragging)
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) })
function animate() {
  requestAnimationFrame(animate)
  const phi = THREE.MathUtils.degToRad(90 - lat), theta = THREE.MathUtils.degToRad(lon)
  camera.lookAt( Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta) )
  renderer.render(scene, camera)
}
updateSceneUI()
enterScene('daguanyuan')
animate()
