import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import {BoxLineGeometry} from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
document.body.append(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x505050 );

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const orbit = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);
orbit.update();

const hemisphereLight = new THREE.HemisphereLight(0x606060, 0x404040)
scene.add(hemisphereLight);

const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(1, 1, 3);
scene.add(light);
light.castShadow = true;

light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048; 
light.shadow.camera.near = 0.1; 
light.shadow.camera.far = 10; 

const dLightHelper = new THREE.DirectionalLightHelper(light, 5);
scene.add(dLightHelper);

const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);

const options = {
    count: 100,
    velocity: {
        min: 1,
        max: 5
    },
    room: {
        object: null,
        size: 6,
        segments: 10,
        visible: true,
    },
    geometry: {
        object: null,
        segments: 3,
        radiusMin: 0.08,
        radiusMax: 0.2,
    },
    control:{
        object: null,
    },
    gui:{
        object: null,
    },
    shadows: true,
    directLightIntensity: 0.8,
    hemisphereLightIntensity: 1,
    axesHelper: true,
    dLightHelper: true,
    gravity: 9.8,
    orbitControl: true,
    dragControl: true,
}

options.gui['Reset objects'] = () => {
    resetObjects();
};

const createRoom = () => {
    options.room.object = new THREE.LineSegments(
        new BoxLineGeometry(options.room.size, options.room.size, options.room.size, options.room.segments, options.room.segments, options.room.segments),
        new THREE.LineBasicMaterial({color: 0x808080})
    );

    options.room.object.geometry.translate(0, options.room.size / 2, 0);
    scene.add(options.room.object);

    const planeGeometry = new THREE.PlaneGeometry(options.room.size, options.room.size, options.room.segments, options.room.segments);
    const planeMaterial = new THREE.MeshStandardMaterial({color: '#ffffff', side: THREE.DoubleSide});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);
    plane.rotateX(-0.5 * Math.PI);
    plane.receiveShadow = true;
}

const removeRoom = () => {
    removeObjectsFromRoom();
    scene.remove(options.room.object);
}

const resetRoom = () =>{
    removeRoom();
    createRoom();
    addObjectsToRoom();
    controlObjects();
}

function randomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function randomNegative(){
    return Math.random() < 0.5 ? -1 : 1;
}

const addObjectsToRoom = () => {
    for(let i = 0; i < options.count; i++){
        const radius = randomNumber(options.geometry.radiusMin, options.geometry.radiusMax);
        const mass = radius * 10;
        const geometry = new THREE.IcosahedronGeometry(radius, options.geometry.segments);
        const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: Math.random() * 0xFFFFFF}));
        object.userData.radius = radius;
        object.userData.mass = mass;

        object.position.x = randomNumber((-1 * options.room.size / 2) + radius, (options.room.size / 2) - radius);
        object.position.y = randomNumber(0 + radius, options.room.size - radius);
        object.position.z = randomNumber((-1 * options.room.size / 2) + radius, (options.room.size / 2) - radius);

        object.userData.velocity = new THREE.Vector3();
        object.userData.velocity.x = randomNumber(options.velocity.min, options.velocity.max) * randomNegative();
        object.userData.velocity.y = randomNumber(options.velocity.min, options.velocity.max) * randomNegative();
        object.userData.velocity.z = randomNumber(options.velocity.min, options.velocity.max) * randomNegative();
        object.userData.hold = false;

        options.room.object.add(object);
        object.castShadow = true;
        object.receiveShadow = true;
    }
}

const removeObjectsFromRoom = () => {
    while(options.room.object.children.length){
        options.room.object.remove(options.room.object.children[0]);
    }
}

const resetObjects = () => {
    removeObjectsFromRoom();
    addObjectsToRoom();
}

const clock = new THREE.Clock();

