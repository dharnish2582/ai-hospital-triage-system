import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { RoomStatus, Room } from './DigitalTwinMap';
import { Patient } from './PatientQueue';
import { useState } from 'react';

// Color palette
const COLORS = {
  floor: '#1e293b',
  wall: '#334155',
  glass: '#cbd5e1',
  available: '#10b981',   // emerald-500  (green)
  reserved: '#f59e0b',    // amber-500    (yellow – patient assigned)
  occupied: '#f43f5e',    // rose-500     (red – ICU critical)
  emergency: '#f97316',   // orange-500   (orange – ER active)
  doctor: '#f8fafc',      // slate-50
  patient: '#3b82f6',     // blue-500
  selected: '#d946ef',    // fuchsia-500
  corridorLight: '#38bdf8', // sky-400
  waitingArea: '#475569',   // slate-600
  corridor: '#1e3a5f',      // dark blue
};

// ── Layout Constants ─────────────────────────────────────────────────
// ── Layout Constants (COMPACT HOSPITAL) ──────────────────────────────
const ROOM_W = 4;
const ROOM_H = 3;
const ROOM_D = 3.5;

/* Reduce spacing between rooms */
const ROOM_GAP = 0.4;
const ROOM_STEP = ROOM_W + ROOM_GAP;

/* Center rooms horizontally */
const ROW_HALF_WIDTH = (5 * ROOM_W + 4 * ROOM_GAP) / 2;

function roomX(index: number): number {
  return -ROW_HALF_WIDTH + ROOM_W / 2 + index * ROOM_STEP;
}

/* Compact vertical spacing (Z positions) */

const WAITING_TOP_Z = -28;

const ICU_ROW1_Z = -22;
const ICU_ROW2_Z = -18;

const NORMAL_TOP_Z = -12;

/* Corridor smaller */
const CORRIDOR_Z = 0;
const CORRIDOR_HALF_LEN = 5;

const NORMAL_BOT_Z = 12;

const ER_ROW1_Z = 18;
const ER_ROW2_Z = 22;

const WAITING_BOT_Z = 28;

/* Smaller hospital floor */
const FLOOR_WIDTH = 28;
const FLOOR_DEPTH = 70;

// ── Dynamic room name arrays ─────────────────────────────────────────
const icuRoomNames = Array.from({ length: 10 }, (_, i) => `ICU${i + 1}`);
const normalRoomNames = Array.from({ length: 10 }, (_, i) => `Room${i + 1}`);
const emergencyRoomNames = Array.from({ length: 10 }, (_, i) => `ER${i + 1}`);

// Split each group: 5 up, 5 down
const icuRow1Names = icuRoomNames.slice(0, 5);
const icuRow2Names = icuRoomNames.slice(5, 10);
const normalTopNames = normalRoomNames.slice(0, 5);
const normalBotNames = normalRoomNames.slice(5, 10);
const erRow1Names = emergencyRoomNames.slice(0, 5);
const erRow2Names = emergencyRoomNames.slice(5, 10);

// ── Room Component ──────────────────────────────────────────────────
function RoomBox({
  room,
  position,
  isSelected,
}: {
  room: Room;
  position: [number, number, number];
  isSelected: boolean;
}) {
  const color =
    room.type === 'ER' && room.status !== 'available'
      ? COLORS.emergency
      : room.status === 'available'
        ? COLORS.available
        : room.status === 'reserved'
          ? COLORS.reserved
          : COLORS.occupied;

  const [pulse, setPulse] = useState(0);

  useFrame((state) => {
    if (room.status === 'occupied' || room.status === 'reserved') {
      setPulse((Math.sin(state.clock.elapsedTime * 3) + 1) * 0.5);
    } else {
      setPulse(0);
    }
  });

  return (
    <group position={position}>
      {/* Floor */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[ROOM_W - 0.2, 0.1, ROOM_D - 0.2]} />
        <meshStandardMaterial
          color={isSelected ? COLORS.selected : color}
          opacity={0.3}
          transparent
        />
      </mesh>

      {/* Glass Walls */}
      <mesh position={[0, ROOM_H / 2, 0]}>
        <boxGeometry args={[ROOM_W, ROOM_H, ROOM_D]} />
        <meshStandardMaterial
          color={COLORS.glass}
          transparent
          opacity={0.1}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
        <lineSegments>
          <edgesGeometry
            args={[new THREE.BoxGeometry(ROOM_W, ROOM_H, ROOM_D)]}
          />
          <lineBasicMaterial
            color={isSelected ? COLORS.selected : color}
            linewidth={isSelected ? 3 : 1}
            transparent
            opacity={0.5}
          />
        </lineSegments>
      </mesh>

      {/* Label */}
      <Text
        position={[0, ROOM_H + 0.5, 0]}
        fontSize={0.65}
        color={isSelected ? COLORS.selected : '#ffffff'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.04}
        outlineColor="#000000"
      >
        {room.name}
      </Text>

      {/* Status Badge */}
      {(room.status === 'reserved' || room.status === 'occupied') &&
        pulse > 0.8 && (
          <Html
            position={[0, ROOM_H + 1.5, 0]}
            center
            zIndexRange={[100, 0]}
          >
            <div className="text-xs font-bold text-white bg-black/80 px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none animate-fade-out">
              {room.status === 'reserved' ? 'Reserved' : 'Occupied'}
            </div>
          </Html>
        )}
    </group>
  );
}

