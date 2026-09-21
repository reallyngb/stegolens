import { useState, useRef } from "react";
import { loadImageFile, generateDemoImage } from "../utils/image";
import { encodeImage } from "../stego/encoder";
import { decodeImage } from "../stego/decoder";
import { utf8Encode, utf8Decode } from "../stego/bitstream";
import type { LoadedImage } from "../types";

export function Analyse() {
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [decodeResult, setDecodeResult] = useState<ReturnType<typeof decodeImage> | null>(null);
  const [decodedText, setDecodedText] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setImage(await loadImageFile(f));
    setDecodeResult(null);
    setDecodedText(null);
  }

  function handleExtract() {
    if (!image) return;
    const r = decodeImage(image.original, image.width, image.height);
    setDecodeResult(r);
    if (r.payload) {
      try {
        setDecodedText(utf8Decode(r.payload.message));
      } catch {
        setDecodedText(null);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-edge rounded bg-panel p-4">
        <h2 className="text-sm font-mono text-accent mb-3">ANALYSE</h2>
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFile} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="px-3 py-1.5 border border-edge rounded hover:border-accent">Load Image</button>
          <button onClick={handleExtract} disabled={!image} className="px-3 py-1.5 border border-accent text-accent rounded hover:bg-accent/10 disabled:opacity-40">Attempt Extraction</button>
        </div>
      </div>
      {image && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="border border-edge rounded bg-panel p-4 text-xs font-mono">
            <div className="text-accent mb-2">IMAGE INFORMATION</div>
            <div>{image.width} × {image.height}</div>
            <div>{(image.width * image.height).toLocaleString()} pixels</div>
            <div>{(image.width * image.height * 3).toLocaleString()} RGB channels</div>
          </div>
          {decodeResult && (
            <div className="border border-edge rounded bg-panel p-4 text-xs font-mono">
              <div className="text-accent mb-2">EXTRACTION RESULT</div>
              {decodeResult.payload ? (
                <pre className="whitespace-pre-wrap break-words">{decodedText ?? "(invalid UTF-8)"}</pre>
              ) : (
                <>
                  <div className="text-warn">No payload detected.</div>
                  <div className="text-slate-500">{decodeResult.error?.message}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Challenges() {
  const [active, setActive] = useState<number | null>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [result, setResult] = useState<ReturnType<typeof decodeImage> | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);

  const challenges = [
    { id: 0, title: "Challenge #01", hasPayload: true, secret: "The flag is: STEGO-{first_contact}" },
    { id: 1, title: "Challenge #02", hasPayload: false, secret: null },
    { id: 2, title: "Challenge #03", hasPayload: true, secret: "🔐 Cybersecurity — こんにちは" },
  ];

  function open(i: number) {
    const c = challenges[i];
    const d = generateDemoImage(384, 384);
    let data = d.data;
    if (c.hasPayload && c.secret) {
      const enc = encodeImage(d.data, 384, 384, utf8Encode(c.secret));
      data = enc.data;
    }
    setImage({
      fileName: `challenge-${c.id}.png`,
      fileType: "image/png",
      fileSize: data.length,
      width: 384,
      height: 384,
      original: data,
      element: d.element,
    });
    setActive(i);
    setResult(null);
    setText(null);
    setSecret(c.secret);
  }

  function extract() {
    if (!image) return;
    const r = decodeImage(image.original, image.width, image.height);
    setResult(r);
    if (r.payload) {
      try {
        setText(utf8Decode(r.payload.message));
      } catch {
        setText(null);
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="border border-edge rounded bg-panel p-4">
        <h2 className="text-sm font-mono text-accent mb-3">CHALLENGES</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {challenges.map((c) => (
            <button key={c.id} onClick={() => open(c.id)}
              className={`text-left border rounded p-3 font-mono text-xs ${active === c.id ? "border-accent text-accent" : "border-edge text-slate-300 hover:border-accent"}`}>
              <div className="text-accent mb-1">{c.title}</div>
              <div className="text-slate-500">Use Analyse tools to decide if a payload is present.</div>
            </button>
          ))}
        </div>
      </div>
      {image && active !== null && (
        <div className="border border-edge rounded bg-panel p-4 space-y-3 text-xs font-mono">
          <button onClick={extract} className="px-3 py-1.5 border border-accent text-accent rounded">Attempt Extraction</button>
          <button onClick={() => alert(secret ? `This image DOES contain a payload.\n\nSecret: ${secret}` : "This image does NOT contain a payload.")}
            className="ml-2 px-3 py-1.5 border border-edge rounded hover:border-accent">Reveal Answer</button>
          {result && (
            <div className="border-t border-edge pt-3">
              {result.payload ? (
                <>
                  <div className="text-bit-payload">✓ Payload recovered</div>
                  <pre className="mt-2 whitespace-pre-wrap">{text}</pre>
                </>
              ) : (
                <>
                  <div className="text-warn">No payload detected.</div>
                  <div className="text-slate-500">{result.error?.message}</div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Learn() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="border border-edge rounded bg-panel p-5">
        <h2 className="text-sm font-mono text-accent mb-3">LEARN LSB</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Least Significant Bit steganography hides a message in the rightmost bit of each RGB channel. Each channel is a byte (0–255), so flipping the last bit changes the value by at most 1 — practically invisible to the eye.
        </p>
      </div>
      <div className="border border-edge rounded bg-panel p-5 space-y-3">
        <h3 className="text-xs font-mono text-accent">THE BIT OPERATION</h3>
        <pre className="bg-panel2 border border-edge rounded p-3 text-xs font-mono text-slate-200">{`newValue = (oldValue & 0b11111110) | secretBit

Example:
  oldValue = 180 = 10110100
  secretBit = 1
  result   = 181 = 10110101`}</pre>
        <p className="text-sm text-slate-300">The AND clears the LSB. The OR inserts the new bit. Every other bit is untouched.</p>
      </div>
      <div className="border border-edge rounded bg-panel p-5 space-y-3">
        <h3 className="text-xs font-mono text-accent">STEGANOGRAPHY IS NOT ENCRYPTION</h3>
        <p className="text-sm text-slate-300">
          LSB steganography hides the existence of a message. It does not protect its content. Anyone who knows the format can extract and read the message. Combine with encryption if you need confidentiality.
        </p>
        <pre className="bg-panel2 border border-edge rounded p-3 text-xs font-mono text-slate-200">{`Plaintext → Encryption → Ciphertext → Steganography → Image`}</pre>
      </div>
      <div className="border border-edge rounded bg-panel p-5 space-y-3">
        <h3 className="text-xs font-mono text-accent">LIMITATIONS</h3>
        <ul className="list-disc list-inside text-sm text-slate-300 space-y-1">
          <li>JPEG recompression destroys LSB payloads. Use PNG.</li>
          <li>LSB embedding is statistically detectable.</li>
          <li>A missing StegaLens header does not prove an image is clean — only that no StegaLens payload was found.</li>
          <li>This is an educational tool, not a covert channel.</li>
        </ul>
      </div>
    </div>
  );
}

export function About() {
  return (
    <div className="space-y-4 max-w-3xl">
      <div className="border border-edge rounded bg-panel p-5">
        <h2 className="text-sm font-mono text-accent mb-3">ABOUT</h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          StegaLens is a browser-only LSB steganography laboratory. Nothing is uploaded. Nothing phones home. The payload format and all bit operations are documented in the source.
        </p>
      </div>
      <div className="border border-edge rounded bg-panel p-5 text-sm text-slate-300 space-y-3">
        <h3 className="text-xs font-mono text-accent">PAYLOAD FORMAT</h3>
        <pre className="bg-panel2 border border-edge rounded p-3 text-xs font-mono">{`offset  size  field
0       4     magic "STGL"
4       1     version (0x01)
5       1     flags (0x00)
6       1     encoding (0x01 = UTF-8)
7       4     message length (big-endian)
11      N     message bytes
11+N    4     CRC-32 checksum`}</pre>
        <h3 className="text-xs font-mono text-accent pt-3">TRAVERSAL ORDER</h3>
        <p>Channel bits are written R → G → B, pixel by pixel, row-major. Alpha is never modified.</p>
        <h3 className="text-xs font-mono text-accent pt-3">LICENSE</h3>
        <p>MIT — see LICENSE.</p>
      </div>
    </div>
  );
}