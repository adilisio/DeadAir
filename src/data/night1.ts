// Night 1 in Port Vesper. Names marked (placeholder) in DESIGN.md are still open.
// Tone: lonely, funny, warm. Scripts are read aloud, so write for the ear.

import type { NightDef } from '../sim/types';

export const NIGHT_1: NightDef = {
  id: 'night1',
  number: 1,

  signOn:
    "Good evening, Port Vesper. This is W-L-M-P, twelve-sixty on your dial, the Lamp, coming to you from the foot of the old lighthouse. The wind's out of the north and the kettle's on. Stay close. Let's get through the night together.",

  signOff:
    "That's the show. Lock your doors, bank your stoves, and if you can't sleep, well, you know where to find me. This is the Lamp, signing off.",

  cards: [
    // ── Records (real 78s; see records.json) ─────────────────
    {
      id: 'rec_moonlight', kind: 'record', recordId: 'moonlight_bay', title: 'Moonlight Bay',
      blurb: 'A barbershop quartet sailing along on Moonlight Bay. Netter kids sing it on the docks.',
      mood: 'bright', loves: ['netters'],
    },
    {
      id: 'rec_deep', kind: 'record', recordId: 'asleep_in_the_deep', title: 'Asleep in the Deep',
      blurb: 'A bass voice from the bottom of the lake. The old Netters take their caps off for it.',
      mood: 'blue', loves: ['netters'],
    },
    {
      id: 'rec_hymn', kind: 'record', recordId: 'nearer_my_god', title: 'Nearer My God to Thee',
      blurb: 'The hymn from the Titanic. The Chapel sings it every Sunday. The Linemen call it "the funeral".',
      mood: 'stirring', loves: ['chapel'], dislikes: ['linemen'],
    },
    {
      id: 'rec_harris', kind: 'record', recordId: 'it_had_to_be_you', title: 'It Had to Be You',
      blurb: "Marion Harris, the newest thing on the dial a hundred years ago. The Linemen whistle it on the pylons.",
      mood: 'bright', loves: ['linemen'],
    },
    {
      id: 'rec_hot', kind: 'record', recordId: 'swanee_butterfly', title: 'Swanee Butterfly',
      blurb: 'Hot jazz, all brass. The Linemen say it sounds like the future. The Chapel says it sounds like sin.',
      mood: 'bright', loves: ['linemen'], dislikes: ['chapel'],
    },
    {
      id: 'rec_sweetheart', kind: 'record', recordId: 'let_me_call_you_sweetheart', title: 'Let Me Call You Sweetheart',
      blurb: 'Everybody knows the words. Everybody pretends not to cry.',
      mood: 'blue', loves: ['netters', 'chapel'],
    },

    // ── News ─────────────────────────────────────────────────
    {
      id: 'news_infirmary', kind: 'news', truth: 'true', title: 'The Chapel infirmary opens its doors',
      blurb: 'True. Medicine came in on a trader boat. Good news, plain and simple.',
      script:
        "Some good news for once. Sister Agnes up at the Chapel says a trader boat brought in a crate of sulfa powder, and the infirmary will see anybody with a fever. No questions, no tithe. Go see her. Then thank her.",
      effects: { morale: 6, trust: { chapel: 6 } },
      helps: 'chapel',
    },
    {
      id: 'news_wiring', kind: 'news', truth: 'rumor', title: 'Wiring pulled from the Chapel',
      blurb: "Rumor. Someone pulled the wiring out of the Chapel's old wing. People saw a Linemen cart.",
      script:
        "Now, I can't swear to this one. But folks up at the Chapel say somebody pulled the wiring out of the old infirmary wing last week, and a few of them say they saw a Linemen cart on Church Road. If somebody's lighting up a substation with the Chapel's walls, they owe this town an explanation.",
      effects: { trust: { chapel: 4, linemen: -8 }, credibility: -2 },
      helps: 'chapel',
    },
    {
      id: 'news_wells', kind: 'news', truth: 'false', title: 'Poison in the east wells',
      blurb: 'An unsigned note under the door blaming the Linemen. No proof. It would make one hell of a broadcast.',
      script:
        "I got a note tonight. No name on it. It says the Linemen's new substation is leaking transformer oil into the east wells, and that they know it. Boil your water, Port Vesper. Boil all of it.",
      effects: { morale: -6, safety: 4, trust: { linemen: -8 }, listeners: 25 },
      grim: true,
      unravel: {
        credibility: -15,
        line: 'The east wells were tested at noon. Clean as rain. People remember who told them otherwise.',
      },
    },

    // ── Warnings ─────────────────────────────────────────────
    {
      id: 'warn_ice', kind: 'warning', title: 'Rotten ice at the north breakwater',
      blurb: 'The shelf is cracking. Netters launch at four. They have to hear this.',
      script:
        "Netters, listen up. The ice shelf off the north breakwater is rotten clean through. I watched a gull fall through it this afternoon. Keep the boats in till it settles. The fish will wait. Please.",
      effects: { morale: -3, safety: 4 },
      grim: true,
      helps: 'netters',
      reach: {
        faction: 'netters',
        threshold: 0.6,
        success: {
          flag: 'n1_boats_stayed_in', tone: 'good',
          effects: { trust: { netters: 10 }, safety: 6 },
          line: 'The Netters kept the boats in. At five the north shelf broke loose and drifted out with nobody on it.',
        },
        fail: {
          flag: 'n1_boat_lost', tone: 'bad',
          effects: { trust: { netters: -6 }, morale: -8 },
          line: "Not enough Netters heard the warning. The Ostrowski boat went out at four, and the shelf went with it. They pulled two of three from the water.",
        },
        unaired: {
          flag: 'n1_boat_lost', tone: 'bad',
          effects: { trust: { netters: -8 }, morale: -8 },
          line: "Nobody warned the Netters about the north shelf. The Ostrowski boat went out at four. They pulled two of three from the water.",
        },
      },
    },
    {
      id: 'warn_dogs', kind: 'warning', title: 'Dog pack on Ridge Road',
      blurb: 'Wild dogs near the pylons. The Linemen are restringing that stretch at night.',
      script:
        "Linemen, there's a pack of wild dogs working Ridge Road between the third and fifth pylons, right where you're stringing new line. Big ones. Go in pairs, carry a light, and don't be a hero over a spool of wire.",
      effects: { safety: 3 },
      grim: true,
      helps: 'linemen',
      reach: {
        faction: 'linemen',
        threshold: 0.6,
        success: {
          flag: 'n1_dogs_avoided', tone: 'good',
          effects: { trust: { linemen: 6 }, safety: 3 },
          line: 'The Linemen worked Ridge Road in pairs. The dogs circled and gave up.',
        },
        fail: {
          flag: 'n1_dogs_bite', tone: 'bad',
          effects: { trust: { linemen: -3 }, safety: -4 },
          line: "A lineman named Pruitt walked Ridge Road alone. He'll keep the leg. He won't forget whose show he wasn't listening to.",
        },
      },
    },

    // ── Ads ──────────────────────────────────────────────────
    {
      id: 'ad_tonic', kind: 'ad', sponsor: "Doc Hessler's", title: "Doc Hessler's Lake Tonic",
      blurb: 'Pays 6 chits. The tonic is mostly vinegar. Doc swears by it.',
      script:
        "This hour comes to you courtesy of Doc Hessler's Lake Tonic. Cures chill, cough, and melancholy, and it's ninety percent vinegar, so it can't hurt. Much. Doc Hessler's: if it burns, it's working.",
      effects: { chits: 6, listeners: -3 },
    },
    {
      id: 'ad_fish', kind: 'ad', sponsor: 'Ostrowski Smokehouse', title: 'Ostrowski Smoked Fish',
      blurb: 'Pays 4 chits. The Netters like hearing their own names on the air.',
      script:
        "Hungry? The Ostrowski Smokehouse on Dock Street has smoked perch, smoked whitefish, and a smoked something Mrs. Ostrowski won't name. Trade welcome. Tell her the Lamp sent you.",
      effects: { chits: 4, trust: { netters: 3 } },
    },
  ],

  switchboard: {
    slot: 2,
    lines: [
      {
        id: 'call_okafor',
        name: 'Mrs. Okafor',
        prompt: 'a woman, crying',
        preview: "Is this the Lamp? Please. It's my boy. He went up Ridge Road at sundown and he isn't back.",
        script:
          "Hello? Is this on? It's Grace Okafor, on Elm. My boy Teddy went up the Ridge Road pylons with the Linemen crew at sundown and he isn't back. He's fourteen. If anybody's out there, please, look for him.",
        voice: { pitch: 1.35, rate: 1.05 },
        aired: {
          faction: 'linemen',
          threshold: 0.5,
          success: {
            flag: 'n1_teddy_found', tone: 'good',
            effects: { trust: { linemen: 8 }, morale: 6 },
            line: "A Lineman crew heard Mrs. Okafor on the air and went back up Ridge Road. They found Teddy stuck on pylon four, cold and embarrassed, and walked him home.",
          },
          fail: {
            flag: 'n1_teddy_cold', tone: 'bad',
            effects: { morale: -4 },
            line: "You put Mrs. Okafor on, but the static ate her words. Teddy walked home at dawn, half frozen. She's not angry. She's just tired.",
          },
        },
        notTaken: {
          flag: 'n1_okafor_missed', tone: 'bad',
          effects: { morale: -3, trust: { linemen: -2 } },
          line: 'Line one rang and rang. Mrs. Okafor walked the Ridge Road herself, all night. Teddy came home at dawn, half frozen.',
        },
        cut: {
          flag: 'n1_okafor_cut', tone: 'bad',
          effects: { morale: -4, credibility: -3, trust: { linemen: -3 } },
          line: "You cut Mrs. Okafor off in the middle of her plea. Nobody heard where Teddy went. He walked home at dawn, half frozen, and Elm Street hasn't forgotten it.",
        },
      },
      {
        id: 'call_chalk',
        name: 'No name',
        prompt: "a man, no name. 'about the Chapel'",
        preview: "Yeah, I'll hold. Folks ought to hear what's going on up at that Chapel. Somebody has to say it.",
        script:
          "Evening, Lamp. Long-time listener. I won't give my name, you'll see why. Folks ought to know what's going on up at that Chapel. That sulfa powder Sister Agnes is handing out? It's chalk. She's cutting it with chalk and selling the real stuff downriver, and anybody who lines up for it is a fool.",
        voice: { pitch: 0.8, rate: 1.0 },
        aired: {
          flag: 'n1_slander_aired', tone: 'bad',
          effects: { credibility: -4, morale: -4, safety: -2, trust: { chapel: -8 } },
          line: 'The man on line two called Sister Agnes a thief on your air. The infirmary sat empty all morning. People who needed it stayed home.',
        },
        turn: {
          at: "It's chalk.",
          caught: {
            flag: 'n1_slander_dumped', tone: 'good',
            effects: { credibility: 3, trust: { chapel: 4 } },
            line: 'You dumped the man on line two before he got it out. Sister Agnes heard about it. She sent a jar of honey down to the station, no note.',
          },
        },
      },
      {
        id: 'call_lottie',
        name: 'Lottie Kowalczyk',
        prompt: 'Lottie K., smokehouse row. chipper',
        preview: "Oh! Is this the Lamp? Oh, how exciting. I just want to say hello to my Walt.",
        script:
          "Hello, Lamp! It's Lottie Kowalczyk. I just want to tell my Walt, on the Linemen night crew: your supper's in the oven, the cat ate half of it, and I love you anyhow. That's all. Hi, everybody!",
        voice: { pitch: 1.5, rate: 1.1 },
        aired: {
          flag: 'n1_lottie_aired', tone: 'good',
          effects: { morale: 4, trust: { linemen: 3 } },
          line: 'Walt Kowalczyk heard about his supper on the radio. The night crew ribbed him about the cat till sunrise. He did not mind one bit.',
        },
        cut: {
          flag: 'n1_lottie_cut', tone: 'bad',
          effects: { morale: -2, trust: { netters: -2 } },
          line: "You cut Lottie Kowalczyk off mid-hello. She's telling the whole of smokehouse row about it.",
        },
      },
    ],
  },

  tube: { slot: 1, at: 0.35, socket: 2 },

  storm: {
    slots: [3, 4],
    held: {
      line: 'A squall came off the lake after midnight. You rode the dial through it, and the Lamp never dropped.',
      effects: { credibility: 3, listeners: 6 },
    },
    lost: {
      line: 'The squall after midnight knocked the Lamp clean off twelve-sixty. Out on the docks they gave up and went to bed.',
      effects: { listeners: -10 },
    },
  },

  otherStation: {
    prefer: ['news_wells', 'warn_ice', 'news_wiring', 'warn_dogs', 'news_infirmary'],
    intro: 'This is the Lamp. Twelve-sixty.',
    stamp: 'Thursday. Two-fourteen in the morning.',
    outro: "Goodnight, Port Vesper. We'll be listening.",
  },
};

/** A sensible show for ?auto runs: dedications and breathers, warnings when they land. */
export const NIGHT_1_AUTO_RUNDOWN = ['news_infirmary', 'rec_hymn', 'warn_dogs', 'rec_harris', 'warn_ice', 'rec_deep'];

/** A messier show for ?scene=dawn, so the ledger has plenty to report. */
export const NIGHT_1_DEMO_RUNDOWN = ['news_wells', 'rec_harris', 'ad_tonic', 'ad_fish', 'warn_ice', 'rec_moonlight'];
