'use client';
import { useEffect, useRef } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createExplosionLayout } from './explosion-layout';
import { decodeModelResponse } from './model-download';
import { PointerTap } from './pointer-tap';
import { SYSTEMS } from './anatomy';
export default function AnatomyScene({ atlas, state, onSelect, onProgress, onError }) {
    const host = useRef(null), latest = useRef(state), select = useRef(onSelect);
    latest.current = state;
    select.current = onSelect;
    useEffect(() => {
        const el = host.current;
        let disposed = false, frame = 0, dirty = true, ready = false, lastView = '', lastReset = -1, lastIsolate = '', layoutKey = '', amount = 0;
        let lastState = null;
        const abort = new AbortController();
        let renderer;
        try {
            renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        }
        catch {
            onError('This browser could not start the 3D viewer. Please try a browser with WebGL enabled.');
            return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 2));
        renderer.setClearColor('#f5eedc');
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = .86;
        el.appendChild(renderer.domElement);
        renderer.domElement.setAttribute('tabindex', '0');
        renderer.domElement.setAttribute('aria-label', 'Interactive human anatomy. Drag to orbit, pinch or scroll to zoom, and tap a structure to inspect it.');
        const scene = new T.Scene(), camera = new T.PerspectiveCamera(34, 1, .005, 100), controls = new OrbitControls(camera, renderer.domElement);
        camera.position.set(1.4, 1.05, 3.6);
        controls.target.set(0, .85, 0);
        controls.enableDamping = true;
        controls.dampingFactor = .085;
        controls.minDistance = .07;
        controls.maxDistance = 40;
        controls.maxPolarAngle = Math.PI * .96;
        controls.addEventListener('change', () => { dirty = true; });
        const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment(), env = pmrem.fromScene(room, .04);
        scene.environment = env.texture;
        room.dispose();
        pmrem.dispose();
        scene.add(new T.HemisphereLight(0xffffff, 0x98856b, .72));
        const key = new T.DirectionalLight(0xfff6e8, 1.45);
        key.position.set(-2, 4, 3);
        scene.add(key);
        const rim = new T.DirectionalLight(0xd8e4f0, .72);
        rim.position.set(2, 2, -3);
        scene.add(rim);
        const ground = new T.Mesh(new T.CircleGeometry(30, 96), new T.MeshStandardMaterial({ color: 0xe4dac6, roughness: 1 }));
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -.019;
        scene.add(ground);
        const platform = new T.Mesh(new T.CylinderGeometry(.68, .7, .028, 100), new T.MeshStandardMaterial({ color: 0xd8c9ad, metalness: .04, roughness: .8 }));
        platform.position.y = -.016;
        scene.add(platform);
        const ring = new T.Mesh(new T.RingGeometry(.63, .632, 128), new T.MeshBasicMaterial({ color: 0x81745f, transparent: true, opacity: .45, side: T.DoubleSide }));
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = .001;
        scene.add(ring);
        const innerRing = new T.Mesh(new T.RingGeometry(.55, .551, 128), new T.MeshBasicMaterial({ color: 0x9a8b73, transparent: true, opacity: .22, side: T.DoubleSide }));
        innerRing.rotation.x = -Math.PI / 2;
        innerRing.position.y = .001;
        scene.add(innerRing);
        const width = T.MathUtils.ceilPowerOfTwo(atlas.parts.length), data = new Float32Array(width * 4), partTexture = new T.DataTexture(data, width, 1, T.RGBAFormat, T.FloatType);
        partTexture.needsUpdate = true;
        const selectedData = new Uint8Array(width * 4), selectionTexture = new T.DataTexture(selectedData, width, 1);
        selectionTexture.needsUpdate = true;
        const materials = [], geometries = [], pickers = [], centers = atlas.parts.map(p => new T.Vector3().fromArray(p.bounds[0]).add(new T.Vector3().fromArray(p.bounds[1])).multiplyScalar(.5));
        const offsets = [], bounds = atlas.parts.map(p => new T.Box3(new T.Vector3().fromArray(p.bounds[0]), new T.Vector3().fromArray(p.bounds[1])));
        let packingWidth = 1, packingHeight = 1;
        const markerPositions = new Float32Array(atlas.parts.length * 3), markerGeometry = new T.BufferGeometry();
        markerGeometry.setAttribute('position', new T.BufferAttribute(markerPositions, 3));
        const markerMaterial = new T.PointsMaterial({ color: 0x64748b, size: 5, sizeAttenuation: false, transparent: true, opacity: .72, depthTest: false });
        markerMaterial.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;'); };
        const markers = new T.Points(markerGeometry, markerMaterial);
        markers.frustumCulled = false;
        markers.renderOrder = 10;
        markers.visible = false;
        scene.add(markers);
        const hover = document.createElement('div');
        hover.className = 'part-hover';
        hover.setAttribute('role', 'tooltip');
        hover.hidden = true;
        el.appendChild(hover);
        let targets = [];
        const projected = new T.Vector3();
        const findTarget = (x, y, radius) => {
            let best = -1, score = Infinity;
            for (const t of targets) {
                const dx = Math.max(t.left - x, 0, x - t.right), dy = Math.max(t.top - y, 0, y - t.bottom), distance = Math.hypot(dx, dy);
                if (distance > radius)
                    continue;
                const candidate = distance + Math.hypot(t.x - x, t.y - y) * .025;
                if (candidate < score) {
                    score = candidate;
                    best = t.index;
                }
            }
            return best;
        };
        const materialFor = (system) => {
            const baseColor = system === 'skeletal' ? '#c7b38b' : SYSTEMS.find(s => s.id === system)?.color ?? '#aebbb8';
            const m = new T.MeshStandardMaterial({ color: baseColor, metalness: .03, roughness: .72, envMapIntensity: .68, side: T.DoubleSide, transparent: system === 'integumentary', opacity: system === 'integumentary' ? .1 : 1, depthWrite: system !== 'integumentary' });
            m.onBeforeCompile = shader => {
                shader.uniforms.partState = { value: partTexture };
                shader.uniforms.selectionState = { value: selectionTexture };
                shader.uniforms.stateWidth = { value: width };
                shader.vertexShader = 'attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n' + shader.vertexShader;
                shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;');
                shader.fragmentShader = 'varying float partVisible; varying float partSelected;\n' + shader.fragmentShader;
                shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;');
                shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.18, 0.42, 0.68), partSelected * 0.72);');
            };
            materials.push(m);
            return m;
        };
        const mats = new Map(SYSTEMS.map(s => [s.id, materialFor(s.id)]));
        let loaded = 0;
        const loadChunk = async (ci) => {
            const chunk = atlas.chunks[ci], compressed = !!chunk.gzip && typeof DecompressionStream !== 'undefined';
            const response = await fetch(compressed ? chunk.gzip : chunk.url, { signal: abort.signal });
            const buffer = await decodeModelResponse(response, chunk.bytes, compressed);
            if (disposed)
                return;
            const groups = new Map();
            atlas.parts.forEach((p, i) => {
                if (p.chunk !== ci)
                    return;
                const g = new T.BufferGeometry();
                g.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3));
                // GPU normalized signed-short normals keep the complete atlas compact in memory.
                g.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true));
                g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
                g.boundingBox = bounds[i].clone();
                g.computeBoundingSphere();
                const pick = new T.Mesh(g);
                pick.matrixAutoUpdate = false;
                pickers[i] = pick;
                geometries.push(g);
                g.setAttribute('partIndex', new T.BufferAttribute(new Float32Array(p.vertexCount).fill(i), 1));
                const list = groups.get(p.system) ?? [];
                list.push(g);
                groups.set(p.system, list);
            });
            groups.forEach((gs, system) => { const geometry = mergeGeometries(gs, false); if (!geometry)
                throw new Error('Could not assemble anatomy geometry.'); geometries.push(geometry); const mesh = new T.Mesh(geometry, mats.get(system)); mesh.frustumCulled = false; scene.add(mesh); });
            lastState = null;
            loaded++;
            onProgress(Math.round(loaded / atlas.chunks.length * 100));
            dirty = true;
        };
        (async () => { try {
            let cursor = 0;
            await Promise.all(Array.from({ length: 3 }, async () => { while (cursor < atlas.chunks.length) {
                const i = cursor++;
                await loadChunk(i);
            } }));
            if (!disposed) {
                ready = true;
                dirty = true;
            }
        }
        catch (e) {
            if (!disposed)
                onError(e instanceof Error ? e.message : 'Could not load the anatomy.');
        } })();
        const fit = (view, extent = 0) => {
            camera.clearViewOffset();
            const aspect = camera.aspect, tangent = 2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2));
            const normalDistance = Math.max(1.95, 1 / aspect) / tangent * 1.08;
            const atlasDistance = Math.max(packingHeight, packingWidth / aspect) / tangent * 1.15;
            const distance = T.MathUtils.lerp(normalDistance, Math.max(.2, atlasDistance), extent);
            if (extent > .8)
                view = 'front';
            const direction = view === 'front' ? new T.Vector3(0, .02, 1) : view === 'back' ? new T.Vector3(0, .02, -1) : view === 'side' ? new T.Vector3(1, .02, 0) : new T.Vector3(.35, .06, 1).normalize();
            controls.target.set(0, .85, 0);
            camera.position.copy(controls.target).addScaledVector(direction, distance);
            controls.update();
            dirty = true;
        };
        const resize = () => { layoutKey = ''; lastState = null; lastIsolate = ''; renderer.setPixelRatio(Math.min(devicePixelRatio, el.clientWidth < 768 || el.clientHeight < 600 ? 1.5 : 2)); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(el.clientWidth, el.clientHeight); fit(latest.current.view, amount); };
        const observer = new ResizeObserver(resize);
        observer.observe(el);
        const raycaster = new T.Raycaster(), pointer = new T.Vector2(), tap = new PointerTap(), worldBox = new T.Box3(), hitPoint = new T.Vector3();
        const down = (e) => { hover.hidden = true; tap.down(e.pointerId, e.clientX, e.clientY, e.pointerType === 'touch' ? 12 : 5); };
        const move = (e) => { tap.move(e.pointerId, e.clientX, e.clientY); if (e.buttons || amount < .5 || e.pointerType === 'touch') {
            hover.hidden = true;
            return;
        } const rect = el.getBoundingClientRect(), x = e.clientX - rect.left, y = e.clientY - rect.top, index = findTarget(x, y, 12); hover.hidden = index < 0; renderer.domElement.style.cursor = index < 0 ? 'grab' : 'pointer'; if (index >= 0) {
            hover.textContent = atlas.parts[index].name;
            hover.style.left = `${Math.max(8, Math.min(x + 14, el.clientWidth - 260))}px`;
            hover.style.top = `${Math.max(8, Math.min(y + 18, el.clientHeight - 55))}px`;
        } };
        const cancel = (e) => tap.cancel(e.pointerId);
        const up = (e) => {
            const validTap = tap.up(e.pointerId, e.clientX, e.clientY);
            if (!validTap || !ready)
                return;
            const rect = renderer.domElement.getBoundingClientRect();
            pointer.set((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1);
            raycaster.setFromCamera(pointer, camera);
            let nearest = Infinity, found = -1;
            const hasSolid = atlas.parts.some((p, i) => p.system !== 'integumentary' && data[i * 4 + 3] > .5);
            pickers.forEach((mesh, i) => { if (!mesh || data[i * 4 + 3] < .5 || (hasSolid && atlas.parts[i].system === 'integumentary'))
                return; worldBox.copy(bounds[i]).translate(mesh.position); if (!raycaster.ray.intersectBox(worldBox, hitPoint))
                return; const hits = raycaster.intersectObject(mesh, false); if (hits[0] && hits[0].distance < nearest) {
                nearest = hits[0].distance;
                found = i;
            } });
            if (found < 0 && amount > .45)
                found = findTarget(e.clientX - rect.left, e.clientY - rect.top, e.pointerType === 'touch' ? 24 : 16);
            if (found >= 0) {
                hover.hidden = true;
                select.current(atlas.parts[found].id);
            }
        };
        renderer.domElement.addEventListener('pointerdown', down);
        renderer.domElement.addEventListener('pointermove', move);
        renderer.domElement.addEventListener('pointerup', up);
        renderer.domElement.addEventListener('pointercancel', cancel);
        const clock = new T.Timer();
        const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        clock.connect(document);
        let lastExtent = -1;
        const keyboard = (e) => { const directions = { ArrowLeft: .12, ArrowRight: -.12 }; if (e.key in directions) {
            e.preventDefault();
            const position = camera.position.clone().sub(controls.target);
            position.applyAxisAngle(new T.Vector3(0, 1, 0), directions[e.key]);
            camera.position.copy(controls.target).add(position);
            controls.update();
            dirty = true;
        } if (e.key === '+' || e.key === '-' || e.key === '=') {
            e.preventDefault();
            camera.position.sub(controls.target).multiplyScalar(e.key === '-' ? 1.12 : .88).add(controls.target);
            controls.update();
            dirty = true;
        } };
        renderer.domElement.addEventListener('keydown', keyboard);
        const animate = () => {
            if (disposed)
                return;
            frame = requestAnimationFrame(animate);
            clock.update();
            const dt = Math.min(clock.getDelta(), .05), s = latest.current;
            const changed = lastState?.visible !== s.visible || lastState?.selected !== s.selected || lastState?.isolate !== s.isolate;
            const moving = Math.abs(amount - s.explode) > .0001;
            if (moving) {
                amount = reducedMotion ? s.explode : T.MathUtils.damp(amount, s.explode, 8, dt);
                dirty = true;
            }
            if (changed || moving || lastExtent < 0) {
                const visible = new Set(s.visible), selection = new Set(s.selected);
                const visibleParts = atlas.parts.filter(p => s.isolate ? selection.has(p.id) : visible.has(p.system) || selection.has(p.id));
                const nextLayoutKey = visibleParts.map(p => p.id).join(',') + ':' + camera.aspect.toFixed(3);
                if (nextLayoutKey !== layoutKey) {
                    const layout = createExplosionLayout(visibleParts, camera.aspect);
                    packingWidth = layout.width;
                    packingHeight = layout.height;
                    atlas.parts.forEach((p, i) => { const cell = layout.cells.get(p.id); offsets[i] = cell ? new T.Vector3(cell.x, cell.y + .85, 0) : centers[i].clone(); });
                    layoutKey = nextLayoutKey;
                    if (amount > .05 && !s.isolate)
                        fit(s.view, Math.max(0, (amount - .3) / .7));
                }
                atlas.parts.forEach((p, i) => {
                    const c = centers[i], destination = offsets[i];
                    let dx = 0, dy = 0, dz = 0;
                    if (amount <= .45) {
                        const t = amount / .45;
                        const group = SYSTEMS.findIndex(sys => sys.id === p.system);
                        const angle = group / SYSTEMS.length * Math.PI * 2;
                        dx = Math.sin(angle) * t * .48;
                        dy = (c.y - .85) * t * .28;
                        dz = Math.cos(angle) * t * .48;
                    }
                    else {
                        const t = (amount - .45) / .55, group = SYSTEMS.findIndex(sys => sys.id === p.system), angle = group / SYSTEMS.length * Math.PI * 2;
                        dx = T.MathUtils.lerp(Math.sin(angle) * .48, destination.x - c.x, t);
                        dy = T.MathUtils.lerp((c.y - .85) * .28, destination.y - c.y, t);
                        dz = T.MathUtils.lerp(Math.cos(angle) * .48, -c.z, t);
                    }
                    const selected = selection.has(p.id);
                    data.set([dx, dy, dz, (s.isolate ? selected : visible.has(p.system) || selected) ? 1 : 0], i * 4);
                    selectedData[i * 4] = selected ? 255 : 0;
                    markerPositions.set(data[i * 4 + 3] > .5 ? [c.x + dx, c.y + dy, c.z + dz] : [10000, 10000, 10000], i * 3);
                    const mesh = pickers[i];
                    if (mesh) {
                        mesh.position.set(dx, dy, dz);
                        mesh.updateMatrix();
                        mesh.updateMatrixWorld(true);
                    }
                });
                partTexture.needsUpdate = true;
                selectionTexture.needsUpdate = true;
                markerGeometry.attributes.position.needsUpdate = true;
                lastState = s;
                lastExtent = amount;
                dirty = true;
            }
            if (s.view !== lastView || s.reset !== lastReset) {
                fit(s.view, amount);
                lastView = s.view;
                lastReset = s.reset;
            }
            if (moving && !s.isolate)
                fit(amount > .5 ? 'front' : s.view, Math.max(0, (amount - .3) / .7));
            const isolateKey = s.isolate ? s.selected.join(',') + ':' + s.reset + ':' + s.inspectorOpen + ':' + camera.aspect : '';
            if (isolateKey !== lastIsolate || (s.isolate && moving)) {
                if (s.isolate) {
                    const box = new T.Box3();
                    atlas.parts.forEach((p, i) => { if (s.selected.includes(p.id))
                        box.union(bounds[i].clone().translate(new T.Vector3(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]))); });
                    if (!box.isEmpty()) {
                        const center = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
                        camera.clearViewOffset();
                        const distance = Math.max(.07, Math.max(size.y, size.x / camera.aspect, size.z) / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2))) * 1.35);
                        controls.target.copy(center);
                        camera.position.copy(center).add(new T.Vector3(.2, .1, 1).normalize().multiplyScalar(distance));
                        controls.update();
                        dirty = true;
                    }
                }
                else if (lastIsolate) {
                    camera.clearViewOffset();
                    fit(s.view, amount);
                }
                lastIsolate = isolateKey;
            }
            controls.enableRotate = amount < .8;
            controls.mouseButtons.LEFT = amount < .8 ? T.MOUSE.ROTATE : T.MOUSE.PAN;
            controls.touches.ONE = amount < .8 ? T.TOUCH.ROTATE : T.TOUCH.PAN;
            ground.visible = platform.visible = ring.visible = innerRing.visible = amount < .5 && !s.isolate;
            markers.visible = amount > .75;
            controls.autoRotate = s.rotate && !s.isolate && amount < .4;
            controls.autoRotateSpeed = .65;
            controls.update();
            if (controls.autoRotate)
                dirty = true;
            if (dirty) {
                renderer.render(scene, camera);
                targets = [];
                if (amount > .45) {
                    const hasSolid = atlas.parts.some((p, i) => p.system !== 'integumentary' && data[i * 4 + 3] > .5);
                    atlas.parts.forEach((p, i) => { if (data[i * 4 + 3] < .5 || (hasSolid && p.system === 'integumentary'))
                        return; let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity; for (let corner = 0; corner < 8; corner++) {
                        projected.set(p.bounds[(corner & 1) ? 1 : 0][0] + data[i * 4], p.bounds[(corner & 2) ? 1 : 0][1] + data[i * 4 + 1], p.bounds[(corner & 4) ? 1 : 0][2] + data[i * 4 + 2]).project(camera);
                        const x = (projected.x + 1) * el.clientWidth / 2, y = (1 - projected.y) * el.clientHeight / 2;
                        left = Math.min(left, x);
                        right = Math.max(right, x);
                        top = Math.min(top, y);
                        bottom = Math.max(bottom, y);
                    } projected.copy(centers[i]).add(new T.Vector3(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])).project(camera); if (projected.z < -1 || projected.z > 1)
                        return; targets.push({ index: i, x: (projected.x + 1) * el.clientWidth / 2, y: (1 - projected.y) * el.clientHeight / 2, left, right, top, bottom }); });
                }
                dirty = false;
            }
        };
        animate();
        const contextLost = (e) => { e.preventDefault(); onError('The 3D session was paused by your device. Reload to continue.'); };
        renderer.domElement.addEventListener('webglcontextlost', contextLost);
        return () => { disposed = true; clock.dispose(); abort.abort(); cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); scene.traverse(o => { if (o instanceof T.Mesh && !geometries.includes(o.geometry)) {
            o.geometry.dispose();
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            ms.forEach(m => m.dispose());
        } }); env.dispose(); partTexture.dispose(); selectionTexture.dispose(); markerGeometry.dispose(); markerMaterial.dispose(); hover.remove(); renderer.dispose(); renderer.domElement.remove(); };
    }, [atlas]);
    return <div className="scene" ref={host}/>;
}
