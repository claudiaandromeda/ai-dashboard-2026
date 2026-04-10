#!/usr/bin/env node
/**
 * normalize-model.mjs
 * 
 * Normalises a garment GLB to a consistent coordinate space matching hoodie.glb:
 *   - Bakes all node transforms (rotation, scale, translation) into vertex geometry
 *   - Scales so the garment WIDTH = TARGET_WIDTH (default 1.277 — matches hoodie)
 *   - Centres the model at origin (X=0, Z=0) with Y bottom = 0
 *
 * Usage:
 *   node scripts/normalize-model.mjs <input.glb> <output.glb> [--target-width 1.277]
 *
 * After normalisation, every model will have:
 *   - groupScale ≈ 1.644 (same as hoodie) → front surface z ≈ +0.30, back ≈ -0.30
 *   - Decal configs transfer with minimal position tuning
 *   - Camera distance auto-computed from model height at runtime
 *
 * Pre-launch: this script should be run on every new model before upload to Supabase.
 * See PRE_LAUNCH.md for full context.
 */

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { mat4, vec3 } from 'gl-matrix';
import draco3d from 'draco3dgltf';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const TARGET_WIDTH = 1.277; // match hoodie.glb natural width

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const inputPath  = args[0];
const outputPath = args[1];
const widthArg = args.indexOf('--target-width');
const targetWidth = widthArg >= 0 ? parseFloat(args[widthArg + 1]) : TARGET_WIDTH;
const flipNormals = args.includes('--flip-normals'); // use when model has inverted normals

if (!inputPath || !outputPath) {
  console.error('Usage: node normalize-model.mjs <input.glb> <output.glb> [--target-width 1.277]');
  process.exit(1);
}

console.log(`\n📐 Normalising: ${inputPath} → ${outputPath}`);
console.log(`   Target width: ${targetWidth}`);

// ── Load ──────────────────────────────────────────────────────────────────────
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
const document = await io.read(resolve(inputPath));
const root = document.getRoot();

// ── Step 1: Compute current world bounding box ────────────────────────────────
let minX = Infinity, maxX = -Infinity;
let minY = Infinity, maxY = -Infinity;
let minZ = Infinity, maxZ = -Infinity;

function applyNodeTransforms(node, parentMatrix) {
  // Build this node's local matrix
  const localMatrix = mat4.create();

  const t = node.getTranslation();
  const r = node.getRotation();  // quaternion [x,y,z,w]
  const s = node.getScale();

  if (t) mat4.translate(localMatrix, localMatrix, t);
  if (r) {
    const rotMat = mat4.create();
    mat4.fromQuat(rotMat, r);
    mat4.multiply(localMatrix, localMatrix, rotMat);
  }
  if (s) mat4.scale(localMatrix, localMatrix, s);

  const worldMatrix = mat4.multiply(mat4.create(), parentMatrix, localMatrix);

  // Apply to mesh vertices
  const mesh = node.getMesh();
  if (mesh) {
    for (const prim of mesh.listPrimitives()) {
      const accessor = prim.getAttribute('POSITION');
      if (!accessor) continue;
      const count = accessor.getCount();
      for (let i = 0; i < count; i++) {
        const v = accessor.getElement(i, [0, 0, 0]);
        const tv = vec3.transformMat4(vec3.create(), v, worldMatrix);
        minX = Math.min(minX, tv[0]); maxX = Math.max(maxX, tv[0]);
        minY = Math.min(minY, tv[1]); maxY = Math.max(maxY, tv[1]);
        minZ = Math.min(minZ, tv[2]); maxZ = Math.max(maxZ, tv[2]);
      }
    }
  }

  for (const child of node.listChildren()) {
    applyNodeTransforms(child, worldMatrix);
  }
}

const identity = mat4.create();
for (const scene of root.listScenes()) {
  for (const node of scene.listChildren()) {
    applyNodeTransforms(node, identity);
  }
}

const currentWidth  = maxX - minX;
const currentHeight = maxY - minY;
const currentDepth  = maxZ - minZ;
const centreX = (minX + maxX) / 2;
const centreZ = (minZ + maxZ) / 2;

console.log(`\n   Current bounds:`);
console.log(`     Width  (X): ${currentWidth.toFixed(3)}  [${minX.toFixed(3)}, ${maxX.toFixed(3)}]`);
console.log(`     Height (Y): ${currentHeight.toFixed(3)}  [${minY.toFixed(3)}, ${maxY.toFixed(3)}]`);
console.log(`     Depth  (Z): ${currentDepth.toFixed(3)}  [${minZ.toFixed(3)}, ${maxZ.toFixed(3)}]`);

// ── Step 2: Compute transform to apply ───────────────────────────────────────
const scale = targetWidth / currentWidth;
// After scaling: translate so X=centred, Y bottom at 0, Z centred
const tx = -centreX * scale;
const ty = -minY * scale;          // Y bottom → 0
const tz = -centreZ * scale;       // Z centred

console.log(`\n   Normalisation:`);
console.log(`     Scale factor: ${scale.toFixed(6)}`);
console.log(`     Translation: (${tx.toFixed(4)}, ${ty.toFixed(4)}, ${tz.toFixed(4)})`);
console.log(`\n   Output bounds (after normalisation):`);
console.log(`     Width  (X): ${(currentWidth * scale).toFixed(3)}`);
console.log(`     Height (Y): ${(currentHeight * scale).toFixed(3)}`);
console.log(`     Depth  (Z): ${(currentDepth * scale).toFixed(3)}`);

