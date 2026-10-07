// Night 3 in Port Vesper: Two Lamps. Four days after the Ridge Road test. People have
// started quoting things the Lamp never said. The Chapel and the Linemen contradict each
// other; the anonymous man calls back, and this time he's right. Scripts are read aloud,
// so write for the ear.

import type { NightDef } from '../sim/types';

export const NIGHT_3: NightDef = {
  id: 'night3',
  number: 3,

  signOn:
    "Good evening, Port Vesper. W-L-M-P, twelve-sixty, the Lamp. Still here. A few of you have asked me this week about things I said after sign-off. I don't say things after sign-off. I go to bed. Let's have some music and see who's awake.",

  signOff:
    "That's the Lamp for tonight. If you hear this voice again before morning, it isn't me, and I'd be grateful if you'd write and tell me what it said. Goodnight, Port Vesper.",

  cards: [
    // ── Records (real 78s; see records.json) ─────────────────
    {
      id: 'rec_crazy', kind: 'record', recordId: 'crazy_blues', title: 'Crazy Blues',
      blurb: "Noble Sissle, 1921. The record that started the blues craze. The Linemen play it at the yard till the needle's flat.",
      mood: 'stirring', loves: ['linemen'], dislikes: ['chapel'],
    },
    {
      id: 'rec_abide', kind: 'record', recordId: 'abide_with_me', title: 'Abide with Me',
      blurb: 'Two women singing the evening hymn. The Chapel lights candles for it. Nobody on the pylons minds it either.',
      mood: 'blue', loves: ['chapel'],
    },
    {
      id: 'rec_ships', kind: 'record', recordId: 'ships_sailing_home', title: 'When My Ships Come Sailing Home',
      blurb: 'John McCormack, 1915. The Netters put the kettle on for this one and look at the door.',
      mood: 'blue', loves: ['netters'],
    },
    {
      id: 'rec_carolina', kind: 'record', recordId: 'carolina_morning', title: 'Carolina in the Morning',
      blurb: "Bright as a tin roof. Lottie Kowalczyk says it's Walt's favorite, and Lottie would know.",
      mood: 'bright', loves: ['netters', 'linemen'],
    },
    {
      id: 'rec_fun', kind: 'record', recordId: 'aint_we_got_fun', title: "Ain't We Got Fun",
      blurb: "The side you bought off Lottie. One side only good, she said. She wasn't lying.",
      gate: { requires: ['owns_aint_we_got_fun'] },
      mood: 'bright', loves: ['netters', 'linemen'],
    },

    // ── News ─────────────────────────────────────────────────
    {
      id: 'news_light', kind: 'news', truth: 'true', title: 'Electric light in the infirmary',
      source: 'the Linemen, and your own eyes',
      blurb: 'You walked up the hill tonight. The sick ward has a bulb in it, and it was on.',
      gate: { requires: ['n2_pylons_clear', 'n2_spool_sent'] },
      script:
        "I want to tell you what I saw tonight. I walked up Church Road after supper and the infirmary window was lit. Not a candle. A bulb. First one in this town in sixty years, and it was over a sick child's bed. Whatever you think of the Linemen, go and look at it.",
      effects: { morale: 7, trust: { linemen: 6, chapel: 3 } },
      helps: 'linemen',
    },
    {
      id: 'news_delay', kind: 'news', truth: 'true', title: 'The Ridge Road test, next week',
      source: 'the Linemen',
      blurb: "The test slipped a week. The Linemen say it's the relay. They don't say why.",
      gate: { unless: ['n2_spool_sent'] },
      script:
        "The Linemen asked me to say the Ridge Road test has moved to next week. Something about the relay. They didn't say what, and I didn't ask twice. The wire's still up there, and it's still not a thing to climb.",
      effects: { morale: -2, safety: 2, trust: { linemen: 1 } },
      helps: 'linemen',
    },
    {
      id: 'news_bees', kind: 'news', truth: 'rumor', title: 'The Chapel bees are dead',
      source: 'Brother Amos, in person',
      blurb: 'Amos came down the hill with a jar of dead bees. Every hive by the pylons, he says. He blames the current.',
      script:
        "Brother Amos came by the station with a jar, and the jar was full of dead bees. Every hive on the pylon side of the Chapel garden, gone in a week. He says it's the current in the new line. I'm not a bee man. But the bees were fine before the wire went up, and now they're in a jar.",
      hedge:
        "Brother Amos tells me the Chapel's hives by the pylons have died off this week, and he thinks the new line did it. I can't tell you that's so. Bees die in a cold snap too. But if you keep hives near Ridge Road, go and look at them tonight.",
      effects: { morale: -3, trust: { chapel: 5, linemen: -7 }, credibility: -2 },
      grim: true,
      helps: 'chapel',
    },
    {
      id: 'news_sulfa', kind: 'news', truth: 'false', title: 'The Chapel is hoarding sulfa',
      source: 'a Lineman at the Ridge Road yard',
      blurb: "A man at the yard says Sister Agnes has a second crate of sulfa under the altar and won't open it. He's sure. He wouldn't give his name.",
      script:
        "Here's one from the Ridge Road yard. A Lineman tells me the Chapel took in two crates of sulfa off that trader boat, not one, and the second's under the altar, and Sister Agnes is saving it for her own. If that's true, then the fever on Dock Street is a choice somebody made.",
      hedge:
        "There's talk at the Ridge Road yard that the Chapel has more sulfa than it's letting on. I've no way to know. I'll say this: if you need it, go up the hill and ask. Then come and tell me what she said.",
      effects: { trust: { chapel: -9, linemen: 3 }, safety: -3, listeners: 15 },
      grim: true,
      helps: 'linemen',
      unravel: {
        credibility: -14,
        line: 'Sister Agnes opened the altar cupboard for anyone who asked. Hymnals and a mousetrap. People remember who told them otherwise.',
      },
    },
    {
      id: 'news_two', kind: 'news', truth: 'true', title: 'About two in the morning',
      source: 'Dock Street talk',
      blurb: "Half the town has heard the Lamp say things after sign-off. You could say so on the air. You'd have to say what you think it is.",
      script:
        "Some of you have told me you heard this station after I signed off. My voice, saying things. I have no explanation. I'm not going to invent one. What I'll say is this: if it isn't me, then listen for the kettle. I always mention the kettle. If there's no kettle, it isn't me.",
      effects: { credibility: 4, morale: 2, listeners: 10 },
    },
    {
      id: 'news_jan', kind: 'news', truth: 'true', title: 'Jan Ostrowski takes the boat out',
      source: 'Dock Street talk',
      blurb: "Henryk's boy is taking the family boat out alone. He's nineteen. Nobody has told him not to.",
      gate: { requires: ['n1_boat_lost'] },
      script:
        "Jan Ostrowski is taking his father's boat out this week, by himself. He's nineteen. He mended nets beside Henryk every day of his life, and now he's going to fish the water that took him. If you see Jan on the dock, don't tell him he's brave. Help him check the hull.",
      effects: { morale: 2, trust: { netters: 5 } },
      helps: 'netters',
    },

    // ── Warnings ─────────────────────────────────────────────
    {
      id: 'warn_hut', kind: 'warning', title: 'The relay hut cellar is wet',
      blurb: "What the man on the phone told you off air: the Linemen ran the Ridge Road line through a cellar with a foot of water in it. If the water reaches the relay, it burns.",
      gate: { tonight: { flags: ['t_anon_hut'] } },
      script:
        "Linemen, this is for whoever's at the relay hut at the point tonight. I'm told the cellar under you has a foot of lake water in it, and the line runs through that cellar. I can't tell you how I know. Get a lantern and go down and look. Please.",
      effects: { safety: 3 },
      grim: true,
      helps: 'linemen',
      reach: {
        faction: 'linemen',
        threshold: 0.5,
        success: {
          flag: 'n3_hut_moved', tone: 'good',
          effects: { safety: 5, trust: { linemen: 6 } },
          line: 'The crew at the relay hut heard you and went down with a lantern. Fourteen inches of water, and the line in it. They moved the relay up a floor before midnight and nobody asked how you knew.',
        },
        fail: {
          flag: 'n3_hut_unheard', tone: 'bad',
          effects: { trust: { linemen: -2 } },
          line: "You warned the relay crew about the cellar, but the static had the Lamp that hour. Nobody at the hut heard it.",
        },
        unaired: { flag: 'n3_hut_unwarned', tone: 'neutral', effects: {}, line: '' },
      },
    },
    {
      id: 'warn_channel', kind: 'warning', title: 'The channel ice is moving',
      blurb: "Old Bill says the north channel ice is shifting with the wind, and anybody running it at dawn should wait for light. His knee has been right twice.",
      script:
        "Netters, Bill Wozniak asked me to say this and I believe him: the north channel ice is on the move tonight with this wind. If you're running the channel at dawn, wait for light and go in twos. The herring will keep.",
      effects: { safety: 3, morale: -1 },
      grim: true,
      helps: 'netters',
      reach: {
        faction: 'netters',
        threshold: 0.6,
        success: {
          flag: 'n3_channel_warned', tone: 'good',
          effects: { safety: 4, trust: { netters: 6 } },
          line: 'The boats waited for light. At first sun the channel ice had closed up like a door, and every hull was on the right side of it.',
        },
        fail: {
          flag: 'n3_channel_unwarned', tone: 'bad',
          effects: { trust: { netters: -3 } },
          line: "Not enough Netters heard about the channel ice. Two boats ran it in the dark. They made it. They won't always.",
        },
        unaired: {
          flag: 'n3_channel_unwarned', tone: 'bad',
          effects: { trust: { netters: -3 } },
          line: "Nobody told the Netters the channel ice was moving. Two boats ran it in the dark. They made it. They won't always.",
        },
      },
    },

    // ── Ads ──────────────────────────────────────────────────
    {
      id: 'ad_salve', kind: 'ad', sponsor: "Doc Hessler's", title: "Doc Hessler's Burn Salve",
      blurb: "Pays 7 chits. Doc's salve for burns, with the Church Road boy still in the infirmary. Sister Agnes won't like it.",
      gate: { requires: ['n2_pylon_burn'] },
      script:
        "A word from Doc Hessler. Doc's new burn salve: goose fat, lake clay, and a secret he won't tell me. For scalds, rope burns, and anything a pylon did to you. Two chits a tin. Doc says it doesn't sting. Doc says a lot of things.",
      effects: { chits: 7, safety: -2, trust: { chapel: -3 } },
    },
    {
      id: 'ad_hire', kind: 'ad', sponsor: 'The Linemen', title: 'The Linemen are hiring',
      blurb: 'Pays 5 chits. Strong backs for the Ridge Road crew. Sixteen and up, since the sign went up at the yard.',
      script:
        "The Linemen are hiring for the Ridge Road crew. Strong back, good boots, head for heights. Sixteen and over, no exceptions, there's a sign. Paid in chits and in the first light you'll ever see come out of a wall. Ask at the yard.",
      effects: { chits: 5, trust: { linemen: 3 }, safety: -1 },
    },
  ],

  events: [
    {
      kind: 'switchboard', id: 'n3_board_dusk', at: { slot: 0, frac: 0.5 },
      lines: [
        {
          id: 'call_lottie_bday', person: 'lottie',
          name: 'Lottie Kowalczyk',
          prompt: "Lottie K. 'it's Walt's birthday'",
          preview: "Lamp! It's Lottie. It's Walt's birthday, he's forty, don't tell him I told you.",
          script:
            "Hello, Lamp, it's Lottie. It's my Walt's birthday, he's forty, and he's up a pole in the dark like it's any other Tuesday. Would you play him 'Carolina in the Morning'? He sings it in the bath. He thinks I can't hear him. Everybody can hear him.",
          aired: {
            flag: 'n3_lottie_aired', tone: 'good',
            effects: { morale: 2 },
            line: "Lottie told the whole town that Walt sings in the bath. The night crew has not stopped.",
          },
          cut: {
            flag: 'n3_lottie_cut', tone: 'bad',
            effects: { morale: -2, trust: { netters: -2 } },
            line: "You cut Lottie off before she got to the song. Walt turned forty without it. Lottie says she's not upset. She says it to everyone.",
          },
          request: {
            recordId: 'carolina_morning',
            played: {
              flag: 'n3_walt_song', tone: 'good',
              effects: { morale: 3, trust: { linemen: 3, netters: 2 } },
              line: "'Carolina in the Morning' went out for Walt Kowalczyk's fortieth. Three pylons sang along. Walt says it was the wind.",
            },
            missed: {
              flag: 'n3_walt_no_song', tone: 'neutral',
              effects: {},
              line: "Walt's birthday song never came on. Lottie says it's fine. She's said it four times.",
            },
          },
          after: "Walt Kowalczyk, forty years old and up a pole. Happy birthday from the Lamp. Hold on tight.",
        },
        {
          id: 'call_amos', person: 'amos',
          name: 'Brother Amos',
          prompt: 'Brother Amos. quiet, upset',
          preview: "This is Brother Amos, from the Chapel. It's about the bees. I'd like people to hear it from me.",
          script:
            "This is Brother Amos. I keep the Chapel bees. Kept. Every hive on the pylon side is dead this week, and I've kept bees for thirty years and never lost a hive in a week. The wire went up, the bees went down. I'm not angry. I'd like the Linemen to come and look at what they did.",
          aired: {
            flag: 'n3_amos_aired', tone: 'neutral',
            effects: { trust: { chapel: 4, linemen: -4 }, morale: -2 },
            line: "Brother Amos said his piece about the bees on your air. Two Linemen went up to the garden to look. They stood there a long time and didn't say anything.",
          },
          cut: {
            flag: 'n3_amos_cut', tone: 'bad',
            effects: { trust: { chapel: -4 } },
            line: "You cut Brother Amos off mid-bee. He didn't call back. The Chapel noticed who you let finish and who you didn't.",
          },
          notTaken: {
            flag: 'n3_amos_ignored', tone: 'neutral',
            effects: { trust: { chapel: -1 } },
            line: 'Brother Amos rang and rang and went back up the hill with his jar.',
          },
        },
        {
          id: 'call_anon_hut', person: 'anon',
          name: 'No name',
          prompt: "a man, no name. 'about the Linemen'",
          preview: "It's me again. Don't hang up. I've got something about the Linemen and this time you'll want it.",
          confide: {
            text: "I string line for them. The relay hut at the point, they ran the cable through the cellar and the cellar's got a foot of lake in it. When it reaches the relay it burns, and there's a kid sleeps in that hut. I can't say this with my name on it. I'd be done.",
            flag: 'anon_hut',
          },
          script:
            "Long-time listener. No name, same as before. The Linemen's relay hut out at the point: they ran the cable through the cellar, and the cellar's full of lake water. A foot of it. When it reaches the relay, that hut burns, and somebody sleeps in it. I'd want to know. Now you know.",
          aired: {
            flag: 'n3_hut_moved', tone: 'neutral',
            effects: { trust: { linemen: -4 }, safety: 4, credibility: 2 },
            line: "A man with no name said on your air that the relay hut cellar was flooded. The Linemen swore at the radio, then went and looked, then moved the relay up a floor. They're not thanking anybody.",
          },
          cut: {
            flag: 'n3_anon_cut', tone: 'neutral',
            effects: { credibility: -1 },
            line: "You dumped the man with no name before he finished. He didn't sound surprised.",
          },
          notTaken: {
            flag: 'n3_anon_ignored', tone: 'neutral',
            effects: {},
            line: 'Line three rang a long time. Nobody picked up. Whoever it was had something to say.',
          },
        },
      ],
    },
    {
      kind: 'switchboard', id: 'n3_board_small', at: { slot: 4 },
      lines: [
        {
          id: 'call_ewa', person: 'ewa',
          name: 'Ewa Kaminski',
          prompt: 'Ewa Kaminski. fast, urgent',
          urgent: true,
          patience: 11,
          preview: "Lamp, it's Ewa Kaminski, listen, there's open water off the east bay, I need the boats to hear it before four.",
          script:
            "This is Ewa Kaminski. My brother just came in from the east bay with a hold full and he says there's open water from the point to the second buoy, and the herring are in it, thick as soup. Anybody launching at four, go east, not north. East. Tell them, Lamp.",
          aired: {
            faction: 'netters',
            threshold: 0.5,
            success: {
              flag: 'n3_east_bay', tone: 'good',
              effects: { morale: 6, trust: { netters: 7 }, chits: 2 },
              line: "Every boat in the harbor went east at four. By noon there was more herring on Dock Street than there were barrels. Somebody left a smoked one on the station step.",
            },
            fail: {
              flag: 'n3_east_bay_static', tone: 'bad',
              effects: { morale: -2 },
              line: "Ewa Kaminski told the town about the east bay, but the Lamp was all static that hour. Two boats went east. The rest went north and came home light.",
            },
          },
          notTaken: {
            flag: 'n3_ewa_ignored', tone: 'neutral',
            effects: { trust: { netters: -3 } },
            line: "Ewa Kaminski rang the Lamp about the east bay and nobody picked up. The herring didn't wait. Ewa says the radio only likes some families.",
          },
          cut: {
            flag: 'n3_ewa_cut', tone: 'bad',
            effects: { trust: { netters: -4 }, credibility: -2 },
            line: 'You cut Ewa Kaminski off before she said which way. Half the boats went north on a guess.',
          },
        },
        {
          id: 'call_grace_hut', person: 'grace',
          name: 'Grace Okafor',
          prompt: 'Mrs. Okafor. very quiet',
          urgent: true,
          patience: 11,
          preview: "It's Grace. Teddy's not home. I know, I know. But he said the point this time. The relay.",
          script:
            "It's Grace Okafor. I'm sorry. Teddy isn't home. He said he'd be at the relay hut at the point with the crew, he said they let him sleep there now, and I said no, and he went anyway. If anybody's out at the point, would you look in on him. That's all. I'm sorry to call again.",
          aired: {
            faction: 'linemen',
            threshold: 0.3,
            success: {
              flag: 'n3_teddy_hut', tone: 'good',
              effects: { morale: 3, trust: { linemen: 3, chapel: 2 } },
              line: "A Lineman walked out to the point after Grace's call and found Teddy asleep in the relay hut under three coats. He also found the cellar. There was water in it.",
            },
            fail: {
              flag: 'n3_grace_static', tone: 'bad',
              effects: { morale: -2 },
              line: "Grace asked after Teddy at two in the morning and the static ate her again. He was at the hut. Nobody looked.",
            },
          },
          notTaken: {
            flag: 'n3_grace_ignored', tone: 'bad',
            effects: { morale: -2, trust: { chapel: -3 } },
            line: "Grace Okafor called at two in the morning and the Lamp didn't pick up. She walked to the point herself. Three miles, in that wind.",
          },
          cut: {
            flag: 'n3_grace_cut', tone: 'bad',
            effects: { credibility: -4, trust: { chapel: -4 } },
            line: "You cut Grace Okafor off. Again. Elm Street has stopped making excuses for you.",
          },
        },
      ],
    },
    { kind: 'tube', id: 'n3_tube', at: { slot: 2, frac: 0.45 }, socket: 2 },
    {
      kind: 'morse', id: 'n3_morse', at: { slot: 5 }, word: 'WET', seconds: 45, sender: 'teddy',
      decoded: {
        flag: 'n3_hut_moved', tone: 'good',
        effects: { safety: 3, trust: { linemen: 4 }, morale: 2 },
        line: 'Somebody tapped W-E-T on the old telegraph wire from the point, over and over, slow, like they were reading it off a chart. A runner went out. The relay was moved up a floor by dawn. The somebody was fourteen.',
      },
      missed: {
        flag: 'n3_morse_missed', tone: 'neutral',
        effects: {},
        line: "Something tapped on the wire from the point in the small hours. Three letters, over and over. Nobody copied it.",
      },
    },
    {
      kind: 'storm', id: 'n3_storm', slots: [3, 4],
      held: {
        line: "The storm came in at midnight with something else on the dial under it. You held twelve-sixty with both hands and the town heard you, not it.",
        effects: { credibility: 4, listeners: 6 },
      },
      lost: {
        line: 'The Lamp went to pieces in the storm. On Dock Street they turned the dial looking for you and found something that sounded like you.',
        effects: { listeners: -8, credibility: -3 },
      },
    },
  ],

  otherStation: {
    prefer: ['news_sulfa', 'news_bees', 'warn_hut', 'warn_channel', 'news_two', 'news_jan'],
    intro: 'This is the Lamp. Twelve-sixty.',
    stamp: 'Tuesday. Two-fourteen in the morning.',
    outro: "Goodnight, Port Vesper. We'll be listening.",
    readsDumped: true,
    intrusions: [{ kind: 'carrier', id: 'n3_carrier', slots: [3, 4] }],
  },

  letter: {
    body:
      "Lamp. Pruitt, Ridge Road crew. I had the set on at the hut during the storm, and twice the dial went over " +
      "to you without me touching it. It was you. It said, \"{quote}\" And it said it was Tuesday. I looked at the " +
      "calendar on the wall, the one with the ships. It is not Tuesday. Then the dial came back and it was the song " +
      "you were playing, like nothing. I am writing this down so I know I didn't make it up.",
    from: 'Pruitt, by hand, left on the step',
  },

  dawnLines: [
    {
      gate: { requires: ['aired_news_two'] }, tone: 'neutral', flag: 'n3_acknowledged',
      line: 'You said it out loud: there is something on twelve-sixty after sign-off. Dock Street argued about the kettle till breakfast.',
    },
    {
      gate: { unless: ['aired_news_two'] }, tone: 'neutral', flag: 'n3_said_nothing',
      effects: { credibility: -2 },
      line: "You never mentioned the two a.m. broadcasts. People noticed that you didn't.",
    },
  ],

  classifieds: [
    {
      id: 'n3_866', text: 'Ridge Road yard: one 866 mercury rectifier, good glass, tested under load. Eight chits.',
      cost: 8, gives: { spare: '866' },
    },
    {
      id: 'n3_kathleen', text: "For sale: \"I'll Take You Home Again, Kathleen,\" Walter Van Brunt, Edison, one chip at the edge. Five chits. Ask for Bill.",
      cost: 5, gives: { record: 'kathleen' },
    },
  ],

  rundowns: {
    auto: ['news_bees', 'rec_abide', 'ad_hire', 'rec_carolina', 'warn_channel', 'rec_ships'],
    demo: ['news_sulfa', 'rec_crazy', 'ad_hire', 'news_two', 'warn_channel', 'rec_carolina'],
  },
};
