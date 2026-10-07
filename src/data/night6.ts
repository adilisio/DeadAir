// Night 6 in Port Vesper: Dead Air. The switch-on is tonight at ten. The storm of the
// decade is coming off the lake behind it, and the ice is going to come over the
// breakwater onto Dock Street around one. Everything the run has been building to
// happens on the air, at once. Scripts are read aloud, so write for the ear.

import type { NightDef } from '../sim/types';

export const NIGHT_6: NightDef = {
  id: 'night6',
  number: 6,

  signOn:
    "Good evening, Port Vesper. W-L-M-P, twelve-sixty, the Lamp. At ten o'clock tonight the Linemen close a switch, and if it works, this is the last night this station is the only light on the shore. There's weather behind it. The kettle's on. Stay with me all the way through.",

  signOff:
    "That's the Lamp. Whatever happens on this frequency after I stop talking, I want you to remember that this part was me. All of it. The kettle, the records, the nights. This is W-L-M-P, twelve-sixty. Goodnight, Port Vesper.",

  cards: [
    // ── Records ──────────────────────────────────────────────
    {
      id: 'rec_sweetheart2', kind: 'record', recordId: 'let_me_call_you_sweetheart', title: 'Let Me Call You Sweetheart',
      blurb: 'Everybody knows the words. Tonight nobody will pretend not to cry.',
      mood: 'blue', loves: ['netters', 'chapel'],
    },
    {
      id: 'rec_hymn2', kind: 'record', recordId: 'nearer_my_god', title: 'Nearer My God to Thee',
      blurb: "The Titanic hymn. The Chapel will want it when the ice comes. The Linemen will call it the funeral. It might be.",
      mood: 'stirring', loves: ['chapel'], dislikes: ['linemen'],
    },
    {
      id: 'rec_harris2', kind: 'record', recordId: 'it_had_to_be_you', title: 'It Had to Be You',
      blurb: 'Marion Harris. The Linemen whistled it on the pylons for six nights. Tonight the pylons light up.',
      mood: 'bright', loves: ['linemen'],
    },
    {
      id: 'rec_cradle2', kind: 'record', recordId: 'rocked_cradle_deep', title: 'Rocked in the Cradle of the Deep',
      blurb: 'The sea hymn, for babies and late boats. Tonight the lake is coming to the houses instead.',
      mood: 'blue', loves: ['netters', 'chapel'],
    },
    {
      id: 'rec_kathleen2', kind: 'record', recordId: 'kathleen', title: "I'll Take You Home Again, Kathleen",
      blurb: "Bill's record with the chip. For taking people home.",
      gate: { requires: ['owns_kathleen'] },
      mood: 'blue', loves: ['netters', 'chapel'],
    },
    {
      id: 'rec_tiger2', kind: 'record', recordId: 'tiger_rag', title: 'Tiger Rag',
      blurb: 'The hot one from the yard. If the lights come on, this is what the Linemen will want under them.',
      gate: { requires: ['owns_tiger_rag'] },
      mood: 'bright', loves: ['linemen'], dislikes: ['chapel'],
    },

    // ── News ─────────────────────────────────────────────────
    {
      id: 'news_tonight', kind: 'news', truth: 'true', title: 'Ten o\'clock, the switch',
      source: 'the Linemen, and the whole town',
      blurb: "The switch closes at ten. Every house with a bulb. The Lamp's own tubes are on that circuit now; if it browns out, you'll know first.",
      script:
        "At ten o'clock tonight the Linemen close the switch at the relay and the Ridge Road line carries current to Dock Street. If you've got a bulb, you've screwed it in by now. If you haven't, go stand in the street at ten and look up at your neighbor's window. Sixty years. I'll be right here. I'll tell you when.",
      effects: { morale: 6, trust: { linemen: 5 } },
      helps: 'linemen',
    },
    {
      id: 'news_brownout', kind: 'news', truth: 'true', title: 'The test that didn\'t run',
      source: 'Pruitt, by note, terse',
      blurb: "The Linemen never got their test window. Pruitt's note says the switch-on goes ahead anyway tonight, untested, and that the Lamp should expect to flicker.",
      gate: { requires: ['n5_stayed_on'] },
      script:
        "A note from the Ridge Road crew. The switch-on goes ahead at ten tonight without the test they wanted. The note says, and I'm reading it as written, 'Expect the Lamp to flicker. Expect worse. You had your chance.' I did. Here we are.",
      effects: { morale: -3, safety: -3, trust: { linemen: -2 } },
      grim: true,
    },
    {
      id: 'news_tom_switch', kind: 'news', truth: 'true', title: 'Tom Pruitt on the switch',
      source: 'the Linemen',
      blurb: "The man who used to call with no name has the switch tonight. His brother asked for him. The crew agreed. Eventually.",
      gate: { requires: ['n5_anon_named'] },
      script:
        "The hand on the switch tonight at ten belongs to Tom Pruitt. You know him. He used to call this station with no name, and then he gave it, and his brother asked the crew to let him close the switch, and the crew said yes. It took them a while. Tom says he's not nervous. Tom is lying, and this time I don't mind.",
      effects: { morale: 4, trust: { linemen: 3 }, credibility: 2 },
      helps: 'linemen',
    },
    {
      id: 'news_last', kind: 'news', truth: 'true', title: 'What the Lamp was for',
      source: 'you',
      blurb: "Your own words, for the last night the Lamp is the only light. You don't have to read it. You might want to.",
      script:
        "I want to say something while it's still just me on this frequency. For six nights this station has been the only thing on the shore that stayed lit, and that was never because of the tubes. It was because you kept the set on. Whatever comes on after me tonight, that part was true. Thank you for listening. Here's a record.",
      effects: { credibility: 5, morale: 5, listeners: 10, trust: { netters: 2, chapel: 2, linemen: 2 } },
    },

    // ── Warnings ─────────────────────────────────────────────
    {
      id: 'warn_evac_chapel', kind: 'warning', title: 'Dock Street: up the hill',
      blurb: "The ice is coming over the breakwater around one. Sister Agnes has the Chapel doors open. Dock Street should go up Church Road, now, on foot, and leave the boats.",
      script:
        "Dock Street, listen to me. The ice is going to come over the breakwater tonight around one, and it's going to come into the houses. The Chapel doors are open. Take the children and the old people and go up Church Road now, on foot, and leave the boats. The boats are boats. Go up the hill.",
      effects: { safety: 8, morale: -4 },
      grim: true,
      helps: 'chapel',
      reach: {
        faction: 'netters',
        threshold: 0.45,
        success: {
          flag: 'n6_went_up', tone: 'good',
          effects: { safety: 8, trust: { netters: 6, chapel: 6 } },
          line: 'Dock Street went up Church Road with lanterns and children and dogs and one goat. The Chapel was full by midnight. The ice came in at ten past one and found the houses empty.',
        },
        fail: {
          flag: 'n6_evac_unheard', tone: 'bad',
          effects: { morale: -4 },
          line: 'You told Dock Street to go up the hill, but the Lamp was half static that hour. Some went. Some stood on the breakwater looking at the ice until it was too late to look at anything.',
        },
        unaired: { flag: 'n6_evac_unaired', tone: 'neutral', effects: {}, line: '' },
      },
    },
    {
      id: 'warn_evac_breakwater', kind: 'warning', title: 'Dock Street: to the boats',
      blurb: "The harbor master's plan: get everyone down to the breakwater to hold the boats off the ice. Every man and woman. The boats are the town's living. He's not wrong about that.",
      script:
        "Dock Street, the harbor master's asked for every hand at the breakwater tonight to hold the boats off the ice when it comes. Every hull is a family's living, and if the ice takes the boats it takes the spring. Get down to the water with poles and rope. Hold the boats.",
      effects: { morale: 3, safety: -8, trust: { netters: 4 } },
      helps: 'netters',
      reach: {
        faction: 'netters',
        threshold: 0.45,
        success: {
          flag: 'n6_went_down', tone: 'bad',
          effects: { safety: -10, morale: -10, trust: { netters: -6, chapel: -8 } },
          line: 'Dock Street went down to the breakwater to hold the boats. At ten past one the ice came over the wall ten feet high. They saved four boats. They did not save everyone who was holding them.',
        },
        fail: {
          flag: 'n6_went_down_some', tone: 'bad',
          effects: { safety: -5, morale: -5 },
          line: 'You sent Dock Street to the breakwater, and the static kept some of them home. The ones who heard you were on the wall when the ice came over it.',
        },
        unaired: { flag: 'n6_breakwater_unaired', tone: 'neutral', effects: {}, line: '' },
      },
    },
    {
      id: 'warn_cut_line', kind: 'warning', title: 'Pull the switch before the water',
      blurb: "The Ridge Road line runs along Dock Street at head height. If the ice brings water into the street with the line live, the street is a wire. The Linemen can cut it. They'd be cutting their own lights.",
      script:
        "Linemen, this is the Lamp, and I'm asking for the thing you don't want to hear. When the ice comes over the breakwater there'll be water in Dock Street, and the line runs down Dock Street live. Pull the switch before one. Put the lights out. You can close it again at dawn. Please.",
      effects: { safety: 6, morale: -3, trust: { linemen: -4 } },
      grim: true,
      helps: 'linemen',
      reach: {
        faction: 'linemen',
        threshold: 0.4,
        success: {
          flag: 'n6_line_cut', tone: 'good',
          effects: { safety: 8, trust: { linemen: 3, chapel: 4 } },
          line: 'At ten to one the Linemen pulled the switch on their own line and Dock Street went dark again. The water came into the street at ten past, and nothing in it was live.',
        },
        fail: {
          flag: 'n6_line_live', tone: 'bad',
          effects: { safety: -8 },
          line: "You asked the Linemen to pull the switch and the static ate it. The line was live when the water came into Dock Street.",
        },
        unaired: { flag: 'n6_line_live', tone: 'neutral', effects: {}, line: '' },
      },
    },

    // ── Ads ──────────────────────────────────────────────────
    {
      id: 'ad_oil', kind: 'ad', sponsor: "Doc Hessler's", title: "Doc Hessler's lamp oil",
      blurb: "Pays 6 chits. Doc wants you to say the electric won't last and everybody should stock his lamp oil. Tonight of all nights.",
      script:
        "Doc Hessler asks me to remind you that electric light is a fad, bulbs burn out, wires come down, and a bottle of Doc's lamp oil never let anybody down. Half price tonight only, while the Linemen are busy. Doc Hessler's: it was good enough for your grandmother.",
      effects: { chits: 6, trust: { linemen: -4 }, morale: -1 },
    },
  ],

  events: [
    {
      kind: 'switchboard', id: 'n6_board_dusk', at: { slot: 0, frac: 0.5 },
      lines: [
        {
          id: 'call_lottie_switch', person: 'lottie',
          name: 'Lottie Kowalczyk',
          prompt: "Lottie K. 'Walt's on the switch!'",
          patience: 20,
          preview: "Lamp! Lottie! Walt's on the crew at the relay tonight, he's got a hand on it, I'm so nervous I ate a whole fish.",
          script:
            "Hello, Lamp, it's Lottie, I just want everybody on the row to know my Walt is at the relay tonight with the switch crew and at ten o'clock when the lights come on that's partly my Walt. I've got a bulb in the kitchen. I've been looking at it all day. It's just sitting there. Hi, Walt!",
          aired: {
            flag: 'n6_lottie_aired', tone: 'good',
            effects: { morale: 3, trust: { linemen: 2, netters: 2 } },
            line: 'Lottie told the row about Walt and the switch, and the bulb in her kitchen. Half of smokehouse row went and looked at their bulbs.',
          },
          cut: {
            flag: 'n6_lottie_cut', tone: 'bad',
            effects: { morale: -2, trust: { netters: -2 } },
            line: 'You cut Lottie off on the night of the lights. She has decided to forgive you. She says so, a lot.',
          },
          after: "Lottie's bulb, Dock Street. Ten o'clock. Everybody look.",
        },
        {
          id: 'call_agnes_doors', person: 'agnes',
          name: 'Sister Agnes',
          prompt: 'Sister Agnes. calm',
          gate: { requires: ['n5_agnes_aired'] },
          patience: 20,
          preview: "Sister Agnes. The Chapel doors are open tonight, all night, for anybody from Dock Street. I'd like that said before the weather.",
          script:
            "This is Sister Agnes. Twice now I've called the radio. The Chapel doors are open tonight and they stay open, with soup and blankets and the stove lit, for anybody from Dock Street who'd rather not be on Dock Street when the ice comes. Bring the children first. We've room for all of it. Come up before it's dark on the road.",
          aired: {
            flag: 'n6_agnes_doors', tone: 'good',
            effects: { safety: 4, trust: { chapel: 5 } },
            line: 'Sister Agnes opened the Chapel on the air before the ice came. Families started up Church Road while the lights were still on.',
          },
          cut: {
            flag: 'n6_agnes_cut', tone: 'bad',
            effects: { trust: { chapel: -8 }, safety: -3 },
            line: 'You cut Sister Agnes off before she finished saying the doors were open. Some of Dock Street never heard that they were.',
          },
          notTaken: {
            flag: 'n6_agnes_ignored', tone: 'neutral',
            effects: { trust: { chapel: -3 } },
            line: 'Sister Agnes rang about the doors and nobody picked up. She opened them anyway.',
          },
        },
        {
          id: 'call_amos_doors', person: 'amos',
          name: 'Brother Amos',
          prompt: 'Brother Amos. for Sister Agnes',
          gate: { unless: ['n5_agnes_aired'] },
          patience: 20,
          preview: "Brother Amos, calling for Sister Agnes, who won't. The Chapel doors are open tonight for Dock Street. She'd like that said.",
          script:
            "Brother Amos. Sister Agnes asked me to call because she won't, and I'm not to say why. The Chapel doors are open all night for anybody from Dock Street who'd rather be up the hill when the ice comes. Soup, blankets, the stove's lit. Bring the children first. And the stubs, if you've got them. Sorry. Habit.",
          aired: {
            flag: 'n6_agnes_doors', tone: 'good',
            effects: { safety: 4, trust: { chapel: 4 } },
            line: 'Brother Amos said the Chapel doors were open, for Sister Agnes. Families started up Church Road while the lights were still on.',
          },
          cut: {
            flag: 'n6_amos_cut', tone: 'bad',
            effects: { trust: { chapel: -5 }, safety: -3 },
            line: 'You cut Brother Amos off before the part about the doors. Some of Dock Street never heard that they were open.',
          },
        },
      ],
    },
    {
      kind: 'switchboard', id: 'n6_board_lights', at: { slot: 2, frac: 0.3 },
      lines: [
        {
          id: 'call_bill_ice', person: 'bill',
          name: 'Old Bill',
          prompt: 'Old Bill. not about the knee',
          urgent: true,
          patience: 16,
          preview: "Bill. Never mind the knee. I'm on the breakwater and the ice is standing up out there. It's coming over by one. Say it.",
          script:
            "Bill Wozniak, and never mind the knee, I'm on the breakwater with a lantern and the ice is standing up in sheets out past the light, two, three men high, and it's walking in on the wind. It comes over this wall by one o'clock. Anybody on Dock Street: don't be on Dock Street at one. That's not the knee. That's my eyes.",
          aired: {
            flag: 'n6_bill_ice', tone: 'good',
            effects: { safety: 5, trust: { netters: 5 }, morale: -2 },
            line: 'Bill called the ice from the breakwater with his own eyes, and for once nobody argued. Dock Street started moving.',
          },
          cut: {
            flag: 'n6_bill_cut', tone: 'bad',
            effects: { trust: { netters: -5 }, safety: -3 },
            line: 'You cut Bill off while he was watching the ice stand up. He put the phone down and went to bang on doors himself.',
          },
          notTaken: {
            flag: 'n6_bill_ignored', tone: 'bad',
            effects: { trust: { netters: -4 }, safety: -2 },
            line: 'Bill rang from the breakwater and the Lamp didn\'t pick up. He went and banged on doors himself. He is seventy-one.',
          },
        },
        {
          id: 'call_grace_switch', person: 'grace',
          name: 'Grace Okafor',
          prompt: 'Mrs. Okafor. happy, for once',
          gate: { unless: ['n4_teddy_hurt'] },
          patience: 16,
          preview: "It's Grace. Nothing's wrong. Teddy's at the relay with the crew, with his key, and I just wanted to tell somebody.",
          script:
            "It's Grace Okafor and nothing is wrong. Teddy is at the relay tonight with the Linemen, with his key, and they let him send the signal that it was time. He sent it. I heard it come through the Linemen's set, three letters, and then the lights. I don't know what the letters were. I wanted somebody to know he sent them.",
          aired: {
            flag: 'n6_grace_proud', tone: 'good',
            effects: { morale: 5, trust: { chapel: 3, linemen: 3 } },
            line: "Grace Okafor called the Lamp with nothing wrong, for the first time, to say her son sent the signal for the lights. Elm Street cheered. It was audible from the station.",
          },
          cut: {
            flag: 'n6_grace_cut', tone: 'bad',
            effects: { credibility: -3, trust: { chapel: -4 } },
            line: 'You cut Grace Okafor off on the one night she called happy.',
          },
        },
        {
          id: 'call_grace_window', person: 'grace',
          name: 'Grace Okafor',
          prompt: 'Mrs. Okafor. quiet',
          gate: { requires: ['n4_teddy_hurt'] },
          patience: 16,
          preview: "It's Grace. Teddy's at the window with his hands in his lap, watching for the lights. He asked me to call. He can't hold the phone.",
          script:
            "It's Grace Okafor. Teddy's at the window with his hands in his lap, waiting for ten o'clock. He can't hold the phone yet so I'm holding it. He says to tell the Linemen he's watching, and to tell them he'd have been at the relay if he could, and to say the switch should be closed slow, not fast, because that's what they taught him. I don't know what that means. He does.",
          aired: {
            flag: 'n6_grace_window', tone: 'good',
            effects: { morale: 4, trust: { chapel: 3, linemen: 2 } },
            line: 'Grace held the phone for Teddy and told the Linemen to close the switch slow. They closed it slow.',
          },
          cut: {
            flag: 'n6_grace_cut', tone: 'bad',
            effects: { credibility: -4, trust: { chapel: -5 } },
            line: 'You cut Grace off while she was speaking for her son. There was no reason good enough.',
          },
        },
        {
          id: 'call_doc_oil', person: 'doc',
          name: 'Doc Hessler',
          prompt: 'Doc Hessler. selling',
          patience: 14,
          preview: "Doc here. Put me on before ten, I've got a lot of lamp oil and about forty minutes to sell it.",
          script:
            "Doc Hessler, and I'll be quick, the lights are coming on and I've got sixty bottles of lamp oil to move. Half price. Electricity's a fad. And listen, if the ice comes tonight, don't go up that hill, the Chapel's full already, I've seen it, stay in your houses with a lamp. Doc Hessler's. Dock Street. I'm not going anywhere.",
          aired: {
            flag: 'n6_doc_stay', tone: 'bad',
            effects: { chits: 6, safety: -6, trust: { chapel: -4 } },
            line: "Doc Hessler told Dock Street on your air to stay in their houses with a lamp. Some did. Doc himself was up the hill by midnight.",
          },
          turn: {
            at: "don't go up that hill",
            caught: {
              flag: 'n6_doc_dumped', tone: 'good',
              effects: { credibility: 3, safety: 2, chits: -1 },
              line: 'You dumped Doc Hessler the moment he told people to stay off the hill. He says the Lamp owes him a chit. The Lamp does not.',
            },
          },
        },
      ],
    },
    {
      kind: 'switchboard', id: 'n6_board_ice', at: { slot: 4 },
      lines: [
        {
          id: 'call_harbor', person: 'harbor',
          name: 'Casimir Nowak',
          prompt: 'the harbor master. ordering',
          urgent: true,
          patience: 10,
          preview: "Nowak, harbor master. I need every hand at the breakwater now, the ice is at the wall. Say it. Don't argue with me, say it.",
          script:
            "This is Casimir Nowak, harbor master, and I'm giving an order. Every man and woman on Dock Street to the breakwater, now, with poles. The ice is at the wall and the boats are in the basin and if we lose the boats we lose the spring. Say it, Lamp. You've said worse.",
          aired: {
            faction: 'netters',
            threshold: 0.4,
            success: {
              flag: 'n6_went_down', tone: 'bad',
              effects: { safety: -8, morale: -6, trust: { netters: -4, chapel: -6 } },
              line: 'The harbor master ordered Dock Street to the breakwater, through you, and some of them went. The ice came over the wall ten feet high at ten past one. They saved three boats.',
            },
            fail: {
              flag: 'n6_harbor_static', tone: 'neutral',
              effects: {},
              line: "The harbor master's order went out into static. Almost nobody heard it. For once, the static was on your side.",
            },
          },
          cut: {
            flag: 'n6_harbor_cut', tone: 'neutral',
            effects: { trust: { netters: -3 }, safety: 3 },
            line: "You dumped the harbor master while he was ordering people to the wall. He'll never forgive you. Several families will.",
          },
          notTaken: {
            flag: 'n6_harbor_ignored', tone: 'neutral',
            effects: { trust: { netters: -2 }, safety: 2 },
            line: "The harbor master rang the Lamp with an order and the Lamp didn't pick up. He gave it from the breakwater with a bullhorn instead. Fewer heard it.",
          },
        },
        {
          id: 'call_tom_line', person: 'anon',
          name: 'Tom Pruitt',
          prompt: 'Tom Pruitt. from the relay',
          gate: { requires: ['n5_anon_named'] },
          urgent: true,
          patience: 10,
          preview: "Tom Pruitt, at the relay. If there's water in Dock Street with this line live, people die. Tell me to pull it and I'll pull it. I need someone to say it.",
          script:
            "Tom Pruitt, at the relay. The line runs down Dock Street at head height and it's live and there's going to be water in that street inside the hour. If I pull the switch the lights go out, all of them, the first night. If I don't, that street's a wire. I've got my hand on it. Somebody tell me.",
          aired: {
            faction: 'linemen',
            threshold: 0.3,
            success: {
              flag: 'n6_line_cut', tone: 'good',
              effects: { safety: 8, trust: { linemen: 4, chapel: 4 } },
              line: "Tom Pruitt asked the town, through you, whether to pull the switch. The town said pull it. At ten to one Dock Street went dark on purpose, and the water that came in at ten past wasn't live.",
            },
            fail: {
              flag: 'n6_line_live', tone: 'bad',
              effects: { safety: -8 },
              line: 'Tom Pruitt asked whether to pull the switch and the static took the answer. He kept his hand on it and waited, and the water came into Dock Street live.',
            },
          },
          cut: {
            flag: 'n6_tom_cut', tone: 'bad',
            effects: { trust: { linemen: -6 }, safety: -4 },
            line: 'You cut Tom Pruitt off with his hand on the switch. He pulled it anyway, late, with the water already in the street.',
          },
          notTaken: {
            flag: 'n6_tom_ignored', tone: 'bad',
            effects: { safety: -4 },
            line: "Tom Pruitt rang from the relay with his hand on the switch and nobody picked up. He pulled it at twenty past one. Late.",
          },
        },
        {
          id: 'call_pruitt_line', person: 'pruitt',
          name: 'Pruitt',
          prompt: 'Pruitt. from the relay',
          gate: { unless: ['n5_anon_named'] },
          urgent: true,
          patience: 10,
          preview: "Pruitt, at the relay. Water in Dock Street with the line live is a wire. Tell me to pull it. Somebody has to say it on the air.",
          script:
            "Pruitt, at the relay. The line runs down Dock Street at head height, live, and there's going to be water in that street inside the hour. I pull the switch, the lights go out on the first night. I don't, the street's a wire. My hand's on it. Say it, Lamp. One way or the other.",
          aired: {
            faction: 'linemen',
            threshold: 0.3,
            success: {
              flag: 'n6_line_cut', tone: 'good',
              effects: { safety: 8, trust: { linemen: 3, chapel: 4 } },
              line: 'Pruitt asked, through you, whether to pull the switch, and the town said pull it. At ten to one Dock Street went dark on purpose. The water that came in at ten past wasn\'t live.',
            },
            fail: {
              flag: 'n6_line_live', tone: 'bad',
              effects: { safety: -8 },
              line: 'Pruitt asked whether to pull the switch and the static took the answer. He waited. The water came into Dock Street live.',
            },
          },
          cut: {
            flag: 'n6_pruitt_cut3', tone: 'bad',
            effects: { trust: { linemen: -6 }, safety: -4 },
            line: 'You cut Pruitt off with his hand on the switch. He pulled it anyway, late.',
          },
          notTaken: {
            flag: 'n6_pruitt_ignored', tone: 'bad',
            effects: { safety: -4 },
            line: 'Pruitt rang from the relay with his hand on the switch and nobody picked up. He pulled it at twenty past one. Late.',
          },
        },
      ],
    },
    { kind: 'tube', id: 'n6_tube_a', at: { slot: 1, frac: 0.6 }, socket: 4 },
    { kind: 'tube', id: 'n6_tube_b', at: { slot: 3, frac: 0.4 }, socket: 1 },
    {
      kind: 'morse', id: 'n6_morse_hill', at: { slot: 5 }, word: 'HILL', seconds: 40, sender: 'teddy',
      gate: { unless: ['n4_teddy_hurt'] },
      decoded: {
        flag: 'n6_hill_keyed', tone: 'good',
        effects: { morale: 3, safety: 2 },
        line: 'H-I-L-L, from the relay, over and over while the water came in. Teddy Okafor, fourteen, signalman, telling anybody who could read it where to go. Some could.',
      },
      missed: {
        flag: 'n6_hill_missed', tone: 'neutral',
        effects: {},
        line: 'Four letters from the relay in the small hours, over and over. Nobody at the station copied them.',
      },
    },
    {
      kind: 'morse', id: 'n6_morse_other', at: { slot: 5 }, word: 'HULLS', seconds: 40,
      gate: { requires: ['n4_teddy_hurt'] },
      decoded: {
        flag: 'n6_boats_keyed', tone: 'eerie',
        effects: {},
        line: 'Five letters under the static at three, keyed slow and even: H-U-L-L-S. Teddy\'s hands were in his lap. Nobody at the relay touched the wire.',
      },
      missed: {
        flag: 'n6_boats_missed', tone: 'neutral',
        effects: {},
        line: 'Something keyed five letters under the static at three, slow. Nobody copied it.',
      },
    },
    {
      kind: 'storm', id: 'n6_storm', slots: [3, 4, 5], wind: 1.6,
      held: {
        line: 'The worst wind in ten years, and the thing under the dial pushing the other way, and you held twelve-sixty through all of it. Dock Street heard the Lamp when it needed to.',
        effects: { credibility: 6, listeners: 8 },
      },
      lost: {
        line: 'The wind took the Lamp off twelve-sixty in the worst hour and the thing underneath came up through it, clear as a bell, in your voice. Dock Street did what it said.',
        effects: { listeners: -10, credibility: -6 },
      },
    },
  ],

  otherStation: {
    prefer: ['warn_evac_breakwater', 'warn_evac_chapel', 'warn_cut_line', 'ad_oil', 'news_last', 'news_tonight', 'news_brownout', 'news_tom_switch'],
    intro: 'This is the Lamp. Twelve-sixty.',
    stamp: 'Tonight. Two-fourteen in the morning.',
    outro: "Goodnight, Port Vesper. We'll be listening.",
    readsDumped: true,
    readsAll: true,
    intrusions: [
      { kind: 'carrier', id: 'n6_carrier', slots: [3, 4, 5] },
      { kind: 'override', id: 'n6_override', at: { slot: 1, frac: 0.5 }, seconds: 20 },
      { kind: 'climax', id: 'n6_climax', at: { slot: 4, frac: 0.35 }, seconds: 45, card: 'warn_evac_breakwater', counter: 'warn_evac_chapel' },
    ],
  },

  letter: {
    body:
      "To the Lamp. It's the listener from Dock Street, the one who wrote the first time. We're at the Chapel. " +
      "The house is gone, or it's full of ice, which is the same. I had the little set in my coat and I left it on " +
      "after you signed off, like the first night. At fourteen past two it said, \"{quote}\" And then it said " +
      "goodnight, and then there was nothing on twelve-sixty, nothing at all, for the first time in six nights. " +
      "My husband says I dreamed the whole week. I didn't. Thank you for the kettle.",
    from: 'a listener, formerly of Dock Street',
  },

  letters: [
    {
      gate: { requires: ['n6_other_silent'] },
      body:
        "To the Lamp. It's the listener from Dock Street, the one who wrote the first time. We're at the Chapel. " +
        "I had the little set in my coat and I left it on after you signed off, like the first night. At fourteen " +
        "past two there was nothing. I mean nothing: not static, not a voice. Just the frequency, open, like a door " +
        "with nobody in it. I sat and listened to it until the stove went out. My husband says I dreamed the whole " +
        "week. I didn't. Thank you for the kettle.",
      from: 'a listener, formerly of Dock Street',
    },
  ],

  classifieds: [],

  dawnLines: [
    {
      gate: { requires: ['n6_went_up'], unless: ['n6_went_down'] },
      tone: 'good', flag: 'n6_dock_saved',
      effects: { morale: 8 },
      line: 'Everybody who lived on Dock Street woke up on the Chapel floor. All of them. The goat too.',
    },
    {
      gate: { requires: ['n6_went_up', 'n6_went_down'] },
      tone: 'neutral', flag: 'n6_dock_split',
      effects: { morale: -4 },
      line: 'Two voices sent Dock Street two ways. Most went up the hill. The ones who went to the wall are the ones the Chapel is praying for by name this morning.',
    },
    {
      gate: { unless: ['n6_went_up', 'n6_went_down'] },
      tone: 'bad', flag: 'n6_dock_stayed',
      effects: { morale: -8, safety: -6 },
      line: 'Nobody told Dock Street where to go, so Dock Street stayed. The ice came into the houses at ten past one. They got out through windows. Most of them.',
    },
    {
      gate: { requires: ['n6_line_live', 'n6_went_down'] },
      tone: 'bad', flag: 'n6_line_deaths',
      effects: { morale: -10, safety: -10, trust: { linemen: -12 } },
      line: 'The Ridge Road line was live when the water came into Dock Street. Nobody is saying the number yet. The Linemen pulled the switch at twenty past one and have not closed it since.',
    },
    {
      gate: { requires: ['n6_line_cut'], unless: ['n6_went_down'] },
      tone: 'good',
      line: 'The lights were on for two hours and fifty minutes, and then the Linemen put them out on purpose to save the street. Nobody on Dock Street has stopped talking about either half of that.',
    },
    {
      gate: { requires: ['n6_jammed'] },
      tone: 'eerie',
      line: 'For forty seconds in the worst of it, twelve-sixty was dead air. Not you, not the other one. Just the carrier, held, with both hands. Then you came back.',
    },
    {
      gate: { requires: ['n6_countered'] },
      tone: 'eerie',
      line: 'For forty seconds there were two Lamps on twelve-sixty saying opposite things in the same voice. Dock Street had to choose which one it believed. It mostly chose the one with the kettle.',
    },
    {
      gate: { requires: ['n6_carried'] },
      tone: 'eerie',
      line: 'At the worst moment the other one took the frequency and you let it. It said what you hadn\'t. Dock Street did what it said.',
    },
  ],

  headlines: [
    { gate: { requires: ['n6_dock_saved', 'n6_line_cut'] }, text: 'DOCK STREET WENT UP THE HILL', sub: 'The lights came on, and then the Linemen put them out to save the street. Everyone woke up at the Chapel.' },
    { gate: { requires: ['n6_dock_saved'] }, text: 'DOCK STREET WENT UP THE HILL', sub: 'Everyone off the street before the ice. The line stayed live and the water found it, and the houses were empty.' },
    { gate: { requires: ['n6_line_deaths'] }, text: 'THE STREET WAS A WIRE', sub: 'They went to the wall to hold the boats, and the Ridge Road line was live when the water came.' },
    { gate: { requires: ['n6_dock_split'] }, text: 'TWO LAMPS, TWO ROADS', sub: 'Half of Dock Street went up Church Road. Half went to the breakwater. Both were told to by the same voice.' },
    { gate: { requires: ['n6_went_down'] }, text: 'THEY HELD THE BOATS', sub: 'Dock Street went to the breakwater with poles. The ice came over the wall ten feet high.' },
    { gate: { requires: ['n6_dock_stayed'] }, text: 'THE ICE CAME IN', sub: 'Nobody said where to go. Dock Street stayed home and the lake came through the windows.' },
    { gate: {}, text: 'THE LAMP STAYED ON', sub: 'Six nights. One voice, and then two. The town is still here.' },
  ],

  rundowns: {
    auto: ['news_tonight', 'rec_harris2', 'warn_cut_line', 'rec_sweetheart2', 'warn_evac_chapel', 'rec_cradle2'],
    demo: ['ad_oil', 'rec_hymn2', 'news_tonight', 'rec_harris2', 'warn_evac_breakwater', 'rec_sweetheart2'],
  },
};
