"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { RotateCcw } from "lucide-react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { ShowroomEligibleProduct, ShowroomSceneSlot } from "@/src/types";
import { Box3, Group, MathUtils, Mesh, Object3D, Quaternion, Vector3 } from "three";
import { ROOM_CAMERA_SLOT_OVERRIDES } from "@/src/components/admin/showroom/constants";
import { cn } from "@/src/lib/utils";

type Occupant = {
  slot: ShowroomSceneSlot;
  product: ShowroomEligibleProduct;
};

type CameraMarker = {
  id: string;
  nodeName: string;
  position: [number, number, number];
  target: [number, number, number];
  keywords: string[];
  isOverview: boolean;
};

type SlotCameraTarget = {
  slotId: string;
  markerName: string;
  position: [number, number, number];
  keywords: string[];
};

type CameraView = {
  position: [number, number, number];
  target: [number, number, number];
};

const DIAGNOSTIC_CAMERA_POSITION: [number, number, number] = [0, 1.2, 0.01];
const DIAGNOSTIC_CAMERA_TARGET: [number, number, number] = [0, 1.2, -1];

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

function normalizeMarkerName(value: string) {
  return value.trim().toUpperCase();
}

function slotCodeToMarkerName(slot: ShowroomSceneSlot) {
  const source = slot.slotCode || slot.label || slot.slotId;
  return `SLOT_${String(source)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()}`;
}

function buildCameraTargetForSlot(slot: ShowroomSceneSlot): SlotCameraTarget {
  const markerName = slotCodeToMarkerName(slot);
  return {
    slotId: slot.slotId,
    markerName,
    position: (slot.anchorPosition ?? [0, 0, 0]) as [number, number, number],
    keywords: markerKeywords(markerName, "SLOT_"),
  };
}