const moveObjects = (delta) =>{
    for(const object of options.room.object.children){
        if(object.userData.hold === false){
            object.position.x += object.userData.velocity.x * delta;
            object.position.y += object.userData.velocity.y * delta;
            object.position.z += object.userData.velocity.z * delta;
        }

        controlBoxCollision(object);
        controlObjectCollision(object);
        //addGravity(object, delta);
    }
}

const controlBoxCollision = (object) =>{
    const radius = object.userData.radius;
    const range = (options.room.size / 2) - radius;

    if(object.position.x < - range || object.position.x > range){
        object.position.x = THREE.MathUtils.clamp(object.position.x, - range, range);
        object.userData.velocity.x = - object.userData.velocity.x;
    }

    if(object.position.y < radius || object.position.y > options.room.size - radius){
        object.position.y = THREE.MathUtils.clamp(object.position.y, radius, options.room.size - radius);
        object.userData.velocity.y *= -0.8; 
        object.userData.velocity.x *= 0.98; 
        object.userData.velocity.z *= 0.98; 
    }

    if(object.position.z < - range || object.position.z > range){
        object.position.z = THREE.MathUtils.clamp(object.position.z, - range, range);
        object.userData.velocity.z = - object.userData.velocity.z;
    }
}
let distance = null;
let normal = new THREE.Vector3();
let u1 = new THREE.Vector3();
let u2 = new THREE.Vector3();
let v1 = new THREE.Vector3();
let v2 = new THREE.Vector3();

const controlObjectCollision = (object) => {
    for(const potentialIntersect of options.room.object.children){
        normal.copy(object.position).sub(potentialIntersect.position);
        distance = normal.length();

        if(distance < potentialIntersect.userData.radius + object.userData.radius){
            normal.multiplyScalar(distance - (potentialIntersect.userData.radius + object.userData.radius));
            object.position.sub(normal);
            potentialIntersect.position.add(normal);
            normal.normalize();

            u1.copy(object.userData.velocity).multiplyScalar(object.userData.mass - potentialIntersect.userData.mass);
            u2.copy(potentialIntersect.userData.velocity).multiplyScalar(2 * potentialIntersect.userData.mass);
            v1.addVectors(u1, u2).divideScalar(object.userData.mass + potentialIntersect.userData.mass);

            u2.copy(potentialIntersect.userData.velocity).multiplyScalar(potentialIntersect.userData.mass - object.userData.mass);
            u1.copy(object.userData.velocity).multiplyScalar(2 * object.userData.mass);
            v2.addVectors(u2, u1).divideScalar(object.userData.mass + potentialIntersect.userData.mass);

            object.userData.velocity.copy(v1);
            potentialIntersect.userData.velocity.copy(v2);
        }
    }
};

const addGravity = (object, delta) => {
    if(object.userData.hold === false){
        object.userData.velocity.y -= options.gravity * delta;
    }
}

const dragStartCallback = (_event) => {
    _event.object.userData.hold = true;
    orbit.enabled = false;
}

const dragEndCallback = (_event) => {
    _event.object.userData.hold = false;
    orbit.enabled = options.orbitControl ? true : false;
}

const controlObjects = () =>{
    options.control.object = new DragControls(options.room.object.children, camera, renderer.domElement);  
    options.control.object.addEventListener('dragstart', dragStartCallback);    
    options.control.object.addEventListener('dragend', dragEndCallback);            
}

