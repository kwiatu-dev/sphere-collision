import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'dat.gui';
import {BoxLineGeometry} from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';

const VehicleModel = new URL('../3d/Hennesey Venom F5.glb', import.meta.url);
const GLTFAssetLoader = new GLTFLoader();

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
camera.position.set(0, 5, 15);
camera.lookAt(0, 0, 0);
orbit.update();

const hemisphereLight = new THREE.HemisphereLight(0x606060, 0x404040)
scene.add(hemisphereLight);

const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(10, 8, 8);
scene.add(light);
light.castShadow = true;

light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048; 
light.shadow.camera.near = 0.1; 
light.shadow.camera.far = 25; 
light.shadow.camera.top = 10;
light.shadow.camera.left = -10;
light.shadow.camera.right = 25;
light.shadow.camera.bottom = -10;

const dLightHelper = new THREE.DirectionalLightHelper(light, 2);
scene.add(dLightHelper);
dLightHelper.visible = false;

const dLightShadowHelper = new THREE.CameraHelper(light.shadow.camera);
scene.add(dLightShadowHelper);
dLightShadowHelper.visible = false;

const axesHelper = new THREE.AxesHelper(10);
scene.add(axesHelper);
axesHelper.visible = false;

const options = {
    count: 00,
    velocity: {
        min: 1,
        max: 5
    },
    room: {
        object: null,
        size: 15,
        segments: 10,
        visible: true,
        cannonMaterial: new CANNON.Material(),
        cannonBodies: [],
    },
    geometry: {
        object: null,
        segments: 3,
        radiusMin: 0.2,
        radiusMax: 0.5,
        wireframe: false,
        cannonMaterial: new CANNON.Material()
    },
    control:{
        object: null,
    },
    gui:{
        object: null,
    },
    vehilce: {
        cannonMaterial: new CANNON.Material(),
        model: null,
        cannon: null,
        gltf: null,
        wheelFrontOponaLeft: null,
        wheelFrontOponaRight: null,
        wheelFrontFelgaLeft: null, 
        wheelFrontFelgaRight: null,
        wheelBackOponaLeft: null,
        wheelBackOponaRight: null,
        wheelBackFelgaLeft: null,
        wheelBackFelgaRight: null,
        steeringWheels: 0,
    },
    shadows: true,
    directLightIntensity: 0.8,
    hemisphereLightIntensity: 1,
    axesHelper: false,
    dLightHelper: false,
    dLightShadowHelper: false,
    gravity: 9.8,
    orbitControl: true,
    dragControl: true,
}

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -options.gravity, 0),
});

const sphereContantRoom = new CANNON.ContactMaterial(
    options.room.cannonMaterial,
    options.geometry.cannonMaterial,
    { restitution: .7, friction: .5 }
);

const sphereContantSphere = new CANNON.ContactMaterial(
    options.geometry.cannonMaterial,
    options.geometry.cannonMaterial,
    { restitution: .9 }
);

const sphereContactVehicle = new CANNON.ContactMaterial(
    options.geometry.cannonMaterial,
    options.vehilce.cannonMaterial,
    { restitution: .9 }
)

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

    //CANNON ROOM BODY
    const planeShape = new CANNON.Box(new CANNON.Vec3(options.room.size / 2, options.room.size / 2, 0.1));
    const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, 0 - (.2 / 2),  0), material: options.room.cannonMaterial });
    groundBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    world.addBody(groundBody);
    options.room.cannonBodies.push(groundBody);

    const leftWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(-options.room.size / 2 - (.2 / 2), options.room.size / 2,  0), material: options.room.cannonMaterial });
    leftWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
    world.addBody(leftWallBody);
    options.room.cannonBodies.push(leftWallBody);

    const rightWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(options.room.size / 2 + (.2 / 2), options.room.size / 2,  0), material: options.room.cannonMaterial });
    rightWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
    world.addBody(rightWallBody);
    options.room.cannonBodies.push(rightWallBody);

    const backWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, options.room.size / 2,  -options.room.size / 2 - (.2 / 2)), material: options.room.cannonMaterial });
    world.addBody(backWallBody);
    options.room.cannonBodies.push(backWallBody);

    const frontWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, options.room.size / 2,  options.room.size / 2 + (.2 / 2)), material: options.room.cannonMaterial });
    world.addBody(frontWallBody);
    options.room.cannonBodies.push(frontWallBody);

    const topWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, options.room.size + (.2 / 2),  0), material: options.room.cannonMaterial });
    topWallBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
    world.addBody(topWallBody);
    options.room.cannonBodies.push(topWallBody);
}

