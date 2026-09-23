import fs from 'fs'
import path from 'path'

// Copy dist/index.source.html to index.html
const distHtml = path.join('dist', 'index.source.html')
const rootHtml = 'index.html'
if (fs.existsSync(distHtml)) {
  fs.copyFileSync(distHtml, rootHtml)
  console.log('Copied dist/index.source.html to index.html')
} else {
  console.error('Could not find dist/index.source.html')
}

// Ensure assets directory exists in root
const rootAssets = 'assets'
if (!fs.existsSync(rootAssets)) {
  fs.mkdirSync(rootAssets)
}

// Copy dist/assets to assets
const distAssets = path.join('dist', 'assets')
if (fs.existsSync(distAssets)) {
  const files = fs.readdirSync(distAssets)
  for (const file of files) {
    fs.copyFileSync(path.join(distAssets, file), path.join(rootAssets, file))
  }
  console.log('Copied dist/assets to assets')
}

// Copy api directory into dist/api
const distApi = path.join('dist', 'api')
if (!fs.existsSync(distApi)) {
  fs.mkdirSync(distApi, { recursive: true })
}
if (fs.existsSync('api')) {
  const apiFiles = fs.readdirSync('api')
  for (const file of apiFiles) {
    fs.copyFileSync(path.join('api', file), path.join(distApi, file))
  }
  console.log('Copied api directory to dist/api')
}
