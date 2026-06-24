/**
 * 博客分类定义
 * 仿知乎分类体系，用于博客列表筛选和编辑选择
 */

export const CATEGORIES = [
  { value: '', label: '推荐', icon: '🔥' },
  { value: 'tech', label: '技术', icon: '💻' },
  { value: 'technology', label: '科技', icon: '🔬' },
  { value: 'lifestyle', label: '生活', icon: '☕' },
  { value: 'finance', label: '财经', icon: '💰' },
  { value: 'education', label: '教育', icon: '📚' },
  { value: 'culture', label: '文化', icon: '🎭' },
  { value: 'sports', label: '体育', icon: '⚽' },
  { value: 'digital', label: '数码', icon: '📱' },
  { value: 'gaming', label: '游戏', icon: '🎮' },
  { value: 'entertainment', label: '影视娱乐', icon: '🎬' },
]

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.filter(c => c.value).map(c => [c.value, c.label]),
)

export function getCategoryLabel(value) {
  return CATEGORY_MAP[value] || value || '未分类'
}