// ── Avatar Component ────────────────────────────────────────────────
function Avatar({
  type,
  label,
  position,
  isSelected,
}: {
  type: 'doctor' | 'patient';
  label: string;
  position: THREE.Vector3;
  isSelected: boolean;
}) {
  const color = type === 'doctor' ? COLORS.doctor : COLORS.patient;

  return (
    <group position={position}>
      <mesh position={[0, type === 'doctor' ? 0.8 : 0.6, 0]} castShadow>
        {type === 'doctor' ? (
          <capsuleGeometry args={[0.3, 0.8, 4, 8]} />
        ) : (
          <sphereGeometry args={[0.4, 16, 16]} />
        )}
        <meshStandardMaterial
          color={isSelected ? COLORS.selected : color}
          roughness={0.4}
        />
      </mesh>

      <Text
        position={[0, type === 'doctor' ? 2 : 1.5, 0]}
        fontSize={0.35}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.03}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  );
}

// ── Animated Corridor Lights ────────────────────────────────────────
function CorridorLights() {
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.children.forEach((c: any) => {
        if (c.material) {
          c.material.opacity =
            (Math.sin(state.clock.elapsedTime * 2 + c.position.z * 0.5) + 1) *
            0.3;
        }
      });
    }
  });

  const lights = [];
  for (
    let z = -CORRIDOR_HALF_LEN + 1;
    z < CORRIDOR_HALF_LEN - 1;
    z += 2
  ) {
    lights.push(
      <mesh
        key={`l${z}`}
        position={[-2, 0.12, z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.2, 1]} />
        <meshBasicMaterial
          color={COLORS.corridorLight}
          transparent
          opacity={0.5}
        />
      </mesh>
    );
    lights.push(
      <mesh
        key={`r${z}`}
        position={[2, 0.12, z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[0.2, 1]} />
        <meshBasicMaterial
          color={COLORS.corridorLight}
          transparent
          opacity={0.5}
        />
      </mesh>
    );
  }

  return <group ref={ref}>{lights}</group>;
}

// ── Camera Manager ──────────────────────────────────────────────────
function CameraManager() {
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 3}
      minDistance={30}
      maxDistance={80}
      target={[0, 0, 0]}
    />
  );
}

// ── Section Label (flat text on the floor) ──────────────────────────
function SectionLabel({
  text,
  position,
  color = '#94a3b8',
}: {
  text: string;
  position: [number, number, number];
  color?: string;
}) {
  return (
    <Text
      position={position}
      fontSize={1.2}
      rotation={[-Math.PI / 2, 0, 0]}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.03}
      outlineColor="#000000"
    >
      {text}
    </Text>
  );
}