const createInterface = () => {
    options.gui.object = new dat.GUI();
    const primaryOptions = options.gui.object.addFolder('Options');

    primaryOptions.add(options, 'shadows').onChange((e) => {
        light.castShadow = e;
    });

    primaryOptions.add(options, 'directLightIntensity', 0, 1).onChange((e) => {
        light.intensity = e;
    });

    primaryOptions.add(options, 'hemisphereLightIntensity', 0, 1).onChange((e) => {
        hemisphereLight.intensity = e;
    });

    primaryOptions.add(options, 'orbitControl', 0, 1).onChange((e) => {
        orbit.enabled = e;
    });

    primaryOptions.add(options, 'dragControl', 0, 1).onChange((e) => {
        options.control.object.enabled = e;
    });

    const objectControlls = options.gui.object.addFolder('Objects');

    objectControlls.add(options.gui, 'Reset objects');

    objectControlls.add(options, 'count').onChange((e) => {
        options.count = e;
        resetObjects();
    });

    objectControlls.add(options.geometry, 'radiusMin').onChange((e) => {
        options.geometry.radiusMin = e;
        resetObjects();
    });

    objectControlls.add(options.geometry, 'radiusMax').onChange((e) => {
        options.geometry.radiusMax = e;
        resetObjects();
    });

    const roomControls = options.gui.object.addFolder('Room');

    roomControls.add(options.room, 'size').onChange((e) => {
        options.room.size = e;
        resetRoom();
    });

    roomControls.add(options.room, 'segments').onChange((e) => {
        options.room.segments = e;
        resetRoom();
    });

    roomControls.add(options.room, 'visible').onChange((e) => {
        options.room.object.material.visible = e;
    });

    const helpers = options.gui.object.addFolder('Helpers');

    helpers.add(options, 'axesHelper').onChange((e) => {
        axesHelper.visible = e;
    });

    helpers.add(options, 'dLightHelper').onChange((e) => {
        dLightHelper.visible = e;
    });

    const physics = options.gui.object.addFolder('Physics');

    physics.add(options, 'gravity').onChange((e) => {
        options.gravity = e;
    });

    physics.add(options.velocity, 'min').onChange((e) => {
        options.velocity.min = e;
    });

    physics.add(options.velocity, 'max').onChange((e) => {
        options.velocity.max = e;
    });
}

function animate(tick){
    const delta = clock.getDelta();
    moveObjects(delta);

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const momentumTest = () => {
    const radius1 = 0.5;
    const mass1 = radius1 * 10;
    const geometry1 = new THREE.IcosahedronGeometry(radius1, options.geometry.segments);
    const object1 = new THREE.Mesh(geometry1, new THREE.MeshLambertMaterial({color: Math.random() * 0xFFFFFF}));
    object1.userData.radius = radius1;
    object1.userData.mass = mass1;

    object1.position.x = -1;
    object1.position.y = options.room.size / 2;
    object1.position.z = 0;

    object1.userData.velocity = new THREE.Vector3();
    object1.userData.velocity.x = 0.5
    object1.userData.velocity.y = 0
    object1.userData.velocity.z = 0
    object1.userData.hold = false;

    options.room.object.add(object1);
    object1.castShadow = true;
    object1.receiveShadow = true;

    const radius2 = 0.2;
    const mass2 = radius2 * 10;
    const geometry2 = new THREE.IcosahedronGeometry(radius2, options.geometry.segments);
    const object2 = new THREE.Mesh(geometry2, new THREE.MeshLambertMaterial({color: Math.random() * 0xFFFFFF}));
    object2.userData.radius = radius2;
    object2.userData.mass = mass2;

    object2.position.x = options.room.size / 8;
    object2.position.y = options.room.size / 2;
    object2.position.z = 0;

    object2.userData.velocity = new THREE.Vector3();
    object2.userData.velocity.x = -0.1;
    object2.userData.velocity.y = 0
    object2.userData.velocity.z = 0
    object2.userData.hold = false;

    options.room.object.add(object2);
    object2.castShadow = true;
    object2.receiveShadow = true;
}

const init = () => {
    createRoom();
    //addObjectsToRoom();
    //controlObjects();
    //createInterface();
    momentumTest();
    renderer.setAnimationLoop(animate);
};

init();

/**
 * TODO
 * 1. Różne rozmiary kulek (x)
 * 2. Dodawanie kulek w wybranym miejscu za pomocą kursura
 * 3. Wstawić na środek jakiś ciekawy model 
 * 4. Odbijać kulki od modelu na środku 
 */

