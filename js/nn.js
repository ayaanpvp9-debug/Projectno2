/* ==========================================================================
   NN — a small, genuine neural network in plain JavaScript.

   Architecture:  arbitrary depth, tanh hidden layers, sigmoid output.
   Loss:          binary cross-entropy (mean over the batch).
   Learning:      full-batch backpropagation + gradient descent.
   Everything here is real arithmetic — no animations, no faked values.
   ========================================================================== */

const sigmoid = (z) => 1 / (1 + Math.exp(-z));

export class NeuralNet {
  /**
   * @param {number[]} sizes - layer widths, e.g. [2, 8, 8, 1]
   * @param {number} seed - deterministic initialisation
   */
  constructor(sizes, seed = 12345) {
    if (!Array.isArray(sizes) || sizes.length < 2) {
      throw new Error("NeuralNet needs at least an input and an output layer");
    }
    this.sizes = sizes;
    this.depth = sizes.length - 1;
    this.W = [];
    this.B = [];

    let state = seed >>> 0;
    const random = () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    for (let l = 0; l < this.depth; l++) {
      const nIn = sizes[l];
      const nOut = sizes[l + 1];
      const scale = Math.sqrt(2 / (nIn + nOut));
      const layerW = [];
      const layerB = [];
      for (let j = 0; j < nOut; j++) {
        const row = new Float64Array(nIn);
        for (let i = 0; i < nIn; i++) row[i] = (random() * 2 - 1) * scale;
        layerW.push(row);
        layerB.push((random() * 2 - 1) * 0.1);
      }
      this.W.push(layerW);
      this.B.push(layerB);
    }

    // Momentum buffers (one per weight/bias) — smoother descent, same maths.
    this.vW = this.W.map((layer) => layer.map((row) => new Float64Array(row.length)));
    this.vB = this.B.map((layer) => new Float64Array(layer.length));

    /** Total number of learnable parameters. */
    this.parameterCount = this.W.reduce(
      (acc, layer) => acc + layer.reduce((a, row) => a + row.length + 1, 0),
      0
    );
  }

  /**
   * Forward pass for a single sample.
   * Returns activations (a[0] = input) and pre-activations (z[0] = first layer).
   */
  forward(x) {
    const a = [x];
    const z = [];
    for (let l = 0; l < this.depth; l++) {
      const nOut = this.sizes[l + 1];
      const zl = new Float64Array(nOut);
      const al = new Float64Array(nOut);
      const isOutput = l === this.depth - 1;
      for (let j = 0; j < nOut; j++) {
        const row = this.W[l][j];
        let sum = this.B[l][j];
        const prev = a[l];
        for (let i = 0; i < row.length; i++) sum += row[i] * prev[i];
        zl[j] = sum;
        al[j] = isOutput ? sigmoid(sum) : Math.tanh(sum);
      }
      z.push(zl);
      a.push(al);
    }
    return { a, z };
  }

  /** Probability of class 1 for a single sample. */
  predict(x) {
    const { a } = this.forward(x);
    return a[this.depth][0];
  }

  /** Mean binary cross-entropy over a batch. */
  loss(X, Y) {
    let total = 0;
    for (let n = 0; n < X.length; n++) {
      const p = Math.min(1 - 1e-7, Math.max(1e-7, this.predict(X[n])));
      total += -(Y[n] * Math.log(p) + (1 - Y[n]) * Math.log(1 - p));
    }
    return total / X.length;
  }

  accuracy(X, Y) {
    let correct = 0;
    for (let n = 0; n < X.length; n++) {
      if ((this.predict(X[n]) > 0.5 ? 1 : 0) === Y[n]) correct++;
    }
    return correct / X.length;
  }

