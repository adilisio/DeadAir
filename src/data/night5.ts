// Night 5 in Port Vesper: Silence. The Linemen want the Lamp dark for two hours tonight
// so they can test the switch-on from the lighthouse circuit. The Chapel wants a
// statement about the voice at two in the morning. Bill's knee says calm. The
// barometer says squall. Scripts are read aloud, so write for the ear.

import type { NightDef } from '../sim/types';

export const NIGHT_5: NightDef = {
  id: 'night5',
  number: 5,

  signOn:
    "Good evening, Port Vesper. W-L-M-P, twelve-sixty, the Lamp. Tonight a lot of people want this station to be quiet, for different reasons, and some of them are good reasons. The kettle's on. Let's see how long I last.",

  signOff:
    "That's the Lamp, for as long as it was. Kettle's off. If you hear me after this, you know what to listen for. Goodnight, Port Vesper.",

  cards: [
    // ── Records ──────────────────────────────────────────────
    {
      id: 'rec_howcome2', kind: 'record', recordId: 'how_come_you_do_me', title: 'How Come You Do Me Like You Do?',
      blurb: "Marion Harris, sassy as ever. The Linemen's request line is just this song, over and over.",
      mood: 'bright', loves: ['linemen'], dislikes: ['chapel'],
    },
    {
      id: 'rec_home2', kind: 'record', recordId: 'home_over_there', title: 'The Home Over There',
      blurb: "The Calvary Choir. The Chapel's record. Sister Agnes hums it when she's measuring sulfa.",
      mood: 'stirring', loves: ['chapel'], dislikes: ['linemen'],
    },
    {
      id: 'rec_mill2', kind: 'record', recordId: 'old_mill_stream', title: 'Down by the Old Mill Stream',
      blurb: 'The dockside sing-along. After the week the Netters have had, they could use a song to get the words wrong to.',
      mood: 'bright', loves: ['netters'],
    },
    {
      id: 'rec_maggie', kind: 'record', recordId: 'maggie', title: 'When You and I Were Young, Maggie',
      blurb: "Marta's mother's record. Plays clean. Everyone over sixty will sit down for it.",
      gate: { requires: ['owns_maggie'] },
      mood: 'blue', loves: ['netters', 'chapel'],
    },
    {
      id: 'rec_fun2', kind: 'record', recordId: 'aint_we_got_fun', title: "Ain't We Got Fun",
      blurb: "Lottie's one-sided record. Still only one side good.",
      gate: { requires: ['owns_aint_we_got_fun'] },
      mood: 'bright', loves: ['netters', 'linemen'],
    },

    // ── News ─────────────────────────────────────────────────
    {
      id: 'news_switchon', kind: 'news', truth: 'true', title: 'The lights come on tomorrow night',
      source: 'the Linemen',
      blurb: 'The relay held. The Ridge Road line reaches Dock Street tomorrow night: every house with a bulb and a wire.',
      gate: { requires: ['n3_hut_moved'] },
      script:
        "The Linemen say tomorrow night, around ten, they close the switch at the Ridge Road relay, and the line carries to Dock Street. Every house that's strung a wire and found a bulb. Sixty years. If you've got a bulb, screw it in tonight and don't touch it. If you don't, go and stand on Dock Street at ten and look up.",
      effects: { morale: 8, trust: { linemen: 7 } },
      helps: 'linemen',
    },
    {
      id: 'news_rebuild', kind: 'news', truth: 'true', title: 'The relay, rebuilt',
      source: 'the Linemen',
      blurb: "The relay hut burned. The Linemen have rebuilt the relay on the dry floor of the lighthouse itself. They'd like you to know that's why the lights flicker here.",
      gate: { unless: ['n3_hut_moved'] },
      script:
        "The Linemen have rebuilt the relay that burned at the point. They built it on the ground floor of this lighthouse, under this room, which is why the lamp over my desk is doing that. They say the Ridge Road line reaches Dock Street tomorrow night. They say it with less of a smile than they used to.",
      effects: { morale: 5, trust: { linemen: 4 }, safety: -1 },
      helps: 'linemen',
    },
    {
      id: 'news_thanks', kind: 'news', truth: 'true', title: 'The boat says thank you',
      source: 'Dock Street, loudly',
      blurb: 'The crew that walked in off the ice wants the town thanked on the air, and the station too, and they are not subtle about it.',
      gate: { requires: ['n4_boat_home'] },
      script:
        "The crew that came in off the ice asked me to say thank you to every boat that went out, every pole, every rope, and the kid at the point who knew which way was north. They've put a barrel of herring at the station door. I don't know what to do with a barrel of herring. Come and get some.",
      effects: { morale: 5, trust: { netters: 5, linemen: 2 } },
      helps: 'netters',
    },
    {
      id: 'news_lost', kind: 'news', truth: 'true', title: 'A service at the Chapel',
      source: 'the Chapel',
      blurb: "The man who didn't walk in off the ice. The Chapel holds a service tomorrow. There's no body. There's a boat.",
      gate: { requires: ['n4_boat_lost'] },
      script:
        "The Chapel will hold a service tomorrow at noon for the man the ice took on Thursday. There's nothing to bury. Sister Agnes says they'll bury his oilskin, and that's fine, and anyone who thinks that's strange has never buried a fisherman. Bring a story about him. Bring two.",
      effects: { morale: -3, trust: { netters: 5, chapel: 4 } },
      grim: true,
      helps: 'netters',
    },
    {
      id: 'news_teddy_hands', kind: 'news', truth: 'true', title: "Teddy Okafor's hands",
      source: 'Grace Okafor, by note',
      blurb: "Grace sent a note. Teddy's hands will heal. He wants the Linemen to know he'd like his job back, when they do.",
      gate: { requires: ['n4_teddy_hurt'] },
      script:
        "A note from Grace Okafor. Teddy's hands are healing. Sister Agnes says he'll have the use of them, all of them, by spring. He has asked his mother to tell the Linemen that when his hands work he'd like to carry spools again. Grace wrote that part very small.",
      effects: { morale: 3, trust: { chapel: 2, linemen: 1 } },
    },
    {
      id: 'news_teddy_key', kind: 'news', truth: 'true', title: 'Teddy keeps the key',
      source: 'the Linemen, grinning',
      blurb: 'The Linemen have given Teddy Okafor the old telegraph key to keep, and a title. Grace has not been consulted.',
      gate: { requires: ['n4_teddy_saved'] },
      script:
        "The Linemen have made Teddy Okafor, age fourteen, the official signalman of the Ridge Road crew, and given him the old telegraph key to keep. His mother has opinions about the hours. Teddy has opinions about the title. He wanted a longer one.",
      effects: { morale: 4, trust: { linemen: 3 } },
    },

    // ── The question ─────────────────────────────────────────
    {
      id: 'ans_deny', kind: 'news', truth: 'true', title: 'Say it isn\'t you', group: 'answer',
      source: 'you',
      blurb: "Tell the town plainly: the voice at two in the morning is not this station. You don't know what it is.",
      script:
        "Some of you want me to say something about the voice on this frequency after I sign off, so here it is. It isn't me. I don't know what it is. I've sat up with the set on and heard it myself, and it is my voice, and it is not me. That's all I know. I'm not going to pretend to know more.",
      effects: { credibility: 4, morale: -2, trust: { chapel: 3 } },
      reach: {
        faction: 'chapel', threshold: 0,
        success: { flag: 'n5_answer_deny', tone: 'neutral', effects: {}, line: 'You said it on the air: the voice at two isn\'t you, and you don\'t know what it is. Some people found that honest. Some found it worse.' },
        fail: { flag: 'n5_answer_deny', tone: 'neutral', effects: {}, line: '' },
        unaired: { flag: 'n5_not_denied', tone: 'neutral', effects: {}, line: '' },
      },
    },
    {
      id: 'ans_claim', kind: 'news', truth: 'false', title: 'Say it\'s a recording', group: 'answer',
      source: 'you',
      blurb: "Tell them it's you: a recording you leave running, nothing to worry about. It isn't. It would calm things down.",
      script:
        "About the voice after sign-off: it's me. It's a recording. I leave a tape running some nights so the frequency isn't empty, and it plays back old shows, and I should have said so sooner. There's nothing on twelve-sixty but the Lamp. Go to sleep.",
      effects: { morale: 5, credibility: 2, trust: { chapel: 2, linemen: 2 } },
      unravel: {
        credibility: -10,
        line: 'You said the two a.m. voice was a tape. It read something tonight that you never recorded, and three people on Dock Street know it.',
      },
      reach: {
        faction: 'chapel', threshold: 0,
        success: { flag: 'n5_answer_claim', tone: 'neutral', effects: {}, line: 'You told the town the voice at two is a tape you leave running. The town slept better. For a night.' },
        fail: { flag: 'n5_answer_claim', tone: 'neutral', effects: {}, line: '' },
        unaired: { flag: 'n5_not_claimed', tone: 'neutral', effects: {}, line: '' },
      },
    },
    {
      id: 'ans_silent', kind: 'news', truth: 'true', title: 'Say nothing about it', group: 'answer',
      source: 'you',
      blurb: "Say on the air that you won't be discussing it. Decline the question in your own voice.",
      script:
        "I've been asked to say something tonight about what people hear on this frequency after I sign off. I'm not going to. Not because I'm hiding anything. Because I don't know anything, and this station doesn't say things it doesn't know. Here's a record.",
      effects: { credibility: 1, morale: -3, trust: { chapel: -3 } },
      reach: {
        faction: 'chapel', threshold: 0,
        success: { flag: 'n5_answer_silent', tone: 'neutral', effects: {}, line: 'You declined, on the air, to talk about the voice at two. The Chapel took it as an answer.' },
        fail: { flag: 'n5_answer_silent', tone: 'neutral', effects: {}, line: '' },
        unaired: { flag: 'n5_not_silent', tone: 'neutral', effects: {}, line: '' },
      },
    },

    // ── Warnings ─────────────────────────────────────────────
    {
      id: 'warn_dark', kind: 'warning', title: 'The Lamp goes dark for the test',
      endsShow: true,
      blurb: "Read this and sign off early: the Linemen get the lighthouse circuit for the switch-on test. The show ends here. Twelve-sixty goes quiet. Or does it.",
      script:
        "Port Vesper, the Linemen need the lighthouse circuit for two hours tonight to test the switch-on, and this transmitter is on that circuit. So the Lamp goes dark early. I'm not happy about it and I'm doing it anyway, because tomorrow night there are lights. Bank your stoves. This is the Lamp, off early, signing off.",
      effects: { trust: { linemen: 9, chapel: -3 }, listeners: -18, morale: -2 },
      helps: 'linemen',
      reach: {
        faction: 'linemen', threshold: 0,
        success: { flag: 'n5_dark', tone: 'neutral', effects: {}, line: 'You gave the Linemen the circuit and went dark. The test ran clean. Twelve-sixty was not quiet while you were gone.' },
        fail: { flag: 'n5_dark', tone: 'neutral', effects: {}, line: '' },
        unaired: { flag: 'n5_stayed_on', tone: 'neutral', effects: { trust: { linemen: -5 } }, line: 'You stayed on the air through the Linemen\'s test window. They ran it off a hand generator and it browned out twice. They noticed who didn\'t help.' },
      },
    },
    {
      id: 'warn_squall5', kind: 'warning', title: 'Squall at three, says the glass',
      blurb: "The barometer has dropped like a stone since supper. Bill's knee says calm. The glass has never lied to you. Neither has the knee, till now.",
      script:
        "Netters, the glass on my wall has dropped a quarter inch since supper and it's still going. That's a squall, around three, off the lake. I know what Bill's knee says. I'm telling you what the glass says. Tie up.",
      effects: { safety: 3, morale: -2 },
      grim: true,
      helps: 'netters',
      reach: {
        faction: 'netters',
        threshold: 0.6,
        success: {
          flag: 'n5_squall_warned', tone: 'good',
          effects: { safety: 5, trust: { netters: 6 } },
          line: 'The squall came at three, off the lake, like the glass said. Every boat was tied. Bill is not speaking to his knee.',
        },
        fail: {
          flag: 'n5_squall_unwarned', tone: 'bad',
          effects: { morale: -3, trust: { netters: -3 } },
          line: 'The squall came at three. The boats that trusted the knee over the glass are the ones with the cracked rails.',
        },
        unaired: {
          flag: 'n5_squall_unwarned', tone: 'bad',
          effects: { morale: -3, trust: { netters: -3 } },
          line: 'Nobody read the glass on the air. The squall came at three and found half the harbor tied loose.',
        },
      },
    },

    // ── Ads ──────────────────────────────────────────────────
    {
      id: 'ad_smokehouse3', kind: 'ad', sponsor: 'Ostrowski Smokehouse', title: 'Smoked herring, a lot of it',
      blurb: 'Pays 4 chits. Dock Street has more herring than barrels. The smokehouse wants it known.',
      script:
        "The Ostrowski Smokehouse has smoked herring. The Ostrowski Smokehouse has a great deal of smoked herring. Trade welcome, chits welcome, and if you've nothing to trade, Mrs. Ostrowski says come anyway and bring a bucket. Tell her the Lamp sent you. She knows.",
      effects: { chits: 4, trust: { netters: 3 }, morale: 1 },
    },
  ],

  events: [
    {
      kind: 'switchboard', id: 'n5_board_dusk', at: { slot: 0, frac: 0.5 },
      lines: [
        {
          id: 'call_agnes', person: 'agnes',
          name: 'Sister Agnes',
          prompt: 'Sister Agnes. she never calls',
          patience: 24,
          preview: "This is Sister Agnes, from the Chapel. Yes. I'm calling. I'd like to say something to the town, if you'll let me.",
          script:
            "This is Sister Agnes. I don't call the radio. I'm calling the radio. Port Vesper, there is a voice on this frequency at night that is not this man's, whatever it sounds like, and it has told you things he never said, and some of you have acted on them. I'm asking you to listen for the kettle. And I'm asking the Lamp to tell you, plainly, what it thinks that voice is. Tonight.",
          aired: {
            flag: 'n5_agnes_aired', tone: 'neutral',
            effects: { trust: { chapel: 5 }, credibility: 2, morale: -2 },
            line: 'Sister Agnes spoke on the Lamp for the first time in her life. The whole hill heard it. She asked you a question in front of everyone.',
          },
          cut: {
            flag: 'n5_agnes_cut', tone: 'bad',
            effects: { trust: { chapel: -9 }, credibility: -4 },
            line: 'You cut Sister Agnes off the first and only time she ever called. The Chapel has stopped sending honey.',
          },
          notTaken: {
            flag: 'n5_agnes_ignored', tone: 'bad',
            effects: { trust: { chapel: -6 } },
            line: 'Sister Agnes rang the Lamp, which she has never done, and nobody picked up. She will not do it again.',
          },
          after: "That was Sister Agnes. I heard the question. Stay with me.",
        },
        {
          id: 'call_pruitt_dark', person: 'pruitt',
          name: 'Pruitt',
          prompt: 'Pruitt. about the circuit',
          gate: { requires: ['n3_hut_moved'] },
          patience: 20,
          preview: "Pruitt. We need the lighthouse circuit from eleven to one for the test. That means you, off. I'm asking nice.",
          script:
            "Pruitt, Ridge Road crew. We're testing the switch-on tonight and the lighthouse is on the circuit, which means this transmitter is on the circuit, which means from eleven to one we need the Lamp off. I know what I'm asking. Tomorrow night there's lights on Dock Street if you say yes. That's the trade.",
          aired: {
            flag: 'n5_pruitt_asked', tone: 'neutral',
            effects: { trust: { linemen: 2 } },
            line: 'Pruitt asked the whole town, through you, for two hours of silence. Now everybody knows what the Lamp was asked.',
          },
          cut: {
            flag: 'n5_pruitt_cut2', tone: 'bad',
            effects: { trust: { linemen: -6 } },
            line: 'You dumped Pruitt in the middle of asking for the circuit. The Linemen took that as your answer.',
          },
          confide: {
            text: "Between us: if you don't go dark, they'll pull the fuse on you at eleven anyway. I argued against it. I lost. I'd rather you chose it.",
            flag: 'pruitt_fuse',
          },
        },
        {
          id: 'call_sparky_dark', person: 'sparky',
          name: 'Sparky',
          prompt: "Sparky. 'about tonight'",
          gate: { unless: ['n3_hut_moved'] },
          patience: 20,
          preview: "Hey Lamp, Sparky, so the new relay's under your floor and we need to test it tonight, eleven to one, and that means, um. You. Off.",
          script:
            "Hey, Port Vesper, it's Sparky! So the new relay's in the lighthouse now, right under the Lamp, and tonight eleven to one we test the switch-on, and the lighthouse circuit can't carry the test and the transmitter both, so, Lamp, we kind of need you off for two hours? Tomorrow night, lights! Everybody! Lights!",
          aired: {
            flag: 'n5_sparky_asked', tone: 'neutral',
            effects: { trust: { linemen: 2 }, morale: 1 },
            line: 'Sparky asked the town, through you, for two hours of silence, with exclamation marks. Now everybody knows what the Lamp was asked.',
          },
          cut: {
            flag: 'n5_sparky_cut', tone: 'neutral',
            effects: { trust: { linemen: -3 } },
            line: 'You dumped Sparky. The Linemen sent Pruitt down with a note instead. The note was shorter.',
          },
          confide: {
            text: "Also, uh, don't tell anybody, but if you say no they're going to pull your fuse at eleven anyway. I think. Pruitt said. I wasn't supposed to say.",
            flag: 'pruitt_fuse',
          },
        },
        {
          id: 'call_bill_calm', person: 'bill',
          name: 'Old Bill',
          prompt: "Old Bill. 'the knee says calm'",
          patience: 20,
          preview: "Bill. The knee says calm tonight, flat calm, and I know what your glass says, and the glass is wrong.",
          script:
            "Bill Wozniak. I know the Lamp's got a glass on the wall that's dropping. I've got a knee that's been right for forty years and it says flat calm till morning. The glass is a glass. The knee is a knee. Netters, don't lose a night's sleep tying up for nothing. That's all.",
          aired: {
            flag: 'n5_bill_calm', tone: 'neutral',
            effects: { trust: { netters: 2 }, safety: -3 },
            line: "Bill told the town, on your air, that the glass was wrong and the knee said calm.",
          },
          cut: {
            flag: 'n5_bill_cut', tone: 'neutral',
            effects: { trust: { netters: -3 } },
            line: 'You cut Bill off mid-knee. He says the Lamp only likes him when he agrees with it.',
          },
        },
      ],
    },
    {
      kind: 'switchboard', id: 'n5_board_late', at: { slot: 3, frac: 0.4 },
      lines: [
        {
          id: 'call_tom', person: 'anon',
          name: 'No name',
          prompt: "the man with no name. 'last time'",
          patience: 20,
          preview: "It's me. The no-name. This is the last time I call like this. Put me on and I'll tell you who I am.",
          script:
            "This is the man who's been calling with no name. My name is Tom Pruitt. I string line for the Linemen, same as my brother. I'm the one who called about the hut, and I was right, and I'm the one who called about the Chapel the first week, and I was wrong, and I'm sorry for it. I'm saying my name because I'm tired of the other one. That's all.",
          aired: {
            flag: 'n5_anon_named', tone: 'good',
            effects: { credibility: 4, trust: { chapel: 3, linemen: -3 }, morale: 2 },
            line: 'The man with no name gave it, on your air: Tom Pruitt. His brother did not speak to him for a day. Then he did.',
          },
          cut: {
            flag: 'n5_anon_cut', tone: 'bad',
            effects: { credibility: -2 },
            line: 'You dumped the man with no name just before he said it. He won\'t call again. He said so, and he meant it this time.',
          },
          notTaken: {
            flag: 'n5_anon_ignored', tone: 'neutral',
            effects: {},
            line: "The man with no name rang, said it was the last time, and hung up. It was.",
          },
        },
        {
          id: 'call_lottie_rumor', person: 'lottie',
          name: 'Lottie Kowalczyk',
          prompt: "Lottie K. 'you'll want to hear this'",
          patience: 20,
          preview: "Lamp, Lottie, listen, the whole row is saying the two a.m. voice is Walt's cousin from Sandusky doing an impression. It's not. But that's what they're saying.",
          script:
            "Hello, Lamp, Lottie. I just want to say, for the row: the voice at two in the morning is NOT Walt's cousin Stan from Sandusky, I don't care what Mrs. Nowak says, Stan can't do voices, Stan can barely do his own. Whoever it is, it isn't Stan. That's all. Hi, Walt.",
          aired: {
            flag: 'n5_lottie_stan', tone: 'good',
            effects: { morale: 3 },
            line: "Lottie cleared Walt's cousin Stan of being the two a.m. voice, on the air. Stan is relieved. Mrs. Nowak is not convinced.",
          },
          cut: {
            flag: 'n5_lottie_cut', tone: 'neutral',
            effects: { trust: { netters: -2 } },
            line: 'You cut Lottie off before she got to Stan. Smokehouse row remains convinced it is Stan.',
          },
          confide: {
            text: "Also, Walt says don't tell you this, but the Linemen are pulling your fuse at eleven whether you say yes or no. He heard it at the yard. I'm telling you because somebody should.",
            flag: 'pruitt_fuse',
          },
        },
      ],
    },
    { kind: 'tube', id: 'n5_tube_a', at: { slot: 1, frac: 0.4 }, socket: 0 },
    { kind: 'tube', id: 'n5_tube_b', at: { slot: 4, frac: 0.3 }, socket: 3 },
    {
      kind: 'morse', id: 'n5_morse', at: { slot: 5 }, word: 'KETTLE', seconds: 50,
      decoded: {
        flag: 'n5_morse_kettle', tone: 'eerie',
        effects: { credibility: -1 },
        line: 'Six letters under the static at three, keyed slow and even: K-E-T-T-L-E. Teddy was asleep. Nobody at the point touched the wire.',
      },
      missed: {
        flag: 'n5_morse_missed', tone: 'neutral',
        effects: {},
        line: 'Something keyed six letters under the static at three, slow, even. Nobody copied it. Teddy says it wasn\'t him.',
      },
    },
    {
      kind: 'storm', id: 'n5_storm', slots: [4, 5], wind: 1.9,
      held: {
        line: 'The squall came at three with the antenna guy wire cut, and the Lamp swung on the dial like a lantern on a hook. You held it anyway.',
        effects: { credibility: 5, listeners: 6 },
      },
      lost: {
        line: 'Somebody had cut the antenna guy wire. In the squall the Lamp swung clean off twelve-sixty and the thing underneath had the frequency to itself for most of an hour.',
        effects: { listeners: -12, credibility: -4 },
      },
    },
  ],

  otherStation: {
    prefer: ['ans_claim', 'ans_deny', 'ans_silent', 'warn_squall5', 'warn_dark', 'news_switchon', 'news_rebuild'],
    intro: 'This is the Lamp. Twelve-sixty.',
    stamp: 'Tonight. Two-fourteen in the morning.',
    outro: "Goodnight, Port Vesper. We'll be listening.",
    readsDumped: true,
    readsGroup: 'answer',
    fillsSilence: true,
    intrusions: [
      { kind: 'carrier', id: 'n5_carrier', slots: [4, 5] },
      { kind: 'override', id: 'n5_override_a', at: { slot: 0, frac: 0.7 }, seconds: 20 },
      { kind: 'override', id: 'n5_override_b', at: { slot: 3, frac: 0.6 }, seconds: 26 },
    ],
  },

  letter: {
    body:
      "To the Lamp. Sister Agnes. I sat up with the infirmary set after you signed off. At fourteen minutes past two " +
      "it said, in your voice, \"{quote}\" It said the date. It said tonight's date, and it said it while I was " +
      "looking at the clock, and the clock said fourteen past two. I have been a nurse for thirty years and I do " +
      "not frighten. I am writing this so that you know I heard it, and so that you know I am not angry with you. " +
      "Whatever it is, it is not you. Keep the kettle on.",
    from: 'Sister Agnes, by hand',
  },

  classifieds: [
    { id: 'n5_6l6', text: 'Ridge Road yard: one 6L6, new old stock, still in the box. Seven chits. Ask for Tom.', cost: 7, gives: { spare: '6L6' } },
    { id: 'n5_6sn7', text: 'Ridge Road yard: 6SN7, tested, good glass. Six chits.', cost: 6, gives: { spare: '6SN7' } },
    { id: 'n5_moonlight', text: 'Wanted: "Moonlight Bay," any pressing. Will trade a 5U4. Ask for Sparky.', cost: 0, gives: { spare: '5U4' }, gate: { requires: ['aired_rec_moonlight2'] } },
  ],

  dawnLines: [
    {
      gate: { requires: ['n5_bill_calm'] },
      tone: 'neutral',
      line: "Bill's knee said calm. The squall came at three. Bill has not left the house, and the knee has not been mentioned.",
    },
    {
      gate: { requires: ['n5_agnes_aired'], unless: ['n5_answer_deny', 'n5_answer_claim', 'n5_answer_silent'] },
      tone: 'bad', effects: { trust: { chapel: -5 }, credibility: -3 },
      line: 'Sister Agnes asked you a question in front of the whole town and the night ended without an answer. The hill took that as one.',
    },
    {
      gate: { requires: ['n5_dark'] },
      tone: 'eerie',
      line: "While the Lamp was dark, twelve-sixty wasn't. People who left the set on heard a whole show. Yours. With a kettle in it.",
    },
  ],

  rundowns: {
    auto: ['ad_smokehouse3', 'rec_mill2', 'ans_deny', 'rec_howcome2', 'warn_squall5', 'rec_home2'],
    demo: ['ans_claim', 'rec_home2', 'ad_smokehouse3', 'rec_mill2', 'warn_squall5', 'rec_howcome2'],
  },
};
