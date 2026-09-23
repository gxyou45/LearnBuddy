// Prototype import/test source only. Learning pages use contentRepository and the API.
export const contentVersion = 4;
import type { Character, CharacterId, Lesson, Step, Story } from '@learnbuddy/contracts';
export type { Character, CharacterId, Lesson, Step, Story };
export const lessons: Lesson[] = [
  {
    "id": "family",
    "title": "认识家人",
    "theme": 0,
    "intro": "你好，我的家！",
    "characters": [
      {
        "id": "wo",
        "text": "我",
        "word": "我自己",
        "example": "指一指自己，说一声：我。",
        "icon": "🙋",
        "audio": "wo"
      },
      {
        "id": "ba",
        "text": "爸",
        "word": "爸爸",
        "example": "爸爸的“爸”，我们一起认一认。",
        "icon": "👨",
        "audio": "ba"
      },
      {
        "id": "ma",
        "text": "妈",
        "word": "妈妈",
        "example": "妈妈的“妈”，我们一起认一认。",
        "icon": "👩",
        "audio": "ma"
      }
    ],
    "story": {
      "text": "爸爸妈妈和我一起看书。",
      "audio": "family-reading",
      "note": "指一指爸爸、妈妈和“我”，再找找大家正在看的书。",
      "supportCharacters": [
        "和",
        "一",
        "起",
        "看",
        "书"
      ]
    },
    "lifeTask": "指一指自己，再找找身边照顾你的人。",
    "introAudio": "intro"
  },
  {
    "id": "home",
    "title": "一起回家",
    "theme": 0,
    "intro": "打开温暖的家门",
    "characters": [
      {
        "id": "jia",
        "text": "家",
        "word": "家里",
        "example": "家是我们生活的地方。",
        "icon": "🏡",
        "audio": "jia"
      },
      {
        "id": "men",
        "text": "门",
        "word": "大门",
        "example": "出门、进门，都要经过门。",
        "icon": "🚪",
        "audio": "men"
      },
      {
        "id": "ren",
        "text": "人",
        "word": "一个人",
        "example": "你和我都是人。",
        "icon": "🧍",
        "audio": "ren"
      }
    ],
    "story": {
      "text": "我们一家人站在家门口。",
      "audio": "story-home",
      "note": "数数门口有几个人，找一找家门。",
      "supportCharacters": [
        "们",
        "一",
        "站",
        "在",
        "口"
      ]
    },
    "lifeTask": "和家长一起找找家里的门。",
    "introAudio": "intro-home"
  },
  {
    "id": "welcome",
    "title": "客人来啦",
    "theme": 0,
    "intro": "朋友，欢迎你来！",
    "characters": [
      {
        "id": "ni",
        "text": "你",
        "word": "对面的你",
        "example": "我对着面前的朋友说：你。“你”就是我正在说话的那个人。",
        "icon": "🫵",
        "audio": "ni"
      },
      {
        "id": "hao",
        "text": "好",
        "word": "真好",
        "example": "开心的时候可以说：真好！",
        "icon": "👍",
        "audio": "hao"
      },
      {
        "id": "lai",
        "text": "来",
        "word": "走过来",
        "example": "朋友从那边朝我们走过来，这就是“来”。",
        "icon": "🚶",
        "audio": "lai"
      }
    ],
    "story": {
      "text": "你来我家，我向你招手说你好。",
      "audio": "story-welcome",
      "note": "谁在门口招手？谁正在走过来？",
      "supportCharacters": [
        "向",
        "招",
        "手",
        "说"
      ]
    },
    "lifeTask": "向身边的人招招手，说一声你好。",
    "introAudio": "intro-welcome"
  },
  {
    "id": "pets",
    "title": "你好，小猫",
    "theme": 1,
    "intro": "今天认识新朋友",
    "characters": [
      {
        "id": "xiao",
        "text": "小",
        "word": "小小的",
        "example": "小小的东西，可以放在手心里。",
        "icon": "🐣",
        "audio": "xiao"
      },
      {
        "id": "mao",
        "text": "猫",
        "word": "小猫",
        "example": "小猫有胡须，会喵喵叫。",
        "icon": "🐈",
        "audio": "mao"
      },
      {
        "id": "gou",
        "text": "狗",
        "word": "小狗",
        "example": "小狗会摇尾巴，也会汪汪叫。",
        "icon": "🐕",
        "audio": "gou"
      }
    ],
    "story": {
      "text": "小猫和小狗在草地上玩球。",
      "audio": "story-pets",
      "note": "指指小猫、小狗，再找找它们中间的球。",
      "supportCharacters": [
        "和",
        "在",
        "草",
        "地",
        "上",
        "玩",
        "球"
      ]
    },
    "lifeTask": "找一找生活中小小的东西。",
    "introAudio": "intro-pets"
  },
  {
    "id": "snack",
    "title": "喝水时间",
    "theme": 1,
    "intro": "动物朋友开饭啦",
    "characters": [
      {
        "id": "shui",
        "text": "水",
        "word": "一杯水",
        "example": "口渴了，我们要喝水。",
        "icon": "💧",
        "audio": "shui"
      },
      {
        "id": "he",
        "text": "喝",
        "word": "喝一口",
        "example": "把杯子举起来，喝一口。",
        "icon": "🥤",
        "audio": "he"
      },
      {
        "id": "chi",
        "text": "吃",
        "word": "吃东西",
        "example": "吃饭的时候，慢慢嚼。",
        "icon": "😋",
        "audio": "chi"
      }
    ],
    "story": {
      "text": "小猫喝水，小狗吃饭。",
      "audio": "story-snack",
      "note": "小猫低头在做什么？小狗的碗里有什么？",
      "supportCharacters": [
        "饭"
      ]
    },
    "lifeTask": "喝一口水，说说“喝”和“吃”有什么不同。",
    "introAudio": "intro-snack"
  },
  {
    "id": "pond",
    "title": "看见朋友",
    "theme": 1,
    "intro": "池塘边的新发现",
    "characters": [
      {
        "id": "yu",
        "text": "鱼",
        "word": "小鱼",
        "example": "小鱼在水里摆尾巴。",
        "icon": "🐟",
        "audio": "yu"
      },
      {
        "id": "niao",
        "text": "鸟",
        "word": "小鸟",
        "example": "小鸟有翅膀，会飞。",
        "icon": "🐦",
        "audio": "niao"
      },
      {
        "id": "kan",
        "text": "看",
        "word": "看一看",
        "example": "睁开眼睛，仔细看一看。",
        "icon": "👀",
        "audio": "kan"
      }
    ],
    "story": {
      "text": "我看小鱼游，小鸟在树上。",
      "audio": "story-pond",
      "note": "看看水里的鱼和树上的鸟，孩子在看哪里？",
      "supportCharacters": [
        "游",
        "在",
        "树",
        "上"
      ]
    },
    "lifeTask": "和家长一起观察窗外的鸟。",
    "introAudio": "intro-pond"
  },
  {
    "id": "basket",
    "title": "藏在哪里",
    "theme": 1,
    "intro": "谁藏在篮子里？",
    "characters": [
      {
        "id": "you",
        "text": "有",
        "word": "有一个",
        "example": "篮子不是空的，里面有一个球。",
        "icon": "🧺",
        "audio": "you"
      },
      {
        "id": "zai",
        "text": "在",
        "word": "在哪里",
        "example": "小猫在哪里？小猫在树下。",
        "icon": "📍",
        "audio": "zai"
      },
      {
        "id": "de",
        "text": "的",
        "word": "谁的",
        "example": "我的球，你的书，“的”把它们连起来。",
        "icon": "🎒",
        "audio": "de"
      }
    ],
    "story": {
      "text": "我的篮子里有一只小猫，小猫在睡觉。",
      "audio": "story-basket",
      "note": "看看篮子里有什么，孩子指的是谁的篮子？",
      "supportCharacters": [
        "篮",
        "子",
        "里",
        "一",
        "只",
        "睡",
        "觉"
      ]
    },
    "lifeTask": "把一个玩具放进篮子，说说它在哪里。",
    "introAudio": "intro-basket"
  },
  {
    "id": "sky",
    "title": "抬头看一看",
    "theme": 2,
    "intro": "山上的白天和夜晚",
    "characters": [
      {
        "id": "ri",
        "text": "日",
        "word": "太阳",
        "example": "“日”可以表示太阳，也可以表示一天。",
        "icon": "☀️",
        "audio": "ri"
      },
      {
        "id": "yue",
        "text": "月",
        "word": "月亮",
        "example": "夜空中，弯弯的月亮出来了。",
        "icon": "🌙",
        "audio": "yue"
      },
      {
        "id": "shan",
        "text": "山",
        "word": "高山",
        "example": "远处一座高高的山。",
        "icon": "⛰️",
        "audio": "shan"
      }
    ],
    "story": {
      "text": "白日里太阳照着山，夜晚月亮挂在山上。",
      "audio": "story-sky",
      "note": "左边是白天，右边是夜晚，分别找找太阳和月亮。",
      "supportCharacters": [
        "白",
        "里",
        "太",
        "阳",
        "照",
        "着",
        "夜",
        "晚",
        "亮",
        "挂",
        "上"
      ]
    },
    "lifeTask": "和家长聊聊白天与夜晚看到的天空。",
    "introAudio": "intro-sky"
  },
  {
    "id": "plants",
    "title": "花草朋友",
    "theme": 2,
    "intro": "走进绿色的小花园",
    "characters": [
      {
        "id": "mu",
        "text": "木",
        "word": "树木",
        "example": "树木有树干，也有枝叶。",
        "icon": "🌳",
        "audio": "mu"
      },
      {
        "id": "hua",
        "text": "花",
        "word": "花朵",
        "example": "一朵花，开在草地上。",
        "icon": "🌼",
        "audio": "hua"
      },
      {
        "id": "cao",
        "text": "草",
        "word": "小草",
        "example": "绿绿的小草，从地里长出来。",
        "icon": "🌱",
        "audio": "cao"
      }
    ],
    "story": {
      "text": "树木旁边有小花，小花下面有绿草。",
      "audio": "story-plants",
      "note": "从高高的树木往下看，花和草在哪里？",
      "supportCharacters": [
        "树",
        "旁",
        "边",
        "下",
        "面",
        "绿"
      ]
    },
    "lifeTask": "出门时找一棵树、一朵花和一片草。",
    "introAudio": "intro-plants"
  },
  {
    "id": "positions",
    "title": "大与小",
    "theme": 2,
    "intro": "树上树下真热闹",
    "characters": [
      {
        "id": "shang",
        "text": "上",
        "word": "上面",
        "example": "小鸟停在树上。",
        "icon": "⬆️",
        "audio": "shang"
      },
      {
        "id": "xia",
        "text": "下",
        "word": "下面",
        "example": "小猫躲在树下。",
        "icon": "⬇️",
        "audio": "xia"
      },
      {
        "id": "da",
        "text": "大",
        "word": "大大的",
        "example": "大大的树冠，像一把遮阳伞。",
        "icon": "🌳",
        "audio": "da"
      }
    ],
    "story": {
      "text": "大树上有小鸟，大树下有小猫。",
      "audio": "story-positions",
      "note": "看看小鸟和小猫，谁在上面，谁在下面？",
      "supportCharacters": [
        "树"
      ]
    },
    "lifeTask": "把玩具放在桌上和桌下，说说它的位置。",
    "introAudio": "intro-positions"
  }
];
export const characters = lessons.flatMap(l => l.characters);
export function lessonForCharacter(id: string) { return lessons.find(l => l.characters.some(c => c.id === id)) || lessons[0]; }
export function getSteps(lesson: Lesson): Step[] {
 return [
 { id: 'intro', kind: 'intro', title: lesson.intro, subtitle: '和喜欢的人一起，认识三个新朋友。', audio: lesson.introAudio },
 ...lesson.characters.map(c => ({ id: `teach-${c.id}`, kind: 'teach' as const, characterId: c.id, title: '一起认识这个字', subtitle: c.example, audio: c.audio })),
 ...lesson.characters.map(c => ({ id: `word-${c.id}`, kind: 'word' as const, characterId: c.id, title: '读词语', subtitle: '先听一听，再和家长一起读。', audio: `word-${c.id}` })),
 ...lesson.characters.map(c => ({ id: `sound-${c.id}`, kind: 'sound' as const, characterId: c.id, title: '小耳朵，听一听', subtitle: '听声音，找出对应的汉字。', audio: c.audio })),
 ...lesson.characters.map(c => ({ id: `meaning-${c.id}`, kind: 'meaning' as const, characterId: c.id, title: '这个字是什么意思？', subtitle: '看看汉字，和家长一起找到它的意思。', audio: 'meaning' })),
 { id: 'hunt', kind: 'hunt', title: '汉字藏在哪里？', subtitle: '找出今天认识的三个汉字。', audio: 'hunt' },
 { id: 'story', kind: 'story', title: '读句子', subtitle: '一起读一句，故事就开始了。', audio: lesson.story.audio },
 ];
}
export const steps = getSteps(lessons[0]);
export const storyPages = lessons.map(l => l.story);
export const themes = [
 { title: '我的家', subtitle: '从身边的爱，认识汉字', icon: '🏡' },
 { title: '动物朋友', subtitle: '和小动物一起发现世界', icon: '🐈' },
 { title: '一起去公园', subtitle: '把汉字带到大自然里', icon: '🌳' },
];
export function shuffled<T>(items: readonly T[]): T[] {
 const result = [...items];
 for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
 return result;
}
