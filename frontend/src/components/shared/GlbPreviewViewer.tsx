"use client";

import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bounds, Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Cuboid, RotateCcw } from "lucide-react";
import { Mesh, Object3D, Quaternion, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { cn } from "@/src/lib/utils";
import { ModelLoadBoundary } from "@/src/components/shared/ModelLoadBoundary";

type SlotMarker = {
  id: string;
  nodeName: string;
  label: string;
  position: [number, number, number];
  footprint: [number, number];
  keywords: string[];
};

type CameraMarker = {
  id: string;
  nodeName: string;
  position: [number, number, number];
  target: [number, number, number];
  keywords: string[];
  isOverview: boolean;
};

type CameraView = {
  position: readonly [number, number, number];
  target: readonly [number, number, number];
};

function markerKeywords(name: string, prefix: string) {
  return name
    .replace(prefix, "")
    .trim()
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);
}

function roundVector3(vector: Vector3): [number, number, number] {
  return [vector.x, vector.y, vector.z].map((value) => Math.round(value * 1000) / 1000) as [number, number, number];
}

function findBestCameraForSlot(slotMarker: SlotMarker, cameraMarkers: CameraMarker[]) {
  const scopedCameras = cameraMarkers.filter((marker) => !marker.isOverview);
  if (!scopedCameras.length) return null;

  const scored = scopedCameras.map((cameraMarker) => {
    const overlapCount = cameraMarker.keywords.filter((keyword) => slotMarker.keywords.includes(keyword)).length;
    const extraKeywords = Math.max(cameraMarker.keywords.length - overlapCount, 0);
    const distance = new Vector3(...cameraMarker.position).distanceTo(new Vector3(...slotMarker.position));
    return {
      cameraMarker,
      overlapCount,
      extraKeywords,
      distance,
      score: overlapCount * 10 - extraKeywords,
    };
  });

  const keywordMatch = scored
    .filter((item) => item.overlapCount > 0)
    .sort((left, right) => right.score - left.score || left.distance - right.distance)[0];

  if (keywordMatch) return keywordMatch.cameraMarker;

  return scored.sort((left, right) => left.distance - right.distance)[0]?.cameraMarker ?? null;
}

function normalizeMarkerName(value: string) {
  return value.trim().toUpperCase();
}

function GlbScene({
  src,
  showNamedMarkers = false,
  useEmbeddedCameraMarkers = true,
  markerPrefix = "SLOT_",
  cameraMarkerPrefix = "CAM_",
  focusedMarkerId,
  onMarkerClick,
  onSlotMarkersChange,
  onCameraMarkersChange,
}: {
  src: string;
  showNamedMarkers?: boolean;
  useEmbeddedCameraMarkers?: boolean;
  markerPrefix?: string;
  cameraMarkerPrefix?: string;
  focusedMarkerId?: string | null;
  onMarkerClick?: (markerId: string) => void;
  onSlotMarkersChange?: (markers: SlotMarker[]) => void;
  onCameraMarkersChange?: (markers: CameraMarker[]) => void;
}) {
  const gltf = useGLTF(src);

  const { scene, slotMarkers, cameraMarkers } = useMemo(() => {
    const next = gltf.scene.clone(true);
    const nextSlotMarkers: SlotMarker[] = [];
    const nextCameraMarkers: CameraMarker[] = [];

    next.updateMatrixWorld(true);

    next.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      const worldPosition = child.getWorldPosition(new Vector3());
      const worldQuaternion = child.getWorldQuaternion(new Quaternion());

      if (showNamedMarkers && child.name.startsWith(markerPrefix)) {
        const worldScale = child.getWorldScale(new Vector3());
        const footprint: [number, number] = [
          Math.min(Math.max(worldScale.x, 0.75), 5.5),
          Math.min(Math.max(worldScale.z, 0.75), 5.5),
        ];

        nextSlotMarkers.push({
          id: child.uuid,
          nodeName: child.name,
          label: child.name.replace(markerPrefix, "").replaceAll("_", " "),
          position: roundVector3(worldPosition),
          footprint,
          keywords: markerKeywords(child.name, markerPrefix),
        });
        return;
      }

      if (useEmbeddedCameraMarkers && child.name.startsWith(cameraMarkerPrefix)) {
        const forward = new Vector3(0, 0, -1).applyQuaternion(worldQuaternion).normalize();
        const target = worldPosition.clone().add(forward.multiplyScalar(4.5));
        const keywords = markerKeywords(child.name, cameraMarkerPrefix);

        nextCameraMarkers.push({
          id: child.uuid,
          nodeName: child.name,
          position: roundVector3(worldPosition),
          target: roundVector3(target),
          keywords,
          isOverview: keywords.length === 1 && keywords[0] === "overview",
        });
      }
    });

    return { scene: next, slotMarkers: nextSlotMarkers, cameraMarkers: nextCameraMarkers };
  }, [cameraMarkerPrefix, gltf.scene, markerPrefix, showNamedMarkers, useEmbeddedCameraMarkers]);

  useEffect(() => {
    onSlotMarkersChange?.(slotMarkers);
  }, [onSlotMarkersChange, slotMarkers]);

  useEffect(() => {
    onCameraMarkersChange?.(cameraMarkers);
  }, [cameraMarkers, onCameraMarkersChange]);

  return (
    <>
      <primitive object={scene} />
      {showNamedMarkers
        ? slotMarkers.map((marker) => (
            <group key={marker.id} position={[marker.position[0], marker.position[1], marker.position[2]]}>
              <Html position={[0, 0.36, 0]} center>
                <button
                  type="button"
                  onClick={() => onMarkerClick?.(marker.id)}
                  className={cn(
                    "cursor-pointer px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:-translate-y-0.5",
                    focusedMarkerId === marker.id
                      ? "text-slate-950"
                      : "text-amber-700 hover:text-amber-800",
                  )}
                  style={{ textShadow: "0 1px 10px rgba(255, 250, 241, 0.98)" }}
                >
                  {marker.label}
                </button>
              </Html>
            </group>
          ))
        : null}
    </>
  );
}

