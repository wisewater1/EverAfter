# Ghost-Cone Volumetric Apparition with AI Personality Integration

## Introduction

Building a ghost-cone display that projects a person's virtual presence in mid-air requires two broad innovations:

1. A volumetric display capable of producing and controlling luminous voxels (light points) inside a cone filled with scattering particles.
2. A personality engine that animates the voxels with the voice, mannerisms, and knowledge of a specific individual derived from a year’s worth of interviews.

This report synthesises research on volumetric displays and describes a modular architecture for combining an AI-driven personality with a particle-based volumetric projector. Citations from peer-reviewed research and reputable news sources are provided.

### What the Ghost-Cone Enables

A production-ready ghost-cone would unlock several high-impact experiences. Each scenario combines volumetric rendering, retrieval-augmented dialogue, and safety tooling to create a coherent interaction:

- **Memorial telepresence**: Families can schedule a walk-up session in a remembrance space. Presence sensors wake the cone, the Self File loads a “family mode” persona, and the ghost greets visitors by name using permissioned memories. Session transcripts and memory lookups are logged for review by caregivers.
- **Storytelling installations**: Museums or cultural sites can host guided narrations from historical figures. Curators define exhibit chapters, attach multilingual narration tracks, and configure time-of-day lighting cues so the ghost’s colour temperature matches the environment.
- **Remote appearances**: Living participants stream a volumetric proxy to ceremonies or keynotes when travel is impossible. Real-time speech drives visemes, while latency buffers (<120 ms) keep gestures synchronised with the audio feed. Remote operators can trigger overlays (e.g., slides, captions) that float beside the apparition.
- **Therapeutic sessions**: Grief counsellors orchestrate supervised conversations with the apparition to aid processing. The policy engine enforces boundary scripts, while heart-rate or proximity sensors can automatically pause the session if distress thresholds are exceeded.
- **Education and training**: Organisations encapsulate rare expertise—such as veteran clinicians or master craftspeople—into interactive tutors. Step-by-step demonstrations are pre-scripted as voxel choreography, and the retrieval pipeline surfaces annotated tools or diagrams when learners ask for clarification.

