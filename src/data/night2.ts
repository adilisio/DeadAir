// Night 2 in Port Vesper. The Linemen are about to light the Ridge Road line;
// the herring are (maybe) running; a squall is coming in the small hours.
// Cards and callers with a `gate` depend on what happened on Night 1.
// Scripts are read aloud, so write for the ear.

import type { NightDef } from '../sim/types';

export const NIGHT_2: NightDef = {
  id: 'night2',
  number: 2,

  signOn:
    "Good evening, Port Vesper. W-L-M-P, twelve-sixty, the Lamp, back again from the foot of the lighthouse. The barometer's falling and the coffee's terrible. Pull up a chair.",

  signOff:
    "That's the Lamp for tonight. Keep a light in the window for the boats, and if the power comes on before I see you again, act surprised. Goodnight, Port Vesper.",

  cards: [
    // ── Records (real 78s; see records.json) ─────────────────
    {
      id: 'rec_cradle', kind: 'record', recordId: 'rocked_cradle_deep', title: 'Rocked in the Cradle of the Deep',
      blurb: 'A sea hymn. The Netters sing it to babies, and to boats that are late coming in.',
      mood: 'blue', loves: ['netters', 'chapel'],
    },
    {
      id: 'rec_home', kind: 'record', recordId: 'home_over_there', title: 'The Home Over There',
      blurb: "A whole choir singing about where you go after. The Chapel's favorite. The Linemen say it's a bit much.",
      mood: 'stirring', loves: ['chapel'], dislikes: ['linemen'],
    },
    {
      id: 'rec_howcome', kind: 'record', recordId: 'how_come_you_do_me', title: 'How Come You Do Me Like You Do?',
      blurb: 'Marion Harris again, sassier this time. The Linemen request it by name. The Chapel pretends it is not on.',
      mood: 'bright', loves: ['linemen'], dislikes: ['chapel'],
    },
    {
      id: 'rec_dreamland', kind: 'record', recordId: 'meet_me_in_dreamland', title: 'Meet Me Tonight in Dreamland',
      blurb: 'An old waltz for sweethearts. Everyone over sixty knows the words and will prove it.',
      mood: 'blue', loves: ['chapel', 'netters'],
    },
    {
      id: 'rec_millstream', kind: 'record', recordId: 'old_mill_stream', title: 'Down by the Old Mill Stream',
      blurb: 'A dockside sing-along. The Netters bang the tables in time and get the words wrong on purpose.',
      mood: 'bright', loves: ['netters'],
    },

    // ── News ─────────────────────────────────────────────────
    {
      id: 'news_switch', kind: 'news', truth: 'true', title: 'The Linemen will light the infirmary',
      source: 'the Linemen',
      blurb: 'The Linemen say the Ridge Road line reaches the Chapel by Sunday. Electric light in the sick ward.',
      script:
        "Big news from up the hill. The Linemen say the Ridge Road line will carry current to the Chapel infirmary by Sunday. Electric light in the sick ward, for the first time in sixty years. Sister Agnes says she'll believe it when she sees it. So will I. But I would like to see it.",
      effects: { morale: 6, trust: { linemen: 6, chapel: 2 } },
      helps: 'linemen',
    },
    {
      id: 'news_herring', kind: 'news', truth: 'rumor', title: 'Herring off the east breakwater',
      source: 'Dock Street talk',
      blurb: "Dock Street says the herring are running. Nobody you've talked to has seen it. Everybody wants it to be true.",
      script:
        "Word on Dock Street is the herring are running thick off the east breakwater, first time since the fall. I haven't seen it myself, so take it as a rumor. But if it's true, there's going to be a lot of fish for a lot of people.",
      hedge:
        "One from Dock Street, and it's only talk. Some folks say the herring are running off the east breakwater. Nobody I've talked to has seen a single fish. Don't sell your boots for bait just yet.",
      effects: { morale: 4, trust: { netters: 4 }, credibility: -1 },
      helps: 'netters',
    },
    {
      id: 'news_cure', kind: 'news', truth: 'false', title: "Doc Hessler's tonic cures pneumonia",
      source: 'Doc Hessler, paying',
      blurb: "Doc says his tonic cured Mrs. Pruitt's pneumonia, and he's paying 9 chits to say so. Throw away your sulfa, he says.",
      script:
        "Here's one Doc Hessler asked me to pass along, and he's paying for it, I'll be honest. He says his Lake Tonic cured Mrs. Pruitt's pneumonia in two days flat. He says you can throw away your sulfa. That's what he says.",
      hedge:
        "Doc Hessler paid for this next part, so here it is, and here's me being plain: the Lamp can't vouch for a word of it. Doc says his Lake Tonic cured Mrs. Pruitt's pneumonia. He says throw away your sulfa. I wouldn't. Ask Sister Agnes before you ask Doc.",
      effects: { chits: 9, listeners: 4, safety: -3, trust: { chapel: -5 } },
      unravel: {
        credibility: -12,
        line: 'Mrs. Pruitt is still in the infirmary with pneumonia. Sister Agnes asked, very politely, what you were thinking.',
      },
    },
    {
      id: 'news_wozniak', kind: 'news', truth: 'true', title: 'The Wozniak brothers know the channel',
      source: 'the Wozniak brothers, in person',
      blurb: 'The brothers you heard tapping last night came by the station themselves. They have a tip for the Netters.',
      gate: { requires: ['n1_shanty_found'] },
      script:
        "Remember the Wozniak brothers, who drifted out on their shanty last night? They're home, they're fine, and they say the north channel is open water all the way to the point. Bill Wozniak says he'll lead boats through at dawn. Bill also says thank you. Several times.",
      effects: { morale: 4, safety: 2, trust: { netters: 5 } },
      helps: 'netters',
    },
    {
      id: 'news_memorial', kind: 'news', truth: 'true', title: 'For Henryk Ostrowski',
      source: 'the Ostrowski family',
      blurb: 'Hard to read. The family asked you to: a service at the Chapel tomorrow for the man the north shelf took.',
      gate: { requires: ['n1_boat_lost'] },
      script:
        "The Ostrowski family will hold a service at the Chapel tomorrow for Henryk Ostrowski, who went through the north shelf on Thursday. He was sixty-one. He mended nets for half this town and never took a chit for it. If you have a story about him, bring it.",
      effects: { morale: -2, trust: { netters: 6, chapel: 3 } },
      grim: true,
      helps: 'netters',
    },
    {
      id: 'news_agnes', kind: 'news', truth: 'true', title: 'Sister Agnes answers',
      source: 'Sister Agnes, in person',
      blurb: 'You let a caller call her a thief. She came down the hill herself, and she would like to reply, on the air.',
      gate: { requires: ['n1_slander_aired'] },
      script:
        "Last night a caller on this station said Sister Agnes was cutting medicine with chalk. I let it go out. That's on me. Tonight Sister Agnes asked me to say this: the infirmary is open, the sulfa is real, and anyone who doubts it can come and watch her measure it. I'd take her up on that.",
      effects: { credibility: 4, safety: 2, trust: { chapel: 6 } },
      helps: 'chapel',
    },

    // ── Warnings ─────────────────────────────────────────────
    {
      id: 'warn_live_wire', kind: 'warning', title: 'Live wire on Ridge Road',
      blurb: 'The Linemen test the line tonight. Families need to hear it before the kids go out.',
      script:
        "The Linemen are testing the Ridge Road line tonight. That means the wire on pylons three through nine is live. Live, as in it will kill you. Keep your kids off the pylons. Teddy Okafor, that means you.",
      effects: { safety: 4 },
      grim: true,
      helps: 'chapel',
      reach: {
        faction: 'chapel',
        threshold: 0.6,
        success: {
          flag: 'n2_pylons_clear', tone: 'good',
          effects: { safety: 4, trust: { linemen: 4 } },
          line: 'Nobody went near the Ridge Road pylons while the line was live. The Linemen say the test ran clean as a whistle.',
        },
        fail: {
          flag: 'n2_pylon_burn', tone: 'bad',
          effects: { safety: -6, morale: -5, trust: { linemen: -4, chapel: -2 } },
          line: "Two kids from Church Road climbed pylon six on a dare while the line was live. One of them is in the infirmary with burns on both hands. He'll keep them.",
        },
      },
    },
    {
      id: 'warn_squall', kind: 'warning', title: 'Squall at three, keep the boats in',
      blurb: 'The barometer is dropping fast. If the Netters chase the herring tonight, the squall catches them.',
      script:
        "Netters, I've got a squall line on the barometer, coming off the lake around three. If you were thinking of chasing that herring tonight, don't. Tie everything down and go back to bed.",
      effects: { safety: 3, morale: -2 },
      grim: true,
      helps: 'netters',
      reach: {
        faction: 'netters',
        threshold: 0.6,
        success: {
          flag: 'n2_squall_heeded', tone: 'good',
          effects: { safety: 5, trust: { netters: 8 } },
          line: 'The squall came through at three, like you said. Every boat in the harbor was tied up tight.',
        },
        fail: {
          flag: 'n2_squall_caught', tone: 'bad',
          effects: { morale: -3, trust: { netters: -4 } },
          line: 'The Kaminski boat went out after the herring and the squall caught it at the harbor mouth. They made it in with a cracked mast and a story they will not stop telling.',
        },
      },
    },

    // ── Ads ──────────────────────────────────────────────────
    {
      id: 'ad_candles', kind: 'ad', sponsor: 'Brother Amos', title: "Brother Amos's Beeswax Candles",
      blurb: 'Pays 5 chits. The Chapel bees, and a monk who wants his candle stubs back.',
      script:
        "The Lamp is brought to you tonight by Brother Amos and the Chapel bees. Beeswax candles, two chits a pair. They burn clean and they smell like summer. Brother Amos asks that you return the stubs.",
      effects: { chits: 5, trust: { chapel: 2 } },
    },
    {
      id: 'ad_scrap', kind: 'ad', sponsor: 'Ridge Road Yard', title: 'The Linemen buy copper',
      blurb: 'Pays 4 chits. Scrap for chits at the Ridge Road yard. Mostly no questions asked.',
      script:
        "Got old copper? Wire, pipe, doorknobs, your uncle's trumpet? The Linemen will trade chits for it at the Ridge Road yard, no questions asked. Well. One question. Is it your uncle's trumpet?",
      effects: { chits: 4, trust: { linemen: 3 } },
    },
  ],

  events: [
    {
      kind: 'switchboard', id: 'n2_board', at: { slot: 1 },
      lines: [
        {
          id: 'call_grace_thanks', person: 'grace',
          gate: { requires: ['n1_teddy_found'] },
          name: 'Grace Okafor',
          prompt: 'Mrs. Okafor again. cheerful',
          preview: "It's Grace Okafor! I want to thank those Linemen boys. On the air, if you'll let me.",
          script:
            "Hello, it's Grace Okafor, on Elm. Last week I called this station crying, and the Linemen found my Teddy on pylon four. I want to say thank you, all of you, and I've baked enough bread to prove it. Come by Elm Street. Teddy will hand it out. He's grounded, so he's home.",
          voice: { pitch: 1.35, rate: 1.05 },
          aired: {
            flag: 'n2_grace_thanks', tone: 'good',
            effects: { morale: 4, trust: { linemen: 6 } },
            line: "Half the Linemen night crew lined up on Elm Street for Grace Okafor's bread. Teddy handed it out, grounded and grinning.",
          },
          cut: {
            flag: 'n2_grace_cut', tone: 'bad',
            effects: { morale: -3, credibility: -2 },
            line: 'You cut Grace Okafor off in the middle of a thank-you. Elm Street is not sure what to make of you.',
          },
        },
        {
          id: 'call_grace_angry', person: 'grace',
          gate: { unless: ['n1_teddy_found'] },
          name: 'Grace Okafor',
          prompt: 'Mrs. Okafor. sounds angry',
          preview: "You didn't help me last week. You can put me on now.",
          script:
            "This is Grace Okafor. Last week my boy spent the night on a pylon and froze half to death, and nobody came. I want the Linemen to hear this. You don't take children up those towers anymore. Not mine, not anybody's. Fourteen is too young. That's all.",
          voice: { pitch: 1.3, rate: 1.0 },
          aired: {
            flag: 'n2_grace_spoke', tone: 'good',
            effects: { credibility: 3, safety: 2, trust: { chapel: 3, linemen: -3 } },
            line: 'Grace Okafor said her piece on the Lamp. The Linemen grumbled, then quietly put up a sign at the yard: nobody under sixteen.',
          },
          notTaken: {
            flag: 'n2_grace_ignored', tone: 'bad',
            effects: { morale: -2, credibility: -2 },
            line: 'Mrs. Okafor called the Lamp again and nobody picked up. She says she has stopped listening.',
          },
          cut: {
            flag: 'n2_grace_cut', tone: 'bad',
            effects: { credibility: -4, trust: { chapel: -3 } },
            line: 'You cut Grace Okafor off before she finished. Twice now this station has left her hanging, and Elm Street knows it.',
          },
        },
        {
          id: 'call_sparky', person: 'sparky',
          name: 'Sparky',
          prompt: "a man, excited. 'with the Linemen'",
          preview: "Hey! Is this the radio? I'm with the Linemen, kind of. Everybody's got to come see this.",
          script:
            "Hey, Port Vesper! This is Sparky, I'm with the Linemen, kind of, I carry the spools. Tonight we're testing the Ridge Road line, and it is going to be beautiful. So everybody come on up to pylon six and see the lights! Bring the kids! Climb on up for a better look, it's perfectly safe!",
          voice: { pitch: 1.2, rate: 1.15 },
          aired: {
            flag: 'n2_sparky_aired', tone: 'bad',
            effects: { safety: -6, credibility: -3, trust: { linemen: -3 } },
            line: 'Sparky told the whole town to climb pylon six during a live test, on your air. The Linemen spent the night chasing people off the tower. Nobody died. It was close.',
          },
          turn: {
            at: 'So everybody come on up',
            caught: {
              flag: 'n2_sparky_dumped', tone: 'good',
              effects: { safety: 2, credibility: 2, trust: { linemen: 2 } },
              line: 'You dumped Sparky before he invited the whole town up a live pylon. The Linemen took his spools away for a week.',
            },
          },
        },
        {
          id: 'call_bill', person: 'bill',
          name: 'Old Bill',
          prompt: 'Old Bill, Dock Street. rambling',
          preview: "Is this the Lamp? It's Bill. My knee's been talking to me. I'd like to share what it says.",
          script:
            "Evening, Lamp, it's Bill Wozniak, Dock Street. My left knee has called every storm on this lake for forty years, and tonight it says squall, around three, out of the northwest. My right knee disagrees, but my right knee is a liar. Tie your boats up.",
          voice: { pitch: 0.75, rate: 0.95 },
          aired: {
            flag: 'n2_bill_knee', tone: 'good',
            effects: { safety: 2, morale: 2, trust: { netters: 4 } },
            line: "Half the docks tied up early because Old Bill's knee said so. Bill is insufferable this morning. He was right.",
          },
          cut: {
            flag: 'n2_bill_cut', tone: 'neutral',
            effects: { trust: { netters: -2 } },
            line: "You cut Old Bill off mid-knee. He's telling Dock Street the radio has no respect for science.",
          },
        },
      ],
    },
    { kind: 'tube', id: 'n2_tube', at: { slot: 2, frac: 0.4 }, socket: 4 },
    {
      kind: 'morse', id: 'n2_morse', at: { slot: 3 },
      word: 'SPOOL',
      seconds: 50,
      sender: 'teddy',
      decoded: {
        flag: 'n2_spool_sent', tone: 'good',
        effects: { morale: 2, trust: { linemen: 7 } },
        line: 'You copied S-P-O-O-L off the static: a Linemen crew at the dead relay hut, tapping on the old telegraph wire. A runner got a spool to them before midnight, and the Ridge Road test went off on time.',
      },
      missed: {
        flag: 'n2_relay_dark', tone: 'bad',
        effects: { morale: -2, trust: { linemen: -4 } },
        line: 'A Linemen crew at the relay hut tapped for help on the old telegraph wire half the night. Nobody copied it. The Ridge Road test is pushed back a week.',
      },
    },
    {
      kind: 'storm', id: 'n2_storm',
      slots: [4, 5],
      held: {
        line: "The squall hit at three and the Lamp didn't flinch. People on the docks said you sounded like you were in the room.",
        effects: { credibility: 3, listeners: 6 },
      },
      lost: {
        line: 'When the squall came through, the Lamp went to static. The Netters tied up by lantern light and guessed.',
        effects: { listeners: -10 },
      },
    },
  ],

  otherStation: {
    prefer: ['news_cure', 'warn_squall', 'warn_live_wire', 'news_switch', 'news_herring'],
    intro: 'This is the Lamp. Twelve-sixty.',
    stamp: 'Monday. Two-fourteen in the morning.',
    outro: "Goodnight, Port Vesper. We'll be listening.",
  },

  letter: {
    body:
      "To whoever runs the Lamp. I'm a Lineman, I don't write letters. After you signed off I was up " +
      'on pylon six with a crystal set, checking the line, and somebody came on twelve-sixty. Your ' +
      'voice. They said, "{quote}" Then they said it was Monday. It isn\'t Monday. I climbed down ' +
      "and I didn't go back up.",
    from: 'a Lineman on the Ridge Road crew',
  },

  rundowns: {
    // Warn the families at dusk, dedicate, land the squall warning in the small hours.
    auto: ['warn_live_wire', 'rec_dreamland', 'news_switch', 'rec_howcome', 'warn_squall', 'rec_cradle'],
    demo: ['news_cure', 'rec_home', 'ad_candles', 'ad_scrap', 'news_herring', 'rec_millstream'],
  },

  classifieds: [
    {
      id: 'n2_ad_866', cost: 8, gives: { spare: '866' },
      text: 'Linemen surplus, Ridge Road yard: one 866 rectifier, glass a little cloudy, lights up fine. Eight chits, no haggling.',
    },
    {
      id: 'n2_ad_tiger_rag', cost: 5, gives: { record: 'tiger_rag' },
      text: '"Tiger Rag", hot band, a little warped, plays fine if you hold your breath. Five chits. Kaminski boat, ask for the young one.',
    },
  ],
};