// ── Step 3: Bake transform into all geometry and clear node transforms ────────
function bakeAndClearTransforms(node, parentMatrix) {
  const localMatrix = mat4.create();
  const t = node.getTranslation();
  const r = node.getRotation();
  const s = node.getScale();
  if (t) mat4.translate(localMatrix, localMatrix, t);
  if (r) { const rm = mat4.create(); mat4.fromQuat(rm, r); mat4.multiply(localMatrix, localMatrix, rm); }
  if (s) mat4.scale(localMatrix, localMatrix, s);
  const worldMatrix = mat4.multiply(mat4.create(), parentMatrix, localMatrix);

  const mesh = node.getMesh();
  if (mesh) {
    for (const prim of mesh.listPrimitives()) {
      const posAccessor = prim.getAttribute('POSITION');
      if (posAccessor) {
        const count = posAccessor.getCount();
        for (let i = 0; i < count; i++) {
          const v = posAccessor.getElement(i, [0, 0, 0]);
          // Apply world transform
          let tv = vec3.transformMat4(vec3.create(), v, worldMatrix);
          // Apply normalisation scale + translation
          tv[0] = tv[0] * scale + tx;
          tv[1] = tv[1] * scale + ty;
          tv[2] = tv[2] * scale + tz;
          posAccessor.setElement(i, tv);
        }
      }

      // Also transform normals (rotation only, no scale, no translation)
      const normAccessor = prim.getAttribute('NORMAL');
      if (normAccessor) {
        // Extract rotation-only matrix (no scale, no translation)
        const normalMatrix = mat4.create();
        if (r) { mat4.fromQuat(normalMatrix, r); }
        // Propagate parent rotation
        const parentRot = mat4.create();
        // Simple: use the world matrix but zeroed translation + normalised scale
        // For correctness, use inverse-transpose of the upper-left 3x3
        const nm3 = mat4.clone(worldMatrix);
        nm3[12] = nm3[13] = nm3[14] = 0; // clear translation
        mat4.invert(nm3, nm3);
        mat4.transpose(nm3, nm3);

        const count = normAccessor.getCount();
        for (let i = 0; i < count; i++) {
          const n = normAccessor.getElement(i, [0, 0, 0]);
          const tn = vec3.transformMat4(vec3.create(), n, nm3);
          vec3.normalize(tn, tn);
          normAccessor.setElement(i, tn);
        }
      }
    }
  }

  // Clear this node's transforms (baked in now)
  node.setTranslation([0, 0, 0]);
  node.setRotation([0, 0, 0, 1]);
  node.setScale([1, 1, 1]);

  for (const child of node.listChildren()) {
    bakeAndClearTransforms(child, worldMatrix);
  }
}

// Only the root nodes need baking — their children inherit identity after this
for (const scene of root.listScenes()) {
  for (const node of scene.listChildren()) {
    bakeAndClearTransforms(node, identity);
  }
}

// ── Step 3b: Flip normals if requested ───────────────────────────────────────
if (flipNormals) {
  let flipped = 0;
  for (const scene of root.listScenes()) {
    for (const node of scene.listChildren()) {
      const mesh = node.getMesh();
      if (!mesh) continue;
      for (const prim of mesh.listPrimitives()) {
        const norm = prim.getAttribute('NORMAL');
        if (!norm) continue;
        for (let i = 0; i < norm.getCount(); i++) {
          const n = norm.getElement(i, [0,0,0]);
          norm.setElement(i, [-n[0], -n[1], -n[2]]);
          flipped++;
        }
      }
    }
  }
  console.log(`   Flipped ${flipped} normals`);
}

// ── Step 4: Write output ──────────────────────────────────────────────────────
await io.write(resolve(outputPath), document);

const finalWidth  = currentWidth  * scale;
const finalHeight = currentHeight * scale;
const finalDepth  = currentDepth  * scale;
const expectedGroupScale = 2.1 / finalWidth;

console.log(`\n✅ Written: ${outputPath}`);
console.log(`\n   Expected GarmentViewer3D values:`);
console.log(`     groupScale: ${expectedGroupScale.toFixed(4)}`);
console.log(`     Scene width: ${(finalWidth * expectedGroupScale).toFixed(3)} (target 2.1)`);
console.log(`     Scene height: ${(finalHeight * expectedGroupScale).toFixed(3)}`);
console.log(`     Scene depth: ${(finalDepth * expectedGroupScale).toFixed(3)}`);
console.log(`     Front surface z ≈ +${((finalDepth / 2) * expectedGroupScale * 0.85).toFixed(3)}`);
console.log(`     Back surface z  ≈ -${((finalDepth / 2) * expectedGroupScale * 0.85).toFixed(3)}`);
console.log(`\n   Camera guidance:`);
const camZ = ((finalHeight * expectedGroupScale) / 2) / Math.tan(26 * Math.PI / 180) * 1.2;
console.log(`     Suggested cameraZ for full-height fit (FOV 52°): ${camZ.toFixed(2)}`);
