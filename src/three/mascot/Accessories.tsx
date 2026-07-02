import type { Garment } from '@/domain/types';

/**
 * Weather accessories for the mascot, authored in the normalized model space
 * (feet at y=0, ~1.9 tall, centered on origin, facing +Z). Each piece toggles
 * on the presence of a Garment from recommendOutfit(). Simple crafted meshes —
 * readable and cheap; can be replaced with modeled props later.
 */
export const Accessories = ({ garments }: { garments: Garment[] }) => {
  const has = (g: Garment) => garments.includes(g);

  return (
    <group>
      {has('raincoat') ? (
        <Raincoat />
      ) : (
        (has('heavyCoat') || has('coat')) && <Coat heavy={has('heavyCoat')} />
      )}
      {has('scarf') && <Scarf />}
      {has('sunhat') ? <Sunhat /> : has('hat') && <Beanie />}
      {has('sunglasses') && <Sunglasses />}
      {has('umbrella') && <Umbrella />}
      {has('boots') && <Boots />}
    </group>
  );
};

const HEAD_Y = 1.78;
const EYE_Y = 1.55;
const NECK_Y = 1.28;
const TORSO_Y = 0.98;
const FRONT_Z = 0.3;

function Beanie() {
  return (
    <group position={[0, HEAD_Y, 0]}>
      <mesh castShadow scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.3, 20, 16]} />
        <meshStandardMaterial color="#c0453b" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.29, 0.06, 12, 24]} />
        <meshStandardMaterial color="#a53c33" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Sunhat() {
  return (
    <group position={[0, HEAD_Y, 0]}>
      {/* flat brim: a thin cylinder is already a horizontal disc (no rotation) */}
      <mesh castShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.03, 28]} />
        <meshStandardMaterial color="#e8d18a" roughness={0.9} />
      </mesh>
      <mesh castShadow position={[0, 0.1, 0]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.26, 20, 16]} />
        <meshStandardMaterial color="#dcc074" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Scarf() {
  return (
    <group position={[0, NECK_Y, 0]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.22, 0.08, 12, 24]} />
        <meshStandardMaterial color="#d1495b" roughness={0.9} />
      </mesh>
      {/* hanging tail */}
      <mesh castShadow position={[0.1, -0.22, FRONT_Z - 0.05]}>
        <boxGeometry args={[0.12, 0.32, 0.06]} />
        <meshStandardMaterial color="#d1495b" roughness={0.9} />
      </mesh>
    </group>
  );
}

function Sunglasses() {
  return (
    <group position={[0, EYE_Y, FRONT_Z]}>
      {[-0.13, 0.13].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 20]} />
          <meshStandardMaterial color="#0b0f16" roughness={0.4} metalness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.12, 0.03, 0.03]} />
        <meshStandardMaterial color="#0b0f16" />
      </mesh>
    </group>
  );
}

function Coat({ heavy }: { heavy: boolean }) {
  return (
    <mesh castShadow position={[0, TORSO_Y, 0]}>
      <cylinderGeometry args={[0.3, 0.42, 0.62, 20]} />
      <meshStandardMaterial color={heavy ? '#33414f' : '#6b4f3a'} roughness={0.95} />
    </mesh>
  );
}

function Raincoat() {
  return (
    <mesh castShadow position={[0, TORSO_Y + 0.08, 0]}>
      <coneGeometry args={[0.46, 0.8, 22]} />
      <meshStandardMaterial color="#f2c14e" roughness={0.7} />
    </mesh>
  );
}

function Umbrella() {
  return (
    <group position={[0.05, 2.5, 0]}>
      <mesh castShadow rotation={[0, 0, 0]}>
        <coneGeometry args={[0.6, 0.4, 24]} />
        <meshStandardMaterial color="#3a7bd5" roughness={0.6} />
      </mesh>
      {/* pole */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1.1, 8]} />
        <meshStandardMaterial color="#5a3d2b" />
      </mesh>
    </group>
  );
}

function Boots() {
  return (
    <group position={[0, 0.09, 0.02]}>
      {[-0.16, 0.16].map((x) => (
        <mesh key={x} castShadow position={[x, 0, 0]}>
          <boxGeometry args={[0.17, 0.18, 0.24]} />
          <meshStandardMaterial color="#3f2e22" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
