"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus, RotateCcw, Maximize2 } from "lucide-react";
import { initialViewport } from "../graphics/viewport";
import { disposeObject } from "../graphics/dispose";
import { parts } from "../data/catalog";
import { nominalSealForPart } from "../digital-twin/model-registry";
import { useFullscreen } from "./useFullscreen";
export function AssemblyModel({
  assembly,
  selected,
  onSelect,
  initialIsolate = false,
  workshop,
  expansion,
}: {
  assembly: string;
  selected: string;
  onSelect: (id: string) => void;
  initialIsolate?: boolean;
  expansion?: { expanded: boolean; toggle: () => void };
  workshop?: {
    hiddenPartIds: string[];
    removedPartIds: string[];
    explosion: number;
    onExplosion: (value: number) => void;
  };
}) {
  const fullView = useFullscreen();
  const nominalSeal = assembly.startsWith("nominal-seal:")
    ? nominalSealForPart(assembly.slice("nominal-seal:".length))
    : undefined;
  const partName = (id: string) =>
    parts.find((p) => p.id === id)?.name || nominalSealForPart(id)?.name || id;
  const stats = useRef<HTMLOutputElement>(null);
  const host = useRef<HTMLDivElement>(null),
    actions = useRef<{
      reset: () => void;
      zoom: (factor: number) => void;
      view: (name: string) => void;
      focus: () => void;
    } | null>(null);
  const state = useRef({
    selected,
    onSelect,
    explosion: initialIsolate ? 0 : 0.35,
    isolate: initialIsolate,
    spin: false,
    workshop,
    wireframe: false,
    opacity: 1,
    section: false,
    quality: "balanced",
  });
  useLayoutEffect(() => {
    state.current.workshop = workshop;
    state.current.selected = selected;
    state.current.onSelect = onSelect;
  }, [workshop, selected, onSelect]);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [explosion, setExplosion] = useState(initialIsolate ? 0 : 35),
    [isolate, setIsolate] = useState(initialIsolate),
    [spin, setSpin] = useState(false),
    [modeled, setModeled] = useState<string[]>([]),
    [wireframe, setWireframe] = useState(false),
    [opacity, setOpacity] = useState(1),
    [section, setSection] = useState(false),
    [quality, setQuality] = useState("balanced");
  useEffect(() => {
    let active = true,
      dispose = () => {};
    async function init() {
      setReady(false);
      setError("");
      setModeled([]);
      try {
        const [T, { OrbitControls }, { RoomEnvironment }, { buildAssembly }] =
          await Promise.all([
            import("three"),
            import("three/examples/jsm/controls/OrbitControls.js"),
            import("three/examples/jsm/environments/RoomEnvironment.js"),
            import("../graphics/assembly-geometry"),
          ]);
        if (!active || !host.current) return;
        let built: import("../graphics/assembly-geometry").BuiltAssembly;
        if (nominalSeal) {
          const { GLTFLoader } = await import(
            "three/examples/jsm/loaders/GLTFLoader.js"
          );
          const gltf = await new GLTFLoader().loadAsync(
            `/models/nominal-seals/${nominalSeal.number}-${quality === "economy" ? "low" : "medium"}.glb`,
          );
          const group = new T.Group();
          group.add(gltf.scene);
          gltf.scene.traverse((o) => {
            o.userData.part = nominalSeal.partId;
            o.userData.parts = [nominalSeal.partId];
          });
          built = {
            group,
            parts: [
              {
                object: gltf.scene,
                ids: [nominalSeal.partId],
                base: new T.Vector3(),
                offset: new T.Vector3(),
              },
            ],
          };
          if (!active) {
            group.traverse((o) => {
              if (o instanceof T.Mesh) {
                o.geometry.dispose();
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                  (m) => m.dispose(),
                );
              }
            });
            return;
          }
        } else built = buildAssembly(assembly);
        const el = host.current,
          scene = new T.Scene();
        scene.background = new T.Color(0xf4f5f3);
        const viewport = initialViewport(el.clientWidth, el.clientHeight);
        const camera = new T.PerspectiveCamera(
          35,
          viewport.aspect,
          0.0001,
          500,
        );
        const renderer = new T.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(viewport.width, viewport.height);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.4;
        renderer.shadowMap.enabled = true;
        renderer.localClippingEnabled = true;
        renderer.shadowMap.type = T.PCFShadowMap;
        renderer.domElement.tabIndex = 0;
        renderer.domElement.setAttribute(
          "aria-label",
          "Assembly model. Arrow keys orbit, plus and minus zoom, zero resets.",
        );
        el.appendChild(renderer.domElement);
        const environment = new RoomEnvironment(),
          pmrem = new T.PMREMGenerator(renderer),
          env = pmrem.fromScene(environment, 0.04);
        scene.environment = env.texture;
        environment.dispose();
        pmrem.dispose();
        scene.add(new T.HemisphereLight(0xffffff, 0x68737d, 2));
        const key = new T.DirectionalLight(0xffffff, 4);
        key.position.set(6, 12, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.left = -12;
        key.shadow.camera.right = 12;
        key.shadow.camera.top = 14;
        key.shadow.camera.bottom = -12;
        scene.add(key);
        const fill = new T.DirectionalLight(0xd5e4ee, 2);
        fill.position.set(-5, 3, -5);
        scene.add(fill);
        scene.add(built.group);
        for (const p of built.parts)
          p.object.position
            .copy(p.base)
            .addScaledVector(
              p.offset,
              state.current.workshop?.explosion ?? state.current.explosion,
            );
        const bounds = new T.Box3().setFromObject(built.group),
          center = bounds.getCenter(new T.Vector3()),
          size = bounds.getSize(new T.Vector3());
        const distance = Math.max(size.x / camera.aspect, size.y, size.z) * 1.8;
        camera.position
          .copy(center)
          .add(
            new T.Vector3(0.8, 0.55, 0.9).normalize().multiplyScalar(distance),
          );
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.copy(center);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.minDistance = nominalSeal ? 0.001 : 0.02;
        controls.maxDistance = distance * 4;
        controls.autoRotateSpeed = 0.8;
        controls.saveState();
        const ground = new T.Mesh(
          new T.PlaneGeometry(80, 80),
          new T.ShadowMaterial({ color: 0x4c5661, opacity: 0.12 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = bounds.min.y - 0.4;
        ground.receiveShadow = true;
        scene.add(ground);
        const ids = built.parts
          .flatMap((p) => p.ids)
          .filter(
            (id) => parts.some((p) => p.id === id) || !!nominalSealForPart(id),
          );
        setModeled(ids);
        const focus = () => {
          const box = new T.Box3();
          built.group.updateMatrixWorld(true);
          for (const part of built.parts)
            if (part.ids.includes(state.current.selected))
              box.union(new T.Box3().setFromObject(part.object));
          if (box.isEmpty()) return;
          const target = box.getCenter(new T.Vector3()),
            extent = box.getSize(new T.Vector3()),
            d = Math.max(extent.x / camera.aspect, extent.y, extent.z) * 2.2;
          const direction = camera.position
            .clone()
            .sub(controls.target)
            .normalize();
          controls.target.copy(target);
          camera.position
            .copy(target)
            .addScaledVector(direction, Math.max(nominalSeal ? 0.005 : 0.1, d));
          controls.update();
        };
        actions.current = {
          focus,
          reset: () => {
            controls.reset();
          },
          zoom: (factor) => {
            camera.position
              .sub(controls.target)
              .multiplyScalar(factor)
              .add(controls.target);
            controls.update();
          },
          view: (name) => {
            const directions: Record<string, import("three").Vector3> = {
              front: new T.Vector3(0, 0, 1),
              back: new T.Vector3(0, 0, -1),
              right: new T.Vector3(1, 0, 0),
              left: new T.Vector3(-1, 0, 0),
              top: new T.Vector3(0, 1, 0.0001),
              underside: new T.Vector3(0, -1, 0.0001),
            };
            const radius = camera.position.distanceTo(controls.target);
            const delta = (directions[name] || directions.front).multiplyScalar(
              radius,
            );
            camera.position.copy(controls.target).add(delta);
            controls.update();
          },
        };
        const ray = new T.Raycaster(),
          point = new T.Vector2();
        let down = { x: 0, y: 0 };
        const pd = (event: PointerEvent) => {
          down = { x: event.clientX, y: event.clientY };
        };
        const click = (event: MouseEvent) => {
          if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5)
            return;
          const rect = renderer.domElement.getBoundingClientRect();
          point.set(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            (-(event.clientY - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(point, camera);
          const hit = ray
            .intersectObjects(built.group.children, true)
            .find((h) => {
              let object: import("three").Object3D | null = h.object;
              while (object) {
                if (!object.visible) return false;
                object = object.parent;
              }
              return ids.includes(h.object.userData.part);
            });
          if (hit)
            state.current.onSelect(
              hit.object.userData.parts?.includes(state.current.selected)
                ? state.current.selected
                : hit.object.userData.part,
            );
        };
        const keyboard = (event: KeyboardEvent) => {
          if (
            ![
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
              "+",
              "=",
              "-",
              "0",
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          if (event.key === "0") {
            controls.reset();
            return;
          }
          if (["+", "=", "-"].includes(event.key)) {
            actions.current?.zoom(event.key === "-" ? 1.2 : 1 / 1.2);
            return;
          }
          const spherical = new T.Spherical().setFromVector3(
            camera.position.clone().sub(controls.target),
          );
          spherical.theta +=
            event.key === "ArrowLeft"
              ? 0.15
              : event.key === "ArrowRight"
                ? -0.15
                : 0;
          spherical.phi +=
            event.key === "ArrowUp"
              ? -0.15
              : event.key === "ArrowDown"
                ? 0.15
                : 0;
          spherical.makeSafe();
          camera.position.setFromSpherical(spherical).add(controls.target);
          controls.update();
        };
        renderer.domElement.addEventListener("pointerdown", pd);
        renderer.domElement.addEventListener("click", click);
        renderer.domElement.addEventListener("keydown", keyboard);
        const resize = new ResizeObserver(() => {
          if (!el.clientWidth || !el.clientHeight) return;
          camera.aspect = el.clientWidth / el.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(el.clientWidth, el.clientHeight);
        });
        resize.observe(el);
        const sectionPlane = new T.Plane(new T.Vector3(-1, 0, 0), center.x);
        let appearance = "";
        let frame = 0,
          lastSelection = "",
          lastIsolation = false;
        let samples = 0,
          sampleStart = performance.now();
        function render() {
          if (!active) return;
          for (const p of built.parts)
            p.object.position
              .copy(p.base)
              .addScaledVector(
                p.offset,
                state.current.workshop?.explosion ?? state.current.explosion,
              );
          if (
            lastSelection !== state.current.selected ||
            lastIsolation !== state.current.isolate ||
            appearance !==
              JSON.stringify([
                state.current.workshop?.hiddenPartIds,
                state.current.workshop?.removedPartIds,
                state.current.wireframe,
                state.current.opacity,
                state.current.section,
                state.current.quality,
              ])
          ) {
            const represented = ids.includes(state.current.selected);
            for (const p of built.parts) {
              const picked = p.ids.includes(state.current.selected);
              p.object.visible =
                (!state.current.isolate || !represented || picked) &&
                !p.ids.some(
                  (id) =>
                    state.current.workshop?.hiddenPartIds.includes(id) ||
                    state.current.workshop?.removedPartIds.includes(id),
                );
              p.object.traverse((object) => {
                if (object instanceof T.Mesh) {
                  const material =
                    object.material as import("three").MeshStandardMaterial;
                  material.wireframe = state.current.wireframe;
                  material.opacity = picked ? 1 : state.current.opacity;
                  material.transparent = material.opacity < 1;
                  material.depthWrite = material.opacity === 1;
                  material.clippingPlanes = state.current.section
                    ? [sectionPlane]
                    : [];
                  material.needsUpdate = true;
                  if (material.emissive) {
                    material.emissive.set(picked ? 0x9a4d22 : 0x000000);
                    material.emissiveIntensity = picked ? 0.28 : 0;
                  }
                }
              });
            }
            if (state.current.isolate && represented) focus();
            renderer.setPixelRatio(
              Math.min(
                devicePixelRatio,
                state.current.quality === "detail"
                  ? 2
                  : state.current.quality === "economy"
                    ? 1
                    : 1.5,
              ),
            );
            renderer.shadowMap.enabled = state.current.quality !== "economy";
            appearance = JSON.stringify([
              state.current.workshop?.hiddenPartIds,
              state.current.workshop?.removedPartIds,
              state.current.wireframe,
              state.current.opacity,
              state.current.section,
              state.current.quality,
            ]);
            lastSelection = state.current.selected;
            lastIsolation = state.current.isolate;
          }
          controls.autoRotate = state.current.spin;
          controls.update();
          renderer.render(scene, camera);
          if (++samples === 120) {
            const elapsed = performance.now() - sampleStart;
            if (stats.current)
              stats.current.textContent = `${Math.round(120000 / elapsed)} fps · ${renderer.info.render.calls} draw calls · ${renderer.info.render.triangles.toLocaleString()} triangles · ${renderer.info.memory.geometries} geometries · ${renderer.info.memory.textures} textures`;
            samples = 0;
            sampleStart = performance.now();
          }
          frame = requestAnimationFrame(render);
        }
        render();
        if (initialIsolate) {
          focus();
          controls.saveState();
        }
        setReady(true);
        dispose = () => {
          cancelAnimationFrame(frame);
          resize.disconnect();
          controls.dispose();
          renderer.domElement.removeEventListener("pointerdown", pd);
          renderer.domElement.removeEventListener("click", click);
          renderer.domElement.removeEventListener("keydown", keyboard);
          disposeObject(scene);
          env.dispose();
          renderer.dispose();
          renderer.domElement.remove();
          actions.current = null;
        };
      } catch {
        if (active)
          setError(
            "3D rendering is unavailable. The source drawing and full parts table remain available.",
          );
      }
    }
    init();
    return () => {
      active = false;
      dispose();
    };
  }, [assembly, quality,initialIsolate,nominalSeal]);
  return (
    <div
      className={
        "assembly-model" + (fullView.fallback ? " viewer-expanded" : "")
      }
      role={fullView.fallback ? "dialog" : undefined}
      aria-modal={fullView.fallback || undefined}
      aria-label={fullView.fallback ? "Expanded assembly model" : undefined}
      tabIndex={fullView.fallback ? -1 : undefined}
    >
      <div className="model-stage" ref={host} />
      {!ready && (
        <p className="model-state" role="status">
          {error || "Loading assembly model…"}
        </p>
      )}
      <div className="assembly-model-toolbar">
        <div>
          <button
            className="icon-button"
            aria-label="Zoom model in"
            onClick={() => actions.current?.zoom(1 / 1.2)}
          >
            <Plus size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Zoom model out"
            onClick={() => actions.current?.zoom(1.2)}
          >
            <Minus size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Reset model view"
            onClick={() => actions.current?.reset()}
          >
            <RotateCcw size={17} />
          </button>
        </div>
        <div className="model-orientations">
          {["front", "back", "left", "right", "top", "underside"].map(
            (name) => (
              <button key={name} onClick={() => actions.current?.view(name)}>
                {name}
              </button>
            ),
          )}
        </div>
        <button className="text-link" onClick={() => actions.current?.focus()}>
          Focus part
        </button>
        <button
          className="icon-button"
          aria-label={
            (expansion?.expanded ?? fullView.expanded)
              ? "Exit expanded model"
              : "Expand model"
          }
          title={
            (expansion?.expanded ?? fullView.expanded)
              ? "Exit expanded model"
              : "Expand model"
          }
          onClick={() =>
            expansion
              ? expansion.toggle()
              : fullView.toggle(host.current?.parentElement || null)
          }
        >
          <Maximize2 size={17} />
        </button>
      </div>
      <div className="assembly-model-settings">
        <label>
          Assembly separation
          <input
            type="range"
            min="0"
            max="100"
            aria-label="Explode assembly"
            value={workshop ? Math.round(workshop.explosion * 100) : explosion}
            onChange={(e) => {
              const value = Number(e.target.value);
              workshop?.onExplosion(value / 100);
              setExplosion(value);
              state.current.explosion = value / 100;
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={spin}
            onChange={(e) => {
              setSpin(e.target.checked);
              state.current.spin = e.target.checked;
            }}
          />
          Auto rotate
        </label>
        <label>
          <input
            type="checkbox"
            checked={isolate}
            onChange={(e) => {
              setIsolate(e.target.checked);
              state.current.isolate = e.target.checked;
            }}
          />
          Isolate selection
        </label>
      </div>
      <div className="assembly-model-settings">
        <label>
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => {
              setWireframe(e.target.checked);
              state.current.wireframe = e.target.checked;
            }}
          />
          Wireframe
        </label>
        <label>
          <input
            type="checkbox"
            checked={section}
            onChange={(e) => {
              setSection(e.target.checked);
              state.current.section = e.target.checked;
            }}
          />
          Section view
        </label>
        <label>
          Surrounding opacity
          <input
            aria-label="Surrounding opacity"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => {
              setOpacity(+e.target.value);
              state.current.opacity = +e.target.value;
            }}
          />
        </label>
        <label>
          Graphics
          <select
            value={quality}
            onChange={(e) => {
              setQuality(e.target.value);
              state.current.quality = e.target.value;
            }}
          >
            <option value="economy">Economy</option>
            <option value="balanced">Balanced</option>
            <option value="detail">Detail</option>
          </select>
        </label>
      </div>
      <p className="model-selection">
        {partName(selected)}
        {modeled.includes(selected)
          ? " · highlighted"
          : " · see source drawing for this item"}
      </p>
      <div className="modeled-parts" aria-label="Select a modeled component">
        {modeled
          .filter((id, i) => modeled.indexOf(id) === i)
          .map((id) => (
            <button
              key={id}
              className={id === selected ? "selected" : ""}
              onClick={() => onSelect(id)}
            >
              {partName(id)}
            </button>
          ))}
      </div>
      <details className="model-performance">
        <summary>Renderer statistics</summary>
        <output ref={stats}>Collecting current scene measurements…</output>
      </details>
      <p className="drawing-source">
        <strong>
          {nominalSeal
            ? "Nominal circular seal model"
            : "Reference assembly model"}
        </strong>
        <span>
          {nominalSeal
            ? `Catalog expression interpreted as ${nominalSeal.insideDiameterMm} mm inside diameter × ${nominalSeal.crossSectionMm} mm circular cross-section. Nominal outside diameter ${nominalSeal.outerDiameterMm} mm. Material, tolerances, installed deformation and fitment are unverified. `
            : ""}
          Drag to orbit through 360°. Scroll or pinch to zoom. Geometry
          illustrates component relationships; it is not dimensionally verified
          BMW CAD. Production variants must be checked in the source drawing.
        </span>
      </p>
    </div>
  );
}