function findBestCameraForSlot(slotTarget: SlotCameraTarget, cameraMarkers: CameraMarker[]) {
  const scopedCameras = cameraMarkers.filter((marker) => !marker.isOverview);
  if (!scopedCameras.length) return null;

  const overrideCameraName =
    ROOM_CAMERA_SLOT_OVERRIDES[normalizeMarkerName(slotTarget.markerName) as keyof typeof ROOM_CAMERA_SLOT_OVERRIDES];
  if (overrideCameraName) {
    const overrideCamera = scopedCameras.find(
      (cameraMarker) => normalizeMarkerName(cameraMarker.nodeName) === normalizeMarkerName(overrideCameraName),
    );
    if (overrideCamera) return overrideCamera;
  }

  const scored = scopedCameras.map((cameraMarker) => {
    const overlapCount = cameraMarker.keywords.filter((keyword) => slotTarget.keywords.includes(keyword)).length;
    const extraKeywords = Math.max(cameraMarker.keywords.length - overlapCount, 0);
    const distance = new Vector3(...cameraMarker.position).distanceTo(new Vector3(...slotTarget.position));
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

function RoomModel({
  src,
  onCameraMarkersChange,
}: {
  src: string;
  onCameraMarkersChange?: (markers: CameraMarker[]) => void;
}) {
  const gltf = useGLTF(src);

  const { scene, cameraMarkers } = useMemo(() => {
    const next = gltf.scene.clone(true);
    const nextCameraMarkers: CameraMarker[] = [];

    next.updateMatrixWorld(true);
    next.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      if (!child.name.startsWith("CAM_")) return;

      const worldPosition = child.getWorldPosition(new Vector3());
      const worldQuaternion = child.getWorldQuaternion(new Quaternion());
      const forward = new Vector3(0, 0, -1).applyQuaternion(worldQuaternion).normalize();
      const target = worldPosition.clone().add(forward.multiplyScalar(4.5));
      const keywords = markerKeywords(child.name, "CAM_");

      nextCameraMarkers.push({
        id: child.uuid,
        nodeName: child.name,
        position: roundVector3(worldPosition),
        target: roundVector3(target),
        keywords,
        isOverview: keywords.length === 1 && keywords[0] === "overview",
      });
    });

    return {
      scene: next,
      cameraMarkers: nextCameraMarkers,
    };
  }, [gltf.scene]);

  useEffect(() => {
    onCameraMarkersChange?.(cameraMarkers);
  }, [cameraMarkers, onCameraMarkersChange]);

  return <primitive object={scene} />;
}

function SlotMarker({
  slot,
  active,
  onSelect,
}: {
  slot: ShowroomSceneSlot;
  active: boolean;
  onSelect?: (slotId: string | null) => void;
}) {
  return (
    <group position={slot.anchorPosition as [number, number, number]}>
      <Html position={[0, 0.36, 0]} center>
        <button
          type="button"
          onClick={() => onSelect?.(slot.slotId)}
          className={cn(
            "cursor-pointer px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition hover:-translate-y-0.5",
            active ? "text-slate-950" : "text-amber-700 hover:text-amber-800",
          )}
          style={{ textShadow: "0 1px 10px rgba(255, 250, 241, 0.98)" }}
        >
          {slot.label}
        </button>
      </Html>
    </group>
  );
}

function AnimatedProductModel({ occupant, highlighted }: { occupant: Occupant; highlighted: boolean }) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(occupant.product.model3dUrl);

  const clonedScene = useMemo(() => {
    const next = gltf.scene.clone(true);
    next.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return next;
  }, [gltf.scene]);

  const sceneOffset = useMemo(() => {
    const bounds = new Box3().setFromObject(clonedScene);
    const center = bounds.getCenter(new Vector3());
    const min = bounds.min.clone();

    return occupant.slot.anchorPosition[1] > 0.15
      ? ([-center.x, -center.y, -center.z] as [number, number, number])
      : ([-center.x, -min.y, -center.z] as [number, number, number]);
  }, [clonedScene, occupant.slot.anchorPosition]);

  const targetPosition = useMemo(
    () => (occupant.slot.anchorPosition ?? [0, 0, 0]) as [number, number, number],
    [occupant.slot.anchorPosition],
  );
  const targetRotation = useMemo(
    () => (occupant.slot.anchorRotation ?? [0, 0, 0]) as [number, number, number],
    [occupant.slot.anchorRotation],
  );

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(targetPosition[0], 3.5, targetPosition[2] + 2);
    groupRef.current.rotation.set(targetRotation[0], targetRotation[1], targetRotation[2]);
    groupRef.current.scale.set(1, 1, 1);
  }, [targetPosition, targetRotation]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const t = 1 - Math.exp(-delta * (highlighted ? 9 : 6));
    groupRef.current.position.x = MathUtils.lerp(groupRef.current.position.x, targetPosition[0], t);
    groupRef.current.position.y = MathUtils.lerp(groupRef.current.position.y, targetPosition[1], t);
    groupRef.current.position.z = MathUtils.lerp(groupRef.current.position.z, targetPosition[2], t);
    groupRef.current.rotation.x = MathUtils.lerp(groupRef.current.rotation.x, targetRotation[0], t);
    groupRef.current.rotation.y = MathUtils.lerp(groupRef.current.rotation.y, targetRotation[1], t);
    groupRef.current.rotation.z = MathUtils.lerp(groupRef.current.rotation.z, targetRotation[2], t);
  });

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} position={sceneOffset} />
    </group>
  );
}

