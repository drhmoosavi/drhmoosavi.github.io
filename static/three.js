// Define a constant for the 3D z-index styling
const Z_INDEX_3D = '0';

// Import necessary modules from Three.js and OrbitControls from the skypack CDN
import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import {OrbitControls} from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";

// Clear the console
console.clear();

// Create a new Three.js scene and set the background color
let scene = new THREE.Scene();
scene.background = new THREE.Color(0x160016);

// Create a perspective camera with a field of view of 45 degrees, setting near and far clipping planes
let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 1000);
camera.position.set(0, 25, 20); // Position the camera

// Create a WebGL renderer and set its size to the window dimensions
let renderer = new THREE.WebGLRenderer();
renderer.setSize(innerWidth, innerHeight);
// Style the canvas element for positioning and z-index
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = Z_INDEX_3D;

// Append the renderer's canvas element to the HTML document body
document.body.appendChild(renderer.domElement);

// Update the renderer and camera on window resize
window.addEventListener("resize", event => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Initialize OrbitControls to enable camera control via mouse interactions
let controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false; // Disable panning

// Global uniform to pass time variable to shaders
let gu = {
  time: {value: 0}
}

// Arrays to hold sizes and shift values for each point
let sizes = [];
let shift = [];

// Function to generate random shift values for each point's animation
let pushShift = () => {
  shift.push(
    Math.random() * Math.PI,             // Random start angle for movement in spherical coordinates
    Math.random() * Math.PI * 2,           // Random phase for movement
    (Math.random() * 0.9 + 0.1) * Math.PI * 0.1, // A factor for speed or movement amplitude
    Math.random() * 0.9 + 0.1              // A scale value for movement offset
  );
}

// Create an array of 50,000 points. Each point is given a random size and position.
let pts = new Array(50000).fill().map(p => {
  sizes.push(Math.random() * 1.2 + 0.1);  // Randomly assign sizes between 0.1 and 1.3
  pushShift();                           // Generate shift attribute for the point
  // Random direction point multiplied by a random scalar to scatter points around a sphere-like volume
  return new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 0.5 + 9.5);
})

// Create additional 100,000 points in a cylindrical formation
for(let i = 0; i < 100000; i++){
  let r = 10, R = 18;
  // Determine a random value with bias by raising to the power 0.25 for smoother distribution
  let rand = Math.pow(Math.random(), 0.25);
  // Compute the radius in cylindrical coordinates based on the random value
  let radius = Math.sqrt(R * R * rand + (1 - rand) * r * r);
  // Create the point using cylindrical coordinates (radius, angle, height) and add it to pts array
  pts.push(new THREE.Vector3().setFromCylindricalCoords(radius, Math.random() * 2 * Math.PI, (Math.random() - 0.5) * 2 ));
  sizes.push(Math.random() * 1.5 + 0.2); // Random size for the point
  pushShift();                         // Generate shift attribute for animation
}

// Create a buffer geometry from the points array
let g = new THREE.BufferGeometry().setFromPoints(pts);
// Attach the sizes and shift arrays as attributes to the geometry
g.setAttribute("sizes", new THREE.Float32BufferAttribute(sizes, 1));
g.setAttribute("shift", new THREE.Float32BufferAttribute(shift, 4));

// Set up a PointsMaterial for rendering each point
let m = new THREE.PointsMaterial({
  size: 0.125,
  transparent: true,
  depthTest: false,
  blending: THREE.AdditiveBlending,
  onBeforeCompile: shader => {
    // Provide the time uniform to the shader
    shader.uniforms.time = gu.time;
    // Inject custom shader code into the vertex shader for point size and animated movement
    shader.vertexShader = `
      uniform float time;
      attribute float sizes;
      attribute vec4 shift;
      varying vec3 vColor;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = size * sizes;`  // Scale the base size by the attribute size per point.
    ).replace(
      `#include <color_vertex>`,
      `#include <color_vertex>
        // Compute distance-based gradient for color
        float d = length(abs(position) / vec3(20., 5., 20));
        d = clamp(d, 0., 1.);
        // Mix two colors based on the computed distance
        vColor = mix(vec3(20., 155., 0.), vec3(100., 50., 255.), d) / 195.;
      `
    ).replace(
      `#include <begin_vertex>`,
      `#include <begin_vertex>
        // Animate the position along a spherical path using the shift attributes and time
        float t = time;
        float moveT = mod(shift.x + shift.z * t, PI2);
        float moveS = mod(shift.y + shift.z * t, PI2);
        transformed += vec3(cos(moveS) * sin(moveT), cos(moveT), sin(moveS) * sin(moveT)) * shift.w;
      `
    );
    // Inject custom shader code into the fragment shader to modify color and opacity
    shader.fragmentShader = `
      varying vec3 vColor;
      ${shader.fragmentShader}
    `.replace(
      `#include <clipping_planes_fragment>`,
      `#include <clipping_planes_fragment>
        // Calculate distance from point center to create a circular falloff effect
        float d = length(gl_PointCoord.xy - 0.5);
        //if (d > 0.5) discard; // Optionally discard fragments outside the desired circle
      `
    ).replace(
      `vec4 diffuseColor = vec4( diffuse, opacity );`,
      `vec4 diffuseColor = vec4( vColor, smoothstep(0.5, 0.1, d)/* * 0.5 + 0.5*/ );` // Set the fragment color
    );
  }
});

// Create a Points object from the geometry and material, and apply initial rotation and scale
let p = new THREE.Points(g, m);
p.rotation.order = "ZYX";
p.rotation.z = 0;
p.rotation.x = 0.5;
p.rotation.y = 1;
p.scale.set(0.4, 0.5, 0.45);
scene.add(p);

// Create a clock to track elapsed time for animation
let clock = new THREE.Clock();

// Animation loop
renderer.setAnimationLoop(() => {
  // Skip rendering if the window width is less than 380px (responsive behavior)
  if (innerWidth < 380) {
    return;
  }
  // Update camera controls for smooth damping
  controls.update();
  let t = clock.getElapsedTime() * 0.5;
  // Update the uniform time value for shader animations
  gu.time.value = t * Math.PI;
  // Slowly rotate the points object around the y-axis
  p.rotation.y = t * 0.001;
  // Render the scene from the perspective of the camera
  renderer.render(scene, camera);
});

// Add click listeners to navigation buttons to trigger a fade-out effect before navigating
document.querySelectorAll('.nav-button').forEach(button => {
  button.addEventListener('click', event => {
    event.preventDefault();
    const targetPage = button.getAttribute('data-target');
    // Add a fade-out CSS class to the body
    document.body.classList.add('fade-out');
    // Navigate to the target page after a delay matching the fade-out animation duration
    setTimeout(() => {
      window.location.href = targetPage;
    }, 500);
  });
});