function MarkerFocusController({
  controlsRef,
  focusedView,
  defaultView,
  resetVersion,
}: {
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
  focusedView: CameraView | null;
  defaultView: CameraView | null;
  resetVersion: number;
}) {
  const { camera } = useThree();
  const desiredPositionRef = useRef<Vector3 | null>(null);
  const desiredTargetRef = useRef<Vector3 | null>(null);
  const isAnimatingRef = useRef(true);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    if (!focusedView) {
      if (!defaultView) {
        desiredTargetRef.current = null;
        desiredPositionRef.current = null;
        isAnimatingRef.current = false;
        return;
      }
      desiredTargetRef.current = new Vector3(...defaultView.target);
      desiredPositionRef.current = new Vector3(...defaultView.position);
      isAnimatingRef.current = true;
      controls.update();
      return;
    }

    desiredTargetRef.current = new Vector3(...focusedView.target);
    desiredPositionRef.current = new Vector3(...focusedView.position);
    isAnimatingRef.current = true;
  }, [controlsRef, defaultView, focusedView, resetVersion]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !isAnimatingRef.current) return;

    const target = desiredTargetRef.current;
    if (target) {
      const t = 1 - Math.exp(-delta * 4.8);
      controls.target.lerp(target, t);
      controls.update();
    }

    const desiredPosition = desiredPositionRef.current;
    if (desiredPosition) {
      const t = 1 - Math.exp(-delta * 4.2);
      camera.position.lerp(desiredPosition, t);
    }

    const targetDistance = target ? controls.target.distanceTo(target) : 0;
    const cameraDistance = desiredPosition ? camera.position.distanceTo(desiredPosition) : 0;
    if (targetDistance < 0.01 && cameraDistance < 0.01) {
      isAnimatingRef.current = false;
    }
  });

  return null;
}