function CameraRig({ desiredView, resetVersion }: { desiredView: CameraView | null; resetVersion: number }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const startPositionRef = useRef<Vector3 | null>(null);
  const startTargetRef = useRef<Vector3 | null>(null);
  const midPositionRef = useRef<Vector3 | null>(null);
  const midTargetRef = useRef<Vector3 | null>(null);
  const endPositionRef = useRef<Vector3 | null>(null);
  const endTargetRef = useRef<Vector3 | null>(null);
  const progressRef = useRef(1);
  const desiredCameraPosition = useMemo(
    () => (desiredView ? new Vector3(...desiredView.position) : null),
    [desiredView],
  );
  const desiredTarget = useMemo(() => (desiredView ? new Vector3(...desiredView.target) : null), [desiredView]);
  const activeAzimuthAngle = useMemo(() => {
    if (!desiredView) return null;
    const direction = new Vector3(...desiredView.target).sub(new Vector3(...desiredView.position));
    return Math.atan2(direction.x, direction.z);
  }, [desiredView]);
  const activePolarAngle = useMemo(() => {
    if (!desiredView) return null;
    const direction = new Vector3(...desiredView.target).sub(new Vector3(...desiredView.position));
    const horizontalDistance = Math.hypot(direction.x, direction.z) || 1;
    return Math.atan2(horizontalDistance, direction.y);
  }, [desiredView]);

  useEffect(() => {
    if (!controlsRef.current) return;
    if (activeAzimuthAngle != null) {
      controlsRef.current.setAzimuthalAngle(activeAzimuthAngle);
    }
    if (activePolarAngle != null) {
      controlsRef.current.setPolarAngle(activePolarAngle);
    }
    controlsRef.current.update();
  }, [activeAzimuthAngle, activePolarAngle, resetVersion]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls || !desiredTarget || !desiredCameraPosition) {
      startPositionRef.current = null;
      startTargetRef.current = null;
      midPositionRef.current = null;
      midTargetRef.current = null;
      endPositionRef.current = null;
      endTargetRef.current = null;
      progressRef.current = 1;
      return;
    }

    const currentPosition = camera.position.clone();
    const currentTarget = controls.target.clone();
    const nextPosition = desiredCameraPosition.clone();
    const nextTarget = desiredTarget.clone();
    const midpointLift = Math.max(1.2, currentPosition.distanceTo(nextPosition) * 0.18);

    startPositionRef.current = currentPosition;
    startTargetRef.current = currentTarget;
    endPositionRef.current = nextPosition;
    endTargetRef.current = nextTarget;
    midPositionRef.current = currentPosition
      .clone()
      .lerp(nextPosition, 0.5)
      .add(new Vector3(0, midpointLift, 0));
    midTargetRef.current = currentTarget
      .clone()
      .lerp(nextTarget, 0.5)
      .add(new Vector3(0, midpointLift * 0.35, 0));
    progressRef.current = 0;
  }, [desiredCameraPosition, desiredTarget, resetVersion]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    const startPosition = startPositionRef.current;
    const startTarget = startTargetRef.current;
    const midPosition = midPositionRef.current;
    const midTarget = midTargetRef.current;
    const endPosition = endPositionRef.current;
    const endTarget = endTargetRef.current;

    if (!controls || !startPosition || !startTarget || !midPosition || !midTarget || !endPosition || !endTarget) {
      return;
    }

    progressRef.current = Math.min(1, progressRef.current + delta * 0.7);
    const progress = progressRef.current;
    const segmentProgress = progress < 0.5 ? progress / 0.5 : (progress - 0.5) / 0.5;
    const easedProgress = segmentProgress * segmentProgress * (3 - 2 * segmentProgress);

    if (progress < 0.5) {
      camera.position.lerpVectors(startPosition, midPosition, easedProgress);
      controls.target.lerpVectors(startTarget, midTarget, easedProgress);
    } else {
      camera.position.lerpVectors(midPosition, endPosition, easedProgress);
      controls.target.lerpVectors(midTarget, endTarget, easedProgress);
    }
    controls.update();

    if (
      progress >= 1 &&
      camera.position.distanceTo(endPosition) < 0.01 &&
      controls.target.distanceTo(endTarget) < 0.01
    ) {
      progressRef.current = 1;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      minDistance={2}
      maxDistance={24}
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
    />
  );
}

