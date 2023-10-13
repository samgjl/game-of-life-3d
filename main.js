import * as THREE from 'https://unpkg.com/three@latest/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@latest/examples/jsm/controls/OrbitControls.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.18/+esm';
import GameOfLife3D from '/game-of-life-3d.js';

// Scene:
const scene = new THREE.Scene();

// Camera:
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

// Pointer + Raycasting handling:
const raycaster = new THREE.Raycaster();
var intersections;
const pointer = new THREE.Vector2();

// Renderer:
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Controls:
const controls = new OrbitControls(camera, renderer.domElement);

// Set camera:
camera.position.set(1.125, 1.125, 1.125);
controls.update();

/*
##########################
       GUI + PARAMS
##########################
*/


var dimension =  20;
var randParams = { density: 3 }
var speed = { speed: 30 }
const gui = new GUI();
const randomFolder = gui.addFolder("Parameters For Entropy");
const aestheticFolder = gui.addFolder("Aesthetic Parameters");
// Buttons:
var playpause = { add: function() { 
    gol.updating = !gol.updating; 
    gol.casting = !gol.updating;
}};
var randomize = { add: function() { 
    gol.casting = false;
    gol.redoAll(randParams['density']);
    gol.casting = true;
}};
var reset = { add: function() { 
    gol.updating = false;
    gol.reset();
    gol.casting = true;
}};
var densityBased = { add: function() { 
    gol.densityBased = !gol.densityBased;
    gol.recolor();
}};
randomFolder.add(randParams, "density", 0, 100, 1);
randomFolder.add(randomize, "add").name("Randomize (R)");
aestheticFolder.add(speed, "speed", 0, 59, 1).name("Speed");
aestheticFolder.add(densityBased, "add").name("Color based on Density? (D)");
gui.add(reset, "add").name("Clear (C)");
gui.add(playpause, "add").name("Play/Pause (Space)");

/*
##########################
           MAIN
##########################
*/

// Game of Life + Parent Object:
const gol = new GameOfLife3D(dimension);
gol.randomizeArray(randParams['density']);
const parent = new THREE.Object3D();
scene.add(parent);
parent.position.set(-0.5, -0.5, -0.5);
// Loop parameters:
var frame = 0; // how often we're updating
var intersect; // current intersected block
var lastIntersect; // old intersected block
var oldColor; // old color of the old intersected block
// Make the points from scratch:
gol.makePoints(parent);
// Render loop:

// ####### USE THIS FOR WEBXR: #######
renderer.setAnimationLoop( animate );

function animate() {
    // Light up an object through raycasting:
    if (gol.casting) lightUpPoint();
    // Updating
    if (gol.updating) {
        frame = (frame+1) % (60 - speed['speed']);
        if (frame == 60 - speed['speed'] - 1) {
            gol.updateAndDraw();
        }
    }
    renderer.render( scene, camera );
}

/*
##########################
    EVENT LISTENERS
##########################
*/
window.addEventListener('resize', onWindowResize);
// Raycasting updating
document.addEventListener('mousemove', onPointerMove);
// Keypresses for shortcuts:
document.addEventListener("keypress", (e) => {
    if (e.key == " ") {
        gol.updating = !gol.updating;
        // update casting:
        gol.casting = !gol.casting;
    } else if (e.key == "r") {	
        gol.updating = false;
        gol.redoAll(randParams['density']);
    } else if (e.key == "c") {
        gol.updating = false;
        gol.reset();
    } else if (e.key == "d") {
        gol.densityBased = !gol.densityBased;
        gol.recolor();
    }
});
// Mouse clicks: L-Click=place, R-Click=remove
document.addEventListener("mousedown", (e) => {
    if (!gol.casting) return;
    intersections = raycaster.intersectObjects( parent.children, false );
    if (intersections.length > 0) {
        intersect = findClickable(intersections);
        if (intersect[0]) {
            // Mouse: L-Click=place, R-Click=remove
            gol.modifyBlock(raycastToVoxel(intersect[0], intersect[1], !e.button), !e.button);
        }
    }
});

/*
##########################
    UTILITY FUNCTIONS
##########################
*/
function onWindowResize() {
    // Fix camera aspect ratio:
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    // Fix renderer size:
    renderer.setSize( window.innerWidth, window.innerHeight );
}
/*
* Handles the mouse movement, fixes raycasting when users rotate/move the mouse
* @param {Object} event - The event object
* @return {void}
*/
function onPointerMove( event ) {
    event.preventDefault();
    pointer.x = ((event.clientX/window.innerWidth)*2) - 1;
    pointer.y = (-(event.clientY/window.innerHeight)*2) + 1;
}
/*
* Takes an array of raycasted objects and returns the first clickable one
* @param {Array} raycastedObjects - The array of raycasted objects
* @return {Array} - The first clickable object in the array
*/
function findClickable(raycastedObjects) {
    for (let i = 0; i < raycastedObjects.length; i++) {
        if (raycastedObjects[i].object.clickable) {
            return [raycastedObjects[i].object, raycastedObjects[i].point];
        }
    }
    return [null, null];
}
/* 
* Takes a contact object and an intersect point and returns the [i][j][k] values of that intersection
* @param {Object} contact - The contact object from the raycaster
* @param vector3 intersectPoint - The intersect point from the raycaster
* @return {Array} - The [i][j][k] values of the intersection (voxel)
*/
function raycastToVoxel(contact, intersectPoint, getNextTo = false) {
    var raycastPoint;
    // If we want the block next to this one:
    if (getNextTo) {
        // Gives us the initial (middle of the grid) position: 
        let dim = (gol.dimension%2) ? (gol.dimension-1)/2 : gol.dimension/2;
        // Contextualize the point in terms of the grid:
        raycastPoint = new THREE.Vector3(dim + Math.round((intersectPoint.x)*gol.dimension), 
                                            dim + Math.round((intersectPoint.y)*gol.dimension), 
                                            dim + Math.round((intersectPoint.z)*gol.dimension));
    }
    // Otherwise, we want the block we're pointing at:
    else {
        raycastPoint = new THREE.Vector3((contact.position.x)*gol.dimension, 
                                         (contact.position.y)*gol.dimension, 
                                         (contact.position.z)*gol.dimension);
    } 
    // Return the point:
    return raycastPoint;
}
/*
* Light up the point we're pointing at
* @return {void}
* @sideeffect - Sets lastIntersect, oldColor, and lastIntersect.material.color
*/
function lightUpPoint() {
    raycaster.setFromCamera(pointer, camera);
    intersections = raycaster.intersectObjects( parent.children, false );
    intersect = findClickable(intersections)[0]
    if (intersect) { // we have an intersect, and it ain't the one we had last
        if (lastIntersect != intersect) {
            if (lastIntersect) lastIntersect.material.color = oldColor;
            lastIntersect = intersect;
            oldColor = lastIntersect.material.color;
            lastIntersect.material.color = new THREE.Color(0xffffff);
        }
    } else { // We ain't intersecting nothing
        if (lastIntersect && oldColor) {
            lastIntersect.material.color = oldColor;
            lastIntersect = null;
        }
    }
}
