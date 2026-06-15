"use client";

import { Suspense, useEffect, useMemo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls, useGLTF } from "@react-three/drei";
import { Cuboid } from "lucide-react";
import { Mesh, Object3D } from "three";
import { cn } from "@/src/lib/utils";
import { ModelLoadBoundary } from "@/src/components/shared/ModelLoadBoundary";

function ProductScene({ src }: { src: string }) {
  const gltf = useGLTF(src);

  const scene = useMemo(() => {
    const next = gltf.scene.clone(true);
    next.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
    return next;
  }, [gltf.scene]);

  return <primitive object={scene} />;
}

export function ShowroomProductPreview({
  src,
  className,
  fallback,
}: {
  src?: string | null;
  className?: string;
  fallback?: ReactNode;
}) {
  useEffect(() => {
    if (src) {
      useGLTF.preload(src);
    }
  }, [src]);

  if (!src) {
    return (
      <div
        className={cn(
          "flex aspect-square items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[linear-gradient(145deg,#fbf4ea,#efe2d2)] text-slate-400",
          className,
        )}
      >
        <Cuboid className="h-7 w-7" />
      </div>
    );
  }

  const fallbackNode =
    fallback ??
    (
      <div
        className={cn(
          "flex aspect-square items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-[linear-gradient(145deg,#fbf4ea,#efe2d2)] text-slate-400",
          className,
        )}
      >
        <Cuboid className="h-7 w-7" />
      </div>
    );

  return (
    <div
      className={cn(
        "aspect-square cursor-grab overflow-hidden rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_top,#fff7ed,transparent_35%),linear-gradient(160deg,#f9f4ed,#eadbc6)] active:cursor-grabbing",
        className,
      )}
    >
      <ModelLoadBoundary fallback={fallbackNode}>
        <Canvas camera={{ position: [2.8, 2.1, 3.1], fov: 34 }} dpr={[1, 1.1]} frameloop="demand">
          <ambientLight intensity={1.2} />
          <directionalLight position={[3, 5, 4]} intensity={1} />
          <directionalLight position={[-2, 2, -2]} intensity={0.35} />
          <Suspense fallback={null}>
            <Bounds fit clip margin={1.18}>
              <ProductScene src={src} />
            </Bounds>
          </Suspense>
          <OrbitControls
            enablePan={false}
            minDistance={1.5}
            maxDistance={8}
            autoRotate={false}
            makeDefault
          />
        </Canvas>
      </ModelLoadBoundary>
    </div>
  );
}