  /**
   * One epoch of full-batch gradient descent.
   * @returns {number} mean loss for this epoch
   */
  trainEpoch(X, Y, learningRate = 0.3, momentum = 0.9) {
    const n = X.length;
    const dW = [];
    const dB = [];
    for (let l = 0; l < this.depth; l++) {
      dW.push(this.W[l].map((row) => new Float64Array(row.length)));
      dB.push(new Float64Array(this.B[l].length));
    }

    let totalLoss = 0;

    for (let s = 0; s < n; s++) {
      const { a, z } = this.forward(X[s]);
      const y = Y[s];
      const p = Math.min(1 - 1e-7, Math.max(1e-7, a[this.depth][0]));
      totalLoss += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));

      // Output layer: dL/dz = p - y (the BCE + sigmoid shortcut)
      let delta = new Float64Array(this.sizes[this.depth]);
      delta[0] = p - y;

      for (let l = this.depth - 1; l >= 0; l--) {
        const prev = a[l];
        for (let j = 0; j < this.sizes[l + 1]; j++) {
          const d = delta[j];
          if (d === 0) continue;
          const rowGrad = dW[l][j];
          for (let i = 0; i < prev.length; i++) rowGrad[i] += d * prev[i];
          dB[l][j] += d;
        }

        if (l > 0) {
          const nextDelta = new Float64Array(this.sizes[l]);
          for (let i = 0; i < this.sizes[l]; i++) {
            let sum = 0;
            for (let j = 0; j < this.sizes[l + 1]; j++) {
              sum += this.W[l][j][i] * delta[j];
            }
            // tanh derivative: 1 - a^2
            nextDelta[i] = sum * (1 - prev[i] * prev[i]);
          }
          delta = nextDelta;
        }
      }
    }

    // Apply the averaged gradient step, with momentum.
    const step = learningRate / n;
    for (let l = 0; l < this.depth; l++) {
      for (let j = 0; j < this.W[l].length; j++) {
        const row = this.W[l][j];
        const grad = dW[l][j];
        const vRow = this.vW[l][j];
        for (let i = 0; i < row.length; i++) {
          vRow[i] = momentum * vRow[i] - step * grad[i];
          row[i] += vRow[i];
        }
        this.vB[l][j] = momentum * this.vB[l][j] - step * dB[l][j];
        this.B[l][j] += this.vB[l][j];
      }
    }

    const loss = totalLoss / n;
    return Number.isFinite(loss) ? loss : 5;
  }
}

/* --------------------------------------------------------------------------
   Dataset generators — deterministic, normalised to roughly [-1, 1]
   -------------------------------------------------------------------------- */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {"xor"|"circles"|"moons"} kind
 * @param {number} count
 * @param {number} noise - label noise (0–0.15)
 */
export function makeDataset(kind, count = 260, noise = 0.04) {
  const random = createRandom(kind === "xor" ? 11 : kind === "circles" ? 22 : 33);
  const X = [];
  const Y = [];

  for (let i = 0; i < count; i++) {
    let x;
    let y;
    let label;

    if (kind === "xor") {
      x = random() * 2 - 1;
      y = random() * 2 - 1;
      label = (x > 0 ? 1 : 0) ^ (y > 0 ? 1 : 0);
    } else if (kind === "circles") {
      const r = Math.sqrt(random()) * 0.95;
      const angle = random() * Math.PI * 2;
      x = r * Math.cos(angle);
      y = r * Math.sin(angle);
      label = r < 0.58 ? 1 : 0; // label 1 = inside the ring
    } else {
      // Two interlocking crescents.
      const isTop = random() > 0.5;
      const angle = random() * Math.PI;
      const rr = 0.82;
      if (isTop) {
        x = rr * Math.cos(angle) - 0.05;
        y = rr * Math.sin(angle) - 0.15;
        label = 0;
      } else {
        x = rr * Math.cos(-angle) + 0.45;
        y = rr * Math.sin(-angle) + 0.25;
        label = 1;
      }
      x += (random() - 0.5) * 0.09;
      y += (random() - 0.5) * 0.09;
    }

    if (random() < noise) label = label === 1 ? 0 : 1;

    X.push([x, y]);
    Y.push(label);
  }

  return { X, Y };
}
