/**
 * Convert NASA Orion STL to GLB format.
 * Usage: node scripts/convert-stl.js <input.stl> <output.glb>
 */
import { readFileSync, writeFileSync } from 'fs';

const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/convert-stl.js <input.stl> <output.glb>');
  process.exit(1);
}

// Parse binary STL
const buf = readFileSync(inputPath);
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

const numTriangles = dv.getUint32(80, true);
console.log(`Parsing ${numTriangles} triangles...`);

const positions = new Float32Array(numTriangles * 9);
const normals = new Float32Array(numTriangles * 9);

for (let i = 0; i < numTriangles; i++) {
  const offset = 84 + i * 50;
  const nx = dv.getFloat32(offset, true);
  const ny = dv.getFloat32(offset + 4, true);
  const nz = dv.getFloat32(offset + 8, true);

  for (let v = 0; v < 3; v++) {
    const vOffset = offset + 12 + v * 12;
    const vi = i * 9 + v * 3;
    positions[vi] = dv.getFloat32(vOffset, true);
    positions[vi + 1] = dv.getFloat32(vOffset + 4, true);
    positions[vi + 2] = dv.getFloat32(vOffset + 8, true);
    normals[vi] = nx;
    normals[vi + 1] = ny;
    normals[vi + 2] = nz;
  }
}

// Build minimal glTF 2.0 JSON
const posBuffer = Buffer.from(positions.buffer);
const normBuffer = Buffer.from(normals.buffer);
const binBuffer = Buffer.concat([posBuffer, normBuffer]);

// Compute bounding box
let minX = Infinity, minY = Infinity, minZ = Infinity;
let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (let i = 0; i < positions.length; i += 3) {
  minX = Math.min(minX, positions[i]);
  minY = Math.min(minY, positions[i+1]);
  minZ = Math.min(minZ, positions[i+2]);
  maxX = Math.max(maxX, positions[i]);
  maxY = Math.max(maxY, positions[i+1]);
  maxZ = Math.max(maxZ, positions[i+2]);
}

console.log(`Bounds: [${minX.toFixed(1)}, ${minY.toFixed(1)}, ${minZ.toFixed(1)}] to [${maxX.toFixed(1)}, ${maxY.toFixed(1)}, ${maxZ.toFixed(1)}]`);

const gltf = {
  asset: { version: "2.0", generator: "arow-stl-converter" },
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{
    primitives: [{
      attributes: { POSITION: 0, NORMAL: 1 },
      material: 0,
    }]
  }],
  materials: [{
    pbrMetallicRoughness: {
      baseColorFactor: [0.75, 0.75, 0.75, 1.0],
      metallicFactor: 0.5,
      roughnessFactor: 0.5,
    }
  }],
  accessors: [
    {
      bufferView: 0, componentType: 5126, count: numTriangles * 3,
      type: "VEC3", min: [minX, minY, minZ], max: [maxX, maxY, maxZ]
    },
    {
      bufferView: 1, componentType: 5126, count: numTriangles * 3,
      type: "VEC3"
    }
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: posBuffer.length },
    { buffer: 0, byteOffset: posBuffer.length, byteLength: normBuffer.length }
  ],
  buffers: [{ byteLength: binBuffer.length }]
};

// Write GLB
const jsonStr = JSON.stringify(gltf);
const jsonBuf = Buffer.from(jsonStr);
// Pad JSON to 4-byte alignment
const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
const paddedJson = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
// Pad bin to 4-byte alignment
const binPad = (4 - (binBuffer.length % 4)) % 4;
const paddedBin = Buffer.concat([binBuffer, Buffer.alloc(binPad, 0x00)]);

const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBin.length;
const glb = Buffer.alloc(totalLength);
let off = 0;
// Header
glb.writeUInt32LE(0x46546C67, off); off += 4; // magic "glTF"
glb.writeUInt32LE(2, off); off += 4;           // version
glb.writeUInt32LE(totalLength, off); off += 4;  // total length
// JSON chunk
glb.writeUInt32LE(paddedJson.length, off); off += 4;
glb.writeUInt32LE(0x4E4F534A, off); off += 4; // "JSON"
paddedJson.copy(glb, off); off += paddedJson.length;
// BIN chunk
glb.writeUInt32LE(paddedBin.length, off); off += 4;
glb.writeUInt32LE(0x004E4942, off); off += 4; // "BIN\0"
paddedBin.copy(glb, off);

writeFileSync(outputPath, glb);
console.log(`Written ${outputPath} (${(totalLength/1024).toFixed(1)} KB)`);