// ── Main Scene ──────────────────────────────────────────────────────
function HospitalScene({
  rooms,
  doctors,
  patients,
  selectedPatientId,
}: {
  rooms: Room[];
  doctors: any[];
  patients: Patient[];
  selectedPatientId: string | null;
}) {
  // Build a position map for every room by name
  const roomPositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();

    const placeRow = (names: string[], z: number) => {
      names.forEach((name, i) => {
        const r = rooms.find((rm) => rm.name === name);
        if (r) map.set(r.id, new THREE.Vector3(roomX(i), 0, z));
      });
    };

    placeRow(icuRow1Names, ICU_ROW1_Z);
    placeRow(icuRow2Names, ICU_ROW2_Z);
    placeRow(normalTopNames, NORMAL_TOP_Z);
    placeRow(normalBotNames, NORMAL_BOT_Z);
    placeRow(erRow1Names, ER_ROW1_Z);
    placeRow(erRow2Names, ER_ROW2_Z);

    return map;
  }, [rooms]);

  // Derive avatar placements
  const activeAvatars = useMemo(() => {
    const docs: {
      id: number;
      label: string;
      position: THREE.Vector3;
      isSelected: boolean;
    }[] = [];
    const pats: {
      id: string;
      label: string;
      position: THREE.Vector3;
      isSelected: boolean;
    }[] = [];

    rooms.forEach((room) => {
      if (
        (room.status === 'reserved' || room.status === 'occupied') &&
        room.patientId
      ) {
        const roomPos = roomPositions.get(room.id);
        if (!roomPos) return;

        const patient = patients.find((p) => p.name === room.patientId);
        if (patient) {
          const isSelPat = patient.id.toString() === selectedPatientId;
          pats.push({
            id: patient.id.toString(),
            label: patient.name,
            position: new THREE.Vector3(roomPos.x - 0.6, 0, roomPos.z),
            isSelected: isSelPat,
          });

          const docName = (patient as any).assigned_doctor;
          if (docName) {
            const doc = doctors.find((d) => d.name === docName);
            if (doc) {
              docs.push({
                id: doc.id,
                label: doc.name,
                position: new THREE.Vector3(roomPos.x + 0.6, 0, roomPos.z),
                isSelected: isSelPat,
              });
            }
          }
        }
      }
    });

    return { docs, pats };
  }, [rooms, patients, doctors, roomPositions, selectedPatientId]);

  const selectedRoomName = selectedPatientId
    ? (patients.find((p) => p.id.toString() === selectedPatientId) as any)
        ?.assigned_room
    : null;

  return (
    <>
      <color attach="background" args={[COLORS.floor]} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 40, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Floor Base */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[FLOOR_WIDTH, 0.1, FLOOR_DEPTH]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      {/* Grid */}
      <gridHelper
        args={[FLOOR_DEPTH, 60, '#334155', '#1e293b']}
        position={[0, 0, 0]}
      />

      {/* ── Waiting Area (Top) ─────────────────────────────────── */}
      <mesh
        position={[0, 0.02, WAITING_TOP_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROW_HALF_WIDTH * 2 + 2, 6]} />
        <meshStandardMaterial
          color={COLORS.waitingArea}
          transparent
          opacity={0.4}
        />
      </mesh>
      <SectionLabel
        text="WAITING AREA"
        position={[0, 0.1, WAITING_TOP_Z]}
        color="#e2e8f0"
      />

      {/* ── ICU Rooms (2 rows of 5) ───────────────────────────── */}
      <SectionLabel
        text="ICU ROOMS"
        position={[0, 0.1, ICU_ROW1_Z - 4]}
        color="#f87171"
      />

      {/* ── Normal Rooms Top (5) ──────────────────────────────── */}
      <SectionLabel
        text="NORMAL ROOMS"
        position={[0, 0.1, NORMAL_TOP_Z - 4]}
        color="#a78bfa"
      />

      {/* ── Central Corridor ──────────────────────────────────── */}
      <mesh
        position={[0, 0.01, CORRIDOR_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[FLOOR_WIDTH - 2, CORRIDOR_HALF_LEN * 2]} />
        <meshStandardMaterial
          color={COLORS.corridor}
          transparent
          opacity={0.5}
        />
      </mesh>
      <SectionLabel
        text="═══════  CORRIDOR  ═══════"
        position={[0, 0.1, CORRIDOR_Z]}
        color="#38bdf8"
      />
      <CorridorLights />

      {/* ── Normal Rooms Bottom (5) ───────────────────────────── */}
      <SectionLabel
        text="NORMAL ROOMS"
        position={[0, 0.1, NORMAL_BOT_Z + 4]}
        color="#a78bfa"
      />

      {/* ── ER Rooms (2 rows of 5) ────────────────────────────── */}
      <SectionLabel
        text="EMERGENCY ROOMS"
        position={[0, 0.1, ER_ROW2_Z + 4]}
        color="#fb923c"
      />

      {/* ── Waiting Area (Bottom) ─────────────────────────────── */}
      <mesh
        position={[0, 0.02, WAITING_BOT_Z]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROW_HALF_WIDTH * 2 + 2, 6]} />
        <meshStandardMaterial
          color={COLORS.waitingArea}
          transparent
          opacity={0.4}
        />
      </mesh>
      <SectionLabel
        text="WAITING AREA"
        position={[0, 0.1, WAITING_BOT_Z]}
        color="#e2e8f0"
      />

      {/* ── Bounding Walls ────────────────────────────────────── */}
      {/* North */}
      <mesh position={[0, 2.5, -FLOOR_DEPTH / 2]} receiveShadow castShadow>
        <boxGeometry args={[FLOOR_WIDTH, 5, 0.5]} />
        <meshStandardMaterial
          color={COLORS.wall}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      {/* South */}
      <mesh position={[0, 2.5, FLOOR_DEPTH / 2]} receiveShadow castShadow>
        <boxGeometry args={[FLOOR_WIDTH, 5, 0.5]} />
        <meshStandardMaterial
          color={COLORS.wall}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      {/* West */}
      <mesh
        position={[-FLOOR_WIDTH / 2, 2.5, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[0.5, 5, FLOOR_DEPTH]} />
        <meshStandardMaterial
          color={COLORS.wall}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      {/* East */}
      <mesh
        position={[FLOOR_WIDTH / 2, 2.5, 0]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[0.5, 5, FLOOR_DEPTH]} />
        <meshStandardMaterial
          color={COLORS.wall}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>

      {/* ── Render All Rooms ──────────────────────────────────── */}
      {rooms.map((room) => {
        const pos = roomPositions.get(room.id);
        const isSel = selectedRoomName === room.name;
        return pos ? (
          <RoomBox
            key={room.id}
            room={room}
            position={[pos.x, pos.y, pos.z]}
            isSelected={isSel}
          />
        ) : null;
      })}

      {/* ── Avatars ───────────────────────────────────────────── */}
      {activeAvatars.docs.map((doc) => (
        <Avatar
          key={`doc-${doc.id}`}
          type="doctor"
          label={doc.label}
          position={doc.position}
          isSelected={doc.isSelected}
        />
      ))}
      {activeAvatars.pats.map((pat) => (
        <Avatar
          key={`pat-${pat.id}`}
          type="patient"
          label={pat.label}
          position={pat.position}
          isSelected={pat.isSelected}
        />
      ))}

      {/* Camera Controls */}
      <CameraManager />
    </>
  );
}

