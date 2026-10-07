// Night 4 in Port Vesper: The Freeze. The lake locked overnight. A boat is overdue, and
// the relay hut at the point either got moved on Night 3 or it didn't. Two warnings
// contradict each other, and the Other Station will read whichever one you don't.
// Scripts are read aloud, so write for the ear.

import type { NightDef } from '../sim/types';

/** Which boat is overdue depends on who the earlier nights left on the water. */
const OSTROWSKI = { requires: ['n1_boat_lost'] };
const KAMINSKI = { requires: ['n2_squall_caught'], unless: ['n1_boat_lost'] };
const WOZNIAK = { unless: ['n1_boat_lost', 'n2_squall_caught'] };

export const NIGHT_4: NightDef = {
  id: 'night4',
  number: 4,

  signOn:
    "Good evening, Port Vesper. W-L-M-P, twelve-sixty, the Lamp. The lake froze last night from the breakwater to as far as I can see, and it did it in about four hours. The kettle's on. If you're out there, come in.",

  signOff:
    "That's the Lamp. Bank the stove and keep the kettle full, and if you hear me again tonight, check for the kettle. Goodnight, Port Vesper.",

  cards: [
    // ── Records ──────────────────────────────────────────────
    {
      id: 'rec_moonlight2', kind: 'record', recordId: 'moonlight_bay', title: 'Moonlight Bay',
      blurb: "The barbershop quartet again. The Netters say it's the song the boats come home to. Tonight that's not a figure of speech.",
      mood: 'bright', loves: ['netters'],
    },
    {
      id: 'rec_rock', kind: 'record', recordId: 'rock_of_ages', title: 'Rock of Ages',
      blurb: 'Four voices and a pump organ. The Chapel plays it when somebody is out on the water and not back.',
      mood: 'stirring', loves: ['chapel'], dislikes: ['linemen'],
    },
    {
      id: 'rec_over', kind: 'record', recordId: 'over_there', title: 'Over There',
      blurb: 'Caruso, 1918, singing a war song like an opera. It gets people out of chairs. That might be what you want tonight.',
      mood: 'stirring', loves: ['linemen', 'netters'],
    },
    {
      id: 'rec_tiger', kind: 'record', recordId: 'tiger_rag', title: 'Tiger Rag',
      blurb: "The side you bought at the yard. Hot as a stove. The Chapel will write a letter.",
      gate: { requires: ['owns_tiger_rag'] },
      mood: 'bright', loves: ['linemen'], dislikes: ['chapel'],
    },
    {
      id: 'rec_kathleen', kind: 'record', recordId: 'kathleen', title: "I'll Take You Home Again, Kathleen",
      blurb: "Bill's record, with the chip at the edge. Everybody's mother sang it. Half of them are still crying.",
      gate: { requires: ['owns_kathleen'] },
      mood: 'blue', loves: ['netters', 'chapel'],
    },

    // ── News ─────────────────────────────────────────────────
    {
      id: 'news_freeze', kind: 'news', truth: 'true', title: 'The lake locked overnight',
      source: 'your own window',
      blurb: 'Ice from the breakwater to the horizon in four hours. Anyone who was out when it came is out still.',
      script:
        "The lake froze last night. Not the harbor, the lake. From the breakwater out as far as the lighthouse beam goes, white and flat and silent, in about four hours. I've never seen it do that. Bill says he has, once, when he was nine. He says it didn't end well then either.",
      effects: { safety: 2, morale: -4 },
      grim: true,
    },
    {
      id: 'news_overdue_o', kind: 'news', truth: 'true', title: 'The Ostrowski boat is overdue',
      source: 'the harbor master',
      blurb: "Jan Ostrowski went out before the freeze and hasn't come in. Henryk's boy. Nineteen. Alone.",
      gate: OSTROWSKI,
      script:
        "Jan Ostrowski took his father's boat out yesterday afternoon, before the ice, and he hasn't come in. He's nineteen and he's alone and he's somewhere out there in the white. His mother is on the dock. She has been since dark. If you're out there, Jan, keep a lantern lit. We're looking.",
      effects: { morale: -4, trust: { netters: 4 } },
      grim: true,
      helps: 'netters',
    },
    {
      id: 'news_overdue_k', kind: 'news', truth: 'true', title: 'The Kaminski boat is overdue',
      source: 'the harbor master',
      blurb: "The Kaminskis went out after herring with a cracked mast and haven't come in. Ewa's brother and two others.",
      gate: KAMINSKI,
      script:
        "The Kaminski boat went out yesterday after the herring, cracked mast and all, and it hasn't come in. Three men. Ewa Kaminski's brother is one of them. She's on the dock with a lantern and she won't come up to the station. If you're out there, keep a light burning. We're looking.",
      effects: { morale: -4, trust: { netters: 4 } },
      grim: true,
      helps: 'netters',
    },
    {
      id: 'news_overdue_w', kind: 'news', truth: 'true', title: 'The Wozniak boat is overdue',
      source: 'the harbor master',
      blurb: "Bill's nephews took the boat north yesterday and the ice came before they did.",
      gate: WOZNIAK,
      script:
        "The Wozniak boat is overdue. Bill's two nephews, the same two who drifted out on the shanty, took the boat north yesterday and the ice came in behind them. Bill is on the dock. He says his knee says they're fine. He's holding it while he says it. If you're out there, boys, keep a lantern lit.",
      effects: { morale: -4, trust: { netters: 4 } },
      grim: true,
      helps: 'netters',
    },
    {
      id: 'news_bees_truth', kind: 'news', truth: 'true', title: 'What killed the bees',
      source: 'a Lineman who keeps hives',
      blurb: "A Lineman went up to the Chapel garden and opened the dead hives. Frozen, he says. Nothing to do with the wire.",
      gate: { requires: ['aired_news_bees'] },
      script:
        "About the Chapel bees. A Lineman who keeps his own hives went up to the garden and opened Brother Amos's. He says the cold got them, a week before the line went live. Not the current. I said otherwise on this station, and I'm saying this now, and I'll leave it to you which you believe.",
      effects: { credibility: 3, trust: { linemen: 4, chapel: -2 } },
      helps: 'linemen',
    },
    {
      id: 'news_agnes_sulfa', kind: 'news', truth: 'true', title: 'Sister Agnes opens the cupboard',
      source: 'Sister Agnes, in person',
      blurb: "You said she was hoarding sulfa. She opened the altar cupboard for anyone who asked. She would like you to say what was in it.",
      gate: { requires: ['aired_news_sulfa'] },
      script:
        "Last week I told you the Chapel had sulfa under the altar. Sister Agnes opened the cupboard to anybody who climbed the hill, and I climbed it. Hymnals, a mousetrap, and a jar of honey. The honey was for me. That's what was in it.",
      effects: { credibility: 4, trust: { chapel: 6, linemen: -2 } },
      helps: 'chapel',
    },
    {
      id: 'news_frost_cure', kind: 'news', truth: 'false', title: "Doc Hessler's tonic for frostbite",
      source: 'Doc Hessler, paying twelve',
      blurb: "Doc will pay twelve chits for you to say his tonic brings back frozen fingers. Twelve. On a night people will have frozen fingers.",
      script:
        "Doc Hessler asked me to read this and he's paying for it. He says his Lake Tonic, rubbed on and taken by the spoon, brings the blood back into frozen fingers and toes, and that the Chapel's way, warm water and waiting, is for people who like losing toes. His words. Doc's on Dock Street. Twelve chits says he is.",
      hedge:
        "Doc Hessler is paying this station twelve chits to tell you his tonic cures frostbite. I'll say he's paying. I won't say it works. If your fingers are white, go up the hill to Sister Agnes and put them in warm water, not vinegar.",
      effects: { chits: 12, safety: -5, trust: { chapel: -6 }, listeners: 5 },
      unravel: {
        credibility: -12,
        line: "Two Netters rubbed Doc's tonic on frostbite instead of walking up the hill. One of them will keep nine fingers. Sister Agnes didn't call. She didn't have to.",
      },
    },

    // ── Warnings ─────────────────────────────────────────────
    {
      id: 'warn_stayin', kind: 'warning', title: 'All boats stay in',
      blurb: 'The ice is new and thin past the breakwater. Every boat that goes out tonight is another boat to look for.',
      script:
        "Netters, this is the Lamp. Nobody goes out on that ice tonight. Not for herring, not for anybody. It's four hours old and it'll hold a gull and not much else. I know who's out there. I know. Stay in till light, and we'll go together.",
      effects: { safety: 5, morale: -3 },
      grim: true,
      helps: 'netters',
      reach: {
        faction: 'netters',
        threshold: 0.5,
        success: {
          flag: 'n4_boats_in', tone: 'neutral',
          effects: { safety: 4, trust: { netters: 2 } },
          line: 'Every boat stayed tied up through the night. Nobody else went through the ice. Nobody went looking, either.',
        },
        fail: {
          flag: 'n4_boats_in_unheard', tone: 'neutral',
          effects: {},
          line: 'You told the boats to stay in, but the static had the Lamp that hour. Two went out anyway, slow, with poles.',
        },
        unaired: { flag: 'n4_stayin_unaired', tone: 'neutral', effects: {}, line: '' },
      },
    },
    {
      id: 'warn_search', kind: 'warning', title: 'Search at first light, in pairs',
      blurb: "The opposite of staying in. Boats out at first light, two by two, with poles and rope, to look for the overdue boat.",
      script:
        "Netters. First light, whoever has a boat and a pole, meet at the breakwater. Pairs, roped together, nobody alone, nobody past the second buoy without a line back. We're going out on the ice to find our people. Dress for it.",
      effects: { morale: 4, safety: -3 },
      helps: 'netters',
      reach: {
        faction: 'netters',
        threshold: 0.5,
        success: {
          flag: 'n4_search', tone: 'good',
          effects: { trust: { netters: 6 } },
          line: 'At first light there were eleven boats at the breakwater and a hundred feet of rope. The search went out in pairs.',
        },
        fail: {
          flag: 'n4_search_unheard', tone: 'bad',
          effects: { trust: { netters: -2 } },
          line: 'You called for a search at first light and most of the Netters never heard it. Three boats went out on their own, unroped.',
        },
        unaired: { flag: 'n4_search_unaired', tone: 'neutral', effects: {}, line: '' },
      },
    },

    // ── Ads ──────────────────────────────────────────────────
    {
      id: 'ad_candles2', kind: 'ad', sponsor: 'Brother Amos', title: 'Candles for the freeze',
      blurb: 'Pays 5 chits. Brother Amos again, bees or no bees. Candles for every window on Dock Street tonight.',
      script:
        "Brother Amos and the Chapel bees, what's left of them, have candles for the freeze. One chit a pair tonight, and free to any house with a boat out. Put one in the window facing the lake. Brother Amos says it's so they can find their way. He also says please return the stubs.",
      effects: { chits: 5, morale: 2, trust: { chapel: 3 } },
    },
  ],

  events: [
    {
      kind: 'switchboard', id: 'n4_board_dusk', at: { slot: 1, frac: 0.5 },
      lines: [
        {
          id: 'call_doc', person: 'doc',
          name: 'Doc Hessler',
          prompt: 'Doc Hessler. wants to go live',
          preview: "Lamp! It's Doc. Put me on, I'll do the tonic myself, save you reading it. Trust me.",
          script:
            "Evening, Port Vesper, it's Doc Hessler, and I'll keep it short because it's cold. Frozen fingers, frozen toes, that white numb feeling: Doc Hessler's Lake Tonic, rubbed in hard and taken by the spoon. Don't bother with the hill. Throw away your sulfa and your warm water and your prayers and buy a bottle. I'm on Dock Street.",
          aired: {
            flag: 'n4_doc_aired', tone: 'bad',
            effects: { chits: 10, safety: -4, trust: { chapel: -5 } },
            line: "Doc Hessler told the town, live on your air, to throw away their sulfa. He paid you ten chits for it. By noon there was a line outside his door and a shorter one at the infirmary.",
          },
          turn: {
            at: 'Throw away your sulfa',
            caught: {
              flag: 'n4_doc_dumped', tone: 'good',
              effects: { credibility: 3, trust: { chapel: 4 }, chits: -2 },
              line: "You dumped Doc Hessler the second he told people to throw away their medicine. He wants his two chits back. The Chapel sent down a loaf.",
            },
          },
          notTaken: {
            flag: 'n4_doc_ignored', tone: 'neutral',
            effects: {},
            line: 'Doc Hessler rang and rang. Doc will be back. Doc is always back.',
          },
        },
        {
          id: 'call_walt', person: 'walt',
          name: 'Walt Kowalczyk',
          prompt: 'Walt K. gruff, embarrassed',
          gate: { requires: ['n3_walt_song'] },
          preview: "It's Walt. Kowalczyk. Lottie made me call. About the song.",
          script:
            "This is Walt Kowalczyk. Lottie says I have to say thank you on the air for the song, so: thank you. Also I do not sing in the bath. Also, for the Netters, we've got a crew at the point tonight with a spotlight, and we'll swing it over the ice every ten minutes. If you're out there, wave at it.",
          aired: {
            flag: 'n4_walt_spotlight', tone: 'good',
            effects: { morale: 3, trust: { linemen: 3, netters: 3 } },
            line: 'The Linemen swung a spotlight over the ice all night from the point. Walt still says he doesn\'t sing in the bath.',
          },
          cut: {
            flag: 'n4_walt_cut', tone: 'neutral',
            effects: { trust: { linemen: -2 } },
            line: 'You cut Walt Kowalczyk off before he got to the spotlight. Lottie has opinions about that.',
          },
        },
        {
          id: 'call_pruitt_thanks', person: 'pruitt',
          name: 'Pruitt',
          prompt: 'Pruitt, Ridge Road crew. short',
          gate: { requires: ['n3_hut_moved'], unless: ['n3_walt_song'] },
          preview: "Pruitt. Ridge Road. About the hut. I'm not saying thank you. I'm calling, is all.",
          script:
            "Pruitt, Ridge Road crew. Somebody told this station our relay hut was sitting in a foot of water, and we moved it, and I'm not going to ask who. For the Netters: we've a crew at the point tonight with a spotlight and we'll swing it over the ice every ten minutes. If you're out there, wave at it. That's all.",
          aired: {
            flag: 'n4_pruitt_spotlight', tone: 'good',
            effects: { trust: { linemen: 4, netters: 2 }, morale: 2 },
            line: "Pruitt put a spotlight on the ice from the point all night and didn't say thank you to anybody. The Linemen are calling that a thaw.",
          },
          cut: {
            flag: 'n4_pruitt_cut', tone: 'bad',
            effects: { trust: { linemen: -4 } },
            line: "You cut Pruitt off. He's not a man who calls twice.",
          },
        },
        {
          id: 'call_bill_freeze', person: 'bill',
          name: 'Old Bill',
          prompt: 'Old Bill. steadier than usual',
          preview: "Bill. It's about the ice. The knee's got something to say and for once I agree with it.",
          script:
            "Bill Wozniak. The knee says the ice holds till Thursday and then it goes all at once, and the knee has seen this before, in nineteen-whatever. So: anybody out there, the ice under you is good till Thursday. Walk home. Walk north to the point and the Linemen's light. Don't wait to be found.",
          aired: {
            flag: 'n4_bill_aired', tone: 'good',
            effects: { trust: { netters: 4 }, safety: 2, morale: 2 },
            line: "Bill told anybody out on the ice to walk for the point. Bill was right about Thursday, too. Bill is going to be impossible.",
          },
          cut: {
            flag: 'n4_bill_cut', tone: 'bad',
            effects: { trust: { netters: -3 } },
            line: 'You cut Old Bill off before the knee finished. Dock Street says the Lamp has stopped believing in science.',
          },
        },
      ],
    },
    {
      kind: 'switchboard', id: 'n4_board_small', at: { slot: 4 },
      lines: [
        {
          id: 'call_marta', person: 'marta',
          name: 'Marta Ostrowski',
          prompt: 'Marta Ostrowski. from the dock',
          gate: OSTROWSKI,
          urgent: true,
          patience: 12,
          preview: "It's Marta Ostrowski. I'm at the harbor master's. I need boats at first light and I need you to say so.",
          script:
            "This is Marta Ostrowski. My husband is under that ice and my son is on top of it, and I will not lose both to the same lake in one month. I need every boat with a pole at the breakwater at first light. If this station won't say it, I'll walk out there myself. I've got the rope already.",
          aired: {
            faction: 'netters',
            threshold: 0.5,
            success: {
              flag: 'n4_search', tone: 'good',
              effects: { trust: { netters: 6 }, morale: 2 },
              line: "Marta Ostrowski asked for boats and got them. Eleven at the breakwater at first light, roped in pairs, Marta in the first one.",
            },
            fail: {
              flag: 'n4_search_static', tone: 'bad',
              effects: { morale: -2 },
              line: "Marta Ostrowski asked for a search and the static took half of it. Four boats came. She went out anyway.",
            },
          },
          notTaken: {
            flag: 'n4_marta_ignored', tone: 'bad',
            effects: { trust: { netters: -5 }, morale: -3 },
            line: "Marta Ostrowski called the Lamp from the harbor master's office and nobody picked up. She walked out on the ice at dawn with a rope. Alone.",
          },
          cut: {
            flag: 'n4_marta_cut', tone: 'bad',
            effects: { trust: { netters: -6 }, credibility: -3 },
            line: "You cut Marta Ostrowski off in the middle of asking for her son. Dock Street will not forget that one.",
          },
        },
        {
          id: 'call_ewa_overdue', person: 'ewa',
          name: 'Ewa Kaminski',
          prompt: 'Ewa Kaminski. from the dock',
          gate: KAMINSKI,
          urgent: true,
          patience: 12,
          preview: "Ewa. I'm at the harbor master's. My brother's out there. I need boats at first light and I need you to say it.",
          script:
            "This is Ewa Kaminski. I told you about the east bay and the herring and now my brother is out there with the ice on top of him. I need boats with poles at the breakwater at first light. If this station won't say so I'll go out alone and you can read about it tomorrow.",
          aired: {
            faction: 'netters',
            threshold: 0.5,
            success: {
              flag: 'n4_search', tone: 'good',
              effects: { trust: { netters: 6 }, morale: 2 },
              line: 'Ewa Kaminski asked for boats and got them. Eleven at the breakwater at first light, roped in pairs, Ewa in the first one.',
            },
            fail: {
              flag: 'n4_search_static', tone: 'bad',
              effects: { morale: -2 },
              line: 'Ewa Kaminski asked for a search and the static took half of it. Four boats came. She went out anyway.',
            },
          },
          notTaken: {
            flag: 'n4_ewa_ignored', tone: 'bad',
            effects: { trust: { netters: -5 }, morale: -3 },
            line: "Ewa Kaminski called the Lamp from the harbor master's office and nobody picked up. She went out on the ice at dawn with a rope. Alone.",
          },
          cut: {
            flag: 'n4_ewa_cut', tone: 'bad',
            effects: { trust: { netters: -6 }, credibility: -3 },
            line: 'You cut Ewa Kaminski off while she was asking for her brother. Dock Street will not forget that one.',
          },
        },
        {
          id: 'call_bill_overdue', person: 'bill',
          name: 'Old Bill',
          prompt: 'Old Bill. not rambling',
          gate: WOZNIAK,
          urgent: true,
          patience: 12,
          preview: "Bill. My nephews. I need boats at first light and I'm asking you to say it, and I don't ask.",
          script:
            "Bill Wozniak. My nephews are out there, the same two fools, and I'm asking this station for boats with poles at the breakwater at first light. Roped. I don't ask for things. I'm asking. Say it, Lamp.",
          aired: {
            faction: 'netters',
            threshold: 0.5,
            success: {
              flag: 'n4_search', tone: 'good',
              effects: { trust: { netters: 6 }, morale: 2 },
              line: 'Bill asked for boats and got them. Eleven at the breakwater at first light, roped in pairs. Bill went in the first one and did not mention his knee.',
            },
            fail: {
              flag: 'n4_search_static', tone: 'bad',
              effects: { morale: -2 },
              line: 'Bill asked for a search and the static took half of it. Four boats came. He went out anyway.',
            },
          },
          notTaken: {
            flag: 'n4_bill_ignored', tone: 'bad',
            effects: { trust: { netters: -5 }, morale: -3 },
            line: "Bill Wozniak called the Lamp and asked for help, which Bill does not do, and nobody picked up. He went out on the ice at dawn with a rope.",
          },
          cut: {
            flag: 'n4_bill_cut2', tone: 'bad',
            effects: { trust: { netters: -6 }, credibility: -3 },
            line: 'You cut Bill off while he was asking for his nephews. Dock Street will not forget that one.',
          },
        },
        {
          id: 'call_sparky_point', person: 'sparky',
          name: 'Sparky',
          prompt: "Sparky, at the point. 'the kid'",
          gate: { requires: ['n3_hut_moved'] },
          patience: 12,
          preview: "Lamp, it's Sparky, I'm at the point with the kid, he's fine, he's doing something on the wire and I can't read it.",
          script:
            "Hey, Lamp, Sparky, at the relay hut with Teddy, we're fine, the relay's upstairs now and dry as a bone. Listen, the kid's been on the old telegraph key for an hour tapping the same thing over and over and I can't read it, I never learned. He says you can. He says listen under the static. So, listen under the static, I guess!",
          aired: {
            flag: 'n4_sparky_aired', tone: 'neutral',
            effects: { morale: 2, trust: { linemen: 2 } },
            line: "Sparky told the town, live, that Teddy was tapping something on the old wire and nobody at the point could read it. Half of Dock Street put their ear to the radio.",
          },
          cut: {
            flag: 'n4_sparky_cut', tone: 'neutral',
            effects: {},
            line: 'You cut Sparky off. Sparky did not notice for several minutes.',
          },
        },
        {
          id: 'call_grace_fire', person: 'grace',
          name: 'Grace Okafor',
          prompt: 'Mrs. Okafor. SCREAMING',
          gate: { unless: ['n3_hut_moved'] },
          urgent: true,
          patience: 12,
          preview: "The hut! The relay hut at the point, there's smoke, Teddy's in it, somebody GO!",
          script:
            "This is Grace Okafor, the relay hut at the point is on fire, I can see it from Elm Street, there's a glow, and Teddy is in that hut, he sleeps there, somebody who's near the point, please, GO, don't wait for me, I'm running.",
          aired: {
            faction: 'linemen',
            threshold: 0.3,
            success: {
              flag: 'n4_teddy_saved', tone: 'good',
              effects: { morale: 4, trust: { linemen: 4, chapel: 4 } },
              line: 'Two Linemen at the yard heard Grace on the air and ran the mile to the point. They pulled Teddy out of the relay hut with his coat smoking. He kept asking about the relay.',
            },
            fail: {
              flag: 'n4_teddy_hurt', tone: 'bad',
              effects: { morale: -6, trust: { linemen: -3, chapel: -3 } },
              line: 'Grace screamed for the point on your air and the static swallowed it. Teddy got himself out of the hut. His hands are wrapped to the elbow. The relay is gone.',
            },
          },
          notTaken: {
            flag: 'n4_teddy_hurt', tone: 'bad',
            effects: { morale: -7, credibility: -4, trust: { chapel: -5 } },
            line: "Grace Okafor rang the Lamp while the relay hut burned, and nobody picked up. Teddy got himself out. His hands are wrapped to the elbow. Grace isn't calling again.",
          },
          cut: {
            flag: 'n4_teddy_hurt', tone: 'bad',
            effects: { morale: -7, credibility: -6, trust: { chapel: -6 } },
            line: 'You dumped Grace Okafor while the relay hut was on fire with her son inside. Teddy got himself out. There is no version of this the town forgives.',
          },
        },
      ],
    },
    { kind: 'tube', id: 'n4_tube_a', at: { slot: 2, frac: 0.3 }, socket: 1 },
    { kind: 'tube', id: 'n4_tube_b', at: { slot: 5, frac: 0.3 }, socket: 2 },
    {
      kind: 'morse', id: 'n4_morse_north', at: { slot: 3 }, word: 'NORTH', seconds: 45, sender: 'teddy',
      gate: { requires: ['n3_hut_moved'] },
      decoded: {
        flag: 'n4_position', tone: 'good',
        effects: { morale: 2, trust: { linemen: 3 } },
        line: 'N-O-R-T-H, keyed from the relay hut at the point over and over, slow. Teddy Okafor had seen a lantern on the ice north of the second buoy and told the only way he knew how.',
      },
      missed: {
        flag: 'n4_position_missed', tone: 'neutral',
        effects: {},
        line: 'Something keyed five letters from the point in the small hours. Nobody copied it. Teddy says he saw a light.',
      },
    },
    {
      kind: 'morse', id: 'n4_morse_fire', at: { slot: 3 }, word: 'FIRE', seconds: 40, sender: 'teddy',
      gate: { unless: ['n3_hut_moved'] },
      decoded: {
        flag: 'n4_teddy_saved', tone: 'good',
        effects: { safety: 3, morale: 3, trust: { linemen: 4 } },
        line: 'F-I-R-E, tapped from the relay hut on the old wire, fast and sloppy. A runner from the yard got to the point in time to pull Teddy out and lose the relay. He tapped it with the cellar already burning.',
      },
      missed: {
        flag: 'n4_fire_missed', tone: 'bad',
        effects: {},
        line: 'Four letters tapped from the point, fast, then nothing. Nobody copied it.',
      },
    },
    {
      kind: 'storm', id: 'n4_storm', slots: [2, 3],
      held: {
        line: 'Wind off the ice at midnight, and the other thing on the dial under it. You held twelve-sixty. The town heard the Lamp.',
        effects: { credibility: 4, listeners: 5 },
      },
      lost: {
        line: 'The Lamp slipped off twelve-sixty in the wind and the thing underneath came up through it. On Dock Street they heard both and could not tell which was which.',
        effects: { listeners: -8, credibility: -4 },
      },
    },
  ],

  otherStation: {
    prefer: ['warn_stayin', 'warn_search', 'news_frost_cure', 'news_bees_truth', 'news_agnes_sulfa', 'news_freeze'],
    intro: 'This is the Lamp. Twelve-sixty.',
    stamp: 'Friday. Two-fourteen in the morning.',
    outro: "Goodnight, Port Vesper. We'll be listening.",
    readsDumped: true,
    intrusions: [
      { kind: 'carrier', id: 'n4_carrier', slots: [2, 3] },
      { kind: 'override', id: 'n4_override', at: { slot: 1, frac: 0.15 }, seconds: 22 },
    ],
  },

  letter: {
    body:
      "Dear Lamp. This is Teddy Okafor. Mom says I have to write because I told her and she didn't believe me. " +
      "I had the crystal set on at the hut and you came on in the middle of the record, in the middle, and said, " +
      "\"{quote}\" Then you said it was Friday. Mom says it's not Friday. I know Morse now, the Linemen taught me. " +
      "If you ever need to tell me something that isn't on the radio, tap it.",
    from: 'Teddy Okafor, age fourteen, Elm Street',
  },

  classifieds: [
    { id: 'n4_5u4', text: 'Ridge Road yard: one 5U4 rectifier, pulled from a set that drowned. Dried out and tested. Seven chits.', cost: 7, gives: { spare: '5U4' } },
    { id: 'n4_maggie', text: 'For sale: "When You and I Were Young, Maggie," Henry Burr. Plays clean. My mother\'s. Five chits, Dock Street, ask for Marta.', cost: 5, gives: { record: 'maggie' } },
  ],

  dawnLines: [
    {
      gate: { requires: ['n4_search', 'n4_position'] },
      tone: 'good', flag: 'n4_boat_home',
      effects: { morale: 10, trust: { netters: 8 }, safety: 2 },
      line: "The search went north, where the Morse said, and found the boat at the second buoy with everybody in it alive, blue and swearing. They walked them in across the ice. Dock Street rang a bell that hasn't been rung in sixty years.",
    },
    {
      gate: { requires: ['n4_search'], unless: ['n4_position'] },
      tone: 'neutral', flag: 'n4_boat_late',
      effects: { morale: 3, trust: { netters: 3 } },
      line: 'The search went out at first light with no idea which way. They found the boat at noon, east, by luck. Everybody alive. One of them will lose toes to the wait.',
    },
    {
      gate: { unless: ['n4_search'] },
      tone: 'bad', flag: 'n4_boat_lost',
      effects: { morale: -9, trust: { netters: -8 } },
      line: "No search went out. The boat came in on its own at dusk the next day, walked in across the ice, one short. They don't know where he went through. Dock Street is quiet.",
    },
    {
      gate: { requires: ['aired_news_bees'], unless: ['aired_news_bees_truth', 'hedged_news_bees'] },
      tone: 'neutral',
      line: "Rumor on Church Road: the Chapel bees froze a week before the line went up. The current had nothing to do with it. Nobody at the Lamp has said so.",
    },
    {
      gate: { requires: ['n4_teddy_hurt'] },
      tone: 'bad',
      line: "The relay hut at the point is a black square in the snow. The Ridge Road line is dark again. The Linemen are not talking about whose cellar it was.",
    },
  ],

  rundowns: {
    auto: ['news_freeze', 'rec_moonlight2', 'warn_search', 'rec_over', 'warn_stayin', 'rec_rock'],
    demo: ['news_frost_cure', 'rec_rock', 'ad_candles2', 'news_freeze', 'warn_stayin', 'rec_moonlight2'],
  },
};