These use cases depend on the layered hardware and software stack described below: stable particle volumes for drawing luminous voxels, high-speed rendering pipelines, and a permissioned AI personality that retrieves verified memories on demand. Operational playbooks for each experience type appear in [Experience Blueprints](#experience-blueprints).

## 1. Volumetric Display Foundations

### 1.1 Optical Trap Volumetric Displays

Traditional holographic displays create images on a two-dimensional surface, so the light-scattering medium and the image point are separate. In contrast, free-space volumetric displays generate luminous points directly in the air. Smalley et al. introduced a volumetric display that traps a cellulose particle in a photophoretic optical trap and then scans it through the display volume while illuminating it with red, green, and blue lasers.[^1] This platform produces full-colour graphics with ten-micrometre image points and a large colour gamut, and it avoids the “clipping” problems that plague surface-based 3D displays. The optical trap display demonstrates that by moving a tiny particle fast enough and flashing different colours, a viewer sees a persistent 3D object floating in mid-air.

### 1.2 Fog-Screen and Vapor Displays

Fog screens provide another approach to displaying images in free space. Researchers at the City University of Hong Kong developed interactive fog display prototypes that use projection mapping onto non-planar, reconfigurable fog screens.[^2] Images are displayed at multiple depth layers, and touch interaction is possible. The first prototype uses a calibrated projector and fog-emitter modules mounted on linear motion platforms, synchronised with the image content. The second prototype employs a two-dimensional array of switchable fog emitters; columns of laminar fog create a non-planar screen that scatters projected light.

### 1.3 Particle-Based Displays and Multimodal Feedback

Researchers at University College London’s Interaction Centre developed Particle Based Displays (PBDs). These systems use ultrasound transducer arrays to levitate and move particles rapidly, allowing volumetric content that users can see, hear, and feel.[^3] The real-time control of high-speed particles enables applications such as fully coloured volumetric displays, multi-point tactile feedback, and parametric audio. PBDs illustrate that volumetric displays can incorporate haptic feedback and sound by precisely controlling particle positions in three dimensions.

### 1.4 Mist Projection Systems

Panasonic’s “Silky Fine Mist” technology repurposes high-pressure cooling systems to create walk-through holograms. The system sprays a fine mist of water droplets around 6 micrometres in diameter; the droplets are smaller than typical fog particles and evaporate quickly.[^4] When this vapour is combined with projections, three-dimensional visuals appear to float in mid-air, and viewers can walk through the mist without encountering a solid surface. Although primarily used for art installations and branding displays, the technology underscores the importance of controlling droplet size and evaporation for clean, walk-through images.

## 2. Ghost-Cone Display Architecture

A ghost-cone device combines the principles above into a 50-inch-tall cone filled with scattering particles. Within the cone, programmable beams address specific voxels to draw a ghostly upper torso. The design is modular, with subsystems summarised below.

| Subsystem | Purpose | Research & design considerations |
| --- | --- | --- |
| Particle medium & scattering volume | Produce a uniform, laminar column of particles that scatter light. Mist droplets or levitated particles create the canvas for voxels. | Ultrasonic mist makers or atomisers generate droplets (~1–10 µm), guided by airflow and boundary meshes. Mist-based systems must balance droplet density for brightness versus haze; fine droplets (~6 µm) evaporate quickly.[^4] Fog screens demonstrate reconfigurable fog emitters for multi-depth displays,[^2] while particle-based displays show that ultrasound arrays can move particles precisely.[^3] |
| Volume shaping & containment | Maintain the cone’s shape and limit turbulence. Transparent guides or air curtains prevent drift and provide laminar flow. | Fog-screen prototypes use motorised fog emitters to shape non-planar screens,[^2] and particle-levitation research uses acoustic fields to localise particles.[^3] |
| Illumination & voxel projection | Use beam-steering (galvanometer mirrors, MEMS, or spatial light modulators) to target 3D positions. High-power, eye-safe lasers or LED sources supply the photons. | Optical-trap displays scan a single trapped particle and illuminate it with RGB lasers to create 3D points,[^1] while fog-screen projection mapping shows that synchronising projector movement with particle emitters enables depth control.[^2] |
| Calibration & feedback | Map commanded voxel positions to real 3D coordinates. Use cameras or depth sensors to calibrate beam aiming and compensate for drift in the particle medium. | Volumetric displays require precise calibration to align the scanning system with the particle volume; misalignment reduces image quality. |
| Control & rendering software | Convert a 3D model (the ghostly upper body) into a sequence of voxels. Optimise scanning paths, handle occlusion, and adjust brightness/dwell times. | Rendering should prioritise visible surfaces to reduce scanning load. Real-time control is essential for animation and interaction. |
| Structure & enclosure | Provide a rigid, vibration-isolated frame; house electronics, optics, and particle generators; ensure safety and ventilation. | Tiny vibrations can blur optical-trap displays; robust support reduces misalignment.[^1] |
| Interaction & sensing (optional) | Detect gestures or presence (via cameras, depth sensors, or haptics). Modulate the voxel schedule in response to user actions. | Particle-based displays provide tactile feedback and audio using ultrasound,[^3] and fog displays demonstrate touch interaction.[^2] |

## 3. Building Blocks for a 50-Inch Ghost-Cone

1. **Particle generation**: Choose an ultrasonic mist maker or aerosol emitter capable of producing a stable column of droplets within a 50-inch cone. Ensure droplet size ~6–10 µm to maximise scattering and minimise residual dampness distribution. Use a ring of emitters to create a smooth volume.[^4]
2. **Illumination engine**: Deploy galvanometer mirrors or a MEMS scanner with an RGB laser or high-power LED. Beam steering should achieve sub-millimetre accuracy within the cone. Consider multiple beams or multiplexing to reduce scan time.
3. **Voxel scheduling**: Divide the cone into vertical slices (e.g., 100 layers). Within each slice, scan voxels radially and angularly. To avoid flicker, update the entire volume at 30–60 Hz and adjust dwell times to account for brightness and scattering.
4. **Calibration**: Place cameras around the cone to monitor where voxels appear. Use calibration algorithms to align commanded positions with actual beam impacts. Feedback loops should compensate for drift caused by airflow or droplet movement.
5. **Ghost rendering**: Build a 3D mesh of the person’s upper body. Use rendering software to convert the mesh into voxels, applying alpha blending and dithering to create a semi-transparent appearance. Adjust opacity and jitter to enhance ghostliness.
6. **Safety & environment**: Use eye-safe lasers and shield stray beams. Provide ventilation or dehumidification to avoid dampness. Regularly monitor droplet concentration to prevent mould or respiratory issues.[^4]

## 4. Integrating an AI Personality

Beyond creating a volumetric ghost, the project aims to animate the ghost with a faithful personality derived from extensive interviews. This requires a pipeline from data collection to real-time performance.

### 4.1 Personality Profile (the Self File)

The Self File is a structured JSON document summarising the subject’s identity, traits, speech patterns, and memories. It might include:

- **Identity**: name, pronouns, age bracket, and languages.
- **Traits**: Big-Five personality scores, values, humour style, moral palette.
- **Idiolect**: common phrases, filler words, sentence length distribution.
- **Topics**: ranked interests and aversions (e.g., loves jazz, avoids politics).
- **Memories**: verified facts (events, relationships) stored with confidence scores.
- **Boundaries**: topics the model should avoid; escalation rules for grief or trauma.
- **Style**: tone sliders (warm, clinical, poetic), humour style, empathy level.
- **Examples**: 30–100 genuine answers from the subject to ground the model.

### 4.2 Knowledge & Memory

To prevent confabulation, the system uses a retrieval-augmented generation (RAG) architecture:

- **Fact graph**: A graph database stores entities (people, places, dates) and their relationships. Each node has timestamps and permission levels. When the ghost is asked about a memory, the system queries this graph first.
- **Vector store**: A vector database holds embeddings of long answers, stories, and letters. Semantic search retrieves relevant anecdotes or quotes.
- At runtime, the top-K memories are fetched and passed to the language model to craft a response in the subject’s style.

### 4.3 Dialogue Management

A dialogue brain controls how the ghost interacts:

1. **NLU router**: Classifies user intent (question, reminiscence, comfort, joke, refusal, etc.).
2. **Policy**: A finite-state machine with rules for greetings, small talk, deeper topics, and closure. Guardrails prevent the ghost from giving medical or legal advice and enforce boundaries.[^4]
3. **NLG persona**: A large language model prompt is composed from the subject’s traits, idiolect, and retrieved memories. The system instructs the model to speak with specific tone and to cite only verified memories.

An affect model tracks the emotional state (arousal and valence). The ghost’s voice and gestures adjust to reflect sadness, enthusiasm, or calm.

### 4.4 Performance Engine

To make the AI feel alive in a volumetric display, several synchronised channels are generated:

- **Text-to-speech (TTS)**: Neural TTS with controllable style tokens produces the ghost’s voice. Prosody parameters (pitch, pace, breathiness) are modulated by the affect model. Voice cloning requires explicit consent.
- **Visemes / lip sync**: Phonemes from the TTS are mapped to visemes (mouth shapes) at high frame rates (60–120 fps).
- **Gesture synthesis**: Behaviour-tree or diffusion models generate head nods, arm motions, and habitual tics (e.g., chin tilt).
- **Gaze control**: The ghost looks towards the user’s head position, with natural saccades and gaze aversion periods.
- **Idle loops**: Subtle breathing, weight shifts, and micro-movements prevent the figure from appearing frozen.

These outputs are merged into frame tracks that the volumetric renderer can interpret: audio streams, viseme sequences, joint rotations, and gaze targets. A flicker shader can add subtle noise and heartbeat-synchronised pulses to emphasise the spectral effect.

### 4.5 Real-Time Loop

The system executes a loop every few hundred milliseconds:

1. Sense: Capture user speech and pose via microphones and depth cameras.
2. Understand: Run NLU to determine intent; extract entities.
3. Recall: Retrieve relevant memories from the graph and vector store.
4. Plan: Choose a dialog strategy; check boundaries.
5. Generate: Compose a response using the large language model.
6. Render: Use TTS and gesture synthesis to produce audio and animation tracks. Feed these to the ghost-cone renderer (voxel scheduler, beam steering).
7. Adapt: Update the affect model based on user reactions.

The target end-to-end latency (from user utterance to ghost reply) should be under 150 ms to maintain conversational flow.

### 4.6 Consent, Safety, and Ethics

Using a person’s likeness requires clear, revocable consent. The system stores signed consents and allows the subject or their estate to revoke the model. Privacy modes (“public,” “family,” “private”) govern which memories are accessible. Every memory retrieval and response is logged for auditing. Periodic “red team” prompts test the ghost for bias, confabulation, and boundary violations.

## 5. Implementation Roadmap

1. **Week 1–2**: Construct the Self File from interview data; select 30 golden responses; define boundaries. Set up RAG components (graph and vector database).
2. **Week 3–4**: Implement TTS with style tokens and a viseme pipeline; create simple gesture loops; test persona on a 2D avatar.
3. **Week 5–6**: Integrate the avatar into the ghost-cone renderer. Map visemes and joint rotations to voxel positions and tune opacity/flicker. Begin logging consent and interactions.
4. **Week 7–8**: Polish interactions (interruptions, laughter, grief modes). Conduct family evaluations to ensure the ghost sounds and behaves like the person. Lock refusal scripts.
5. **Beyond**: Add interaction sensors, haptic modules, or mid-air audio. Explore colour voxels and dynamic transparency. Expand the system to support multiple characters or telepresence.

## 6. Experience Blueprints

The following blueprints translate the core subsystems into operational runbooks. Each table summarises the pre-session setup, live orchestration, and follow-up artefacts required for a dependable experience.

### 6.1 Memorial Telepresence Session

| Phase | Key actions | Tooling & safeguards |
| --- | --- | --- |
| **Preparation (T-24h)** | Curate relevant memories, verify consent status, and configure the Self File persona mode (e.g., "family – comfort"). | Consent ledger, memory graph curation console, privacy policy review checklist. |
| **Warm-up (T-10 min)** | Run mist generator diagnostics, execute calibration sweep, and play a silent lip-sync rehearsal to validate voxel alignment. | Automated health-check script, calibration cameras, ops dashboard alerts. |
| **Session (0–30 min)** | Sense arrivals via depth cameras, greet visitors by name, pace dialogue based on affect signals, and enforce boundary scripts if disallowed topics arise. | Intent classifier, affect model, policy engine with escalation triggers, on-call facilitator view. |
| **Post-session (T+10 min)** | Auto-generate a reflection packet summarising prompts asked, memories retrieved, and guardrail interventions; queue anonymised metrics for quality review. | Secure session log store, analytics pipeline, red-team prompt rotation. |

### 6.2 Museum Storytelling Loop

| Phase | Key actions | Tooling & safeguards |
| --- | --- | --- |
| **Preparation (T-1 week)** | Record narration variants, author exhibit chapters, and pre-render gesture clips for each chapter. | Content management interface, motion library, localisation workflow. |
| **Loop runtime (daily)** | Align mist lighting with gallery lighting schedule, trigger narration chapters via visitor proximity, and surface interactive prompts on adjacent signage. | Lighting control DMX bridge, visitor heatmap, signage CMS integration. |
| **Maintenance (weekly)** | Review analytics on dwell time and prompt engagement, rotate seasonal stories, and run red-team prompts to validate boundary adherence. | BI dashboards, QA checklist, audit log exporter. |

### 6.3 Remote Appearance Broadcast

| Phase | Key actions | Tooling & safeguards |
| --- | --- | --- |
| **Preparation (T-48h)** | Calibrate latency budget, rehearse duplex audio link, and map stage lighting cues to volumetric opacity levels. | Network latency monitor, TTS fallback voice pack, lighting cue sheet. |
| **Live stream (0–90 min)** | Capture speaker audio via high-quality mic, translate phonemes into visemes with <2 frame delay, monitor jitter buffer, and render supplemental slides as voxel side-panels. | WebRTC uplink, phoneme-to-viseme service, jitter analytics, overlay compositor. |
| **Wrap-up (T+15 min)** | Archive transcript, label highlight moments, and gather operator notes on any latency spikes or guardrail interventions. | Session archive service, operator annotation UI, incident tracker. |

## Conclusion

Creating a ghost-cone that convincingly embodies a specific individual is a grand challenge at the intersection of optics, acoustics, AI, and human-computer interaction. Optical trap displays prove that scanning a single illuminated particle can create a full-colour volumetric image.[^1] Interactive fog screens and mist projection systems show that controlled aerosols can form walk-through, touch-sensitive displays,[^2][^4] while particle-based displays extend the concept to multimodal experiences, combining sight, sound, and touch.[^3] Integrating a personality model with these technologies requires careful curation of the subject’s traits and memories, robust dialogue management, real-time rendering, and strict ethical safeguards. When executed thoughtfully, the ghost-cone could offer comforting, immersive interactions that honour a loved one’s voice and presence without erasing the humanity behind the technology.

## References

[^1]: Smalley, D. E., et al. "A photophoretic-trap volumetric display." *Nature* (2018). https://www.nature.com/articles/nature25176
[^2]: "Researchers Develop 3D Holographic Projection." *Display Daily* (2024). https://displaydaily.com/researchers-develop-3d-holographic-projection/
[^3]: "Particle-based Displays." UCL Interaction Centre. https://www.ucl.ac.uk/uclic/research-projects/2023/nov/particle-based-displays
[^4]: Statt, N. "Panasonic's Silky Fine Mist creates walk-through holograms for real-world displays." *TechSpot* (2024). https://www.techspot.com/news/104835-panasonic-silky-fine-mist-creates-walk-through-holograms.html
