# INSIDE AI — Beyond the Algorithm

An immersive, scroll-driven documentary about artificial intelligence. Eight chapters, six
interactive demonstrations, no backend, no accounts, no tracking. Everything — including the neural
network that actually trains in your browser — runs locally as a static site.

> **The principle:** don't just explain artificial intelligence. Let the visitor experience how it works.

---

## Run it locally

There is no build step. Any static file server works:

```bash
# from the repository root
python3 -m http.server 3000
# → http://localhost:3000
```

Or `npx serve .`, or open `index.html` through any static host. (A plain `file://` open will
block ES modules, so use a server.)

**Deployment:** the site is pure HTML/CSS/JS. On Render, `render.yaml` is a ready Blueprint
(runtime: static, publish path: `.`, empty build command). On Netlify/Vercel/GitHub Pages,
publish the repository root. `.nojekyll` is included for GitHub Pages.

---

## The journey

| # | Chapter | What happens |
|---|---------|--------------|
| — | **Prologue — The Unknown Machine** | A canvas neural lattice forms in the dark; the opening lines give way to the title. |
| 01 | **Intelligence, Engineered** | Pinned comparison of traditional programming vs. machine learning, plus a live "learn by example" experiment: a real polynomial logistic regression trained on points you control. |
| 02 | **The Data Factory** | A five-stage pipeline (collection → cleaning → labelling → preparation → training) you can scroll or click through, with four kinds of raw material and their specific failure modes. |
| 03 | **Inside the Network** | A hand-built SVG network (3–4–4–2). Inspect any neuron, read its weighted sum, bias and incoming contributions, move the inputs, randomise the weights, and run an animated forward pass with real softmax output. |
| 04 | **The Training Room** | A genuinely trained network: forward propagation, binary cross-entropy, backpropagation with momentum, and a live decision boundary, loss curve, train/test accuracy and probe predictions. Learning rate, capacity and dataset are adjustable. |
| 05 | **Words into Tokens** | Your own sentence becomes tokens → vectors → a causal attention map → next-token probabilities, then generated token by token. |
| 06 | **Into the World** | A pinned horizontal narrative through healthcare, education, agriculture, transport, accessibility, research, manufacturing and creative work — each with a real-world example, benefits and limits. |
| 07 | **The Limits** | Hallucination, bias, privacy, misinformation, copyright and oversight, plus a three-scenario "would you trust this?" judgement exercise. |
| 08 | **The Human Question** | The closing lines, then a six-question knowledge challenge with explanations, scoring and a result screen. |

---

## What is real, and what is illustrative

**Real, computed live in your browser:**

- Chapter 1's classifier — quadratic-feature logistic regression, trained with gradient descent.
- Chapter 3's network maths — weighted sums, ReLU, softmax, rendered from the actual weights.
- Chapter 4's training simulator — `js/nn.js` implements a tanh/sigmoid MLP with
  binary cross-entropy loss, full backpropagation and momentum gradient descent. The boundary
  you see is sampled from the model on a 46 × 46 grid after every few epochs.
- Chapter 5's tokenizer, embeddings, attention weights and next-token distribution — all
  computed from your input. The generation is a small bigram model.

**Deliberately simplified, and labelled as such in the interface:**

- Diagrams use tiny numbers (3 inputs, 8 hidden units, 8 embedding dimensions). Real models are
  the same mathematics at a scale of billions.
- The tokenizer is a local illustration of sub-word splitting, **not** GPT's BPE vocabulary.
- The attention heat-map is computed from hashed token vectors and position, not from a
  trained transformer's internal state.
- Chapter 5's language model is trained on a few dozen sentences written for this page. Its
  output is only meant to show the *mechanism* of sequential generation.

Nothing here claims to be a frontier model, and no external AI service is contacted.

---

## Structure

```
index.html              all eight chapters, semantic landmarks, no framework
css/
  fonts.css             @font-face for the three self-hosted variable fonts
  style.css             design tokens, chapter layout, responsive rules, reduced-motion
js/
  main.js               entry point
  core.js               boot, Lenis + GSAP plumbing, chrome, reveals, counters
  hero.js               canvas lattice + opening timeline + pinned exit
  chapter1.js           pinned rules-vs-learning sequence, learn-by-example demo
  chapter2.js           data pipeline content, stage/type interaction
  network.js            chapter 3 SVG network: layout, inspection, forward pass
  nn.js                 the real MLP (forward, loss, backprop, datasets)
  training.js           chapter 4 dashboard and training loop
  transformer.js        tokenizer, embeddings, attention, bigram generation
  applications.js       eight domains + horizontally scrubbed gallery
  limits.js             failure modes, judgement exercise
  quiz.js               final challenge + closing reveals
vendor/
  gsap.min.js, ScrollTrigger.min.js, lenis.min.js
  fonts/*.woff2          Space Grotesk, Inter, JetBrains Mono (latin subsets)
  licenses/              GSAP, Lenis (MIT), fonts (OFL)
render.yaml, .nojekyll, .gitignore
```

### Technical notes

- **GSAP + ScrollTrigger** drive every scroll relationship. Pinning is used for exactly four
  moments: the prologue, chapter 1's comparison, chapter 6's gallery, and nothing else —
  the rest of the document scrolls natively.
- **Lenis** smooths wheel scrolling and feeds `ScrollTrigger.update()` from the GSAP ticker.
  It is skipped entirely under `prefers-reduced-motion`.
- Libraries are **vendored** rather than pulled from a CDN, so the site has zero third-party
  requests at runtime and works offline.
- All illustrations are inline SVG; the two canvases draw the hero lattice and the training
  visualisation. There are no particle systems and no 3D engine.
- Chapter modules are initialised inside `try / catch` blocks, so a failure in one chapter can
  never leave the rest of the page blank.

### Accessibility & performance

- Real `<button>` elements for every control, visible focus rings, labelled landmarks,
  `aria-live` regions for the neuron inspector, the judgement feedback and the quiz.
- `prefers-reduced-motion` removes pinning, the hero lattice animation, the horizontal gallery
  (stacked into a grid instead) and all reveal tweens; every demonstration and every chapter
  remains fully usable.
- The training loop pauses when the lab is off-screen or the tab is hidden, and runs a few
  epochs per frame rather than one per tick.
- Mobile gets a deliberately different layout: the network is re-laid-out vertically, the
  data pipeline becomes an accordion, the gallery becomes a vertical chapter, and the
  scroll-jacking is removed.

---

## Accuracy and sources

The explanations follow standard accounts of the field. Useful references:

- Brown et al., *Language Models are Few-Shot Learners* (GPT-3), 2020 — 175B parameters, 96 layers, ~300B training tokens.
- Vaswani et al., *Attention Is All You Need*, 2017 — the transformer and scaled dot-product attention.
- LeCun, Bengio & Hinton, *Deep Learning*, Nature, 2015.
- Jumper et al., *Highly accurate protein structure prediction with AlphaFold*, Nature, 2021.
- De Fauw et al., *Clinically applicable deep learning for diagnosis and referral in retinal disease*, Nature Medicine, 2018 (Moorfields Eye Hospital).

The site deliberately avoids predictions about superintelligence, timelines or "AGI", and
presents the social questions as open ones.

---

## License

Original code and writing: free to use and adapt with attribution.
GSAP is used under the GreenSock standard no-charge license (see `vendor/licenses/GSAP.txt`).
Lenis is MIT. The three typefaces are licensed under the SIL Open Font License.
