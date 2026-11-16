import type { Detection, VisualCandidate } from "./contracts";
import type { FamilyComparison } from "./family-comparison";
export type InferenceResult = {
  comparison?: FamilyComparison;
  detections?: Detection[];
  candidates?: VisualCandidate[];
  ms: number;
};
let nextRequestId = 0; // Correlation only; works on LAN HTTP where randomUUID is unavailable.
export class LocalInference {
  private worker: Worker | null = null;
  private cancel: null | (() => void) = null;
  stop() {
    const cancel = this.cancel;
    this.cancel = null;
    cancel?.();
    if(this.worker){this.worker.onmessage=null;this.worker.onerror=null;this.worker.terminate();}
    this.worker = null;
  }
  run(
    action: "detect" | "retrieve" | "compare",
    image: Blob,
    onProgress: (text: string) => void,
    references: unknown[] = [],
    additionalImages: Blob[] = [],
  ): Promise<InferenceResult> {
    this.stop();
    const worker = new Worker(
      new URL("./inference.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker = worker;
    const requestId=++nextRequestId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cancel = null;
        this.stop();
        reject(
          Error(
            "The scan took too long. Check your connection and try again, or search the catalog by component name.",
          ),
        );
      }, 120000);
      this.cancel = () => {
        clearTimeout(timeout);
        reject(Error("Recognition stopped."));
      };
      worker.onerror = (event) => {
        if(this.worker!==worker)return;
        clearTimeout(timeout);
        this.cancel = null;
        console.warn(
          "Scanner worker initialization failed",
          event.message
            .replace(/blob:\S+|https?:\/\/\S+/g, "[model asset]")
            .slice(0, 200),
        );
        this.stop();
        reject(
          Error(
            "This browser could not load local recognition. Use Read markings instead.",
          ),
        );
      };
      worker.onmessage = ({ data }) => {
        if(this.worker!==worker||data.id!==requestId)return;
        if (data.type === "progress") {
          const p = data.progress;
          onProgress(
            p.status === "view" ? p.text : p.status === "progress" && Number.isFinite(p.progress)
              ? "Downloading recognition files · " +
                  Math.round(p.progress) +
                  "%"
              : "Preparing local recognition…",
          );
          return;
        }
        clearTimeout(timeout);
        this.cancel = null;
        if (data.type === "error") {
          if(data.detail) console.warn("Scanner recognition:", data.detail);
          this.stop();
          reject(Error(data.error));
        } else {
          this.stop();
          resolve(data);
        }
      };
      try{worker.postMessage({
        id: requestId,
        action,
        image,
        references,
        additionalImages,
      });}catch(error){clearTimeout(timeout);this.cancel=null;this.stop();reject(error);}
    });
  }
}
export async function readPhotoText(
  images: {photoId:string;blob:Blob}[],
  onProgress: (text: string) => void,
  signal?: AbortSignal,
) {
  if(images.length<1||images.length>3||images.some(i=>!i.blob.size||i.blob.size>4*1024*1024))throw Error('Use one to three prepared photos.');
  signal?.throwIfAborted();
  const { createWorker, PSM } = await import("tesseract.js");
  signal?.throwIfAborted();
  let stopped=false;
  const initializing = createWorker("eng", 1, {
    workerPath: "/scanner-runtime/ocr/worker.min.js",
    corePath: "/scanner-runtime/ocr/core",
    langPath: "/scanner-runtime/ocr/lang",
    workerBlobURL: false,
    logger: (m) =>
      onProgress(m.status + " · " + Math.round(m.progress * 100) + "%"),
  });
  // Stop an initialization that finishes after cancellation as well as an active
  // recognition. Reuse one worker sequentially, rather than three OCR runtimes.
  let rejectStopped!:(reason:Error)=>void;
  const cancelled=new Promise<never>((_,reject)=>{rejectStopped=reject});
  const cancel = () => { if(stopped)return;stopped=true;rejectStopped(Error('Text reading stopped. Your photos are kept.'));void initializing.then(w=>w.terminate()).catch(()=>{}); };
  signal?.addEventListener("abort", cancel, { once: true });
  const deadline=setTimeout(cancel,90000),start=performance.now();
  let worker:Awaited<typeof initializing>|undefined;
  try {
    if(signal?.aborted)cancel();
    worker=await Promise.race([initializing,cancelled]);
    if(stopped||signal?.aborted)throw Error('Text reading stopped. Your photos are kept.');
    await Promise.race([worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT }),cancelled]);
    const views=[];
    for(const [index,image] of images.entries()){
      if(stopped||signal?.aborted)throw Error('Text reading stopped. Your photos are kept.');
      onProgress(`Reading text in photo ${index+1} of ${images.length}…`);
      const result=await Promise.race([worker.recognize(image.blob),cancelled]);
      views.push({photoId:image.photoId,text:result.data.text.trim().slice(0,1200),confidence:Math.max(0,Math.min(100,result.data.confidence||0))});
    }
    return {views,ms:performance.now()-start};
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", cancel);
    await worker?.terminate();
  }
}
export async function readMarkings(image:Blob,onProgress:(text:string)=>void,signal?:AbortSignal){
  const result=await readPhotoText([{photoId:'active',blob:image}],onProgress,signal);
  return {...result.views[0],ms:result.ms};
}
