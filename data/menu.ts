export interface MenuItem {
  id: number
  name: string
  price: number
  emoji: string
  description?: string
}

export interface PickupPoint {
  label: string
  location: string
}

export interface District {
  name: string
  color: string
  bgColor: string
  points: PickupPoint[]
}

export const menuItems: MenuItem[] = [
  {
    id: 1,
    name: '杏仁豆腐',
    price: 25,
    emoji: '🍮',
    description: '滑嫩香甜，現做杏仁豆腐',
  },
  {
    id: 2,
    name: '杏仁茶',
    price: 100,
    emoji: '☕',
    description: '傳統工法，濃醇杏仁香',
  },
  {
    id: 3,
    name: '蜂蜜銀耳飲',
    price: 90,
    emoji: '🍯',
    description: '天然蜂蜜搭配銀耳，滋潤養顏',
  },
  {
    id: 4,
    name: '抹茶歐蕾',
    price: 80,
    emoji: '🍵',
    description: '日式抹茶融合歐式奶香',
  },
  {
    id: 5,
    name: '翻炒黑豆飲',
    price: 100,
    emoji: '⬛',
    description: '古法翻炒，濃香黑豆精華',
  },
]

export const districts: District[] = [
  {
    name: '信義區',
    color: '#185FA5',
    bgColor: '#E6F1FB',
    points: [
      { label: 'A', location: '三興國小順成蛋糕旁校門口' },
      { label: 'B', location: '吳興國小松仁路校門口' },
      { label: 'C', location: '松山工農校門口' },
      { label: 'D', location: '協和高中中坡南路校門口' },
    ],
  },
  {
    name: '大安區',
    color: '#0F6E56',
    bgColor: '#E1F5EE',
    points: [
      { label: 'A', location: '捷運大安站 4 號出口' },
      { label: 'B', location: '復興南路麥當勞前' },
      { label: 'C', location: '大安森林公園站出口' },
    ],
  },
  {
    name: '三重',
    color: '#993C1D',
    bgColor: '#FAECE7',
    points: [
      { label: 'A', location: '三重捷運站 1 號出口' },
      { label: 'B', location: '三重市場前' },
      { label: 'C', location: '光興國中校門口' },
    ],
  },
  {
    name: '蘆洲',
    color: '#854F0B',
    bgColor: '#FAEEDA',
    points: [
      { label: 'A', location: '蘆洲捷運站 2 號出口' },
      { label: 'B', location: '蘆洲國中正門' },
      { label: 'C', location: '成功路家樂福前' },
    ],
  },
  {
    name: '新莊',
    color: '#993556',
    bgColor: '#FBEAF0',
    points: [
      { label: 'A', location: '新莊捷運站 3 號出口' },
      { label: 'B', location: '新莊廟街入口' },
      { label: 'C', location: '新泰國中校門口' },
    ],
  },
  {
    name: '樹林',
    color: '#3B6D11',
    bgColor: '#EAF3DE',
    points: [
      { label: 'A', location: '樹林火車站前廣場' },
      { label: 'B', location: '樹林國中正門' },
    ],
  },
]
