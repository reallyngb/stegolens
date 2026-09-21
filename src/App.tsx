import { useState, useRef, useMemo, useEffect } from "react";
import { loadImageFile, generateDemoImage, bufferToPngBlob } from "./utils/image";
import { encodeImage } from "./stego/encoder";
import { decodeImage } from "./stego/decoder";
import { utf8Encode, utf8Decode } from "./stego/bitstream";
import { computeDifference } from "./stego/difference";
import { computeLsbDistribution } from "./stego/statistics";
import { byteToBinary } from "./utils/binary";
import { formatBytes } from "./utils/format";
import type { LoadedImage, EmbedMode } from "./types";
import { Analyse, Challenges, Learn, About } from "./pages";

const PAGES = ["LAB", "ANALYSE", "CHALLENGES", "LEARN", "ABOUT"];

export default function App() {
  const [page, setPage] = useState("LAB");
  return (
    <div className="min-h-screen">
      <header className="border-b border-edge bg-panel/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
          <span className="text-lg font-mono text-accent">StegaLens</span>
          <nav className="flex gap-1 text-xs font-mono">
            {PAGES.map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-1.5 rounded border ${
                  page === p
                    ? "border-accent text-accent"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {p}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="border border-edge rounded bg-panel2/60 px-3 py-2 text-xs font-mono text-slate-400">
          <span className="text-accent">LOCAL PROCESSING</span> - Your image and
          message are processed locally in your browser.
        </div>
        {page === "LAB" && <Lab />}
        {page === "ANALYSE" && <Analyse />}
        {page === "CHALLENGES" && <Challenges />}
        {page === "LEARN" && <Learn />}
        {page === "ABOUT" && <About />}
      </main>
    </div>
  );
}

function Lab() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [message, setMessage] = useState("StegaLens demonstration payload.");
  const [mode, setMode] = useState<EmbedMode>("rgb");
  const [encoded, setEncoded] = useState<ReturnType<typeof encodeImage> | null>(null);
  const [decodeResult, setDecodeResult] = useState<ReturnType<typeof decodeImage> | null>(null);
  const [decodedText, setDecodedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amp, setAmp] = useState(25);
  const [pixel, setPixel] = useState({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const diffRef = useRef<HTMLCanvasElement>(null);
  const origRef = useRef<HTMLCanvasElement>(null);
  const stegoRef = useRef<HTMLCanvasElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setError(null);
      setImage(await loadImageFile(f));
      setEncoded(null);
      setDecodeResult(null);
      setDecodedText(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed");
    }
  }

  function handleDemo() {
    const d = generateDemoImage(512, 512);
    setImage({
      fileName: "demo.png",
      fileType: "image/png",
      fileSize: d.data.length,
      width: 512,
      height: 512,
      original: d.data,
      element: d.element,
    });
    setMessage("StegaLens demonstration payload.");
    setEncoded(null);
    setDecodeResult(null);
    setDecodedText(null);
    setError(null);
  }

  function handleEncode() {
    if (!image) return;
    setError(null);
    try {
      const r = encodeImage(
        image.original,
        image.width,
        image.height,
        utf8Encode(message),
        { mode }
      );
      setEncoded(r);
      setPixel({ x: 0, y: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Encode failed");
    }
  }

  function handleDecode() {
    if (!image) return;
    const target = encoded?.data ?? image.original;
    const r = decodeImage(target, image.width, image.height, { mode });
    setDecodeResult(r);
    if (r.payload) {
      try {
        setDecodedText(utf8Decode(r.payload.message));
      } catch {
        setDecodedText(null);
      }
    } else {
      setDecodedText(null);
    }
  }

  async function handleDownload() {
    if (!encoded || !image) return;
    const blob = await bufferToPngBlob(encoded.data, image.width, image.height);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stegolens-encoded.png";
    a.click();
    URL.revokeObjectURL(url);
  }

  const capacityBytes = image
    ? Math.floor((image.width * image.height * (mode === "rgb" ? 3 : 1)) / 8) - 15
    : 0;
  const messageBytes = useMemo(() => utf8Encode(message), [message]);
  const stegoBuffer = encoded?.data ?? null;

  const stats = useMemo(() => {
    if (!image || !stegoBuffer) return null;
    return computeDifference(image.original, stegoBuffer, image.width, image.height);
  }, [image, stegoBuffer]);

  const origDist = useMemo(
    () => (image ? computeLsbDistribution(image.original, image.width, image.height) : null),
    [image]
  );
  const stegoDist = useMemo(
    () =>
      image && stegoBuffer
        ? computeLsbDistribution(stegoBuffer, image.width, image.height)
        : null,
    [image, stegoBuffer]
  );

  useEffect(() => {
    if (!image || !origRef.current) return;
    const c = origRef.current;
    c.width = image.width;
    c.height = image.height;
    c.getContext("2d")!.putImageData(
      new ImageData(image.original, image.width, image.height),
      0,
      0
    );
  }, [image]);

  useEffect(() => {
    if (!image || !stegoBuffer || !stegoRef.current) return;
    const c = stegoRef.current;
    c.width = image.width;
    c.height = image.height;
    c.getContext("2d")!.putImageData(
      new ImageData(stegoBuffer, image.width, image.height),
      0,
      0
    );
  }, [image, stegoBuffer]);

  useEffect(() => {
    if (!image || !stegoBuffer || !diffRef.current) return;
    const c = diffRef.current;
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d")!;
    const out = new Uint8ClampedArray(image.width * image.height * 4);
    for (let p = 0; p < image.width * image.height; p++) {
      const b = p * 4;
      for (let ch = 0; ch < 3; ch++)
        out[b + ch] = Math.min(
          255,
          Math.abs(image.original[b + ch] - stegoBuffer[b + ch]) * amp
        );
      out[b + 3] = 255;
    }
    ctx.putImageData(new ImageData(out, image.width, image.height), 0, 0);
  }, [image, stegoBuffer, amp]);

  const pixelData = useMemo(() => {
    if (!image) return null;
    const idx = (pixel.y * image.width + pixel.x) * 4;
    const o = [image.original[idx], image.original[idx + 1], image.original[idx + 2]];
    const s = stegoBuffer
      ? [stegoBuffer[idx], stegoBuffer[idx + 1], stegoBuffer[idx + 2]]
      : null;
    return { o, s };
  }, [image, stegoBuffer, pixel]);

  const currentStep =
    encoded?.trace?.[Math.min(pixel.x * 3, encoded.trace.length - 1)] ?? null;

  return (
    <div className="space-y-4">
      <div className="border border-edge rounded bg-panel p-4">
        <h2 className="text-sm font-mono text-accent mb-3">LAB</h2>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="px-3 py-1.5 border border-edge rounded hover:border-accent"
          >
            Upload Image
          </button>
          <button
            onClick={handleDemo}
            className="px-3 py-1.5 border border-accent text-accent rounded hover:bg-accent/10"
          >
            Run Demo
          </button>
        </div>
        {error && (
          <div className="mt-3 text-xs text-danger font-mono border border-danger/40 rounded p-2">
            {error}
          </div>
        )}
      </div>

      {image && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="border border-edge rounded bg-panel p-4">
              <h3 className="text-xs font-mono text-accent mb-3">IMAGE INFORMATION</h3>
              <div className="text-xs font-mono text-slate-300 grid grid-cols-2 gap-y-1">
                <span className="text-slate-500">File</span>
                <span className="truncate">{image.fileName}</span>
                <span className="text-slate-500">Type</span>
                <span>{image.fileType}</span>
                <span className="text-slate-500">Dimensions</span>
                <span>
                  {image.width} x {image.height}
                </span>
                <span className="text-slate-500">Pixels</span>
                <span>{(image.width * image.height).toLocaleString()}</span>
                <span className="text-slate-500">Capacity</span>
                <span>{formatBytes(capacityBytes)}</span>
              </div>
            </div>

            <div className="border border-edge rounded bg-panel p-4">
              <h3 className="text-xs font-mono text-accent mb-3">MESSAGE</h3>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-panel2 border border-edge rounded p-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex flex-wrap gap-2 mt-3 text-xs font-mono">
                <button
                  onClick={handleEncode}
                  className="px-3 py-1.5 border border-accent text-accent rounded hover:bg-accent/10"
                >
                  Encode into Image
                </button>
                <button
                  onClick={handleDecode}
                  className="px-3 py-1.5 border border-edge rounded hover:border-accent"
                >
                  Extract Message
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!encoded}
                  className="px-3 py-1.5 border border-edge rounded hover:border-accent disabled:opacity-40"
                >
                  Download Stego PNG
                </button>
              </div>
              <div className="mt-3 text-xs font-mono">
                <span className="text-slate-500">Mode: </span>
                {(["rgb", "red", "green", "blue"] as EmbedMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`ml-1 px-2 py-0.5 border rounded ${
                      mode === m
                        ? "border-accent text-accent"
                        : "border-edge text-slate-400 hover:border-accent"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-edge rounded bg-panel p-4">
              <h3 className="text-xs font-mono text-accent mb-3">
                UTF-8 BYTES ({messageBytes.length})
              </h3>
              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                {Array.from(messageBytes.slice(0, 48)).map((b, i) => (
                  <span
                    key={i}
                    className="px-1 py-0.5 rounded bg-bit-zero text-slate-200"
                  >
                    {byteToBinary(b)}
                  </span>
                ))}
                {messageBytes.length > 48 && (
                  <span className="text-slate-500">...</span>
                )}
              </div>
            </div>

            <div className="border border-edge rounded bg-panel p-4">
              <h3 className="text-xs font-mono text-accent mb-3">PAYLOAD CAPACITY</h3>
              <div className="text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Message size</span>
                  <span>{formatBytes(messageBytes.length)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available</span>
                  <span>{formatBytes(capacityBytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Utilisation</span>
                  <span>
                    {capacityBytes > 0
                      ? ((messageBytes.length / capacityBytes) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border border-edge rounded bg-panel p-4">
              <h3 className="text-xs font-mono text-accent mb-3">BEFORE / AFTER</h3>
              <div className="grid grid-cols-2 gap-px bg-edge rounded overflow-hidden">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 px-2 py-1 bg-panel">
                    ORIGINAL
                  </div>
                  <canvas ref={origRef} className="block w-full h-auto" />
                </div>
                <div>
                  <div className="text-[10px] font-mono text-slate-500 px-2 py-1 bg-panel">
                    STEGO
                  </div>
                  <canvas ref={stegoRef} className="block w-full h-auto" />
                </div>
              </div>
            </div>

            <div className="border border-edge rounded bg-panel p-4">
              <h3 className="text-xs font-mono text-accent mb-3">
                PIXEL MICROSCOPE - ({pixel.x}, {pixel.y})
              </h3>
              <div className="flex gap-1 mb-3 text-xs font-mono">
                <button
                  onClick={() => setPixel((p) => ({ ...p, y: Math.max(0, p.y - 1) }))}
                  className="px-2 py-1 border border-edge rounded hover:border-accent"
                >
                  ^
                </button>
                <button
                  onClick={() =>
                    setPixel((p) => ({ ...p, y: Math.min(image.height - 1, p.y + 1) }))
                  }
                  className="px-2 py-1 border border-edge rounded hover:border-accent"
                >
                  v
                </button>
                <button
                  onClick={() => setPixel((p) => ({ ...p, x: Math.max(0, p.x - 1) }))}
                  className="px-2 py-1 border border-edge rounded hover:border-accent"
                >
                  {"<"}
                </button>
                <button
                  onClick={() =>
                    setPixel((p) => ({ ...p, x: Math.min(image.width - 1, p.x + 1) }))
                  }
                  className="px-2 py-1 border border-edge rounded hover:border-accent"
                >
                  {">"}
                </button>
                <span className="ml-2 text-slate-500 self-center">Navigate pixels</span>
              </div>
              {pixelData && (
                <div className="grid grid-cols-3 gap-y-1 text-xs font-mono">
                  <div className="text-slate-500"></div>
                  <div className="text-slate-400">ORIGINAL</div>
                  <div className="text-slate-400">STEGO</div>
                  {(["RED", "GREEN", "BLUE"] as const).map((name, i) => {
                    const o = pixelData.o[i];
                    const s = pixelData.s ? pixelData.s[i] : null;
                    const changed = s !== null && (o & 1) !== (s & 1);
                    return (
                      <div key={name} className="contents">
                        <div className="text-slate-400">{name}</div>
                        <div className="text-slate-200">
                          {byteToBinary(o)}{" "}
                          <span className="text-slate-500">({o})</span>
                        </div>
                        <div className={changed ? "text-bit-changed" : "text-slate-200"}>
                          {s !== null ? byteToBinary(s) : "--------"}
                          {s !== null && (
                            <span className="ml-1 text-slate-500">({s})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="col-span-3 mt-2 text-slate-500 text-[10px]">
                    LSB (rightmost bit):{" "}
                    {(["R", "G", "B"] as const).map((n, i) => {
                      const o = pixelData.o[i] & 1;
                      const s = pixelData.s ? pixelData.s[i] & 1 : null;
                      const changed = s !== null && o !== s;
                      return (
                        <span key={n} className="mr-3">
                          {n}: {o}
                          {s !== null && (
                            <>
                              {" -> "}
                              <span
                                className={
                                  changed ? "text-bit-changed font-bold" : ""
                                }
                              >
                                {s}
                              </span>
                            </>
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {currentStep && (
              <div className="border border-edge rounded bg-panel p-4">
                <h3 className="text-xs font-mono text-accent mb-3">
                  BIT WRITE OPERATION
                </h3>
                <div className="font-mono text-xs space-y-2">
                  <div>
                    <span className="text-slate-500">Payload bit: </span>
                    <span className="text-bit-payload text-lg">
                      {currentStep.write.bit}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Target: </span>
                    <span>
                      pixel ({currentStep.x}, {currentStep.y}), channel{" "}
                      {["RED", "GREEN", "BLUE"][currentStep.channel]}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Before: </span>
                    <span>{byteToBinary(currentStep.write.before)}</span>
                    <span className="text-slate-500">
                      {" "}
                      ({currentStep.write.before})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">After: </span>
                    <span className={currentStep.write.changed ? "text-bit-changed" : ""}>
                      {byteToBinary(currentStep.write.after)}
                    </span>
                    <span className="text-slate-500">
                      {" "}
                      ({currentStep.write.after})
                    </span>
                  </div>
                  <div className="text-slate-400 border-t border-edge pt-2">
                    ({byteToBinary(currentStep.write.before)} &amp; 11111110) |{" "}
                    {currentStep.write.bit} ={" "}
                    {byteToBinary(currentStep.write.after)}
                  </div>
                </div>
              </div>
            )}

            <div className="border border-edge rounded bg-panel p-4">
              <h3 className="text-xs font-mono text-accent mb-3">DIFFERENCE MAP</h3>
              <div className="flex flex-wrap gap-1 mb-2 text-xs font-mono">
                <span className="text-slate-500 self-center mr-2">Amplification</span>
                {[1, 5, 10, 25, 50, 100].map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmp(a)}
                    className={`px-2 py-0.5 border rounded ${
                      amp === a
                        ? "border-accent text-accent"
                        : "border-edge text-slate-400 hover:border-accent"
                    }`}
                  >
                    {a}x
                  </button>
                ))}
              </div>
              <div className="bg-black border border-edge rounded overflow-hidden">
                <canvas ref={diffRef} className="block w-full h-auto" />
              </div>
            </div>

            {stats && (
              <div className="border border-edge rounded bg-panel p-4">
                <h3 className="text-xs font-mono text-accent mb-3">STEGO ANALYSIS</h3>
                <div className="grid grid-cols-2 gap-y-1 text-xs font-mono">
                  <span className="text-slate-500">Changed pixels</span>
                  <span>
                    {stats.changedPixels.toLocaleString()} /{" "}
                    {stats.totalPixels.toLocaleString()}
                  </span>
                  <span className="text-slate-500">Changed channels</span>
                  <span>
                    {stats.changedChannels.toLocaleString()} /{" "}
                    {stats.totalChannels.toLocaleString()}
                  </span>
                  <span className="text-slate-500">% changed channels</span>
                  <span>{stats.percentChangedChannels.toFixed(4)}%</span>
                  <span className="text-slate-500">Avg channel diff</span>
                  <span>{stats.averageChannelDifference.toFixed(6)}</span>
                  <span className="text-slate-500">Max channel diff</span>
                  <span>{stats.maxChannelDifference}</span>
                </div>
              </div>
            )}

            {origDist && (
              <div className="border border-edge rounded bg-panel p-4">
                <h3 className="text-xs font-mono text-accent mb-3">
                  LSB DISTRIBUTION
                </h3>
                <div className="text-xs font-mono space-y-2">
                  <div>
                    <div className="text-slate-500 mb-1">Original</div>
                    <div>0: {(origDist.zeroRatio * 100).toFixed(2)}%</div>
                    <div>1: {(origDist.oneRatio * 100).toFixed(2)}%</div>
                  </div>
                  {stegoDist && (
                    <div>
                      <div className="text-slate-500 mb-1">Stego</div>
                      <div>0: {(stegoDist.zeroRatio * 100).toFixed(2)}%</div>
                      <div>1: {(stegoDist.oneRatio * 100).toFixed(2)}%</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {decodeResult && (
              <div className="border border-edge rounded bg-panel p-4">
                <h3 className="text-xs font-mono text-accent mb-3">EXTRACTION</h3>
                {decodeResult.payload ? (
                  <div className="text-xs font-mono space-y-2">
                    <div className="text-bit-payload">
                      OK - Magic header, version, length, checksum verified
                    </div>
                    <div className="text-slate-500">Message recovered:</div>
                    <pre className="whitespace-pre-wrap break-words bg-panel2 border border-edge rounded p-2 text-slate-100">
                      {decodedText ?? "(invalid UTF-8)"}
                    </pre>
                  </div>
                ) : (
                  <div className="text-xs font-mono space-y-2">
                    <div className="text-warn">
                      No valid StegaLens payload detected.
                    </div>
                    <div className="text-slate-500">
                      {decodeResult.error?.message}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}