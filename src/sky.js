/* The sky, on her clock.
 *
 * The time of day in the game is the time of day where she is. If it is eleven
 * at night in Latvia it is night here, the lamps are lit and the world is
 * quiet. That is the whole idea: the game is not a place she visits, it is a
 * place that is having the same evening she is.
 *
 * Weather is derived from the date rather than rolled, so it is the SAME
 * weather for both of them. When it rains on her garden it is raining on his
 * too, which for two people in different countries is worth more than any
 * amount of randomness.
 */

const HOUR = 3600e3;

/* Sunrise and sunset drift across the year. Riga swings from about 09:00–15:30
 * at midwinter to 04:30–22:20 at midsummer, which is a huge part of what living
 * there feels like, so it is worth modelling rather than fixing at 06:00. */
export function sunTimes(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400e3);
  /* Peaks at the solstice, around day 172. */
  const swing = Math.cos(((day - 172) / 365) * Math.PI * 2);
  const rise = 6.75 - swing * 2.3;
  const set = 18.9 + swing * 2.6;
  return {rise, set, daylight: set - rise};
}

export function hourOf(date = new Date()) {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

/* 0 at solar midnight, 1 at midday. */
export function daylight(date = new Date()) {
  const {rise, set} = sunTimes(date);
  const h = hourOf(date);
  if (h <= rise - 1.1 || h >= set + 1.1) return 0;
  if (h < rise + 1.1) return smooth((h - (rise - 1.1)) / 2.2);
  if (h > set - 1.1) return smooth(((set + 1.1) - h) / 2.2);
  return 1;
}

export function isNight(date = new Date()) {
  return daylight(date) < 0.06;
}

/* Where the sun or moon sits, 0 (rising) to 1 (setting), and how high. */
export function body(date = new Date()) {
  const {rise, set} = sunTimes(date);
  const h = hourOf(date);
  if (h >= rise && h <= set) {
    const t = (h - rise) / (set - rise);
    return {x: t, y: Math.sin(t * Math.PI), moon: false};
  }
  const night = h < rise ? h + 24 - set : h - set;
  const span = 24 - (set - rise);
  const t = night / span;
  return {x: t, y: Math.sin(t * Math.PI) * 0.7, moon: true};
}

/* Weather.
 *
 * A deterministic function of the calendar day and a slow index within it, so
 * both of them get the same sky at the same moment without anything being
 * stored or sent. Rain arrives in bands a few hours long rather than
 * flickering on and off.
 */
export function weather(date = new Date()) {
  const day = Math.floor(date.getTime() / 86400e3);
  const band = Math.floor(hourOf(date) / 3);            // eight bands a day
  const r = hash(day * 8 + band);
  const next = hash(day * 8 + band + 1);

  /* Wetter in autumn and winter, which is honest for the Baltic. */
  const month = date.getMonth();
  const wetness = [0.42, 0.38, 0.32, 0.28, 0.24, 0.22,
                   0.24, 0.26, 0.34, 0.44, 0.48, 0.46][month];

  const raining = r < wetness;
  /* Ease between bands so it does not switch on a boundary. */
  const into = (hourOf(date) % 3) / 3;
  const strength = raining
    ? Math.min(1, (next < wetness ? 1 : 1 - into) * 1.3)
    : (next < wetness ? into * 0.9 : 0);

  return {raining: strength > 0.12, strength, overcast: Math.min(1, strength + hash(day) * 0.3)};
}

/* Rain waters the garden. It is the one thing in the game that helps without
 * being asked, which is the correct shape for weather in a gift. */
export const RAIN_WATER_PER_HOUR = 0.5;

function hash(n) {
  let x = (n * 374761393 + 668265263) | 0;
  x = (x ^ (x >>> 13)) * 1274126177 | 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

/* Tint a daytime palette toward night. Everything keeps its own hue and simply
 * loses light, which is what keeps the regions distinguishable after dark
 * instead of turning the whole world into one blue soup. */
export function tint(hex, day, overcast) {
  const NIGHT = [22, 26, 44];
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const k = 0.78 * (1 - day);                     // how far toward night
  const grey = 0.22 * overcast * day;             // and how far toward flat
  const out = rgb.map((c, i) => {
    const toNight = c + (NIGHT[i] - c) * k;
    const avg = (rgb[0] + rgb[1] + rgb[2]) / 3;
    return Math.round(toNight + (avg - toNight) * grey);
  });
  return '#' + out.map(c => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('');
}
