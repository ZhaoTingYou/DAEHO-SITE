export function RingDrawingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-white" aria-hidden="true">
      <div className="ring-blueprint-layer absolute inset-[-7%] will-change-transform">
        <svg
          className="ring-blueprint-svg h-full w-full"
          viewBox="0 0 1440 960"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <pattern id="making-draft-grid" width="120" height="120" patternUnits="userSpaceOnUse">
              <path d="M0 0H120V120" stroke="#101D30" strokeOpacity="0.052" strokeWidth="1" />
              <path
                d="M24 0V120M48 0V120M72 0V120M96 0V120M0 24H120M0 48H120M0 72H120M0 96H120"
                stroke="#101D30"
                strokeOpacity="0.024"
                strokeWidth="1"
              />
            </pattern>
            <linearGradient id="making-ring-draft-line" x1="238" y1="180" x2="1190" y2="760" gradientUnits="userSpaceOnUse">
              <stop stopColor="#101D30" stopOpacity="0.10" />
              <stop offset="0.55" stopColor="#9A7763" stopOpacity="0.13" />
              <stop offset="1" stopColor="#7A2230" stopOpacity="0.08" />
            </linearGradient>
            <radialGradient id="making-paper-light" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(720 164) rotate(90) scale(560 740)">
              <stop stopColor="#FFFFFF" stopOpacity="0.92" />
              <stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0.58" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect className="making-draft-grid-plane" width="1440" height="960" fill="url(#making-draft-grid)" />
          <rect width="1440" height="960" fill="url(#making-paper-light)" />

          <g className="making-draft-coordinate-system" stroke="#101D30" strokeLinecap="round">
            <path d="M54 52V18H88M1352 18H1386V52M54 908V942H88M1352 942H1386V908" strokeOpacity="0.12" strokeWidth="1" />

            <g strokeOpacity="0.11" strokeWidth="0.8">
              <path d="M154 240H1294" />
              <path d="M154 480H1294" />
              <path d="M154 720H1294" />
              <path d="M274 96V840" />
              <path d="M514 96V840" />
              <path d="M754 96V840" />
              <path d="M994 96V840" />
              <path d="M1234 96V840" />
            </g>

            <g strokeOpacity="0.16" strokeWidth="0.9">
              <path d="M270 238H278M274 234V242" />
              <path d="M510 238H518M514 234V242" />
              <path d="M750 238H758M754 234V242" />
              <path d="M990 238H998M994 234V242" />
              <path d="M1230 238H1238M1234 234V242" />
              <path d="M270 718H278M274 714V722" />
              <path d="M510 718H518M514 714V722" />
              <path d="M750 718H758M754 714V722" />
              <path d="M990 718H998M994 714V722" />
              <path d="M1230 718H1238M1234 714V722" />
            </g>
          </g>

          <g className="making-draft-coordinate-labels" fill="#101D30" fillOpacity="0.18" fontFamily="Inter, sans-serif" fontSize="12" letterSpacing="0.08em">
            <text x="94" y="724">Y 100</text>
            <text x="94" y="484">Y 200</text>
            <text x="94" y="244">Y 300</text>
            <text x="264" y="872">X 000</text>
            <text x="504" y="872">X 100</text>
            <text x="744" y="872">X 200</text>
            <text x="984" y="872">X 300</text>
            <text x="1222" y="872">X 400</text>
          </g>

          <g className="making-draft-ring-secondary" transform="translate(780 520) rotate(-4 270 140)" stroke="url(#making-ring-draft-line)" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M42 132C112 80 212 52 328 56C444 60 538 92 612 148C536 198 438 224 322 220C206 216 112 186 42 132Z"
              strokeWidth="1"
              strokeOpacity="0.60"
            />
            <path
              d="M104 134C162 104 238 88 326 92C416 96 492 114 552 150"
              strokeWidth="0.8"
              strokeOpacity="0.38"
            />
            <path d="M326 30V246M24 132H632" stroke="#101D30" strokeWidth="0.65" strokeOpacity="0.10" />
          </g>

          <g className="making-draft-ring-primary" transform="translate(186 126) rotate(-6 340 260)" stroke="url(#making-ring-draft-line)" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="340" cy="274" rx="310" ry="174" strokeWidth="0.95" strokeOpacity="0.36" />
            <ellipse cx="340" cy="274" rx="238" ry="132" strokeWidth="0.75" strokeOpacity="0.24" />
            <path d="M68 274H612M340 78V470" stroke="#101D30" strokeWidth="0.65" strokeOpacity="0.075" />
          </g>

          <g className="making-draft-section-layer" transform="translate(760 146)" stroke="url(#making-ring-draft-line)" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M44 318C126 214 248 158 390 164C530 170 636 226 718 322"
              strokeWidth="1"
              strokeOpacity="0.42"
            />
            <path
              d="M102 352C206 288 302 266 414 270C524 274 612 304 674 356"
              strokeWidth="0.8"
              strokeOpacity="0.30"
            />
            <path d="M144 392H628" stroke="#101D30" strokeWidth="0.7" strokeOpacity="0.10" strokeDasharray="2 12" />
            <circle cx="392" cy="168" r="24" strokeWidth="0.72" strokeOpacity="0.18" />
            <circle cx="392" cy="168" r="9" strokeWidth="0.72" strokeOpacity="0.20" />
          </g>

          <g className="making-draft-measure-layer" stroke="#101D30" strokeLinecap="round" strokeLinejoin="round">
            <path d="M908 624H1110" strokeOpacity="0.16" strokeWidth="0.8" />
            <path d="M908 612V636M1110 612V636" strokeOpacity="0.12" strokeWidth="0.7" />
            <path d="M942 624H1076" strokeOpacity="0.18" strokeWidth="0.65" strokeDasharray="5 8" />
            <path d="M1040 568C1084 584 1121 608 1148 642" strokeOpacity="0.13" strokeWidth="0.75" />
            <g fill="#101D30" fillOpacity="0.16" fontFamily="Inter, sans-serif" fontSize="11" letterSpacing="0.09em">
              <text x="968" y="606">R 24</text>
              <text x="1048" y="648">W 08</text>
            </g>
          </g>
        </svg>
      </div>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.86),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.76))]" />
    </div>
  );
}
