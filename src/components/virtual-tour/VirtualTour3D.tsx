import { Suspense, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useTexture, PerspectiveCamera } from '@react-three/drei';
import { RotateCcw, Maximize2, Minimize2, ZoomIn, ZoomOut, Move3D } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as THREE from 'three';

interface Room {
  id: string;
  name: string;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  features?: string[];
}

interface VirtualTour3DProps {
  propertyType: 'residential' | 'commercial' | 'land';
  rooms?: Room[];
  panoramaUrl?: string;
}

// 360° Panorama Viewer Component
const PanoramaSphere = ({ url }: { url: string }) => {
  const texture = useTexture(url);
  const meshRef = useRef<THREE.Mesh>(null);
  
  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[50, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.BackSide} />
    </mesh>
  );
};

// Room Box Component for 3D Floor Plan
const RoomBox = ({ room, isSelected, onSelect }: { room: Room; isSelected: boolean; onSelect: () => void }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame(() => {
    if (meshRef.current && (hovered || isSelected)) {
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, 1.1, 0.1);
    } else if (meshRef.current) {
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, 1, 0.1);
    }
  });

  return (
    <group position={room.position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={room.size} />
        <meshStandardMaterial 
          color={isSelected ? '#F97316' : room.color} 
          transparent 
          opacity={hovered || isSelected ? 0.9 : 0.7}
        />
      </mesh>
      <Html
        position={[0, room.size[1] / 2 + 0.3, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-background/90 text-foreground'
        }`}>
          {room.name}
        </div>
      </Html>
    </group>
  );
};

// Floor with Grid
const Floor = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#e5e7eb" />
    </mesh>
  );
};

// Camera Controls Component
const CameraController = ({ resetCamera }: { resetCamera: boolean }) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  
  useFrame(() => {
    if (resetCamera && controlsRef.current) {
      camera.position.lerp(new THREE.Vector3(10, 10, 10), 0.05);
      controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={5}
      maxDistance={30}
    />
  );
};

// Default rooms for demo
const defaultRooms: Room[] = [
  { id: 'living', name: 'Living Room', position: [0, 0.5, 0], size: [4, 1, 5], color: '#0EA5E9', features: ['Large windows', 'Fireplace'] },
  { id: 'kitchen', name: 'Kitchen', position: [3, 0.5, 0], size: [2.5, 1, 3], color: '#22C55E', features: ['Modern appliances', 'Island counter'] },
  { id: 'master', name: 'Master Bedroom', position: [-3, 0.5, 2], size: [3, 1, 3.5], color: '#F97316', features: ['En-suite bathroom', 'Walk-in closet'] },
  { id: 'bedroom2', name: 'Bedroom 2', position: [-3, 0.5, -2], size: [2.5, 1, 3], color: '#8B5CF6', features: ['Built-in wardrobe'] },
  { id: 'bathroom', name: 'Bathroom', position: [0, 0.5, -3], size: [2, 1, 2], color: '#06B6D4', features: ['Bathtub', 'Shower'] },
];

const VirtualTour3D = ({ propertyType, rooms = defaultRooms, panoramaUrl }: VirtualTour3DProps) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [resetCamera, setResetCamera] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | '360'>('3d');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResetCamera = () => {
    setResetCamera(true);
    setTimeout(() => setResetCamera(false), 1000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  return (
    <div 
      ref={containerRef} 
      className={`relative bg-gradient-to-b from-sky-100 to-slate-100 rounded-xl overflow-hidden ${
        isFullscreen ? 'h-screen' : 'h-[400px] md:h-[500px]'
      }`}
    >
      {/* Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-2">
        <div className="flex gap-2">
          <Button
            variant={viewMode === '3d' ? 'hero' : 'outline'}
            size="sm"
            onClick={() => setViewMode('3d')}
            className="gap-1.5"
          >
            <Move3D className="h-4 w-4" />
            3D Tour
          </Button>
          {panoramaUrl && (
            <Button
              variant={viewMode === '360' ? 'hero' : 'outline'}
              size="sm"
              onClick={() => setViewMode('360')}
              className="gap-1.5"
            >
              360° View
            </Button>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={handleResetCamera}
            className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="h-8 w-8 bg-background/80 backdrop-blur-sm"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />
        <CameraController resetCamera={resetCamera} />
        
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        
        <Suspense
          fallback={
            <Html center>
              <div className="px-3 py-2 rounded-lg bg-white/80 text-xs text-slate-700 shadow">
                Loading 3D tour...
              </div>
            </Html>
          }
        >
          {viewMode === '360' && panoramaUrl ? (
            <PanoramaSphere url={panoramaUrl} />
          ) : (
            <>
              <Floor />
              {rooms.map((room) => (
                <RoomBox
                  key={room.id}
                  room={room}
                  isSelected={selectedRoom === room.id}
                  onSelect={() => setSelectedRoom(room.id === selectedRoom ? null : room.id)}
                />
              ))}
              <gridHelper args={[30, 30, '#d1d5db', '#e5e7eb']} position={[0, 0, 0]} />
            </>
          )}
          <Environment preset="apartment" />
        </Suspense>
      </Canvas>

      {/* Room Info Panel */}
      {selectedRoomData && viewMode === '3d' && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-72 bg-card/95 backdrop-blur-sm rounded-lg p-4 border shadow-lg animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-heading font-semibold text-foreground">{selectedRoomData.name}</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setSelectedRoom(null)}
            >
              ×
            </Button>
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            Size: {selectedRoomData.size[0] * 3}m × {selectedRoomData.size[2] * 3}m
          </div>
          {selectedRoomData.features && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-foreground">Features:</div>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {selectedRoomData.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded">
        {viewMode === '3d' ? 'Click rooms to view details • Drag to rotate • Scroll to zoom' : 'Drag to look around'}
      </div>
    </div>
  );
};

export default VirtualTour3D;