// ── Wrapper Component ───────────────────────────────────────────────
export function DigitalTwinMap3D({
  rooms,
  doctors,
  patients,
  selectedPatientId,
}: {
  rooms: Room[];
  doctors: any[];
  patients: Patient[];
  selectedPatientId: string | null;
}) {
  return (
    <div className="glass-card p-0 h-full flex flex-col overflow-hidden relative border border-slate-700/50 rounded-[2rem] shadow-2xl">
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow-md">
          Digital Twin Hospital Map
        </h2>
        <div className="flex gap-4 text-xs font-semibold mt-3 bg-black/60 p-2.5 rounded-xl backdrop-blur-md shadow-xl border border-white/10 uppercase tracking-wider">
          <div className="flex items-center gap-2 text-white">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            Available
          </div>
          <div className="flex items-center gap-2 text-white">
            <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
            Reserved
          </div>
          <div className="flex items-center gap-2 text-white">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
            ICU Critical
          </div>
          <div className="flex items-center gap-2 text-white">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
            ER Active
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-full bg-gradient-to-br from-[#0f172a] to-[#020617]">
        <Canvas shadows camera={{ position: [0, 45, 35], fov: 50 }}>
          <HospitalScene
            rooms={rooms}
            doctors={doctors}
            patients={patients}
            selectedPatientId={selectedPatientId}
          />
        </Canvas>
      </div>
    </div>
  );
}
