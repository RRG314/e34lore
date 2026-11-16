import type { Series } from "../series/registry";
import type { ServiceLocation } from "../data/quick-reference";

export function ReferenceLocationMap({
  points, selected, onSelect, series = "e34",
}: {
  points: ServiceLocation[];
  series?: Series;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <figure className="qr-map">
      <div className="qr-map-caption"><span>LOCATION MAP</span><span>TOP VIEW</span></div>
      <div className="qr-map-drawing">
        <svg viewBox="0 0 300 440" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="qr-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M0 20V0H20" fill="none" stroke="#43574d" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="300" height="440" fill="url(#qr-grid)" />
          <g fill="none" stroke="#5d7569" strokeWidth="1" strokeDasharray="4 5">
            <path d="M150 22v396M24 95h252M24 350h252" />
          </g>
          <g stroke="#91ac9e" strokeWidth="1.4" strokeLinejoin="round">
            <path fill="#31483f" d="M79 32q71-19 142 0l7 17 8 30v294l-10 28q-76 17-152 0l-10-28V79l8-30z" />
            <path fill="#1b2d27" d="M80 53q70-12 140 0l6 28v72H74V81z" />
            <path fill="#456158" d="M83 158h134l-18 48h-98zM103 313h94l21 32H82z" />
            <path fill="#22372f" d="M104 210h92v99h-92zM75 169l23 39v103l-23 31zM225 169l-23 39v103l23 31zM75 352h150v35q-75 11-150 0z" />
            <path fill="#22372f" d="M63 168h-9l-7 13 17 5m173-18h9l7 13-17 5" />
            {series === "e30" && <>
              <path fill="#263d35" d="M82 53h136l-7 17H89z" />
              <g fill="#819b8d"><circle cx="90" cy="54" r="5"/><circle cx="103" cy="54" r="5"/><circle cx="197" cy="54" r="5"/><circle cx="210" cy="54" r="5"/></g>
            </>}
            <path fill="#597369" d="M126 39h20v8h-20zM154 39h20v8h-20z" />
            <path fill="#819b8d" d="M80 43h37v6H80zM183 43h37v6h-37zM75 390h33v7H75zM192 390h33v7h-33z" />
          </g>
          <g fill="none" stroke="#799185" strokeWidth="1.1">
            <path d="M104 292h92M106 252h88M122 220v30m56-30v30M119 64h62v67h-62zM127 72v49m9-49v49m28-49v49m9-49v49M93 57h114M86 138h128" />
            <path d="M64 234h34m104 0h34M64 309h34m104 0h34" />
          </g>
          <g fill="#bcd2c4" fontSize="9" fontFamily="monospace" letterSpacing="1.2" textAnchor="middle">
            <text x="150" y="13">FRONT ↑</text><text x="29" y="224">LEFT</text>
            <text x="271" y="224">RIGHT</text><text x="150" y="430">REAR</text>
          </g>
        </svg>
        {points.map((point, index) => (
          <button type="button" className="qr-marker" key={point.id}
            style={{ left: point.x + "%", top: point.y + "%" }}
            aria-label={point.title} aria-pressed={selected === point.id}
            onClick={() => onSelect(point.id)}>
            <span>{index + 1}</span>
          </button>
        ))}
      </div>
      <figcaption>Left and right are from the driver’s seated view. Markers show approximate areas.</figcaption>
    </figure>
  );
}
