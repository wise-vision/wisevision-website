import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeAnimationProps {
  className?: string;
}

export default function ThreeAnimation({ className = '' }: ThreeAnimationProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup with enhanced atmosphere
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a0b, 0.002);
    sceneRef.current = scene;

    // Camera setup with cinematic feel
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 40);

    // Enhanced renderer with premium quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0b, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Sophisticated lighting setup
    const ambientLight = new THREE.AmbientLight(0x4da6ff, 0.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x4da6ff, 0.8);
    directionalLight.position.set(20, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x0066cc, 0.6, 80);
    pointLight1.position.set(-20, -20, -20);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x1a8cff, 0.4, 60);
    pointLight2.position.set(20, -10, 20);
    scene.add(pointLight2);

    // Create sophisticated geometric shapes
    const geometries = [
      new THREE.DodecahedronGeometry(1.2),
      new THREE.IcosahedronGeometry(1),
      new THREE.OctahedronGeometry(1.5),
      new THREE.TetrahedronGeometry(1.3),
    ];

    // Premium materials with PBR workflow
    const materials = [
      new THREE.MeshStandardMaterial({ 
        color: 0x4da6ff,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true, 
        opacity: 0.8,
        emissive: 0x001133,
        emissiveIntensity: 0.1
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x0066cc,
        metalness: 0.9,
        roughness: 0.1,
        transparent: true, 
        opacity: 0.6,
        wireframe: false
      }),
      new THREE.MeshStandardMaterial({ 
        color: 0x1a8cff,
        metalness: 0.5,
        roughness: 0.3,
        transparent: true, 
        opacity: 0.7,
        emissive: 0x0066cc,
        emissiveIntensity: 0.05
      }),
    ];

    const floatingObjects: Array<{
      mesh: THREE.Mesh;
      rotationSpeed: THREE.Vector3;
      basePosition: THREE.Vector3;
      floatOffset: number;
      scale: number;
    }> = [];

    // Create elegant floating objects
    for (let i = 0; i < 15; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = materials[Math.floor(Math.random() * materials.length)].clone();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Sophisticated positioning in a sphere
      const phi = Math.acos(-1 + (2 * i) / 15);
      const theta = Math.sqrt(15 * Math.PI) * phi;
      const radius = 25 + Math.random() * 15;

      const basePosition = new THREE.Vector3(
        radius * Math.cos(theta) * Math.sin(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(phi)
      );

      mesh.position.copy(basePosition);

      const scale = 0.6 + Math.random() * 0.8;
      mesh.scale.setScalar(scale);

      scene.add(mesh);

      floatingObjects.push({
        mesh,
        rotationSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        basePosition: basePosition.clone(),
        floatOffset: Math.random() * Math.PI * 2,
        scale
      });
    }

    // Enhanced particle system with better distribution
    const particleCount = 800;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Distribute particles in a sphere
      const radius = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      particlePositions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      particlePositions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      particlePositions[i3 + 2] = radius * Math.cos(phi);

      particleVelocities[i3] = (Math.random() - 0.5) * 0.01;
      particleVelocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      particleVelocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

      particleSizes[i] = Math.random() * 2 + 0.5;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particlesGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x4da6ff,
      size: 0.15,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      vertexColors: false
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // Smooth mouse interaction
    const mouse = new THREE.Vector2();
    const targetCameraPosition = new THREE.Vector3(0, 0, 40);
    const currentCameraPosition = new THREE.Vector3(0, 0, 40);

    const handleMouseMove = (event: MouseEvent) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Smooth camera movement
      targetCameraPosition.x = mouse.x * 3;
      targetCameraPosition.y = mouse.y * 3;
      targetCameraPosition.z = 40;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Smooth animation loop with easing
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.0005;

      // Smooth camera movement with easing
      currentCameraPosition.lerp(targetCameraPosition, 0.02);
      camera.position.copy(currentCameraPosition);
      camera.lookAt(0, 0, 0);

      // Animate floating objects with organic movement
      floatingObjects.forEach((obj, index) => {
        // Smooth rotation
        obj.mesh.rotation.x += obj.rotationSpeed.x;
        obj.mesh.rotation.y += obj.rotationSpeed.y;
        obj.mesh.rotation.z += obj.rotationSpeed.z;

        // Organic floating motion
        const floatY = Math.sin(time * 2 + obj.floatOffset) * 2;
        const floatX = Math.cos(time * 1.5 + obj.floatOffset) * 1;
        const floatZ = Math.sin(time * 1.8 + obj.floatOffset) * 1.5;

        obj.mesh.position.x = obj.basePosition.x + floatX;
        obj.mesh.position.y = obj.basePosition.y + floatY;
        obj.mesh.position.z = obj.basePosition.z + floatZ;

        // Subtle breathing scale effect
        const breathe = 1 + Math.sin(time * 3 + index) * 0.05;
        obj.mesh.scale.setScalar(obj.scale * breathe);
      });

      // Animate particles with flow
      const positions = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        positions[i3] += particleVelocities[i3];
        positions[i3 + 1] += particleVelocities[i3 + 1];
        positions[i3 + 2] += particleVelocities[i3 + 2];

        // Create flowing motion
        const distance = Math.sqrt(
          positions[i3] ** 2 + positions[i3 + 1] ** 2 + positions[i3 + 2] ** 2
        );
        
        if (distance > 100) {
          // Reset particle to center area
          const newRadius = 20 + Math.random() * 10;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          
          positions[i3] = newRadius * Math.sin(phi) * Math.cos(theta);
          positions[i3 + 1] = newRadius * Math.sin(phi) * Math.sin(theta);
          positions[i3 + 2] = newRadius * Math.cos(phi);
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Smooth light pulsing
      pointLight1.intensity = 0.6 + Math.sin(time * 3) * 0.2;
      pointLight2.intensity = 0.4 + Math.cos(time * 2.5) * 0.1;
      directionalLight.intensity = 0.8 + Math.sin(time * 1.5) * 0.1;

      // Rotate entire particle system slowly
      particles.rotation.y += 0.0005;

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize with smooth transitions
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // Proper disposal
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
      particlesGeometry.dispose();
      particlesMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className={`three-animation ${className}`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        overflow: 'hidden',
      }}
    />
  );
}
