import React from 'react';
import { useTheme } from '../context/ThemeContext';
import './CivilBackground.css';

/**
 * Animated civil-engineering themed background.
 * Mount ONCE in App.jsx (inside ThemeProvider, outside page content)
 * so it persists across routes and reacts to theme changes.
 */
export default function CivilBackground() {
  const { theme } = useTheme();

  return (
    <div className="ce-bg" data-theme={theme} aria-hidden="true">
      <div className="ce-bg__sky" />

      {/* stars (dark mode only, via CSS opacity on data-theme) */}
      <div className="ce-bg__stars ce-bg__stars--1" />
      <div className="ce-bg__stars ce-bg__stars--2" />

      {/* sun / moon arcing across the sky */}
      <div className="ce-bg__orbit">
        <div className="ce-bg__celestial" />
      </div>

      {/* parallax clouds */}
      <div className="ce-cloud ce-cloud--1" />
      <div className="ce-cloud ce-cloud--2" />
      <div className="ce-cloud ce-cloud--3" />

      {/* blueprint grid */}
      <div className="ce-bg__grid" />
      <div className="ce-bg__grid ce-bg__grid--major" />

      <svg
        className="ce-bg__scene"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMax slice"
      >
        {/* sweeping measurement line */}
        <g className="ce-scan">
          <line className="ce-stroke ce-stroke--thin ce-accent" x1="0" y1="0" x2="1440" y2="0" strokeDasharray="6 10" />
        </g>

        {/* ---- floating structural elements (parallax depth) ---- */}
        <g className="ce-float" transform="translate(160 180)">
          <path className="ce-stroke" d="M0 0h60v12H38v46h22v12H0V58h22V12H0z" />
        </g>

        <g className="ce-float ce-float--2" transform="translate(1250 300)">
          <g className="ce-spin">
            <polygon className="ce-stroke" points="30,0 56,15 56,45 30,60 4,45 4,15" />
            <circle className="ce-stroke" cx="30" cy="30" r="11" />
          </g>
        </g>

        <g className="ce-float ce-float--3" transform="translate(300 480)">
          <path className="ce-stroke ce-stroke--soft" d="M0 60 L40 0 L80 60 Z M20 30 L60 30 M40 0 L40 60" />
        </g>

        <g className="ce-float ce-float--4" transform="translate(1080 520)">
          <g className="ce-spin">
            <circle className="ce-stroke ce-stroke--soft" cx="40" cy="40" r="36" strokeDasharray="4 8" />
            <circle className="ce-stroke" cx="40" cy="40" r="18" />
            <path className="ce-stroke" d="M40 0v18M40 62v18M0 40h18M62 40h18" />
          </g>
        </g>

        <g className="ce-float ce-float--2" transform="translate(640 140)">
          <path className="ce-stroke ce-stroke--soft ce-stroke--thin" d="M0 70V0h90v70M0 35h90M45 0v70" />
          <circle className="ce-stroke ce-stroke--thin" cx="0" cy="35" r="3" />
          <circle className="ce-stroke ce-stroke--thin" cx="90" cy="35" r="3" />
          <circle className="ce-stroke ce-stroke--thin" cx="45" cy="35" r="3" />
        </g>

        {/* ---- tower crane (right) ---- */}
        <g className="ce-crane">
          <path className="ce-stroke" d="M1170 760V160M1190 760V160" />
          <path className="ce-stroke ce-stroke--thin ce-stroke--soft"
            d="M1170 740l20-20M1170 700l20-20M1170 660l20-20M1170 620l20-20M1170 580l20-20M1170 540l20-20M1170 500l20-20M1170 460l20-20M1170 420l20-20M1170 380l20-20M1170 340l20-20M1170 300l20-20M1170 260l20-20M1170 220l20-20" />
          <g className="ce-crane__jib">
            <path className="ce-stroke" d="M980 160H1340" />
            <path className="ce-stroke ce-stroke--thin" d="M980 160L1180 110L1340 160M1180 110V160" />
            <rect className="ce-stroke" x="1300" y="160" width="40" height="22" />
            <path className="ce-stroke ce-stroke--thin ce-stroke--soft"
              d="M1000 160l20-10M1040 160l20-10M1080 160l20-10M1120 160l20-10" />
            <g className="ce-crane__hook">
              <path className="ce-stroke ce-stroke--thin" d="M1020 160V300" />
              <path className="ce-stroke" d="M1020 300q0 14-10 16q-6 0-8-6" />
              <rect className="ce-stroke ce-accent" x="1004" y="316" width="32" height="18" />
            </g>
          </g>
          {/* blinking aviation warning light */}
          <circle className="ce-crane__light" cx="1180" cy="100" r="5" />
        </g>

        {/* ---- truss bridge with river + moving traffic ---- */}
        <rect className="ce-river" x="420" y="790" width="600" height="40" />

        <g className="ce-stroke ce-stroke--soft">
          <path d="M420 760H1020" />
          <path d="M440 690H1000" />
          <path d="M440 760V690l60-70h400l60 70v70" />
          <path d="M500 690V620M560 690V620M620 690V620M680 690V620M740 690V620M800 690V620M860 690V620M920 690V620" />
          <path d="M440 690l60-70M500 690l60-70M560 690l60-70M620 690l60-70M680 690l60-70M740 690l60-70M800 690l60-70M860 690l60-70M920 690l60-70" />
          <path className="ce-stroke--thin" d="M460 760v60M1000 760v60" />
        </g>
        {/* twinkling rivets */}
        <circle className="ce-rivet" cx="500" cy="690" r="2.5" />
        <circle className="ce-rivet ce-rivet--2" cx="680" cy="690" r="2.5" />
        <circle className="ce-rivet ce-rivet--3" cx="860" cy="690" r="2.5" />

        <g className="ce-traffic">
          <rect x="0" y="755" width="26" height="10" rx="2" className="ce-stroke ce-accent" />
          <circle cx="4" cy="765" r="2" className="ce-headlight" />
        </g>
        <g className="ce-traffic ce-traffic--2">
          <rect x="0" y="755" width="20" height="9" rx="2" className="ce-stroke" />
        </g>

        {/* ---- skyline ---- */}
        <g className="ce-stroke ce-stroke--soft ce-stroke--thin">
          <path d="M0 760V560h80v-60h60v260" />
          <path d="M160 760V620h70v-90h50v230" />
          <path d="M300 760V650h90v110" />
          <path d="M1060 760V600h60v-40h50v200" />
          <path d="M1230 760V640h80v120M1330 760V680h110" />
          <path className="ce-stroke" d="M0 760H1440" />
          <path d="M0 775H1440" strokeDasharray="12 14" />
        </g>
        {/* blinking windows (dark mode glows warmer) */}
        <g className="ce-windows">
          <rect x="20" y="590" width="10" height="10" />
          <rect x="20" y="620" width="10" height="10" />
          <rect x="100" y="540" width="10" height="10" />
          <rect x="180" y="650" width="10" height="10" />
          <rect x="320" y="680" width="10" height="10" />
          <rect x="1080" y="630" width="10" height="10" />
          <rect x="1250" y="670" width="10" height="10" />
        </g>

        {/* rising construction dust / sparkle particles */}
        <g className="ce-dust">
          <circle className="ce-dust__p ce-dust__p--1" cx="1180" cy="700" r="2.5" />
          <circle className="ce-dust__p ce-dust__p--2" cx="1200" cy="710" r="2" />
          <circle className="ce-dust__p ce-dust__p--3" cx="1160" cy="690" r="2" />
          <circle className="ce-dust__p ce-dust__p--4" cx="700" cy="620" r="2" />
          <circle className="ce-dust__p ce-dust__p--5" cx="640" cy="640" r="1.8" />
        </g>
      </svg>

      <div className="ce-bg__vignette" />
    </div>
  );
}