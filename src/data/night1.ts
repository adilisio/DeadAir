// Night 1 in Port Clemency. All names are placeholders (DESIGN.md).
// Tone: lonely, funny, warm. Scripts are read aloud, so write for the ear.

import type { NightDef } from '../sim/types';

export const NIGHT_1: NightDef = {
  id: 'night1',
  number: 1,

  signOn:
    "Good evening, Port Clemency. This is W-L-M-P, twelve-sixty on your dial, the Lamp, coming to you from the foot of the old lighthouse. The wind's out of the north and the kettle's on. Stay close. Let's get through the night together.",

  signOff:
    "That's the show. Lock your doors, bank your stoves, and if you can't sleep, well, you know where to find me. This is the Lamp, signing off.",

  cards: [
    // ── Records ──────────────────────────────────────────────
    {
      id: 'rec_rag', kind: 'record', recordId: 'breakwater_rag', title: 'Breakwater Rag',
      blurb: 'Bright piano rag. The Linemen stomp to it on the pylons.',
      mood: 'bright', loves: ['linemen'],
    },
    {
      id: 'rec_waltz', kind: 'record', recordId: 'lamp_is_lit', title: 'The Lamp Is Lit',
      blurb: 'A slow waltz. Netter wives hum it mending nets.',
      mood: 'blue', loves: ['netters'],
    },
    {
      id: 'rec_march', kind: 'record', recordId: 'volunteers_march', title: 'Clemency Volunteers March',
      blurb: 'Brass and drum. The Grange plays it at harvest. Linemen call it "tractor music".',
      mood: 'stirring', loves: ['grange'], dislikes: ['linemen'],
    },
    {
      id: 'rec_blues', kind: 'record', recordId: 'copper_wire_blues', title: 'Copper Wire Blues',
      blurb: 'Low and rolling. A Lineman song if there ever was one.',
      mood: 'blue', loves: ['linemen'],
    },
    {
      id: 'rec_ballad', kind: 'record', recordId: 'far_shore', title: 'Light Me to the Far Shore',
      blurb: 'A sweet, sad ballad. Everybody pretends not to cry.',
      mood: 'blue', loves: ['netters', 'grange'],
    },

    // ── News ─────────────────────────────────────────────────
    {
      id: 'news_bread', kind: 'news', truth: 'true', title: 'Bread ration goes up',
      blurb: 'True. The Grange is raising the ration. Good news, plain and simple.',
      script:
        "Some good news for once. The Grange co-op says the winter wheat came in heavy, and starting Monday the bread ration goes up by a quarter loaf. Thank a farmer. Then thank another one.",
      effects: { morale: 6, trust: { grange: 6 } },
      helps: 'grange',
    },
    {
      id: 'news_copper', kind: 'news', truth: 'rumor', title: 'Copper stripped from the hospital',
      blurb: "Rumor. Someone stripped Saint Brendan's of its wiring. People saw Linemen carts.",
      script:
        "Now, I can't swear to this one. But folks up on the hill say Saint Brendan's was stripped of its copper wiring last week, and a few of them say they saw Linemen carts on Hospital Road. If that's true, somebody owes this town an explanation.",
      effects: { trust: { grange: 4, linemen: -8 }, credibility: -2 },
      helps: 'grange',
    },
    {
      id: 'news_wells', kind: 'news', truth: 'false', title: 'Poison in the east wells',
      blurb: 'An unsigned note under the door. No proof. It would make one hell of a broadcast.',
      script:
        "I got a note tonight. No name on it. It says somebody's been putting something in the east wells, and that the Grange knows more than it's saying. Boil your water, Port Clemency. Boil all of it.",
      effects: { morale: -6, safety: 4, trust: { grange: -8 }, listeners: 25 },
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
      blurb: 'Wild dogs near the pylons. The Linemen work that stretch at night.',
      script:
        "Linemen, there's a pack of wild dogs working Ridge Road between the third and fifth pylons. Big ones. Go in pairs, carry a light, and don't be a hero over a spool of wire.",
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

  caller: {
    slot: 2,
    name: 'Mrs. Okafor',
    prompt: "Line one: Mrs. Okafor. Her boy hasn't come home.",
    script:
      "Hello? Is this on? It's Grace Okafor, on Elm. My boy Teddy went up the Ridge Road pylons with the Linemen crew at sundown and he isn't back. He's fourteen. If anybody's out there, please, look for him.",
    onAir: {
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
    declined: {
      flag: 'n1_okafor_declined', tone: 'bad',
      effects: { morale: -3, trust: { linemen: -2 } },
      line: "You didn't put Mrs. Okafor on the air. Teddy walked home at dawn, half frozen. Word gets around about who picks up the phone.",
    },
    missed: {
      flag: 'n1_okafor_missed', tone: 'bad',
      effects: { morale: -3 },
      line: 'The phone rang and rang. Mrs. Okafor walked the Ridge Road herself.',
    },
  },

  otherStation: {
    prefer: ['news_wells', 'warn_ice', 'news_copper', 'warn_dogs', 'news_bread'],
    intro: 'This is the Lamp. Twelve-sixty.',
    stamp: 'Thursday. Two-fourteen in the morning.',
    outro: "Goodnight, Port Clemency. We'll be listening.",
  },
};