const removeVehicleBody = () => {
    options.vehilce.cannon.removeFromWorld(world);
}

const removeVehicle = () =>{
    removeVehicleBody();
    scene.remove(options.vehilce.model);
}

const removeObjectBody = (object) => {
    world.removeBody(object.userData.cannon);
}

const removeRoomBodies = () => {
    while(options.room.cannonBodies.length){
        world.removeBody(options.room.cannonBodies.pop());
    }
}

const removeRoom = () => {
    removeObjectsFromRoom();
    scene.remove(options.room.object);
}

const resetRoom = () =>{
    removeRoom();
    removeRoomBodies();
    removeVehicle();
    loadVehicleModel(options.vehilce.gltf);
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
        const geometry = new THREE.SphereGeometry(radius);
        const object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: Math.random() * 0xFFFFFF, wireframe: options.geometry.wireframe}));
        object.userData.radius = radius;
        object.userData.mass = mass;
        
        object.position.x = randomNumber((-1 * options.room.size / 2) + radius, (options.room.size / 2) - radius);
        object.position.y = randomNumber(1 + radius, options.room.size - radius);
        object.position.z = randomNumber((-1 * options.room.size / 2) + radius, (options.room.size / 2) - radius);

        const objectVelocity = new CANNON.Vec3(
            randomNumber(options.velocity.min, options.velocity.max) * randomNegative(),
            randomNumber(options.velocity.min, options.velocity.max) * randomNegative(),
            randomNumber(options.velocity.min, options.velocity.max) * randomNegative()
        );

        object.userData.hold = false;
        options.room.object.add(object);
        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.i = i;

        //CANNON OBJECT BODY
        object.userData.cannon = new CANNON.Body({
            mass: mass,
            shape: new CANNON.Sphere(radius),
            type: CANNON.Body.DYNAMIC,
            velocity: objectVelocity.clone(),
            material: options.geometry.cannonMaterial,
            linearDamping: .2,
            angularDamping: .2
        });

        object.userData.cannon.position.copy(object.position);
        object.userData.cannon.quaternion.copy(object.quaternion);
        world.addBody(object.userData.cannon);
    }
}

const removeObjectsFromRoom = () => {
    while(options.room.object.children.length){
        const object = options.room.object.children.pop();
        removeObjectBody(object);
        options.room.object.remove(object);
    }
}

const resetObjects = () => {
    removeObjectsFromRoom();
    addObjectsToRoom();
}

const controlBoxOut = (object) =>{
    const radius = object.userData.radius;
    const range = (options.room.size / 2) - radius;

    if(object.position.x < - range || object.position.x > range){
        object.position.x = THREE.MathUtils.clamp(object.position.x, - range, range);
        return true;
    }

    if(object.position.y < radius || object.position.y > options.room.size - radius){
        object.position.y = THREE.MathUtils.clamp(object.position.y, radius, options.room.size - radius);
        return true;
    }

    if(object.position.z < - range || object.position.z > range){
        object.position.z = THREE.MathUtils.clamp(object.position.z, - range, range);
        return true;
    }

    return false;
}

const moveObjects = () =>{
    for(const object of options.room.object.children){
        if(object.userData.i === draggingId){
            if(controlBoxOut(object) === false){
                object.userData.cannon.position.copy(object.position);
                object.userData.cannon.quaternion.copy(object.quaternion);
            }
        }
        else{
            object.position.copy(object.userData.cannon.position);
            object.quaternion.copy(object.userData.cannon.quaternion);
        }
    }
}

let draggingId = -1;

const dragStartCallback = (_event) => {
    _event.object.userData.hold = true;
    orbit.enabled = false;
    draggingId = _event.object.userData.i;
}

