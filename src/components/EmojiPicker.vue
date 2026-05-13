<script setup>
import { ref } from 'vue'

const emit = defineEmits(['select'])

const visible = ref(false)

const categories = [
  {
    name: '笑脸',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '😯', '😲', '😳', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '🤖'],
  },
  {
    name: '手势',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✌️', '🤟', '🤘', '👌', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💪', '🦵', '🦶', '👣', '👀', '🫂', '💔'],
  },
  {
    name: '食物',
    emojis: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥬', '🥒', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥟', '🥠', '🥡', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🧆', '🌮', '🌯', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🧂', '🥤', '🧋', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🍾', '☕', '🫖'],
  },
  {
    name: '自然',
    emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🌺', '🌸', '🌼', '🌻', '🌹', '🥀', '🌷', '🌿', '🍀', '🌲', '🌳', '🌴', '🌵', '☀️', '🌈', '⭐', '🌙', '☁️', '⛅'],
  },
  {
    name: '物品',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💕', '💞', '💗', '💖', '💘', '💝', '💟', '💌', '💧', '💤', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '🗯️', '💭', '🫧', '🔥', '✨', '🎉', '🎊', '🎈', '🎁', '🎀', '🪄', '🕶️', '👓', '👔', '👕', '👖', '🧣', '🧤', '🧥', '🧦', '👗', '👘', '🥻', '🩱', '🩲', '🩳', '👙', '👚', '🪡', '🪢', '👛', '👜', '👝', '🎒', '🧳', '👡', '👠', '👟', '🥾', '🥿', '👞', '👑', '💎', '📿'],
  },
]

function handleSelect(emoji) {
  emit('select', emoji)
  visible.value = false
}

function toggle() {
  visible.value = !visible.value
}

function close() {
  visible.value = false
}
</script>

<template>
  <div class="emoji-picker-wrapper">
    <button class="emoji-trigger" type="button" :class="{ active: visible }" @click.stop="toggle" title="插入表情">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="emoji-icon">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
        <circle cx="9" cy="9" r="1" fill="currentColor"/>
        <circle cx="15" cy="9" r="1" fill="currentColor"/>
      </svg>
    </button>
    <Teleport to="body">
      <div v-if="visible" class="emoji-overlay" @click="close"></div>
      <div v-if="visible" class="emoji-panel" @click.stop>
        <div class="emoji-panel-header">选择表情</div>
        <div class="emoji-scroll">
          <div v-for="cat in categories" :key="cat.name" class="emoji-category">
            <div class="category-label">{{ cat.name }}</div>
            <div class="emoji-grid">
              <button
                v-for="emoji in cat.emojis"
                :key="emoji"
                class="emoji-item"
                type="button"
                @click="handleSelect(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.emoji-picker-wrapper {
  position: relative;
  display: inline-flex;
}

.emoji-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(56, 91, 102, 0.15);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
}

.emoji-trigger:hover,
.emoji-trigger.active {
  background: rgba(124, 77, 255, 0.08);
  border-color: rgba(124, 77, 255, 0.3);
}

.emoji-icon {
  width: 18px;
  height: 18px;
  color: #6b7f87;
}

.emoji-trigger:hover .emoji-icon,
.emoji-trigger.active .emoji-icon {
  color: #7c4dff;
}

.emoji-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}

.emoji-panel {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: 360px;
  max-width: calc(100vw - 32px);
  max-height: 360px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.emoji-panel-header {
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #385b66;
  border-bottom: 1px solid rgba(56, 91, 102, 0.1);
  background: rgba(247, 244, 239, 0.6);
}

.emoji-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px 12px;
}

.emoji-category {
  margin-bottom: 8px;
}

.category-label {
  font-size: 11px;
  color: #9ca3af;
  margin-bottom: 6px;
  padding-left: 2px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 2px;
}

.emoji-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1;
  font-size: 20px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.1s;
  padding: 0;
}

.emoji-item:hover {
  background: rgba(124, 77, 255, 0.1);
}

.emoji-scroll::-webkit-scrollbar {
  width: 4px;
}

.emoji-scroll::-webkit-scrollbar-thumb {
  background: rgba(56, 91, 102, 0.2);
  border-radius: 2px;
}

@media (max-width: 640px) {
  .emoji-panel {
    width: 100%;
    max-width: calc(100vw - 16px);
    bottom: 60px;
    max-height: 300px;
  }
}
</style>
