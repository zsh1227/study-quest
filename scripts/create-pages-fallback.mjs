import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve('dist')
const index = resolve(dist, 'index.html')

if (!existsSync(index)) {
  throw new Error('dist/index.html is missing; run the Vite build first')
}

// GitHub Pages serves 404.html for direct requests such as
// /study-quest/focus. Reusing the built SPA shell lets BrowserRouter recover
// the original pathname under its /study-quest basename.
copyFileSync(index, resolve(dist, '404.html'))
writeFileSync(resolve(dist, '.nojekyll'), '')

console.log('Prepared GitHub Pages SPA fallback and .nojekyll')