const dragEndCallback = (_event) => {
    _event.object.userData.hold = false;
    orbit.enabled = options.orbitControl ? true : false;
    _event.object.userData.cannon.velocity = new CANNON.Vec3(0,0,0); 
    draggingId = -1;
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

    objectControlls.add(options.geometry, 'wireframe').onChange((e) => {
        options.geometry.wireframe = e;
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

    helpers.add(options, 'dLightShadowHelper').onChange((e) => {
        dLightShadowHelper.visible = e;
    });

    const physics = options.gui.object.addFolder('Physics');

    physics.add(options, 'gravity').onChange((e) => {
        options.gravity = e;
        world.gravity = new CANNON.Vec3(0, -options.gravity, 0);
    });

    physics.add(options.velocity, 'min').onChange((e) => {
        options.velocity.min = e;
    });

    physics.add(options.velocity, 'max').onChange((e) => {
        options.velocity.max = e;
    });
}

//const cannonDebugger = new CannonDebugger(scene, world, {});
const clock = new THREE.Clock()
let delta

function animate(tick){
    delta = Math.min(clock.getDelta(), 0.1)
    world.step(delta);
    moveObjects(delta);
    moveVehicle(delta);
    //cannonDebugger.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const loadVehicleModel = (gltf) =>{
    options.vehilce.gltf = gltf;
    const model = gltf.scene;
    options.vehilce.model = model;
    scene.add(model);

    options.vehilce.model.getObjectByName('body_02_body_0_body_0_1').material.color.r = Math.random();
    options.vehilce.model.getObjectByName('body_02_body_0_body_0_1').material.color.g = Math.random();
    options.vehilce.model.getObjectByName('body_02_body_0_body_0_1').material.color.b = Math.random();

    options.vehilce.wheelFrontOponaLeft = options.vehilce.model.getObjectByName('tire_mat5_04_tire_mat5_0');
    options.vehilce.wheelFrontOponaRight = options.vehilce.model.getObjectByName('tire_mat5_03_tire_mat5_0');
    options.vehilce.wheelFrontFelgaLeft = options.vehilce.model.getObjectByName('silver_11_silver_0'); 
    options.vehilce.wheelFrontFelgaRight = options.vehilce.model.getObjectByName('silver_12_silver_0'); 

    options.vehilce.wheelBackOponaLeft = options.vehilce.model.getObjectByName('tire_mat5_02_tire_mat5_0');
    options.vehilce.wheelBackOponaRight = options.vehilce.model.getObjectByName('tire_mat5_01_tire_mat5_0');
    options.vehilce.wheelBackFelgaLeft = options.vehilce.model.getObjectByName('silver_04_silver_0'); 
    options.vehilce.wheelBackFelgaRight = options.vehilce.model.getObjectByName('silver_10_silver_0'); 

    options.vehilce.model.traverse((node) => {
        if(node.isMesh){
            node.castShadow = true;
        }
    });

    options.vehilce.model.scale.set(.5, .5, .5);
    const vehicleDimensions = new THREE.Box3().setFromObject(options.vehilce.model);
    createVehicle(vehicleDimensions);
}

const createVehicle = (vehicleDimensions) => {
    const width = vehicleDimensions.max.x;
    const height = vehicleDimensions.max.y / 2 - .1;
    const deep = vehicleDimensions.max.z;

    const carShape = new CANNON.Box(new CANNON.Vec3(width, height, deep));
    const centerOfMassAdjust = new CANNON.Vec3(0, .2, 0);
    
    const carBody = new CANNON.Body({
        mass: 5,
        position: new CANNON.Vec3(0, 1, 0),
        material: options.vehilce.cannonMaterial
    });

    carBody.addShape(carShape, centerOfMassAdjust);

    const vehicle = new CANNON.RigidVehicle({
        chassisBody: carBody,
    }); 

    const wheelShape = new CANNON.Sphere(.2);
    const wheelMaterial = new CANNON.Material('wheel');
    const axis = new CANNON.Vec3(1,0,0);
    const down = new CANNON.Vec3(0, -1, 0);

    const leftFrontWheel = new CANNON.Body({
        mass: 1, 
        material: wheelMaterial,
        angularDamping: .4,
        shape: wheelShape,
        material: options.vehilce.cannonMaterial
    });

    const rightFrontWheel = new CANNON.Body({
        mass: 1, 
        material: wheelMaterial,
        angularDamping: .4,
        shape: wheelShape,
        material: options.vehilce.cannonMaterial
    });

    const leftBackWheel = new CANNON.Body({
        mass: 1, 
        material: wheelMaterial,
        angularDamping: .4,
        shape: wheelShape,
        material: options.vehilce.cannonMaterial
    });

    const rightBackWheel = new CANNON.Body({
        mass: 1, 
        material: wheelMaterial,
        angularDamping: .4,
        shape: wheelShape,
        material: options.vehilce.cannonMaterial
    });

    vehicle.addWheel({
        body: leftFrontWheel,
        position: new CANNON.Vec3(width * .9, -height + .2, deep - .6),
        axis: axis,
        direction: down
    });

    vehicle.addWheel({
        body: rightFrontWheel,
        position: new CANNON.Vec3(-width * .9, -height + .2, deep - .6),
        axis: axis,
        direction: down
    });
    
    vehicle.addWheel({
        body: leftBackWheel,
        position: new CANNON.Vec3(width * .9, -height + .2, -deep + .4),
        axis: axis,
        direction: down
    });

    vehicle.addWheel({
        body: rightBackWheel,
        position: new CANNON.Vec3(-width * .9, -height + .2, -deep + .4),
        axis: axis,
        direction: down
    });

    vehicle.addToWorld(world);
    options.vehilce.cannon = vehicle;

    document.addEventListener('keydown', (event) => {
        const maxSteerVal = Math.PI / 8;
        const maxForce = 5;

        switch (event.key) {
            case 'w':
            case 'ArrowUp':
            vehicle.setWheelForce(maxForce, 0);
            vehicle.setWheelForce(maxForce, 1);
            break;

            case 's':
            case 'ArrowDown':
            vehicle.setWheelForce(-maxForce / 2, 0);
            vehicle.setWheelForce(-maxForce / 2, 1);
            break;

            case 'a':
            case 'ArrowLeft':
            vehicle.setSteeringValue(maxSteerVal, 0);
            vehicle.setSteeringValue(maxSteerVal, 1);
            steeringWheels(maxSteerVal);
            break;

            case 'd':
            case 'ArrowRight':
            vehicle.setSteeringValue(-maxSteerVal, 0);
            vehicle.setSteeringValue(-maxSteerVal, 1);
            steeringWheels(-maxSteerVal);
            break;
        }
    });
  
    // reset car force to zero when key is released
    document.addEventListener('keyup', (event) => {
        switch (event.key) {
            case 'w':
            case 'ArrowUp':
            vehicle.setWheelForce(0, 0);
            vehicle.setWheelForce(0, 1);
            break;

            case 's':
            case 'ArrowDown':
            vehicle.setWheelForce(0, 0);
            vehicle.setWheelForce(0, 1);
            break;

            case 'a':
            case 'ArrowLeft':
            vehicle.setSteeringValue(0, 0);
            vehicle.setSteeringValue(0, 1);
            steeringWheels(0);
            break;

            case 'd':
            case 'ArrowRight':
            vehicle.setSteeringValue(0, 0);
            vehicle.setSteeringValue(0, 1);
            steeringWheels(0);
            break;
        }
    });
}

let angularVelocity; 

const moveVehicle = (delta) => {
    options.vehilce.model.position.copy(options.vehilce.cannon.chassisBody.position.clone().vadd(new CANNON.Vec3(0, -.2, 0)));
    options.vehilce.model.quaternion.copy(options.vehilce.cannon.chassisBody.quaternion);

    angularVelocity = options.vehilce.cannon.wheelBodies[0].angularVelocity.length();

    options.vehilce.wheelFrontFelgaLeft.rotateX(angularVelocity * delta);
    options.vehilce.wheelFrontFelgaRight.rotateX(angularVelocity * delta);
    options.vehilce.wheelFrontOponaLeft.rotateX(angularVelocity * delta);
    options.vehilce.wheelFrontOponaRight.rotateX(angularVelocity * delta);
    options.vehilce.wheelBackFelgaLeft.rotateX(angularVelocity * delta);
    options.vehilce.wheelBackFelgaRight.rotateX(angularVelocity * delta);
    options.vehilce.wheelBackOponaLeft.rotateX(angularVelocity * delta);
    options.vehilce.wheelBackOponaRight.rotateX(angularVelocity * delta);
}

const steeringWheels = (deg) => {
    options.vehilce.wheelFrontOponaLeft.rotation.z = deg;
    options.vehilce.wheelFrontFelgaLeft.rotation.z = deg;
    options.vehilce.wheelFrontFelgaRight.rotation.z = deg;
    options.vehilce.wheelFrontOponaRight.rotation.z = deg;
}

const init = (gltf) => {
    createRoom();
    loadVehicleModel(gltf);
    addObjectsToRoom();
    world.addContactMaterial(sphereContantRoom);
    world.addContactMaterial(sphereContantSphere);
    //world.addContactMaterial(sphereContactVehicle);
    controlObjects();
    createInterface();

    renderer.setAnimationLoop(animate);
};

GLTFAssetLoader.load(VehicleModel.href, init, undefined, (error) => {
    console.error(error);
});


/**
 * TODO
 * 1. Różne rozmiary kulek (x)
 * 2. Dodawanie kulek w wybranym miejscu za pomocą kursura
 * 3. Wstawić na środek jakiś ciekawy model (x)
 * 4. Odbijać kulki od modelu na środku (x)
 * 5. Prouszanie pojazdem (x)
 * 6. Resetowanie pokoju ma restetować dodane ściany w cannon js (x)
 * 7. Odpowiednie poruszanie kołami
 */

