/* Deterministic Math for the shared driving physics.
 *
 * ECMAScript specifies + - * / and Math.sqrt exactly, but Math.sin, cos, tan,
 * atan, atan2, exp, log, pow, tanh and hypot are only "implementation-
 * approximated": different engine versions (e.g. the browser's V8 and the
 * verification server's Node.js) may differ in the last bit. In a chaotic
 * vehicle simulation one bit grows into centimetres within a minute.
 *
 * This module ports the FreeBSD/Sun fdlibm algorithms (the same family V8 uses
 * internally) to plain JavaScript using only exactly specified operations and
 * integer bit manipulation, so every engine produces identical results.
 * Physics files shadow `Math` with `window.LPRMath` and must be loaded after it.
 */
(function(root) {
  'use strict';
  const native = Math;
  const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
  const LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
  const HI = LITTLE ? 1 : 0, LO = LITTLE ? 0 : 1;
  const hi = x => { f64[0] = x; return u32[HI] | 0; };
  const lo = x => { f64[0] = x; return u32[LO]; };
  const setHi = (x, h) => { f64[0] = x; u32[HI] = h; return f64[0]; };
  const setLo = (x, l) => { f64[0] = x; u32[LO] = l; return f64[0]; };
  const fromWords = (h, l) => { u32[HI] = h; u32[LO] = l; return f64[0]; };
  const fabs = x => (x < 0 || (x === 0 && 1 / x < 0)) ? -x : x;
  const sqrt = native.sqrt;
  const huge = 1e300, tiny = 1e-300;

  function scalbn(x, n) {
    const two54 = 1.80143985094819840000e+16, twom54 = 5.55111512312578270212e-17;
    let hx = hi(x); const lx = lo(x);
    let k = (hx & 0x7ff00000) >> 20;
    if (k === 0) {
      if ((lx | (hx & 0x7fffffff)) === 0) return x;
      x *= two54; hx = hi(x); k = ((hx & 0x7ff00000) >> 20) - 54;
      if (n < -50000) return tiny * x;
    }
    if (k === 0x7ff) return x + x;
    k = k + n;
    if (k > 0x7fe) return huge * (x < 0 ? -huge : huge);
    if (k > 0) return setHi(x, (hx & 0x800fffff) | (k << 20));
    if (k <= -54) return n > 50000 ? huge * (x < 0 ? -huge : huge) : tiny * (x < 0 ? -tiny : tiny);
    k += 54;
    return setHi(x, (hx & 0x800fffff) | (k << 20)) * twom54;
  }

  // --- Trigonometry ---------------------------------------------------------
  const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04,
    S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
  function kernelSin(x, y, iy) {
    if ((hi(x) & 0x7fffffff) < 0x3e400000) return x;
    const z = x * x, v = z * x, r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
    if (iy === 0) return x + v * (S1 + z * r);
    return x - ((z * (0.5 * y - v * r) - y) - v * S1);
  }
  const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05,
    C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;
  function kernelCos(x, y) {
    const ix = hi(x) & 0x7fffffff;
    if (ix < 0x3e400000 && (x | 0) === 0) return 1;
    const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
    if (ix < 0x3FD33333) return 1 - (0.5 * z - (z * r - x * y));
    const qx = ix > 0x3fe90000 ? 0.28125 : fromWords(ix - 0x00200000, 0);
    const hz = 0.5 * z - qx, a = 1 - qx;
    return a - (hz - (z * r - x * y));
  }
  const T = [3.33333333333334091986e-01, 1.33333333333201242699e-01, 5.39682539762260521377e-02, 2.18694882948595424599e-02,
    8.86323982359930005737e-03, 3.59207910759131235356e-03, 1.45620945432529025516e-03, 5.88041240820264096874e-04,
    2.46463134818469906812e-04, 7.81794442939557092300e-05, 7.14072491382608190305e-05, -1.85586374855275456654e-05,
    2.59073051863633712884e-05];
  const pio4 = 7.85398163397448278999e-01, pio4lo = 3.06161699786838301793e-17;
  function kernelTan(x, y, iy) {
    const hx = hi(x), ix = hx & 0x7fffffff;
    if (ix < 0x3e300000) return iy === 1 ? x : -1.0 / (x + y);
    if (ix >= 0x3FE59428) {
      if (hx < 0) { x = -x; y = -y; }
      const z = pio4 - x, w = pio4lo - y;
      x = z + w; y = 0.0;
    }
    let z = x * x, w = z * z;
    let r = T[1] + w * (T[3] + w * (T[5] + w * (T[7] + w * (T[9] + w * T[11]))));
    const v = z * (T[2] + w * (T[4] + w * (T[6] + w * (T[8] + w * (T[10] + w * T[12])))));
    const s = z * x;
    r = y + z * (s * (r + v) + y);
    r += T[0] * s;
    w = x + r;
    if (ix >= 0x3FE59428) {
      const vv = iy;
      return (1 - ((hx >> 30) & 2)) * (vv - 2.0 * (x - (w * w / (w + vv) - r)));
    }
    if (iy === 1) return w;
    z = setLo(w, 0);
    const vv = r - (z - x), a = -1.0 / w, t = setLo(a, 0), ss = 1.0 + t * z;
    return t + a * (ss + t * vv);
  }
  const npio2hw = [0x3FF921FB, 0x400921FB, 0x4012D97C, 0x401921FB, 0x401F6A7A, 0x4022D97C, 0x4025FDBB, 0x402921FB,
    0x402C463A, 0x402F6A7A, 0x4031475C, 0x4032D97C, 0x40346B9C, 0x4035FDBB, 0x40378FDB, 0x403921FB, 0x403AB41B, 0x403C463A,
    0x403DD85A, 0x403F6A7A, 0x40407E4C, 0x4041475C, 0x4042106C, 0x4042D97C, 0x4043A28C, 0x40446B9C, 0x404534AC, 0x4045FDBB,
    0x4046C6CB, 0x40478FDB, 0x404858EB, 0x404921FB];
  const invpio2 = 6.36619772367581382433e-01, pio2_1 = 1.57079632673412561417e+00, pio2_1t = 6.07710050650619224932e-11,
    pio2_2 = 6.07710050630396597660e-11, pio2_2t = 2.02226624879595063154e-21, pio2_3 = 2.02226624871116645580e-21,
    pio2_3t = 8.47842766036889956997e-32;
  const rem = { n: 0, y0: 0, y1: 0 };
  // Argument reduction to [-pi/4, pi/4]. Inputs beyond 2^19*pi/2 use the same
  // three-term reduction: accuracy degrades there but every engine agrees.
  function remPio2(x) {
    const hx = hi(x), ix = hx & 0x7fffffff;
    if (ix <= 0x3fe921fb) { rem.n = 0; rem.y0 = x; rem.y1 = 0; return; }
    if (ix < 0x4002d97c) {
      let z;
      if (hx > 0) {
        z = x - pio2_1;
        if (ix !== 0x3ff921fb) { rem.y0 = z - pio2_1t; rem.y1 = (z - rem.y0) - pio2_1t; }
        else { z -= pio2_2; rem.y0 = z - pio2_2t; rem.y1 = (z - rem.y0) - pio2_2t; }
        rem.n = 1; return;
      }
      z = x + pio2_1;
      if (ix !== 0x3ff921fb) { rem.y0 = z + pio2_1t; rem.y1 = (z - rem.y0) + pio2_1t; }
      else { z += pio2_2; rem.y0 = z + pio2_2t; rem.y1 = (z - rem.y0) + pio2_2t; }
      rem.n = -1; return;
    }
    let t = fabs(x);
    const n = native.floor(t * invpio2 + 0.5), fn = n;
    let r = t - fn * pio2_1, w = fn * pio2_1t, y0 = r - w;
    if (!(n < 32 && ix !== npio2hw[n - 1])) {
      const j = ix >> 20;
      let i = j - ((hi(y0) >> 20) & 0x7ff);
      if (i > 16) {
        t = r; w = fn * pio2_2; r = t - w; w = fn * pio2_2t - ((t - r) - w); y0 = r - w;
        i = j - ((hi(y0) >> 20) & 0x7ff);
        if (i > 49) { t = r; w = fn * pio2_3; r = t - w; w = fn * pio2_3t - ((t - r) - w); y0 = r - w; }
      }
    }
    const y1 = (r - y0) - w;
    if (hx < 0) { rem.y0 = -y0; rem.y1 = -y1; rem.n = -n; } else { rem.y0 = y0; rem.y1 = y1; rem.n = n; }
  }
  function sin(x) {
    x = +x;
    const ix = hi(x) & 0x7fffffff;
    if (ix <= 0x3fe921fb) return kernelSin(x, 0, 0);
    if (ix >= 0x7ff00000) return NaN;
    remPio2(x);
    switch (rem.n & 3) {
      case 0: return kernelSin(rem.y0, rem.y1, 1);
      case 1: return kernelCos(rem.y0, rem.y1);
      case 2: return -kernelSin(rem.y0, rem.y1, 1);
      default: return -kernelCos(rem.y0, rem.y1);
    }
  }
  function cos(x) {
    x = +x;
    const ix = hi(x) & 0x7fffffff;
    if (ix <= 0x3fe921fb) return kernelCos(x, 0);
    if (ix >= 0x7ff00000) return NaN;
    remPio2(x);
    switch (rem.n & 3) {
      case 0: return kernelCos(rem.y0, rem.y1);
      case 1: return -kernelSin(rem.y0, rem.y1, 1);
      case 2: return -kernelCos(rem.y0, rem.y1);
      default: return kernelSin(rem.y0, rem.y1, 1);
    }
  }
  function tan(x) {
    x = +x;
    const ix = hi(x) & 0x7fffffff;
    if (ix <= 0x3fe921fb) return kernelTan(x, 0, 1);
    if (ix >= 0x7ff00000) return NaN;
    remPio2(x);
    return kernelTan(rem.y0, rem.y1, 1 - ((rem.n & 1) << 1));
  }

  const atanhi = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
  const atanlo = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
  const aT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01,
    9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02,
    4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
  function atan(x) {
    x = +x;
    const hx = hi(x), ix = hx & 0x7fffffff;
    let id;
    if (ix >= 0x44100000) {
      if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lo(x) !== 0)) return NaN;
      return hx > 0 ? atanhi[3] + atanlo[3] : -atanhi[3] - atanlo[3];
    }
    if (ix < 0x3fdc0000) {
      if (ix < 0x3e200000 && huge + x > 1) return x;
      id = -1;
    } else {
      x = fabs(x);
      if (ix < 0x3ff30000) {
        if (ix < 0x3fe60000) { id = 0; x = (2.0 * x - 1) / (2.0 + x); }
        else { id = 1; x = (x - 1) / (x + 1); }
      } else if (ix < 0x40038000) { id = 2; x = (x - 1.5) / (1 + 1.5 * x); }
      else { id = 3; x = -1.0 / x; }
    }
    const z = x * x, w = z * z;
    const s1 = z * (aT[0] + w * (aT[2] + w * (aT[4] + w * (aT[6] + w * (aT[8] + w * aT[10])))));
    const s2 = w * (aT[1] + w * (aT[3] + w * (aT[5] + w * (aT[7] + w * aT[9]))));
    if (id < 0) return x - x * (s1 + s2);
    const r = atanhi[id] - ((x * (s1 + s2) - atanlo[id]) - x);
    return hx < 0 ? -r : r;
  }
  const pi_o_4 = 7.8539816339744827900e-01, pi_o_2 = 1.5707963267948965580e+00, PI = 3.1415926535897931160e+00,
    pi_lo = 1.2246467991473531772e-16;
  function atan2(y, x) {
    y = +y; x = +x;
    if (x !== x || y !== y) return NaN;
    const hx = hi(x), ix = hx & 0x7fffffff, lx = lo(x), hy = hi(y), iy = hy & 0x7fffffff, ly = lo(y);
    if (((hx - 0x3ff00000) | lx) === 0) return atan(y);
    const m = ((hy >> 31) & 1) | ((hx >> 30) & 2);
    if ((iy | ly) === 0) {
      switch (m) {
        case 0: case 1: return y;
        case 2: return PI + tiny;
        default: return -PI - tiny;
      }
    }
    if ((ix | lx) === 0) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
    if (ix === 0x7ff00000) {
      if (iy === 0x7ff00000) {
        switch (m) {
          case 0: return pi_o_4 + tiny;
          case 1: return -pi_o_4 - tiny;
          case 2: return 3.0 * pi_o_4 + tiny;
          default: return -3.0 * pi_o_4 - tiny;
        }
      }
      switch (m) {
        case 0: return 0;
        case 1: return -0;
        case 2: return PI + tiny;
        default: return -PI - tiny;
      }
    }
    if (iy === 0x7ff00000) return hy < 0 ? -pi_o_2 - tiny : pi_o_2 + tiny;
    const k = (iy - ix) >> 20;
    let z;
    if (k > 60) z = pi_o_2 + 0.5 * pi_lo;
    else if (hx < 0 && k < -60) z = 0.0;
    else z = atan(fabs(y / x));
    switch (m) {
      case 0: return z;
      case 1: return -z;
      case 2: return PI - (z - pi_lo);
      default: return (z - pi_lo) - PI;
    }
  }

  // --- Exponentials ---------------------------------------------------------
  const P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05,
    P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;
  const ln2HI = 6.93147180369123816490e-01, ln2LO = 1.90821492927058770002e-10, invln2 = 1.44269504088896338700e+00;
  const o_threshold = 7.09782712893383973096e+02, u_threshold = -7.45133219101941108420e+02, twom1000 = 9.33263618503218878990e-302;
  function exp(x) {
    x = +x;
    let hx = hi(x);
    const xsb = (hx >> 31) & 1;
    hx &= 0x7fffffff;
    if (hx >= 0x40862E42) {
      if (hx >= 0x7ff00000) {
        if (((hx & 0xfffff) | lo(x)) !== 0) return NaN;
        return xsb === 0 ? x : 0.0;
      }
      if (x > o_threshold) return huge * huge;
      if (x < u_threshold) return twom1000 * twom1000;
    }
    let k = 0, hiPart = 0, loPart = 0;
    if (hx > 0x3fd62e42) {
      if (hx < 0x3FF0A2B2) {
        hiPart = x - (xsb === 0 ? ln2HI : -ln2HI); loPart = xsb === 0 ? ln2LO : -ln2LO; k = 1 - xsb - xsb;
      } else {
        k = native.trunc(invln2 * x + (xsb === 0 ? 0.5 : -0.5));
        hiPart = x - k * ln2HI; loPart = k * ln2LO;
      }
      x = hiPart - loPart;
    } else if (hx < 0x3e300000) {
      if (huge + x > 1) return 1 + x;
    }
    const t = x * x, c = x - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
    if (k === 0) return 1 - ((x * c) / (c - 2.0) - x);
    const y = 1 - ((loPart - (x * c) / (2.0 - c)) - hiPart);
    if (k >= -1021) return setHi(y, hi(y) + (k << 20));
    return setHi(y, hi(y) + ((k + 1000) << 20)) * twom1000;
  }
  const Q1 = -3.33333333333331316428e-02, Q2 = 1.58730158725481460165e-03, Q3 = -7.93650757867487942473e-05,
    Q4 = 4.00821782732936239552e-06, Q5 = -2.01099218183624371326e-07;
  function expm1(x) {
    x = +x;
    let hx = hi(x);
    const xsb = hx & 0x80000000;
    hx &= 0x7fffffff;
    if (hx >= 0x4043687A) {
      if (hx >= 0x40862E42) {
        if (hx >= 0x7ff00000) {
          if (((hx & 0xfffff) | lo(x)) !== 0) return NaN;
          return xsb === 0 ? x : -1.0;
        }
        if (x > o_threshold) return huge * huge;
      }
      if (xsb !== 0 && x + tiny < 0.0) return tiny - 1;
    }
    let k = 0, hiPart = 0, loPart = 0, c = 0;
    if (hx > 0x3fd62e42) {
      if (hx < 0x3FF0A2B2) {
        if (xsb === 0) { hiPart = x - ln2HI; loPart = ln2LO; k = 1; }
        else { hiPart = x + ln2HI; loPart = -ln2LO; k = -1; }
      } else {
        k = native.trunc(invln2 * x + (xsb === 0 ? 0.5 : -0.5));
        hiPart = x - k * ln2HI; loPart = k * ln2LO;
      }
      x = hiPart - loPart;
      c = (hiPart - x) - loPart;
    } else if (hx < 0x3c900000) {
      const t = huge + x;
      return x - (t - (huge + x));
    }
    const hfx = 0.5 * x, hxs = x * hfx;
    const r1 = 1 + hxs * (Q1 + hxs * (Q2 + hxs * (Q3 + hxs * (Q4 + hxs * Q5))));
    let t = 3.0 - r1 * hfx, e = hxs * ((r1 - t) / (6.0 - x * t));
    if (k === 0) return x - (x * e - hxs);
    e = (x * (e - c) - c);
    e -= hxs;
    if (k === -1) return 0.5 * (x - e) - 0.5;
    if (k === 1) return x < -0.25 ? -2.0 * (e - (x + 0.5)) : 1 + 2.0 * (x - e);
    let y;
    if (k <= -2 || k > 56) {
      y = 1 - (e - x);
      return setHi(y, hi(y) + (k << 20)) - 1;
    }
    if (k < 20) {
      t = setHi(1, 0x3ff00000 - (0x200000 >> k));
      y = t - (e - x);
    } else {
      t = setHi(1, (0x3ff - k) << 20);
      y = x - (e + t);
      y += 1;
    }
    return setHi(y, hi(y) + (k << 20));
  }
  function tanh(x) {
    x = +x;
    const jx = hi(x), ix = jx & 0x7fffffff;
    if (ix >= 0x7ff00000) return jx >= 0 ? 1 / x + 1 : 1 / x - 1;
    let z;
    if (ix < 0x40360000) {
      if (ix < 0x3c800000) return x * (1 + x);
      if (ix >= 0x3ff00000) { const t = expm1(2 * fabs(x)); z = 1 - 2 / (t + 2); }
      else { const t = expm1(-2 * fabs(x)); z = -t / (t + 2); }
    } else z = 1 - tiny;
    return jx >= 0 ? z : -z;
  }
  const ln2_hi = 6.93147180369123816490e-01, ln2_lo = 1.90821492927058770002e-10, two54 = 1.80143985094819840000e+16;
  const Lg1 = 6.666666666666735130e-01, Lg2 = 3.999999999940941908e-01, Lg3 = 2.857142874366239149e-01,
    Lg4 = 2.222219843214978396e-01, Lg5 = 1.818357216161805012e-01, Lg6 = 1.531383769920937332e-01, Lg7 = 1.479819860511658591e-01;
  function log(x) {
    x = +x;
    let hx = hi(x), k = 0;
    const lx = lo(x);
    if (hx < 0x00100000) {
      if (((hx & 0x7fffffff) | lx) === 0) return -Infinity;
      if (hx < 0) return NaN;
      k -= 54; x *= two54; hx = hi(x);
    }
    if (hx >= 0x7ff00000) return x + x;
    k += (hx >> 20) - 1023;
    hx &= 0x000fffff;
    let i = (hx + 0x95f64) & 0x100000;
    x = setHi(x, hx | (i ^ 0x3ff00000));
    k += (i >> 20);
    const f = x - 1.0, dk = k;
    if ((0x000fffff & (2 + hx)) < 3) {
      if (f === 0) return k === 0 ? 0 : dk * ln2_hi + dk * ln2_lo;
      const R = f * f * (0.5 - 0.33333333333333333 * f);
      return k === 0 ? f - R : dk * ln2_hi - ((R - dk * ln2_lo) - f);
    }
    const s = f / (2.0 + f), z = s * s;
    i = hx - 0x6147a;
    const w = z * z, j = 0x6b851 - hx;
    const t1 = w * (Lg2 + w * (Lg4 + w * Lg6)), t2 = z * (Lg1 + w * (Lg3 + w * (Lg5 + w * Lg7)));
    i |= j;
    const R = t2 + t1;
    if (i > 0) {
      const hfsq = 0.5 * f * f;
      return k === 0 ? f - (hfsq - s * (hfsq + R)) : dk * ln2_hi - ((hfsq - (s * (hfsq + R) + dk * ln2_lo)) - f);
    }
    return k === 0 ? f - s * (f - R) : dk * ln2_hi - ((s * (f - R) - dk * ln2_lo) - f);
  }

  const bp = [1.0, 1.5], dp_h = [0.0, 5.84962487220764160156e-01], dp_l = [0.0, 1.35003920212974897128e-08];
  const two53 = 9007199254740992.0;
  const L1 = 5.99999999999994648725e-01, L2 = 4.28571428578550184252e-01, L3 = 3.33333329818377432918e-01,
    L4 = 2.72728123808534006489e-01, L5 = 2.30660745775561754067e-01, L6 = 2.06975017800338417784e-01;
  const lg2 = 6.93147180559945286227e-01, lg2_h = 6.93147182464599609375e-01, lg2_l = -1.90465429995776804525e-09;
  const ovt = 8.0085662595372944372e-0017, cp = 9.61796693925975554329e-01, cp_h = 9.61796700954437255859e-01,
    cp_l = -7.02846165095275826516e-09, ivln2 = 1.44269504088896338700e+00, ivln2_h = 1.44269502162933349609e+00,
    ivln2_l = 1.92596299112661746887e-08;
  // ECMAScript semantics: pow(x, NaN) = NaN, pow(x, ±0) = 1, pow(±1, ±Infinity) = NaN.
  function pow(x, y) {
    x = +x; y = +y;
    const hx = hi(x), lx = lo(x), hy = hi(y), ly = lo(y);
    let ix = hx & 0x7fffffff;
    const iy = hy & 0x7fffffff;
    if ((iy | ly) === 0) return 1;
    if (ix > 0x7ff00000 || (ix === 0x7ff00000 && lx !== 0) || iy > 0x7ff00000 || (iy === 0x7ff00000 && ly !== 0)) return NaN;
    let yisint = 0, k, j;
    if (hx < 0) {
      if (iy >= 0x43400000) yisint = 2;
      else if (iy >= 0x3ff00000) {
        k = (iy >> 20) - 0x3ff;
        if (k > 20) {
          j = ly >>> (52 - k);
          if (((j << (52 - k)) >>> 0) === ly) yisint = 2 - (j & 1);
        } else if (ly === 0) {
          j = iy >> (20 - k);
          if ((j << (20 - k)) === iy) yisint = 2 - (j & 1);
        }
      }
    }
    if (ly === 0) {
      if (iy === 0x7ff00000) {
        if (((ix - 0x3ff00000) | lx) === 0) return NaN;
        if (ix >= 0x3ff00000) return hy >= 0 ? y : 0;
        return hy < 0 ? -y : 0;
      }
      if (iy === 0x3ff00000) return hy < 0 ? 1 / x : x;
      if (hy === 0x40000000) return x * x;
      if (hy === 0x3fe00000 && hx >= 0) return sqrt(x);
    }
    let ax = fabs(x);
    if (lx === 0 && (ix === 0x7ff00000 || ix === 0 || ix === 0x3ff00000)) {
      let z = ax;
      if (hy < 0) z = 1 / z;
      if (hx < 0) {
        if (((ix - 0x3ff00000) | yisint) === 0) z = NaN;
        else if (yisint === 1) z = -z;
      }
      return z;
    }
    let n = (hx >> 31) + 1;
    if ((n | yisint) === 0) return NaN;
    let s = 1;
    if ((n | (yisint - 1)) === 0) s = -1;
    let t1, t2, t, u, v, w, z;
    if (iy > 0x41e00000) {
      if (iy > 0x43f00000) {
        if (ix <= 0x3fefffff) return hy < 0 ? huge * huge : tiny * tiny;
        if (ix >= 0x3ff00000) return hy > 0 ? huge * huge : tiny * tiny;
      }
      if (ix < 0x3fefffff) return hy < 0 ? s * huge * huge : s * tiny * tiny;
      if (ix > 0x3ff00000) return hy > 0 ? s * huge * huge : s * tiny * tiny;
      t = ax - 1;
      w = (t * t) * (0.5 - t * (0.3333333333333333333333 - t * 0.25));
      u = ivln2_h * t;
      v = t * ivln2_l - w * ivln2;
      t1 = setLo(u + v, 0);
      t2 = v - (t1 - u);
    } else {
      n = 0;
      if (ix < 0x00100000) { ax *= two53; n -= 53; ix = hi(ax); }
      n += (ix >> 20) - 0x3ff;
      j = ix & 0x000fffff;
      ix = j | 0x3ff00000;
      if (j <= 0x3988E) k = 0;
      else if (j < 0xBB67A) k = 1;
      else { k = 0; n += 1; ix -= 0x00100000; }
      ax = setHi(ax, ix);
      u = ax - bp[k];
      v = 1 / (ax + bp[k]);
      const ss = u * v, s_h = setLo(ss, 0);
      let t_h = fromWords(((ix >> 1) | 0x20000000) + 0x00080000 + (k << 18), 0);
      let t_l = ax - (t_h - bp[k]);
      const s_l = v * ((u - s_h * t_h) - s_h * t_l);
      let s2 = ss * ss;
      let r = s2 * s2 * (L1 + s2 * (L2 + s2 * (L3 + s2 * (L4 + s2 * (L5 + s2 * L6)))));
      r += s_l * (s_h + ss);
      s2 = s_h * s_h;
      t_h = setLo(3.0 + s2 + r, 0);
      t_l = r - ((t_h - 3.0) - s2);
      u = s_h * t_h;
      v = s_l * t_h + t_l * ss;
      const p_h = setLo(u + v, 0), p_l = v - (p_h - u);
      const z_h = cp_h * p_h, z_l = cp_l * p_h + p_l * cp + dp_l[k];
      t = n;
      t1 = setLo(((z_h + z_l) + dp_h[k]) + t, 0);
      t2 = z_l - (((t1 - t) - dp_h[k]) - z_h);
    }
    const y1 = setLo(y, 0);
    let p_l = (y - y1) * t1 + y * t2, p_h = y1 * t1;
    z = p_l + p_h;
    j = hi(z);
    const i0 = lo(z);
    if (j >= 0x40900000) {
      if (((j - 0x40900000) | i0) !== 0) return s * huge * huge;
      if (p_l + ovt > z - p_h) return s * huge * huge;
    } else if ((j & 0x7fffffff) >= 0x4090cc00) {
      if ((((j - (0xc090cc00 | 0)) | 0) | i0) !== 0) return s * tiny * tiny;
      if (p_l <= z - p_h) return s * tiny * tiny;
    }
    let i = j & 0x7fffffff;
    k = (i >> 20) - 0x3ff;
    n = 0;
    if (i > 0x3fe00000) {
      n = j + (0x00100000 >> (k + 1));
      k = ((n & 0x7fffffff) >> 20) - 0x3ff;
      t = fromWords(n & ~(0x000fffff >> k), 0);
      n = ((n & 0x000fffff) | 0x00100000) >> (20 - k);
      if (j < 0) n = -n;
      p_h -= t;
    }
    t = setLo(p_l + p_h, 0);
    u = t * lg2_h;
    v = (p_l - (t - p_h)) * lg2 + t * lg2_l;
    z = u + v;
    w = v - (z - u);
    t = z * z;
    t1 = z - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
    const r = (z * t1) / (t1 - 2) - (w + z * w);
    z = 1 - (r - z);
    j = hi(z) + (n << 20);
    if ((j >> 20) <= 0) z = scalbn(z, n);
    else z = setHi(z, j);
    return s * z;
  }

  // Fixed summation order; sqrt is exactly rounded by specification.
  function hypot() {
    let sum = 0, nan = false;
    for (let i = 0; i < arguments.length; i++) {
      const v = +arguments[i];
      if (v === Infinity || v === -Infinity) return Infinity;
      if (v !== v) nan = true;
      sum += v * v;
    }
    return nan ? NaN : sqrt(sum);
  }

  const unavailable = name => function() {
    throw new Error(`LPRMath.${name} is not deterministic across engines; add a shared implementation before using it in physics code`);
  };
  const api = Object.create(null);
  for (const name of Object.getOwnPropertyNames(native)) {
    const value = native[name];
    if (typeof value === 'function') api[name] = unavailable(name);
    else api[name] = value;
  }
  // Exactly specified by ECMAScript: safe to delegate.
  for (const name of ['abs', 'ceil', 'floor', 'round', 'trunc', 'sign', 'sqrt', 'max', 'min', 'fround', 'imul', 'clz32'])
    api[name] = native[name];
  Object.assign(api, { sin, cos, tan, atan, atan2, exp, expm1, log, pow, tanh, hypot });
  api.deterministic = ['sin', 'cos', 'tan', 'atan', 'atan2', 'exp', 'expm1', 'log', 'pow', 'tanh', 'hypot'];

  // Hash every deterministic function over fixed inputs; identical on every engine.
  api.fingerprint = function() {
    const probes = {
      sin: v => sin(v), cos: v => cos(v), tan: v => tan(v * .3), atan: v => atan(v - 8),
      atan2: v => atan2(v - 8, 1.7 - v * .1), exp: v => exp(v * .05 - 5), expm1: v => expm1(v * .01 - .3),
      log: v => log(v), pow: v => pow(v, .94), pow2: v => pow(v * .7, 2.5), tanh: v => tanh(v * .2 - 3),
      hypot: v => hypot(v, 1.7, v * .3)
    };
    const out = {};
    for (const [name, probe] of Object.entries(probes)) {
      let h = 0;
      for (let i = 1; i <= 4000; i++) {
        f64[0] = probe(i * 0.0041 + 0.1);
        h = (native.imul(h ^ u32[0], 2654435761) ^ u32[1]) >>> 0;
      }
      out[name] = h.toString(16).padStart(8, '0');
    }
    return out;
  };
  Object.freeze(api);

  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LPRMath = api;
})(typeof window === 'object' ? window : globalThis);
