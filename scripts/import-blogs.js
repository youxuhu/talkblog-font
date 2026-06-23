/**
 * 外部文章导入脚本
 *
 * 从 JSON 文件 / Markdown 文件 / Markdown 目录 / 本地种子数据 中批量导入文章到博客。
 *
 * 用法:
 *   1. 从 JSON 文件导入:
 *      node scripts/import-blogs.js <token> --json <path/to/articles.json>
 *
 *   2. 从单个 Markdown 文件导入:
 *      node scripts/import-blogs.js <token> --md <path/to/article.md>
 *
 *   3. 从 Markdown 目录导入 (扫描所有 .md 文件):
 *      node scripts/import-blogs.js <token> --dir <path/to/md/directory>
 *
 *   4. 从种子数据导入 (scripts/seed-blogs.js):
 *      node scripts/import-blogs.js <token> --from-seed
 *
 *   5. 从种子数据导入，每分类只取一篇:
 *      node scripts/import-blogs.js <token> --from-seed --one-per-category
 *
 *   6. 从 JSON 文件导入，每分类只取一篇:
 *      node scripts/import-blogs.js <token> --json <file.json> --one-per-category
 *
 *   --category <value>  为无分类文章设置默认分类 (对所有文章生效)
 *   --dry-run           仅解析和验证，不发送请求
 *
 * JSON 文件格式:
 *   [
 *     {
 *       "title": "文章标题",
 *       "content": "文章内容...",
 *       "category": "tech",       // 可选
 *       "seriesId": 1,            // 可选
 *       "scheduledAt": "2026-06-01T08:00:00"  // 可选
 *     }
 *   ]
 *
 * Markdown 文件格式:
 *   ---
 *   title: 文章标题
 *   category: tech
 *   seriesId: 1
 *   scheduledAt: 2026-06-01T08:00:00
 *   ---
 *   文章内容...
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, dirname } from 'path'
import { fileURLToPath } from 'url'

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080'

const VALID_CATEGORIES = [
  '', 'tech', 'technology', 'lifestyle', 'finance',
  'education', 'culture', 'sports', 'digital', 'gaming', 'entertainment',
]

function parseArgs() {
  const args = process.argv.slice(2)
  const token = args[0]
  if (!token || token.startsWith('--')) {
    console.log('用法: node scripts/import-blogs.js <token> [选项]')
    console.log('')
    console.log('选项:')
    console.log('  --json <path>        从 JSON 文件导入')
    console.log('  --md <path>          从单个 Markdown 文件导入')
    console.log('  --dir <path>         从目录扫描 Markdown 文件导入')
    console.log('  --from-seed          从 seed-blogs.js 种子数据导入')
    console.log('  --one-per-category   每分类只取第一篇文章')
    console.log('  --category <value>   默认分类 (对所有文章生效)')
    console.log('  --dry-run            仅解析和验证，不发送请求')
    console.log('')
    console.log('示例:')
    console.log('  node scripts/import-blogs.js <token> --json ./articles.json')
    console.log('  node scripts/import-blogs.js <token> --from-seed --one-per-category')
    console.log('  node scripts/import-blogs.js <token> --dir ./posts --category tech')
    console.log('  node scripts/import-blogs.js <token> --md ./post.md --dry-run')
    process.exit(1)
  }

  const options = { token, source: null, filePath: null, defaultCategory: '', dryRun: false, onePerCategory: false }

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--json':
        options.source = 'json'
        options.filePath = args[++i]
        break
      case '--md':
        options.source = 'md'
        options.filePath = args[++i]
        break
      case '--dir':
        options.source = 'dir'
        options.filePath = args[++i]
        break
      case '--from-seed':
        options.source = 'seed'
        break
      case '--one-per-category':
        options.onePerCategory = true
        break
      case '--category':
        options.defaultCategory = args[++i]
        if (!VALID_CATEGORIES.includes(options.defaultCategory)) {
          console.error(`错误: 无效的分类 "${options.defaultCategory}"`)
          console.error(`有效分类: ${VALID_CATEGORIES.filter(Boolean).join(', ')}`)
          process.exit(1)
        }
        break
      case '--dry-run':
        options.dryRun = true
        break
      default:
        if (!args[i].startsWith('--')) continue
        console.error(`错误: 未知选项 ${args[i]}`)
        process.exit(1)
    }
  }

  if (!options.source) {
    console.error('错误: 请指定导入来源 (--json / --md / --dir / --from-seed)')
    process.exit(1)
  }

  return options
}

/**
 * 解析 YAML 风格的 frontmatter
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: content.trim() }

  const meta = {}
  for (const line of match[1].split('\n')) {
    const sep = line.indexOf(':')
    if (sep === -1) continue
    const key = line.slice(0, sep).trim()
    let value = line.slice(sep + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
    if (value === 'true') value = true
    else if (value === 'false') value = false
    else if (/^\d+$/.test(value)) value = Number(value)
    meta[key] = value
  }

  return { meta, body: match[2].trim() }
}

function validateArticle(article, index) {
  const errors = []

  if (!article.title || typeof article.title !== 'string') {
    errors.push(`缺少有效标题`)
  } else if (article.title.length > 100) {
    errors.push(`标题超过 100 字 (${article.title.length})`)
  }

  if (!article.content || typeof article.content !== 'string') {
    errors.push(`缺少有效内容`)
  } else if (article.content.length > 10000) {
    errors.push(`内容超过 10000 字 (${article.content.length})`)
  }

  if (article.category && !VALID_CATEGORIES.includes(article.category)) {
    errors.push(`无效分类 "${article.category}"`)
  }

  return errors
}

/**
 * 从 JSON 文件读取文章列表
 */
