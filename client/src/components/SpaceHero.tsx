import { ArrowDown, ArrowUpRight, Orbit, Sparkles } from "lucide-react";
import { Link } from "wouter";

const ORBIT_ART =
  "/manus-storage/async-images/phoW5VZofhAFsALXAVqIaA/image-1.webp";

export default function SpaceHero() {
  return (
    <section className="space-hero" aria-labelledby="space-hero-title">
      <div className="space-hero-art" aria-hidden="true">
        <img
          src={ORBIT_ART}
          alt=""
          onError={event => {
            const image = event.currentTarget;
            if (!image.dataset.fallback) {
              image.dataset.fallback = "true";
              image.src = "/space-orbit.webp";
            }
          }}
        />
        <div className="hero-art-shade" />
      </div>
      <div className="meteor-streak meteor-streak-one" aria-hidden="true" />
      <div className="meteor-streak meteor-streak-two" aria-hidden="true" />
      <div className="hero-content">
        <div className="hero-kicker">
          <span className="kicker-rule" />
          <span>MICROGRAVITY. COMBUSTION. DISCOVERY.</span>
        </div>
        <h1 id="space-hero-title">
          Explore fire.
          <br />
          <span>Beyond Earth.</span>
        </h1>
        <p className="hero-description">
          A different environment. A deeper question.
          <br />
          Investigate how airflow relates to flame survival
          <br className="desktop-break" /> through real NASA BASS / BASS-II
          experiments.
        </p>
        <div className="hero-actions">
          <a className="hero-primary" href="#experiment-workspace">
            Explore experiments <ArrowDown size={17} />
          </a>
          <Link className="hero-secondary" href="/evidence">
            Follow the evidence <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="hero-data-note">
          <Sparkles size={12} /> Real observations. No simulated outcomes.
        </div>
      </div>
      <div className="orbit-reticle orbit-reticle-one" aria-hidden="true">
        <i />
        <span />
      </div>
      <div className="orbit-reticle orbit-reticle-two" aria-hidden="true">
        <i />
        <span />
      </div>
      <div className="hero-orbit-label" aria-hidden="true">
        <span className="orbital-label-rule" />
        <Orbit size={19} />
        <div>
          <b>THE ORBITAL PERSPECTIVE</b>
          <span>Small flames. A bigger universe.</span>
        </div>
      </div>
      <div className="hero-bottom-line">
        <span>01 / EXPERIMENTAL EXPLORER</span>
        <span>
          ILLUSTRATIVE SPACE ENVIRONMENT <span className="cyan">✦</span>
        </span>
      </div>
    </section>
  );
}
