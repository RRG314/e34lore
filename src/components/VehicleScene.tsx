"use client";
import { demoAssets } from "../lib/backend";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { initialViewport } from "../graphics/viewport";
import { disposeObject } from "../graphics/dispose";
import { ArrowUpRight } from "lucide-react";
export function VehicleScene({
  onAssembly,
  onNode,
  visibility,
}: {
  onAssembly: (id: string) => void;
  onNode?: (id: string) => void;
  visibility?: { body: boolean; wheels: boolean };
}) {
  const latest = useRef({ onAssembly, onNode, visibility });
  useLayoutEffect(() => { latest.current = { onAssembly, onNode, visibility }; }, [onAssembly, onNode, visibility]);
  const host = useRef<HTMLDivElement>(null),
    explode = useRef(0);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [value, setValue] = useState(0);
  useEffect(() => {
    if (demoAssets) return;
    let active = true,
      cleanup = () => {};
    async function start() {
      try {
        const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
          import("three"),
          import("three/examples/jsm/loaders/GLTFLoader.js"),
          import("three/examples/jsm/controls/OrbitControls.js"),
        ]);
        if (!active || !host.current) return;
        const el = host.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color("#e6e8e2");
        const viewport = initialViewport(el.clientWidth, el.clientHeight);
        const camera = new THREE.PerspectiveCamera(
          36,
          viewport.aspect,
          0.1,
          100,
        );
        camera.position.set(-7, 4.5, 7);
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(viewport.width, viewport.height);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.25;
        el.appendChild(renderer.domElement);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.target.set(0, 0.8, 0);
        controls.enableDamping = true;
        controls.minDistance = 4;
        controls.maxDistance = 16;
        controls.maxPolarAngle = Math.PI;
        cleanup = () => {
          controls.dispose();
          disposeObject(scene);
          renderer.dispose();
          renderer.domElement.remove();
        };
        scene.add(new THREE.HemisphereLight("#ffffff", "#6c7064", 3));
        const light = new THREE.DirectionalLight("#fff4e1", 3);
        light.position.set(-5, 9, 4);
        scene.add(light);
        const ground = new THREE.Mesh(
          new THREE.PlaneGeometry(80, 80),
          new THREE.MeshStandardMaterial({ color: "#dadfd5", roughness: 1 }),
        );
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.02;
        scene.add(ground);
        const grid = new THREE.GridHelper(30, 30, "#bec4b8", "#d0d5ca");
        grid.position.y = -0.01;
        scene.add(grid);
        const loader = new GLTFLoader();
        const [body, wheel] = await Promise.all([
          loader.loadAsync("/models/e34-525i/e34-body.glb"),
          loader.loadAsync("/models/e34-525i/e34-wheel.glb"),
        ]);
        if (!active) {
          disposeObject(body.scene);
          disposeObject(wheel.scene);
          return;
        }
        const car = new THREE.Group();
        car.add(body.scene);
        scene.add(car);
        body.scene.traverse((object) => {
          object.userData.node = "body-shell";
        });
        // The exterior mesh has no verified engine/component segmentation.
        // Explicit system buttons below provide reference navigation.
        const wheels: import("three").Object3D[] = [];
        for (const x of [-1.623293, 1.623293])
          for (const z of [-0.883437, 0.883437]) {
            const w = wheel.scene.clone(true);
            w.position.set(x, 0.350493, z);
            w.rotation.y = z > 0 ? Math.PI : 0;
            w.userData.baseZ = z;
            // Wheel geometry does not identify a suspension assembly.
            wheels.push(w);
            car.add(w);
          }
        const ray = new THREE.Raycaster(),
          pointer = new THREE.Vector2();
        let down = { x: 0, y: 0 };
        const pd = (e: PointerEvent) => {
          down = { x: e.clientX, y: e.clientY };
        };
        const click = (e: MouseEvent) => {
          if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.set(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            (-(e.clientY - rect.top) / rect.height) * 2 + 1,
          );
          ray.setFromCamera(pointer, camera);
          const hit = ray.intersectObjects(car.children, true)[0];
          if (hit?.object.userData.node && body.scene.visible)
            latest.current.onNode?.(hit.object.userData.node);
        };
        renderer.domElement.addEventListener("pointerdown", pd);
        renderer.domElement.addEventListener("click", click);
        const resize = new ResizeObserver(() => {
          if (!el.clientWidth || !el.clientHeight) return;
          camera.aspect = el.clientWidth / el.clientHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(el.clientWidth, el.clientHeight);
        });
        resize.observe(el);
        let frame = 0;
        function render() {
          if (!active) return;
          body.scene.visible = latest.current.visibility?.body ?? true;
          for (const w of wheels) {
            w.visible = latest.current.visibility?.wheels ?? true;
            const z = w.userData.baseZ;
            w.position.z = z + Math.sign(z) * explode.current * 0.012;
          }
          controls.update();
          renderer.render(scene, camera);
          frame = requestAnimationFrame(render);
        }
        render();
        setReady(true);
        const release = cleanup;
        cleanup = () => {
          cancelAnimationFrame(frame);
          resize.disconnect();
          renderer.domElement.removeEventListener("pointerdown", pd);
          renderer.domElement.removeEventListener("click", click);
          release();
        };
      } catch {
        cleanup();
        if (active)
          setError(
            "3D viewing is unavailable in this browser. Use the assembly diagrams and part lists below.",
          );
      }
    }
    start();
    return () => {
      active = false;
      cleanup();
    };
  }, []);
  return (
    <div className="vehicle-scene">
      <div
        ref={host}
        className="three-host"
        aria-label="Rotatable E34 exterior reference model"
        role="img"
      />
      {!ready && (
        <div className="model-loading">
          <img
            src={demoAssets ? "/demo/vehicle.svg" : "/assets/e34-525i-reference.jpg"}
            alt="Licensed E34 visual reference"
          />
          <p>{error || "Loading the E34 reference model…"}</p>
        </div>
      )}
      <div className="model-caption">
        <span>EXTERIOR VISUAL REFERENCE</span>
        <span>Drag to orbit · Scroll to zoom</span>
      </div>
      <div className="model-controls">
        <label>
          Separate wheels
          <input
            type="range"
            min="0"
            max="100"
            value={value}
            onChange={(e) => {
              const v = Number(e.target.value);
              explode.current = v;
              setValue(v);
            }}
          />
        </label>
        <span>Visual geometry · not factory CAD</span>
      </div>
      <div className="model-systems">
        {[
          ["water-pump", "Cooling assembly"],
          ["front-strut", "Front suspension"],
          ["front-brake", "Front brake"],
        ].map(([id, title]) => (
          <button key={id} onClick={() => onAssembly(id)}>
            {title}
            <ArrowUpRight size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