export function GlbPreviewViewer({
  src,
  title = "3D preview",
  description = "Upload a .glb model to preview it here.",
  className,
  autoRotate = true,
  viewPresets,
  defaultViewPresetId,
  showNamedMarkers = false,
  useEmbeddedCameraMarkers = true,
  allowFreeNavigation = false,
  markerPrefix = "SLOT_",
  cameraMarkerPrefix = "CAM_",
  cameraMarkerOverrides,
  defaultOverview,
  showResetViewButton = false,
  fallback,
}: {
  src?: string | null;
  title?: string;
  description?: string;
  className?: string;
  autoRotate?: boolean;
  viewPresets?: Array<{
    id: string;
    label: string;
    azimuthAngle: number;
    polarAngle: number;
  }>;
  defaultViewPresetId?: string;
  showNamedMarkers?: boolean;
  useEmbeddedCameraMarkers?: boolean;
  allowFreeNavigation?: boolean;
  markerPrefix?: string;
  cameraMarkerPrefix?: string;
  cameraMarkerOverrides?: Record<string, string>;
  defaultOverview?: {
    position: readonly [number, number, number];
    target: readonly [number, number, number];
    azimuthAngle?: number;
    polarAngle?: number;
  };
  showResetViewButton?: boolean;
  fallback?: ReactNode;
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [slotMarkers, setSlotMarkers] = useState<SlotMarker[]>([]);
  const [cameraMarkers, setCameraMarkers] = useState<CameraMarker[]>([]);
  const [focusedMarkerId, setFocusedMarkerId] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    defaultViewPresetId ?? viewPresets?.[0]?.id ?? null,
  );
  const focusedSlotMarker = useMemo(
    () => slotMarkers.find((marker) => marker.id === focusedMarkerId) ?? null,
    [focusedMarkerId, slotMarkers],
  );
  const overviewCameraMarker = useMemo(
    () => cameraMarkers.find((marker) => marker.isOverview) ?? null,
    [cameraMarkers],
  );
  const focusedCameraMarker = useMemo(
    () => {
      if (!focusedSlotMarker) return null;

      const overrideCameraName = cameraMarkerOverrides?.[normalizeMarkerName(focusedSlotMarker.nodeName)];
      if (overrideCameraName) {
        const overrideCamera = cameraMarkers.find(
          (cameraMarker) => normalizeMarkerName(cameraMarker.nodeName) === normalizeMarkerName(overrideCameraName),
        );
        if (overrideCamera) return overrideCamera;
      }

      return findBestCameraForSlot(focusedSlotMarker, cameraMarkers);
    },
    [cameraMarkerOverrides, cameraMarkers, focusedSlotMarker],
  );
  const resolvedDefaultView = useMemo<CameraView>(
    () => {
      if (overviewCameraMarker) {
        return {
          position: overviewCameraMarker.position,
          target: overviewCameraMarker.target,
        };
      }

      if (defaultOverview) {
        return {
          position: defaultOverview.position,
          target: defaultOverview.target,
        };
      }

      return {
        position: [3.8, 2.6, 4.2],
        target: [0, 0.85, 0],
      };
    },
    [defaultOverview, overviewCameraMarker],
  );
  const resolvedFocusedView = useMemo<CameraView | null>(
    () =>
      focusedCameraMarker
        ? {
            position: focusedCameraMarker.position,
            target: focusedCameraMarker.target,
          }
        : focusedSlotMarker
          ? {
              position: resolvedDefaultView.position,
              target: [
                focusedSlotMarker.position[0],
                focusedSlotMarker.position[1] + Math.max(focusedSlotMarker.footprint[0], focusedSlotMarker.footprint[1]) * 0.08 + 0.2,
                focusedSlotMarker.position[2],
              ],
            }
          : null,
    [focusedCameraMarker, focusedSlotMarker, resolvedDefaultView],
  );
  const resolvedActivePresetId =
    viewPresets?.some((preset) => preset.id === activePresetId)
      ? activePresetId
      : (defaultViewPresetId ?? viewPresets?.[0]?.id ?? null);

  useEffect(() => {
    if (src) {
      useGLTF.preload(src);
    }
  }, [src]);

  useEffect(() => {
    if (allowFreeNavigation) return;
    if (!controlsRef.current || !viewPresets?.length || !resolvedActivePresetId) return;
    const preset = viewPresets.find((item) => item.id === resolvedActivePresetId);
    if (!preset) return;
    controlsRef.current.setAzimuthalAngle(preset.azimuthAngle);
    controlsRef.current.setPolarAngle(preset.polarAngle);
    if (!focusedSlotMarker) {
      controlsRef.current.target.set(
        resolvedDefaultView.target[0],
        resolvedDefaultView.target[1],
        resolvedDefaultView.target[2],
      );
    }
    controlsRef.current.update();
  }, [allowFreeNavigation, focusedSlotMarker, resolvedActivePresetId, resolvedDefaultView, viewPresets]);

  const cameraPosition = allowFreeNavigation ? ([2.8, 2.1, 3.1] as const) : resolvedDefaultView.position;
  const loadFailureFallback =
    fallback ?? (
      <div className="flex aspect-square items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-[linear-gradient(160deg,#fbf6ef,#efe5d8)] p-6 text-center">
        <div className="max-w-[220px] space-y-2 text-slate-600">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/70 shadow-sm">
            <Cuboid className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="text-xs leading-5">The 3D model could not be loaded.</p>
        </div>
      </div>
    );

  const handleResetView = () => {
    setFocusedMarkerId(null);
    setActivePresetId(defaultViewPresetId ?? viewPresets?.[0]?.id ?? null);
    setResetVersion((current) => current + 1);
  };

  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-[linear-gradient(160deg,#fbf6ef,#efe5d8)] p-6 text-center",
          className,
        )}
      >
        <div className="max-w-[220px] space-y-2 text-slate-600">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/70 shadow-sm">
            <Cuboid className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-slate-900">{title}</p>
          <p className="text-xs leading-5">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-square cursor-grab overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#fff7ed,transparent_35%),linear-gradient(160deg,#f9f4ed,#e9dcc8)] shadow-inner active:cursor-grabbing",
        className,
      )}
    >
      <Canvas
        camera={{ position: cameraPosition, fov: 38 }}
        dpr={[1, 1.25]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[5, 8, 4]} intensity={1.35} castShadow />
        <directionalLight position={[-4, 3, -4]} intensity={0.45} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.001, 0]}>
          <circleGeometry args={[3.6, 96]} />
          <shadowMaterial opacity={0.14} />
        </mesh>
        <Suspense fallback={null}>
          <ModelLoadBoundary fallback={loadFailureFallback}>
            <Bounds fit clip margin={1.2}>
              <GlbScene
                src={src}
                showNamedMarkers={showNamedMarkers}
                useEmbeddedCameraMarkers={useEmbeddedCameraMarkers}
                markerPrefix={markerPrefix}
                cameraMarkerPrefix={cameraMarkerPrefix}
                focusedMarkerId={focusedMarkerId}
                onMarkerClick={(markerId) => setFocusedMarkerId(markerId)}
                onSlotMarkersChange={setSlotMarkers}
                onCameraMarkersChange={setCameraMarkers}
              />
            </Bounds>
          </ModelLoadBoundary>
        </Suspense>
        {!allowFreeNavigation ? (
          <MarkerFocusController
            controlsRef={controlsRef}
            focusedView={resolvedFocusedView}
            defaultView={resolvedDefaultView}
            resetVersion={resetVersion}
          />
        ) : null}
        <OrbitControls
          ref={controlsRef}
          enablePan={allowFreeNavigation}
          minDistance={allowFreeNavigation ? 0.35 : 1.5}
          maxDistance={allowFreeNavigation ? 60 : 12}
          minPolarAngle={allowFreeNavigation ? 0 : undefined}
          maxPolarAngle={allowFreeNavigation ? Math.PI : undefined}
          minAzimuthAngle={allowFreeNavigation ? -Infinity : undefined}
          maxAzimuthAngle={allowFreeNavigation ? Infinity : undefined}
          autoRotate={allowFreeNavigation ? false : autoRotate && !focusedSlotMarker}
          autoRotateSpeed={0.85}
          makeDefault
        />
      </Canvas>
      {showResetViewButton ? (
        <button
          type="button"
          onClick={handleResetView}
          className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:text-slate-950"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Default view
        </button>
      ) : null}
      {!allowFreeNavigation && useEmbeddedCameraMarkers && !resolvedDefaultView ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-amber-200 bg-amber-50/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/80 dark:text-amber-200">
          CAM_OVERVIEW not found
        </div>
      ) : null}
      {viewPresets?.length ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 px-4 py-4">
          {viewPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setFocusedMarkerId(null);
                setActivePresetId(preset.id);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                resolvedActivePresetId === preset.id
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-white/60 bg-white/85 text-slate-700 backdrop-blur hover:border-slate-300",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
