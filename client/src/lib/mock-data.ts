import img1 from '@assets/stock_images/portrait_of_happy_yo_70ddbe44.jpg';
import img2 from '@assets/stock_images/portrait_of_happy_yo_b35e233f.jpg';
import img3 from '@assets/stock_images/portrait_of_happy_yo_ed7a9db5.jpg';
import img4 from '@assets/stock_images/portrait_of_happy_yo_62631c32.jpg';
import img5 from '@assets/stock_images/portrait_of_happy_yo_b18eab19.jpg';
import img6 from '@assets/stock_images/portrait_of_happy_yo_c4fb0659.jpg';

export interface Streamer {
  id: string;
  username: string;
  avatar: string;
  thumbnail: string;
  viewers: number;
  tags: string[];
  description: string;
  isLive: boolean;
  level: number;
}

export const MOCK_STREAMERS: Streamer[] = [
  {
    id: '1',
    username: 'NeonQueen',
    avatar: img1,
    thumbnail: img1,
    viewers: 12500,
    tags: ['Dance', 'Music', 'Vibes'],
    description: 'Friday Night Dance Party! 💃✨',
    isLive: true,
    level: 45
  },
  {
    id: '2',
    username: 'TechTalks_Dave',
    avatar: img2,
    thumbnail: img2,
    viewers: 3400,
    tags: ['Tech', 'Coding', 'Chat'],
    description: 'Building the future 🚀 AMA',
    isLive: true,
    level: 32
  },
  {
    id: '3',
    username: 'BellaVita',
    avatar: img3,
    thumbnail: img3,
    viewers: 8900,
    tags: ['Lifestyle', 'Travel', 'Chill'],
    description: 'Sunset vibes in Bali 🌅',
    isLive: true,
    level: 50
  },
  {
    id: '4',
    username: 'GamerX_Pro',
    avatar: img4,
    thumbnail: img4,
    viewers: 45000,
    tags: ['Gaming', 'FPS', 'Ranked'],
    description: 'Road to #1 Global 🏆',
    isLive: true,
    level: 88
  },
  {
    id: '5',
    username: 'ChefMario',
    avatar: img5,
    thumbnail: img5,
    viewers: 2100,
    tags: ['Cooking', 'Food', 'ASMR'],
    description: 'Making the perfect pasta 🍝',
    isLive: true,
    level: 12
  },
  {
    id: '6',
    username: 'YogaWithSarah',
    avatar: img6,
    thumbnail: img6,
    viewers: 5600,
    tags: ['Fitness', 'Yoga', 'Health'],
    description: 'Morning flow & meditation 🧘‍♀️',
    isLive: true,
    level: 28
  }
];

export const MOCK_COMMENTS = [
  { id: 1, user: 'User123', text: 'This is amazing! 🔥', color: 'text-cyan-400' },
  { id: 2, user: 'VibeCheck', text: 'Love the energy', color: 'text-pink-400' },
  { id: 3, user: 'CoolCat', text: 'Sent a Rose 🌹', isGift: true, gift: 'Rose' },
  { id: 4, user: 'StreamFan', text: 'Hello from Brazil! 🇧🇷', color: 'text-white' },
  { id: 5, user: 'RichUser', text: 'Sent a Super Car 🏎️', isGift: true, gift: 'Super Car' },
];
