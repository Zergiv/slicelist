// English copy. Same voice as the Spanish: friendly, a bit cheeky, never
// explaining how things work under the hood.

import type { Dict } from "./es";

export const en: Dict = {
  code: "en",
  locale: "en-GB",

  top: {
    language: "Language",
    localTime: "your time",
  },

  input: {
    lead: "Paste a YouTube Music playlist and I'll tell you which songs you can slice in Beat Saber.",
    label: "Playlist link",
    placeholder: "Paste your playlist link here",
    submit: "Find maps",
    stop: "Stop",
    hint: "It has to be public. Playlists and albums both work.",
    example: "Try it with a sample one",
  },

  errors: {
    bad_link: "That doesn't look like a playlist link. Copy it from Share, in YouTube Music.",
    not_playlist: "That link is for a single song or an automatic mix. Paste a playlist's link.",
    not_found: "That playlist is private or doesn't exist. Make it public and paste it again.",
    empty: "That playlist is empty. Add some songs and come back.",
    busy: "I can't reach YouTube Music right now. Try again in a minute.",
    upstream: "YouTube Music wouldn't let me read that playlist. Try again in a minute.",
    too_many: "You're going too fast. Wait a minute and we'll carry on.",
  },

  status: {
    you: "you",
    playlist: "playlist",
    songs: "songs",
    withMap: "mapped",
    withoutMap: "unmapped",
    maps: "maps",
    took: "took",
    headset: "headset",
    nothing: "none yet",
    reading: "reading",
    seconds: (s: string) => `${s} s`,
    truncated: (n: number) => `first ${n} only`,
    blockLabel: (done: number, total: number) => `Progress: ${done} of ${total} songs`,
  },

  headsetStatus: {
    unsupported: "unavailable",
    idle: "not connected",
    connecting: "connecting",
    authorizing: "waiting for permission",
    connected: "connected",
    notModded: "no mods",
    busy: "busy",
    error: "disconnected",
  },

  marquee: {
    title: "covers",
    label: "Covers from your playlist",
    pause: "Pause",
    resume: "Resume",
    empty: "Your playlist's covers will roll through here.",
    open: (title: string) => `Go to ${title}`,
  },

  filters: {
    label: "Which songs to show",
    withMap: "mapped",
    withoutMap: "unmapped",
  },

  list: {
    emptyTitle: "Your songs will show up here. For now, silence.",
    reading: "Reading the playlist",
    noneWithMap: "None of these has a map. Mappers, get to work.",
    noneWithMapScanning: "None yet. Still looking.",
    allHaveMap: "Every one has a map. No getting out of sweating today.",
    withoutMapLead: "Nobody has mapped these. Yet.",
    retry: "Try again",
    scanning: (done: number, total: number) => `Looking: ${done} of ${total}`,
    pendingLeft: (n: number) => (n === 1 ? "1 left to look up." : `${n} left to look up.`),
    resume: "Keep looking",
    failedLead: (n: number) =>
      n === 1 ? "Couldn't manage this one." : `Couldn't manage these ${n}.`,
    retryAll: "Retry all",
    position: (n: number) => `Song ${n}`,
  },

  song: {
    searching: "looking",
    failed: "couldn't look it up",
    retry: "Retry",
    noMap: "no map",
    maps: (n: number) => (n === 1 ? "1 map" : `${n} maps`),
    versions: (n: number) => (n === 1 ? "1 different version" : `${n} different versions`),
    others: (n: number) => (n === 1 ? "another version" : "other versions"),
    othersHint: "Remixes, covers and live takes. They don't count as a map of the song.",
    searchElsewhere: "Look for it yourself on BeatSaver",
    markerFound: "Mapped",
    markerNone: "No map",
    markerSearching: "Looking",
    markerError: "Failed",
  },

  map: {
    by: "mapped by",
    score: "rating",
    upvotes: "upvotes",
    downvotes: "downvotes",
    curated: "curated",
    ranked: "ranked",
    listen: "Listen",
    pause: "Pause",
    view: "View map",
    download: "Download",
    difficulties: "Difficulties",
  },

  version: {
    remix: "remix",
    cover: "cover",
    nightcore: "nightcore",
    live: "live",
    acoustic: "acoustic",
    instrumental: "instrumental",
    speed: "different speed",
    short: "short version",
    extended: "extended version",
    mashup: "mashup",
    other: "another version",
  },

  nowPlaying: {
    title: "now playing",
    empty: "Nothing's playing. Hit a preview.",
    play: "Keep listening",
    pause: "Pause",
    by: "mapped by",
  },

  quest: {
    title: "headset",
    idle: "Plug in your Quest with the cable and I'll send it straight to the game.",
    connect: "Connect headset",
    disconnect: "Disconnect",
    authorizing: "Put the headset on and accept the prompt.",
    connecting: "Looking for your headset.",
    connected: (name: string, n: number) =>
      n === 0
        ? `${name} connected. No added songs on it yet.`
        : n === 1
          ? `${name} connected. 1 added song on it.`
          : `${name} connected. ${n} added songs on it.`,
    fallbackName: "Your Quest",
    unsupported: "This browser can't talk to the headset. Open slicelist in Chrome or Edge.",
    notModded:
      "I can't find a modded Beat Saber on this headset. Run it through ModsBeforeFriday first, then come back.",
    busy: "Another program is using the headset. Close it and try again.",
    lost: "The headset dropped out. Check the cable and connect again.",
    retry: "Retry",
    sendBest: "Add the best map of each song",
    nothingToSend: "The mapped ones are already on your headset.",
    batchProgress: (done: number, total: number) => `${done} of ${total}`,
    stop: "Stop",
    done: "Done. Restart Beat Saber and get slicing.",
    doneWithFailures: (n: number) =>
      n === 1
        ? "Done, except 1 that didn't make it. Restart Beat Saber and get slicing."
        : `Done, except ${n} that didn't make it. Restart Beat Saber and get slicing.`,
  },

  send: {
    idle: "Add to headset",
    queued: "Queued",
    sending: (percent: number) => `Sending ${percent} %`,
    done: "On your headset",
    failed: "Didn't make it. Retry",
  },

  footer: {
    credit: "The maps are made by the BeatSaver crowd. slicelist just finds them for you.",
    design: "design system",
  },
};