function readJsonFile(filePath) {
  const raw = readFileSync(filePath, 'utf-8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data)) {
    throw new Error('JSON 文件必须包含一个数组')
  }
  return data
}

/**
 * 从 Markdown 文件读取单篇文章
 */
function readMdFile(filePath, defaultCategory) {
  const raw = readFileSync(filePath, 'utf-8')
  const { meta, body } = parseFrontmatter(raw)
  return {
    title: meta.title || filePath.replace(/\.md$/i, '').split(/[/\\]/).pop(),
    content: body,
    category: meta.category || defaultCategory || '',
    seriesId: meta.seriesId || undefined,
    scheduledAt: meta.scheduledAt || undefined,
  }
}

/**
 * 从目录扫描 Markdown 文件
 */
function readMdDirectory(dirPath, defaultCategory) {
  const entries = readdirSync(dirPath).sort()
  const articles = []

  for (const entry of entries) {
    const fullPath = join(dirPath, entry)
    if (statSync(fullPath).isFile() && /\.md$/i.test(entry)) {
      const article = readMdFile(fullPath, defaultCategory)
      articles.push(article)
    }
  }

  return articles
}

async function importArticles(articles, token, dryRun) {
  let success = 0
  let fail = 0
  const total = articles.length

  for (let i = 0; i < total; i++) {
    const article = articles[i]
    const label = `[${i + 1}/${total}] ${article.title || '(无标题)'}`

    const errors = validateArticle(article, i)
    if (errors.length > 0) {
      console.log(`✗ ${label}`)
      for (const err of errors) {
        console.log(`    - ${err}`)
      }
      fail++
      continue
    }

    if (dryRun) {
      console.log(`✓ ${label} [模拟]`)
      success++
      continue
    }

    try {
      const payload = {
        title: article.title,
        content: article.content,
        category: article.category || '',
      }
      if (article.seriesId) payload.seriesId = article.seriesId
      if (article.scheduledAt) payload.scheduledAt = article.scheduledAt

      const res = await fetch(`${BASE_URL}/api/blogs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok && data.success !== false) {
        console.log(`✓ ${label}`)
        success++
      } else {
        console.log(`✗ ${label} — ${data.message || res.status}`)
        fail++
      }
    } catch (err) {
      console.log(`✗ ${label} — ${err.message}`)
      fail++
    }
  }

  console.log(`\n完成: 成功 ${success} 篇, 失败 ${fail} 篇, 总计 ${total} 篇`)
  return { success, fail, total }
}

/**
 * 从种子数据导入文章 (scripts/seed-blogs.js)
 */
async function readSeedData() {
  const __dirname = dirname(fileURLToPath(import.meta.url))
  const seedPath = join(__dirname, 'seed-blogs.js')
  const seedModule = await import(seedPath)
  return seedModule.blogs || []
}

/**
 * 每分类只保留第一篇文章
 */
function pickOnePerCategory(articles) {
  const seen = new Set()
  return articles.filter((a) => {
    const cat = a.category || ''
    if (seen.has(cat)) return false
    seen.add(cat)
    return true
  })
}

async function main() {
  const options = parseArgs()

  let articles = []

  try {
    switch (options.source) {
      case 'json':
        articles = readJsonFile(options.filePath)
        break
      case 'md':
        articles = [readMdFile(options.filePath, options.defaultCategory)]
        break
      case 'dir':
        articles = readMdDirectory(options.filePath, options.defaultCategory)
        break
      case 'seed':
        articles = await readSeedData()
        break
    }
  } catch (err) {
    console.error(`读取数据失败: ${err.message}`)
    process.exit(1)
  }

  if (articles.length === 0) {
    console.log('没有找到可导入的文章')
    process.exit(0)
  }

  if (options.onePerCategory) {
    const before = articles.length
    articles = pickOnePerCategory(articles)
    console.log(`每分类取一篇文章: ${before} → ${articles.length} 篇\n`)
  } else {
    console.log(`找到 ${articles.length} 篇文章，开始导入...\n`)
  }

  await importArticles(articles, options.token, options.dryRun)
}

main().catch((err) => {
  console.error(`导入失败: ${err.message}`)
  process.exit(1)
})
