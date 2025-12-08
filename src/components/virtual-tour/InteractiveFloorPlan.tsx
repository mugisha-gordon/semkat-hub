import { useState } from 'react';
import { Maximize, Bed, Bath, UtensilsCrossed, Sofa, Car, TreeDeciduous, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloorPlanRoom {
  id: string;
  name: string;
  icon: 'bed' | 'bath' | 'kitchen' | 'living' | 'garage' | 'garden';
  dimensions: { width: number; height: number };
  position: { x: number; y: number };
  area: number; // in sqm
  color: string;
}

interface InteractiveFloorPlanProps {
  rooms?: FloorPlanRoom[];
  totalArea?: number;
  unit?: 'sqm' | 'sqft';
}

const roomIcons = {
  bed: Bed,
  bath: Bath,
  kitchen: UtensilsCrossed,
  living: Sofa,
  garage: Car,
  garden: TreeDeciduous,
};

const defaultFloorPlan: FloorPlanRoom[] = [
  { id: 'living', name: 'Living Room', icon: 'living', dimensions: { width: 180, height: 140 }, position: { x: 20, y: 20 }, area: 25, color: 'bg-sky/20 border-sky hover:bg-sky/30' },
  { id: 'kitchen', name: 'Kitchen', icon: 'kitchen', dimensions: { width: 120, height: 100 }, position: { x: 200, y: 20 }, area: 15, color: 'bg-semkat-success/20 border-semkat-success hover:bg-semkat-success/30' },
  { id: 'master', name: 'Master Bedroom', icon: 'bed', dimensions: { width: 140, height: 120 }, position: { x: 20, y: 160 }, area: 20, color: 'bg-primary/20 border-primary hover:bg-primary/30' },
  { id: 'bedroom2', name: 'Bedroom 2', icon: 'bed', dimensions: { width: 100, height: 100 }, position: { x: 160, y: 180 }, area: 12, color: 'bg-violet-500/20 border-violet-500 hover:bg-violet-500/30' },
  { id: 'bathroom1', name: 'En-suite Bath', icon: 'bath', dimensions: { width: 60, height: 80 }, position: { x: 260, y: 120 }, area: 6, color: 'bg-cyan-500/20 border-cyan-500 hover:bg-cyan-500/30' },
  { id: 'bathroom2', name: 'Bathroom', icon: 'bath', dimensions: { width: 60, height: 60 }, position: { x: 260, y: 200 }, area: 5, color: 'bg-cyan-500/20 border-cyan-500 hover:bg-cyan-500/30' },
];

const InteractiveFloorPlan = ({ 
  rooms = defaultFloorPlan, 
  totalArea = 83, 
  unit = 'sqm' 
}: InteractiveFloorPlanProps) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [showMeasurements, setShowMeasurements] = useState(true);

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);

  return (
    <div className="bg-card rounded-xl border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Interactive Floor Plan</h3>
          <p className="text-sm text-muted-foreground">Click on rooms to see details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showMeasurements ? 'sky' : 'outline'}
            size="sm"
            onClick={() => setShowMeasurements(!showMeasurements)}
            className="gap-1.5"
          >
            <Ruler className="h-4 w-4" />
            Measurements
          </Button>
        </div>
      </div>

      {/* Floor Plan Canvas */}
      <div className="relative bg-muted rounded-lg p-4 min-h-[320px] overflow-hidden">
        {/* Grid background */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Rooms */}
        <div className="relative">
          {rooms.map((room) => {
            const Icon = roomIcons[room.icon];
            const isSelected = selectedRoom === room.id;
            const isHovered = hoveredRoom === room.id;

            return (
              <div
                key={room.id}
                className={cn(
                  'absolute cursor-pointer border-2 rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-1',
                  room.color,
                  isSelected && 'ring-2 ring-primary ring-offset-2',
                  isHovered && 'scale-[1.02]'
                )}
                style={{
                  left: room.position.x,
                  top: room.position.y,
                  width: room.dimensions.width,
                  height: room.dimensions.height,
                }}
                onClick={() => setSelectedRoom(room.id === selectedRoom ? null : room.id)}
                onMouseEnter={() => setHoveredRoom(room.id)}
                onMouseLeave={() => setHoveredRoom(null)}
              >
                <Icon className={cn(
                  'h-5 w-5 transition-colors',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )} />
                <span className={cn(
                  'text-xs font-medium text-center px-1',
                  isSelected ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {room.name}
                </span>
                {showMeasurements && (
                  <span className="text-[10px] text-muted-foreground">
                    {room.area} {unit}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Total Area Badge */}
        <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border">
          <div className="flex items-center gap-2">
            <Maximize className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">
              Total: {totalArea} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Room Legend */}
      <div className="flex flex-wrap gap-2">
        {rooms.map((room) => {
          const Icon = roomIcons[room.icon];
          const isSelected = selectedRoom === room.id;

          return (
            <button
              key={room.id}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all border',
                isSelected 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-muted text-muted-foreground border-transparent hover:bg-muted/80'
              )}
              onClick={() => setSelectedRoom(room.id === selectedRoom ? null : room.id)}
            >
              <Icon className="h-3.5 w-3.5" />
              {room.name}
            </button>
          );
        })}
      </div>

      {/* Selected Room Details */}
      {selectedRoomData && (
        <div className="bg-muted rounded-lg p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            {(() => {
              const Icon = roomIcons[selectedRoomData.icon];
              return (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              );
            })()}
            <div className="flex-1">
              <h4 className="font-heading font-semibold text-foreground">{selectedRoomData.name}</h4>
              <p className="text-sm text-muted-foreground">
                {selectedRoomData.area} {unit} • 
                {Math.round(selectedRoomData.dimensions.width / 20)}m × {Math.round(selectedRoomData.dimensions.height / 20)}m
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground">
                {Math.round((selectedRoomData.area / totalArea) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">of total area</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveFloorPlan;
