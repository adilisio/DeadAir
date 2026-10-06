// The people of Port Vesper who speak on the Lamp: the DJ, the callers, and the
// voices the Other Station borrows. One voice per person, chosen once, so the town
// becomes recognizable by ear. Voice ids are Kokoro voices (tools/voices.ts renders
// every line offline); pitch/rate are also the speechSynthesis fallback's settings.

import type { FactionId } from '../sim/types';

export type PersonId =
  | 'dj' | 'grace' | 'anon' | 'lottie' | 'sparky' | 'bill' | 'agnes' | 'pruitt' | 'doc' | 'amos' | 'teddy';

export interface Person {
  id: PersonId;
  name: string;
  faction?: FactionId;
  /** One line of who they are, for authors and the ledger. */
  who: string;
  voice: {
    /** Kokoro voice id (see tools/voices.ts). */
    kokoro: string;
    /** Speaking rate multiplier (1 = normal). */
    rate: number;
    /** speechSynthesis fallback pitch (1 = normal). */
    pitch: number;
  };
}

export const PEOPLE: Record<PersonId, Person> = {
  dj: { id: 'dj', name: 'the Lamp', who: 'You. The voice at the foot of the lighthouse.', voice: { kokoro: 'am_michael', rate: 0.95, pitch: 0.95 } },
  grace: { id: 'grace', name: 'Grace Okafor', faction: 'chapel', who: "Teddy's mother, on Elm Street.", voice: { kokoro: 'af_sarah', rate: 1.0, pitch: 1.3 } },
  anon: { id: 'anon', name: 'No name', who: 'A man who will not give his name. Not yet.', voice: { kokoro: 'am_onyx', rate: 0.95, pitch: 0.8 } },
  lottie: { id: 'lottie', name: 'Lottie Kowalczyk', faction: 'netters', who: "Smokehouse row. Walt's wife. Knows everything, tells most of it.", voice: { kokoro: 'af_sky', rate: 1.1, pitch: 1.5 } },
  sparky: { id: 'sparky', name: 'Sparky', faction: 'linemen', who: 'Carries the spools for the Linemen. Enthusiastic. Dangerous.', voice: { kokoro: 'am_puck', rate: 1.15, pitch: 1.2 } },
  bill: { id: 'bill', name: 'Old Bill Wozniak', faction: 'netters', who: 'Dock Street. His knee calls the weather. Right about the lake, wrong about people.', voice: { kokoro: 'am_santa', rate: 0.9, pitch: 0.75 } },
  agnes: { id: 'agnes', name: 'Sister Agnes', faction: 'chapel', who: 'Runs the infirmary and the school. Sends notes. Does not call.', voice: { kokoro: 'af_kore', rate: 0.95, pitch: 1.1 } },
  pruitt: { id: 'pruitt', name: 'Pruitt', faction: 'linemen', who: 'A lineman on the Ridge Road crew.', voice: { kokoro: 'am_fenrir', rate: 1.0, pitch: 0.9 } },
  doc: { id: 'doc', name: 'Doc Hessler', who: 'Sells the tonic. Pays for airtime. Lies.', voice: { kokoro: 'am_eric', rate: 1.05, pitch: 1.0 } },
  amos: { id: 'amos', name: 'Brother Amos', faction: 'chapel', who: 'Keeps the Chapel bees.', voice: { kokoro: 'am_liam', rate: 0.9, pitch: 0.95 } },
  teddy: { id: 'teddy', name: 'Teddy Okafor', who: 'Fourteen. Wants to be a Lineman. Learned Morse from them.', voice: { kokoro: 'am_puck', rate: 1.0, pitch: 1.4 } },
};

export function person(id: PersonId): Person {
  return PEOPLE[id];
}
