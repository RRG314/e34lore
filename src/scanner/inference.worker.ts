/// <reference lib="webworker" />
import { env, pipeline, RawImage } from "@huggingface/transformers";
import { models, componentPrompts, rankReferences } from "./contracts";
import { compareLicensedFamilies } from "./licensed-family-comparison";
import { centerSupportComparison, centerSupportShape } from "./center-support-shape";
import licensedReferences from "../../data/scanner/licensed-family/reference-index.json";
env.allowLocalModels = false;
// CacheStorage is unavailable on LAN HTTP. Preserve inference without weakening browser security.
env.useBrowserCache = typeof caches !== "undefined";
const packagedRuntime = import.meta.env.E34_E30_BUILD === true;
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    mjs: "/scanner-runtime/onnx/ort-wasm-simd-threaded.mjs",
    ...(!packagedRuntime && {wasm: "/scanner-runtime/onnx/ort-wasm-simd-threaded.wasm"}),
  };
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}
async function prepareRuntime() {
  const wasm = env.backends.onnx.wasm;
  if (!packagedRuntime || !wasm || wasm.wasmBinary) return;
  const response = await fetch("/scanner-runtime/onnx/ort-wasm-simd-threaded.wasm.bin");
  if (!response.ok || !response.body) throw Error("The scanner runtime could not load.");
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  wasm.wasmBinary = await new Response(stream).arrayBuffer();
}
let running = false;
self.onmessage = async ({ data }) => {
  if (running) return;
  running = true;
  let model: { dispose: () => Promise<void> } | undefined;
  const started = performance.now();
  try {
    if(!import.meta.env.DEV && data.action !== 'compare')throw Error('This recognition experiment is not released.');
    const localComparison = data.action === 'compare' && import.meta.env.DEV;
    env.allowLocalModels = localComparison;
    env.allowRemoteModels = !localComparison;
    if(localComparison) env.localModelPath = '/scanner-models/6b7c523703ae26e39be4b03774966f8571c7f523/';
    const image = await RawImage.fromBlob(data.image);
    const progress = (event: unknown) =>
      self.postMessage({ id: data.id, type: "progress", progress: event });
    const views: Blob[] = data.action === "compare" ? [data.image, ...(data.additionalImages || [])] : [];
    if (views.length > 3) throw Error("Too many views");
    if (views.length) {
      const matches = [];
      for (let i = 0; i < views.length; i++) {
        const view = i === 0 ? image : await RawImage.fromBlob(views[i]);
        matches.push(centerSupportShape(view));
        if (!matches.at(-1)) break;
      }
      const comparison = centerSupportComparison(matches);
      if (comparison) {
        self.postMessage({id:data.id,type:"result",comparison,ms:performance.now()-started});
        return;
      }
    }
    await prepareRuntime();
    if (data.action === "detect") {
      const detector = await pipeline(
        "zero-shot-object-detection",
        models.detector.id,
        {
          revision: models.detector.revision,
          dtype: "q8",
          device: "wasm",
          progress_callback: progress,
        },
      );
      model = detector;
      const detections = await detector(image, componentPrompts, {
        threshold: 0.15,
        top_k: 8,
        percentage: true,
      });
      self.postMessage({
        id: data.id,
        type: "result",
        detections,
        ms: performance.now() - started,
        model: models.detector,
      });
    } else {
      const encoder = await pipeline(
        "image-feature-extraction",
        models.embedding.id,
        {
          revision: models.embedding.revision,
          dtype: "q8",
          device: "wasm",
          progress_callback: progress,
        },
      );
      model = encoder;
      if (data.action === "compare") {
        const embeddings: number[][] = [];
        const framing=await import('./whole-part-image');
        for (let i=0;i<views.length;i++) {
          progress({ status:"view", text:`Comparing view ${i+1} of ${views.length}…` });
          const view = i === 0 ? image : await RawImage.fromBlob(views[i]);
          const tensor = await encoder(await framing.wholePartImage(view), {});
          if(tensor.dims.length!==2||tensor.dims[0]!==1||tensor.dims[1]!==512){tensor.dispose();throw Error('The model returned an unsupported image representation.');}
          embeddings.push(Array.from(tensor.data, Number));
          tensor.dispose();
        }
        // Preview and release run the same rights-clean category policy. The
        // older retailer-vector experiment remains separate and unreleased.
        const comparison=compareLicensedFamilies(embeddings,licensedReferences);
        self.postMessage({id:data.id,type:"result",comparison,ms:performance.now()-started,model:models.embedding});
        return;
      }
      const tensor = await encoder(image, {});
      const embedding = Array.from(tensor.data, Number),
        candidates = rankReferences(embedding, data.references || []);
      tensor.dispose();
      self.postMessage({
        id: data.id,
        type: "result",
        candidates,
        ms: performance.now() - started,
        model: models.embedding,
      });
    }
  } catch (error) {
    console.warn("Local scanner inference failed", error instanceof Error ? (error.name+": "+error.message).replace(/blob:\S+|https?:\/\/\S+/g,"[model asset]").slice(0,300) : "Unknown model error");
    self.postMessage({
      id: data.id,
      type: "error",
      detail: error instanceof Error ? (error.name+": "+error.message).replace(/blob:\S+|https?:\/\/\S+/g,"[model asset]").slice(0,300) : "Unknown model error",
      error:
        "The scan could not finish on this device. Your photos are kept; retry the scan or compare the catalog records.",
    });
  } finally {
    await model?.dispose();
    running = false;
  }
};
