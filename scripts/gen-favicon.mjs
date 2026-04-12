import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('./public/favicon.svg')

// 產生各尺寸 PNG
await sharp(svg).resize(32, 32).png().toFile('./public/favicon-32.png')
await sharp(svg).resize(180, 180).png().toFile('./public/apple-touch-icon.png')
await sharp(svg).resize(192, 192).png().toFile('./public/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('./public/icon-512.png')

console.log('favicon 產生完成')