export function ShowroomCanvas({
  roomModelUrl,
  slots,
  occupants,
  focusedSlotId,
  onSelectSlot,
  className,
}: {
  roomModelUrl: string;
  slots: ShowroomSceneSlot[];
  occupants: Occupant[];
  focusedSlotId: string | null;
  onSelectSlot?: (slotId: string | null) => void;
  className?: string;
}) {
  const [cameraMarkers, setCameraMarkers] = useState<CameraMarker[]>([]);
  const [resetVersion, setResetVersion] = useState(0);
  const focusedSlot = focusedSlotId ? (slots.find((slot) => slot.slotId === focusedSlotId) ?? null) : null;
  const focusedSlotCameraTarget = useMemo(
    () => (focusedSlot ? buildCameraTargetForSlot(focusedSlot) : null),
    [focusedSlot],
  );
  const overviewCameraMarker = useMemo(
    () => cameraMarkers.find((marker) => marker.isOverview) ?? null,
    [cameraMarkers],
  );
  const focusedCameraMarker = useMemo(
    () => (focusedSlotCameraTarget ? findBestCameraForSlot(focusedSlotCameraTarget, cameraMarkers) : null),
    [cameraMarkers, focusedSlotCameraTarget],
  );
  const desiredView = useMemo<CameraView | null>(() => {
    if (focusedCameraMarker) {
      return {
        position: focusedCameraMarker.position,
        target: focusedCameraMarker.target,
      };
    }

    if (focusedSlot) {
      return null;
    }

    if (overviewCameraMarker) {
      return {
        position: overviewCameraMarker.position,
        target: overviewCameraMarker.target,
      };
    }
    return null;
  }, [focusedCameraMarker, focusedSlot, overviewCameraMarker]);

  useEffect(() => {
    useGLTF.preload(roomModelUrl);
    occupants.forEach((occupant) => {
      if (occupant.product.model3dUrl) {
        useGLTF.preload(occupant.product.model3dUrl);
      }
    });
  }, [occupants, roomModelUrl]);

  const handleResetView = () => {
    onSelectSlot?.(null);
    setResetVersion((current) => current + 1);
  };

  return (
    <div
      className={cn(
        "relative h-[min(44dvh,420px)] cursor-grab overflow-hidden rounded-[24px] border border-slate-200 bg-[radial-gradient(circle_at_top,#fff7ed,transparent_35%),linear-gradient(160deg,#f9f4ed,#e9dcc8)] shadow-inner active:cursor-grabbing md:h-[min(52dvh,560px)] xl:h-full",
        className,
      )}
    >
      <Canvas
        camera={{ position: desiredView?.position ?? DIAGNOSTIC_CAMERA_POSITION, fov: 38 }}
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
        {!desiredView ? (
          <group position={DIAGNOSTIC_CAMERA_TARGET}>
            <Html center>
              <div className="rounded-full border border-red-300 bg-white/90 px-3 py-1 text-[11px] font-medium text-red-600 shadow-sm">
                CAM_OVERVIEW not found
              </div>
            </Html>
          </group>
        ) : null}
        <Suspense fallback={null}>
          <RoomModel src={roomModelUrl} onCameraMarkersChange={setCameraMarkers} />
          {slots.map((slot) => (
            <SlotMarker key={slot.slotId} slot={slot} active={slot.slotId === focusedSlotId} onSelect={onSelectSlot} />
          ))}
          {occupants.map((occupant) => (
            <AnimatedProductModel
              key={`${occupant.slot.slotId}-${occupant.product.productId}`}
              occupant={occupant}
              highlighted={occupant.slot.slotId === focusedSlotId}
            />
          ))}
        </Suspense>
        <CameraRig desiredView={desiredView} resetVersion={resetVersion} />
      </Canvas>
      <button
        type="button"
        onClick={handleResetView}
        className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:text-slate-950"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Default view
      </button>
    </div>
  );
}
