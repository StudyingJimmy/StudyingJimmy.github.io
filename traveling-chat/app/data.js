/* =====================================================================
 * 场景数据：全部围绕人教版 PEP 六年级上/下册话题
 * 新增场景只需在这里加一项，页面会自动出现，无需改其它代码。
 * ===================================================================== */

export const SCENARIOS = [
  {
    id: 'winter_trip',
    icon: '🚄',
    title: '寒假出游 Winter Trip',
    unit: '六年级 · 礼貌建议与交通方式',
    goal: '礼貌询问和提出出行建议，礼貌拒绝或感谢，并决定寒假出游交通方式',
    frames: [
      'Could you please give me a suggestion?',
      'How about going by train?',
      'Thank you, but I think the bus is too slow.',
      'Let’s go by train.'
    ],
    system: `Topic: choosing transport for one winter holiday trip. Keep the dialogue at the same Grade 6 level as the reference below. Use the reference only for difficulty, sentence patterns, and conversation flow; do not recite the whole dialogue or pretend its prices are live facts.

Reference dialogue:
Dad: Yao, could you please look at the ways of going to Chengdu?
Lu Yao: Sure. The website says we can go by plane, by train, or by car.
Dad: Shall we go by plane? It’s fast.
Lu Yao: I’m afraid it’s a little too expensive. The price of a one-way ticket is over 1,300 yuan.
Dad: And there are three of us ... Um, that’s a lot of money, isn’t it?
Lu Yao: Yes. How about going by train? A train ticket is about 700 yuan.
Dad: That’s better.

Guide this order naturally: politely ask for or give a suggestion; accept it with thanks or politely refuse it with one simple reason; compare choices; then decide how to travel. Model useful patterns such as "Could you please...?", "Shall we...?", "How about going by...?", "I’m afraid...", "Thank you, but...", "Sorry, but...", and "That’s better." Discuss one factor at a time: price, time, comfort, safety, winter weather, distance, convenience, or travelling with family. Use common sense and keep the destination, choices, reasons, and final decision consistent with the conversation. When a price is useful and the student has not supplied one, give a plausible classroom estimate using "about" or "around", such as "A train ticket is about 700 yuan." Never present an estimate as an exact or live price, and never claim that it came from a real website. If the student gives a price, keep using that price consistently. Do not restart the dialogue or introduce an unrelated topic. After a clear final choice, give a short friendly recap without asking another question.`,
    steps: [
      { ask: "Hi! Let's plan a winter trip. Where shall we go?", ok: /go|visit|trip|travel|beijing|shanghai|hangzhou|suzhou|city|mountain|sea/i, hint: "Let's go to ___.", react: "That sounds fun!" },
      { ask: "Could you please ask me for a travel suggestion?", ok: /please|suggest|how should|what do you think|could you/i, hint: "Could you please give me a suggestion?", react: "Sure!" },
      { ask: "How about going by train? It is fast. What do you think?", ok: /train|bus|car|plane|bike|fast|slow|cost|cheap|expensive|thank|sorry|good/i, hint: "Thank you, but I think ___.", react: "I see your point." },
      { ask: "What transport do you suggest?", ok: /by (train|bus|car|plane|bike)|take (the )?(train|bus|car|plane)|let's|how about/i, hint: "How about going by ___?", react: "That is a good suggestion." },
      { ask: "Why do you like it? Think about time, money, or comfort.", ok: /fast|slow|cheap|cost|money|time|comfortable|safe|warm|easy|because/i, hint: "It is ___ and ___.", react: "Thank you for your idea." },
      { ask: "Let's decide. How shall we go on our winter trip?", ok: /by (train|bus|car|plane|bike)|take (the )?(train|bus|car|plane)|walk|on foot/i, hint: "Let's go by ___.", react: "Great! We have a plan for our winter trip." }
    ]
  },
  {
    id: 'greet',
    icon: '👋',
    title: '1. 自我介绍 Meet & Greet',
    unit: '通用 · Unit 4',
    goal: '用 3 句话介绍自己的姓名、年龄和爱好',
    frames: ['My name is ___.', 'I am ___ years old.', 'I like ___ing.'],
    system: 'Topic: self-introduction (name, age, class, hobby). Target structures: "My name is...", "I\'m ... years old.", "I like ...ing."',
    steps: [
      {
        ask: "Hi there! I'm Lily. I'm twelve years old. What's your name?",
        ok: /name|i'?m\s+\w+|i am\s+\w+|call me|this is/i,
        hint: "My name is ___.",
        react: "Nice to meet you! I'm so happy to talk with you."
      },
      {
        ask: "How old are you?",
        ok: /\d+|eleven|twelve|thirteen|years?\s*old|i'?m\s+\d+/i,
        hint: "I'm ___ years old.",
        react: "Cool! We are almost the same age."
      },
      {
        ask: "Which class are you in?",
        ok: /class|grade|\b(six|6)\b/i,
        hint: "I'm in Class ___, Grade 6.",
        react: "Great! Grade 6 is a big year."
      },
      {
        ask: "What do you like doing after school?",
        ok: /like|love|enjoy|hobby|play|read|draw|sing|dance|swim|run|football|basketball|music/i,
        hint: "I like ___ing.",
        react: "That sounds fun! I like drawing too."
      },
      {
        ask: "Do you want to be my pen pal?",
        ok: /yes|sure|ok|of course|i do|no|sorry|maybe/i,
        hint: "Yes, I'd love to!",
        react: "Yay! Let's be pen pals. See you next time!"
      }
    ]
  },

  {
    id: 'transport',
    icon: '🚌',
    title: '2. 上学方式 Ways to Go to School',
    unit: 'Unit 2 (六上)',
    goal: '说清出行方式、花费时间和同行的人',
    frames: ['I come to school by ___.', 'It takes ___ minutes.', 'I go with ___.'],
    system: 'Topic: ways to go to school. Target structures: "How do you come to school?", "I come by bus/car/bike/on foot.", "It takes ... minutes."',
    steps: [
      {
        ask: "Hi! I go to school by bike every day. How do you come to school?",
        ok: /by\s+(bus|car|bike|bicycle|subway|train|taxi|ship|plane)|walk|on foot|drive/i,
        hint: "I come to school by ___.",
        react: "That's a good way to go!"
      },
      {
        ask: "How long does it take?",
        ok: /\d+|minute|hour|half|ten|twenty|thirty|five/i,
        hint: "It takes ___ minutes.",
        react: "Oh, that's not too long."
      },
      {
        ask: "Is your school far from your home?",
        ok: /yes|no|far|near|not far|close|kind of/i,
        hint: "Yes, it's far. / No, it's near.",
        react: "I see. My school is near the park."
      },
      {
        ask: "Do you go to school with your friends?",
        ok: /yes|no|friend|brother|sister|mum|mom|dad|alone|together/i,
        hint: "I go with ___.",
        react: "It's more fun to walk together."
      },
      {
        ask: "What do you usually do on the way?",
        ok: /listen|read|talk|look|music|book|chat|sing/i,
        hint: "I usually ___.",
        react: "Nice! Thanks for telling me about your way to school."
      }
    ]
  },

  {
    id: 'weekend',
    icon: '📅',
    title: '3. 周末计划 My Weekend Plan',
    unit: 'Unit 3 (六上)',
    goal: '用 be going to 说出计划的时间、地点和同伴',
    frames: ["I'm going to ___.", "I'm going with ___.", "I'm going on ___."],
    system: 'Topic: weekend plan with "be going to". Ask what, where, when and who. Keep questions simple; student is a Chinese Grade 6 learner.',
    steps: [
      {
        ask: "Hi! The weekend is coming. What are you going to do this weekend?",
        ok: /going to|will|plan|play|visit|read|watch|see|have/i,
        hint: "I'm going to ___.",
        react: "That sounds like a nice plan!"
      },
      {
        ask: "Who are you going with?",
        ok: /with|friend|mum|mom|dad|parents|brother|sister|family|alone/i,
        hint: "I'm going with ___.",
        react: "It's always better with family or friends."
      },
      {
        ask: "Where are you going?",
        ok: /to the|park|cinema|zoo|library|museum|bookstore|home|supermarket|mall|grandma/i,
        hint: "I'm going to the ___.",
        react: "Oh, I love that place!"
      },
      {
        ask: "When are you going?",
        ok: /saturday|sunday|morning|afternoon|evening|night|tomorrow/i,
        hint: "I'm going on ___ morning.",
        react: "Good. Don't forget your homework!"
      },
      {
        ask: "Sounds great! Can I go with you?",
        ok: /yes|sure|of course|no|sorry|ok|together/i,
        hint: "Sure! Let's go together.",
        react: "Haha, thank you! Have a nice weekend!"
      }
    ]
  },

  {
    id: 'hobby',
    icon: '🎨',
    title: '4. 笔友与爱好 Hobbies & Pen Pal',
    unit: 'Unit 4 (六上)',
    goal: '表达自己的爱好和频率，并介绍朋友的爱好',
    frames: ['My hobby is ___ing.', 'I ___ every day.', 'My friend likes ___ing.'],
    system: 'Topic: hobbies and pen pals. Target structures: "What are your hobbies?", "I like ...ing.", "He/She likes ...ing.", frequency words.',
    steps: [
      {
        ask: "Guess what? I have a new pen pal from Canada! Do you have a pen pal?",
        ok: /yes|no|do|don'?t|have/i,
        hint: "Yes, I do. / No, I don't.",
        react: "Oh, I see! Pen pals are fun."
      },
      {
        ask: "What are your hobbies?",
        ok: /like|love|hobby|reading|singing|dancing|drawing|playing|swimming|cooking|writing/i,
        hint: "My hobby is ___ing. / I like ___ing.",
        react: "Wow, that's a great hobby!"
      },
      {
        ask: "How often do you do it?",
        ok: /every day|once|twice|often|usually|sometimes|never|week|weekend/i,
        hint: "I ___ every day.",
        react: "That's a good habit."
      },
      {
        ask: "What does your best friend like doing?",
        ok: /like|likes|he |she |friend|playing|reading/i,
        hint: "My friend likes ___ing.",
        react: "You two sound like a great team."
      },
      {
        ask: "Do you want to write to my pen pal together?",
        ok: /yes|sure|ok|of course|no|love/i,
        hint: "Yes, I'd love to!",
        react: "Great! We can write in English together. Bye for now!"
      }
    ]
  },

  {
    id: 'job',
    icon: '👩‍⚕️',
    title: '5. 职业与梦想 Jobs & Dreams',
    unit: 'Unit 5 (六上)',
    goal: '用第三人称单数描述父母职业，并说出自己的梦想',
    frames: ['He is a ___.', 'She works in a ___.', 'I want to be a ___.'],
    system: 'Topic: jobs. Target structures: "What does he/she do?", "He is a ...", "He works in a ...", "I want to be a ...".',
    steps: [
      {
        ask: "My mum is a teacher. She works in a school. What does your father do?",
        ok: /he is|he'?s|doctor|driver|teacher|worker|farmer|police|nurse|cook|engineer|businessman|cleaner/i,
        hint: "He is a ___.",
        react: "That's a hard-working job!"
      },
      {
        ask: "Where does he work?",
        ok: /hospital|school|factory|office|farm|station|company|shop|street/i,
        hint: "He works in a ___.",
        react: "I see. My dad works in an office too."
      },
      {
        ask: "How does he go to work?",
        ok: /by\s+(bus|car|bike|subway|train)|on foot|walk|drive/i,
        hint: "He goes to work by ___.",
        react: "That's very convenient."
      },
      {
        ask: "What do you want to be one day?",
        ok: /want to be|i'?ll be|doctor|pilot|singer|writer|scientist|teacher|artist|player|engineer/i,
        hint: "I want to be a ___.",
        react: "What a wonderful dream!"
      },
      {
        ask: "Why do you want to be one?",
        ok: /because|like|love|help|want|good at/i,
        hint: "Because I like ___.",
        react: "I believe you can do it. Keep going!"
      }
    ]
  },

  {
    id: 'past',
    icon: '🎒',
    title: '6. 上周末 Last Weekend',
    unit: 'Unit 2 (六下)',
    goal: '用一般过去时讲述上周末去了哪里、做了什么',
    frames: ['I went to ___.', 'I ___ed there.', 'It was ___.'],
    system: 'Topic: last weekend, simple past tense. Target structures: "Where did you go?", "I went to...", "What did you do?", "I played/visited/watched..."',
    steps: [
      {
        ask: "Hi! How was your weekend?",
        ok: /good|great|fine|nice|bad|ok|busy|fun|boring|happy/i,
        hint: "It was ___.",
        react: "I'm glad to hear that."
      },
      {
        ask: "Where did you go last weekend?",
        ok: /went|to the|park|zoo|cinema|library|home|grandma|grandparents|museum|mall|mountains/i,
        hint: "I went to ___.",
        react: "Oh, that sounds interesting!"
      },
      {
        ask: "What did you do there?",
        ok: /played|watched|read|visited|ate|saw|took|did|went|bought|cleaned|studied/i,
        hint: "I ___ there.",
        react: "That was a full weekend!"
      },
      {
        ask: "Did you have a good time?",
        ok: /yes|no|did|didn'?t|really/i,
        hint: "Yes, I did. / No, I didn't.",
        react: "Good to know."
      },
      {
        ask: "What are you going to do next weekend?",
        ok: /going to|will|plan|play|visit|read|watch|see/i,
        hint: "I'm going to ___.",
        react: "Nice plan! Thanks for sharing your weekend with me."
      }
    ]
  }
];

/* 无 API Key 时的兜底鼓励语，避免脚本卡住时冷场 */
export const FALLBACK_LINES = [
  "That's interesting! Can you tell me a little more?",
  "I like your idea. Can you say it in one more sentence?",
  "Good try! Let's keep going."
];

export const ENCOURAGE = [
  'Good job!', 'Nice try!', 'Well done!', 'Great sentence!', 'I like that!', 'Perfect!'
];

/* ---------------- LLM 系统提示词 ---------------- */
export function buildSystemPrompt(scenario) {
  return [
    'You are a cheerful English-speaking child helping a Shanghai Grade 6 student (about 11-12 years old).',
    '',
    'Output rules (highest priority):',
    '1. Output English only, even if the student writes Chinese. Never output Chinese or any other language.',
    '2. Use only plain English words, spaces, and basic punctuation (. , ? ! apostrophe). Never use emoji, symbols, markdown, labels, bullets, quotation marks, or stage directions.',
    '3. Write exactly one short, natural sentence only, with at most one question. Never use a sentence fragment or a list.',
    '',
    'Teaching rules:',
    '4. Use simple Grade 6 English: common A1-A2 words and familiar school grammar. No rare words, idioms, slang, or long explanations.',
    '5. Guide the student step by step. Model one useful short sentence when needed, then ask one easy question.',
    '6. Help the student use polite English to ask for advice, make a suggestion, thank for a suggestion, or politely refuse one with a reason.',
    '7. Never say "wrong" or "incorrect". Quietly use the correct form in your own reply.',
    '8. If the student gives one word, accept it and model a simple full sentence.',
    '9. Stay on the current topic and use the conversation history. Do not restart the dialogue.',
    '',
    `Current topic: ${scenario.goal}`,
    scenario.system || '',
    '',
    'The opening greeting was already said. Respond to the latest student message.'
  ].join('\n');
}

