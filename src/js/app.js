import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {BoxLineGeometry} from 'three/examples/jsm/geometries/BoxLineGeometry.js';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as CANNON from 'cannon-es';
import CannonDebugger from 'cannon-es-debugger';
import * as Interface from './interface/interface';
class Game{
    constructor(options, gui){
        this.objects = {...options.objects};
        this.room = {...options.room};
        this.vehicle = {...options.vehicle};
        this.gui = {...gui};

        this.createRenderer();
        this.createScene();
        this.createCamera();
        this.createOrbitControls();
        this.createLights();
        this.createHelpers();
        this.createGLTFLoader();
    }

    loadGLTFAsset(gltf, callback){
        this.GLTFAssetLoader.load(gltf.href, callback, undefined, (error) => {
            console.error(error);
        });
    }

    createGLTFLoader(){
        this.GLTFAssetLoader = new GLTFLoader();
    }

    createRenderer(){
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.shadowMap.enabled = true;
    }

    createScene(){
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x505050);
    }

    createCamera(){
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 15);
        this.camera.lookAt(0, 0, 0);
    }

    createOrbitControls(){
        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.enabled = this.gui.orbitControl;
    }

    createLights(){
        this.hemisphereLight = new THREE.HemisphereLight(0x606060, 0x404040, this.gui.hemisphereLightIntensity);
        this.scene.add(this.hemisphereLight);
        
        this.light = new THREE.DirectionalLight(0xffffff, this.gui.directLightIntensity);
        this.scene.add(this.light);
        this.light.castShadow = this.gui.shadows;
        this.light.position.set(10, 8, 8);
        this.light.shadow.mapSize.width = 2048;
        this.light.shadow.mapSize.height = 2048; 
        this.light.shadow.camera.near = 0.1; 
        this.light.shadow.camera.far = 25; 
        this.light.shadow.camera.top = 10;
        this.light.shadow.camera.left = -10;
        this.light.shadow.camera.right = 25;
        this.light.shadow.camera.bottom = -10;
    }

    createHelpers(){
        this.dLightHelper = new THREE.DirectionalLightHelper(this.light, 2);
        this.scene.add(this.dLightHelper);
        this.dLightHelper.visible = this.gui.dLightHelper;
        
        this.dLightShadowHelper = new THREE.CameraHelper(this.light.shadow.camera);
        this.scene.add(this.dLightShadowHelper);
        this.dLightShadowHelper.visible = this.gui.dLightShadowHelper;
        
        this.axesHelper = new THREE.AxesHelper(10);
        this.scene.add(this.axesHelper);
        this.axesHelper.visible = this.gui.axesHelper;
    }

    createPhysicsWorld(){
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -this.gui.gravity, 0),
        });

        if(this.gui.cannonDebugger){
            this.createCannonDebugger();
        }
    }

    createRoom(){
        const room = this.room;
        room.cannonWallsMaterial = new CANNON.Material();
        room.cannonWallBodies = [];

        room.object = new THREE.LineSegments(
            new BoxLineGeometry(room.size, room.size, room.size, room.segments, room.segments, room.segments),
            new THREE.LineBasicMaterial({color: 0x808080})
        );
    
        room.object.geometry.translate(0, room.size / 2, 0);
        room.object.visible = this.gui.roomVisible;
        this.scene.add(room.object);
    
        const floorGeometry = new THREE.PlaneGeometry(room.size, room.size, room.segments, room.segments);
        const floorMaterial = new THREE.MeshStandardMaterial({color: '#ffffff', side: THREE.DoubleSide});
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.scene.add(floor);
        floor.rotateX(-0.5 * Math.PI);
        floor.receiveShadow = true;
    
        //CANNON ROOM BODY
        const planeShape = new CANNON.Box(new CANNON.Vec3(room.size / 2, room.size / 2, 0.1));
        const groundBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, 0 - (.2 / 2),  0), material: room.cannonWallsMaterial });
        groundBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
        room.cannonWallBodies.push(groundBody);
    
        const leftWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(-room.size / 2 - (.2 / 2), room.size / 2,  0), material: room.cannonWallsMaterial });
        leftWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
        this.world.addBody(leftWallBody);
        room.cannonWallBodies.push(leftWallBody);
    
        const rightWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(room.size / 2 + (.2 / 2), room.size / 2,  0), material: room.cannonWallsMaterial });
        rightWallBody.quaternion.setFromEuler(0, Math.PI / 2, 0);
        this.world.addBody(rightWallBody);
        room.cannonWallBodies.push(rightWallBody);
    
        const backWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, room.size / 2,  -room.size / 2 - (.2 / 2)), material: room.cannonWallsMaterial });
        this.world.addBody(backWallBody);
        room.cannonWallBodies.push(backWallBody);
    
        const frontWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, room.size / 2,  room.size / 2 + (.2 / 2)), material: room.cannonWallsMaterial });
        this.world.addBody(frontWallBody);
        room.cannonWallBodies.push(frontWallBody);
    
        const topWallBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: planeShape, position: new CANNON.Vec3(0, room.size + (.2 / 2),  0), material: room.cannonWallsMaterial });
        topWallBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
        this.world.addBody(topWallBody);
        room.cannonWallBodies.push(topWallBody);
    }

    createCannonDebugger(){
        this.cannonDebugger = new CannonDebugger(this.scene, this.world, {});
    }

    updateCannonDebugger(){
        if(game.cannonDebugger){
            game.cannonDebugger.update();
        }
    }

    createClock(){
        this.clock = new THREE.Clock();
    }

    getClockDelta(){
        return Math.min(this.clock.getDelta(), 0.1);
    }

    loadVehicleModel = (gltf) =>{
        const model = gltf.scene;
        const vehicle = this.vehicle;
        vehicle.wheels = {};

        model.getObjectByName('body_02_body_0_body_0_1').material.color.r = Math.random();
        model.getObjectByName('body_02_body_0_body_0_1').material.color.g = Math.random();
        model.getObjectByName('body_02_body_0_body_0_1').material.color.b = Math.random();
        
        const frontWheels = [];
        frontWheels.push(model.getObjectByName('tire_mat5_04_tire_mat5_0'));
        frontWheels.push(model.getObjectByName('tire_mat5_03_tire_mat5_0'));
        frontWheels.push(model.getObjectByName('silver_11_silver_0')); 
        frontWheels.push(model.getObjectByName('silver_12_silver_0')); 
        vehicle.wheels.frontModels = frontWheels;
        
        const backWheels = [];
        backWheels.push(model.getObjectByName('tire_mat5_02_tire_mat5_0'));
        backWheels.push(model.getObjectByName('tire_mat5_01_tire_mat5_0'));
        backWheels.push(model.getObjectByName('silver_04_silver_0')); 
        backWheels.push(model.getObjectByName('silver_10_silver_0')); 
        vehicle.wheels.backModels = backWheels;
    
        model.traverse((node) => {
            if(node.isMesh){
                node.castShadow = true;
            }
        });

        model.scale.set(.5, .5, .5);
        vehicle.dimensions = new THREE.Box3().setFromObject(model);
        vehicle.model = model;
        vehicle.gltf = gltf;
        this.scene.add(model);
        this.vehicle  = {...vehicle};
    }

    createVehicleBody = () => {
        const vehicle = this.vehicle;
        const vehicleDimensions = vehicle.dimensions;
        const width = vehicleDimensions.max.x;
        const height = vehicleDimensions.max.y / 2 - .1; //Dopasowanie wysokości do modelu
        const deep = vehicleDimensions.max.z;
        const carShape = new CANNON.Box(new CANNON.Vec3(width, height, deep));
        const centerOfMassAdjust = new CANNON.Vec3(0, .2, 0);
        const wheelShape = new CANNON.Sphere(.2);
        const wheelMaterial = new CANNON.Material('wheel');
        const axis = new CANNON.Vec3(1,0,0);
        const down = new CANNON.Vec3(0, -1, 0);

        vehicle.wheels.angularVelocity = 0;
        vehicle.wheels.frontAngleY = 0;
        vehicle.wheels.angleX = 0;
        vehicle.contactMaterial = new CANNON.Material();

        const carBody = new CANNON.Body({
            mass: 5,
            position: new CANNON.Vec3(0, 1, 0),
            material: vehicle.cannonMaterial
        });
    
        carBody.addShape(carShape, centerOfMassAdjust);
    
        const rigidVehicle = new CANNON.RigidVehicle({
            chassisBody: carBody,
        }); 
    
        const leftFrontWheel = new CANNON.Body({
            mass: 1, 
            material: wheelMaterial,
            angularDamping: .4,
            shape: wheelShape,
            material: vehicle.cannonMaterial
        });
    
        const rightFrontWheel = new CANNON.Body({
            mass: 1, 
            material: wheelMaterial,
            angularDamping: .4,
            shape: wheelShape,
            material: vehicle.cannonMaterial
        });
    
        const leftBackWheel = new CANNON.Body({
            mass: 1, 
            material: wheelMaterial,
            angularDamping: .4,
            shape: wheelShape,
            material: vehicle.cannonMaterial
        });
    
        const rightBackWheel = new CANNON.Body({
            mass: 1, 
            material: wheelMaterial,
            angularDamping: .4,
            shape: wheelShape,
            material: vehicle.cannonMaterial
        });
    
        rigidVehicle.addWheel({
            body: leftFrontWheel,
            position: new CANNON.Vec3(width * .9, -height + .2, deep - .6),
            axis: axis,
            direction: down
        });
    
        rigidVehicle.addWheel({
            body: rightFrontWheel,
            position: new CANNON.Vec3(-width * .9, -height + .2, deep - .6),
            axis: axis,
            direction: down
        });
        
        rigidVehicle.addWheel({
            body: leftBackWheel,
            position: new CANNON.Vec3(width * .9, -height + .2, -deep + .4),
            axis: axis,
            direction: down
        });
    
        rigidVehicle.addWheel({
            body: rightBackWheel,
            position: new CANNON.Vec3(-width * .9, -height + .2, -deep + .4),
            axis: axis,
            direction: down
        });
    
        vehicle.cannon = rigidVehicle;
        rigidVehicle.addToWorld(this.world);
        this.vehicleControls(rigidVehicle);
    }

    vehicleControls(rigidVehicle){
        document.addEventListener('keydown', (event) => {
            const maxSteerVal = Math.PI / 8;
            const maxForce = 5;
    
            switch (event.key) {
                case 'w':
                case 'ArrowUp':
                rigidVehicle.setWheelForce(maxForce, 0);
                rigidVehicle.setWheelForce(maxForce, 1);
                break;
    
                case 's':
                case 'ArrowDown':
                rigidVehicle.setWheelForce(-maxForce / 2, 0);
                rigidVehicle.setWheelForce(-maxForce / 2, 1);
                break;
    
                case 'a':
                case 'ArrowLeft':
                rigidVehicle.setSteeringValue(maxSteerVal, 0);
                rigidVehicle.setSteeringValue(maxSteerVal, 1);
                this.steeringWheels(maxSteerVal);
                break;
    
                case 'd':
                case 'ArrowRight':
                rigidVehicle.setSteeringValue(-maxSteerVal, 0);
                rigidVehicle.setSteeringValue(-maxSteerVal, 1);
                this.steeringWheels(-maxSteerVal);
                break;
            }
        });
      
        document.addEventListener('keyup', (event) => {
            switch (event.key) {
                case 'w':
                case 'ArrowUp':
                rigidVehicle.setWheelForce(0, 0);
                rigidVehicle.setWheelForce(0, 1);
                break;
    
                case 's':
                case 'ArrowDown':
                rigidVehicle.setWheelForce(0, 0);
                rigidVehicle.setWheelForce(0, 1);
                break;
    
                case 'a':
                case 'ArrowLeft':
                rigidVehicle.setSteeringValue(0, 0);
                rigidVehicle.setSteeringValue(0, 1);
                this.steeringWheels(0);
                break;
    
                case 'd':
                case 'ArrowRight':
                rigidVehicle.setSteeringValue(0, 0);
                rigidVehicle.setSteeringValue(0, 1);
                this.steeringWheels(0);
                break;
            }
        });
    }

    randomNumber(min, max) {
        return Math.random() * (max - min) + min;
    }
    
    randomNegative(){
        return Math.random() < 0.5 ? -1 : 1;
    }

    addObjectsToRoom(){
        const objects = this.objects;
        const room = this.room;
        const world = this.world;
        let radius, mass, geometry, object, objectVelocity;
        if(!objects.contactMaterial){ objects.contactMaterial = new CANNON.ContactMaterial();}

        for(let i = 0; i < objects.count; i++){
            radius = this.randomNumber(objects.radius.min, objects.radius.max);
            mass = radius * 10;
            geometry = new THREE.SphereGeometry(radius);
            object = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({color: Math.random() * 0xFFFFFF, wireframe: this.gui.objetcsWireframe}));
            object.userData.radius = radius;
            object.userData.mass = mass;
            
            object.position.x = this.randomNumber((-1 * room.size / 2) + radius, (room.size / 2) - radius);
            object.position.y = this.randomNumber(1 + radius, room.size - radius);
            object.position.z = this.randomNumber((-1 * room.size / 2) + radius, (room.size / 2) - radius);
    
            objectVelocity = new CANNON.Vec3(
                this.randomNumber(objects.velocity.min, objects.velocity.max) * this.randomNegative(),
                this.randomNumber(objects.velocity.min, objects.velocity.max) * this.randomNegative(),
                this.randomNumber(objects.velocity.min, objects.velocity.max) * this.randomNegative()
            );
    
            object.userData.hold = false;
            object.castShadow = true;
            object.receiveShadow = true;
            object.userData.i = i;
            room.object.add(object);
    
            object.userData.cannon = new CANNON.Body({
                mass: mass,
                shape: new CANNON.Sphere(radius),
                type: CANNON.Body.DYNAMIC,
                velocity: objectVelocity.clone(),
                material: objects.contactMaterial,
                linearDamping: .2,
                angularDamping: .2
            });
    
            object.userData.cannon.position.copy(object.position);
            object.userData.cannon.quaternion.copy(object.quaternion);
            world.addBody(object.userData.cannon);
        }
    }

    controlBoxOut(object){
        if(object.position.x < - ((options.room.size / 2) - object.userData.radius) || object.position.x > ((options.room.size / 2) - object.userData.radius)){
            object.position.x = THREE.MathUtils.clamp(object.position.x, - ((options.room.size / 2) - object.userData.radius), ((options.room.size / 2) - object.userData.radius));
            return true;
        }
    
        if(object.position.y < object.userData.radius || object.position.y > options.room.size - object.userData.radius){
            object.position.y = THREE.MathUtils.clamp(object.position.y, object.userData.radius, options.room.size - object.userData.radius);
            return true;
        }
    
        if(object.position.z < - ((options.room.size / 2) - object.userData.radius) || object.position.z > ((options.room.size / 2) - object.userData.radius)){
            object.position.z = THREE.MathUtils.clamp(object.position.z, - ((options.room.size / 2) - object.userData.radius), ((options.room.size / 2) - object.userData.radius));
            return true;
        }
    
        return false;
    }

    moveObjects(){
        for(const object of this.room.object.children){
            if(object.userData.i === this.draggingObjectId){
                if(this.controlBoxOut(object) === false){
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

    dragStartCallback = (_event) => {
        _event.object.userData.hold = true;
        this.orbit.enabled = false;
        this.setDraggingObject(_event.object.userData.i);
    }

    dragEndCallback = (_event) => {
        _event.object.userData.hold = false;
        this.orbit.enabled = this.gui.orbitControl ? true : false;
        _event.object.userData.cannon.velocity = new CANNON.Vec3(0,0,0); 
        this.removeDraggingObject();
        
    }

    setDraggingObject(objectId){
        this.draggingObjectId = objectId;   
    }

    removeDraggingObject(){
        this.draggingObjectId = -1;
    }

    dragControlObjects = () =>{
        const room = this.room.object;
        this.dragControl = new DragControls(room.children, this.camera, this.renderer.domElement);  
        this.dragControl.enabled = this.gui.dragControl;
        this.dragControl.addEventListener('dragstart', this.dragStartCallback);    
        this.dragControl.addEventListener('dragend', this.dragEndCallback);   
        this.setDraggingObject(-1);         
    }

    moveVehicleModel(){
        this.vehicle.model.position.copy(this.vehicle.cannon.chassisBody.position.clone().vadd(new CANNON.Vec3(0, -.2, 0)));
        this.vehicle.model.quaternion.copy(this.vehicle.cannon.chassisBody.quaternion);
    }

    steeringWheels(deg){
        this.vehicle.wheels.frontAngleY = -deg;
    }

    steeringWheelsAnimation(delta){
        this.vehicle.wheels.angularVelocity = this.vehicle.cannon.wheelBodies[0].angularVelocity.length();
        this.vehicle.wheels.angleX += this.vehicle.wheels.angularVelocity * delta;
    
        for(const wheelElement of this.vehicle.wheels.backModels){
            wheelElement.rotateX(this.vehicle.wheels.angularVelocity * delta);
        };

        for(const wheelElement of this.vehicle.wheels.frontModels){
            let vector = new THREE.Vector3(1, 0, 0);
            vector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicle.wheels.frontAngleY);
    
            wheelElement.rotation.y = this.vehicle.wheels.frontAngleY;
            wheelElement.rotation.x = 0;
            wheelElement.rotation.z = 0;
    
            wheelElement.rotateOnWorldAxis(vector, this.vehicle.wheels.angleX);
        }
    }

    createCanva(){
        document.body.append(this.renderer.domElement);
    }

    resizeCanvaOnWindowResize(){
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    createContactMaterials(){
        this.sphereContactRoom = new CANNON.ContactMaterial(
            this.objects.contactMaterial,
            this.room.cannonWallsMaterial,
            { restitution: .7, friction: .5 }
        );

        this.sphereContactSphere = new CANNON.ContactMaterial(
            this.objects.contactMaterial,
            this.objects.contactMaterial,
            { restitution: .9 }
        );
        
        this.sphereContactVehicle = new CANNON.ContactMaterial(
            this.objects.contactMaterial,
            this.vehicle.contactMaterial,
            { restitution: .9 }
        );

        this.world.addContactMaterial(this.sphereContactRoom);
        this.world.addContactMaterial(this.sphereContactSphere);
        this.world.addContactMaterial(this.sphereContactVehicle);
    }

    createInterface(){
        Interface.loadInterface(this);
    }

    removeVehicleBody(){
        this.vehicle.cannon.removeFromWorld(this.world);
    }
    
    removeVehicle(){
        this.removeVehicleBody();
        this.scene.remove(this.vehicle.model);
    }
    
    removeObjectBody(object){
        this.world.removeBody(object.userData.cannon);
    }
    
    removeRoomBodies(){
        while(this.room.cannonWallBodies.length){
            this.world.removeBody(this.room.cannonWallBodies.pop());
        }
    }
    
    removeRoom(){
        this.removeObjectsFromRoom();
        this.scene.remove(this.room.object);
    }
    
    resetRoom(){
        this.removeRoom();
        this.removeRoomBodies();
        this.removeVehicle();
        this.loadVehicleModel(this.vehicle.gltf);
        this.createRoom();
        this.addObjectsToRoom();
        this.controlObjects();
    }
    
    removeObjectsFromRoom(){
        const room = this.room.object;

        while(room.children.length){
            const object = room.children.pop();
            this.removeObjectBody(object);
            room.remove(object);
        }
    }
    
    resetObjects(){
        this.removeObjectsFromRoom();
        this.addObjectsToRoom();
    }

    updateGravity(){
        game.world.gravity = new CANNON.Vec3(0, -this.gui.gravity, 0);
    }

    animate(tick){
        game.clockDelta = game.getClockDelta();
        game.world.step(game.clockDelta);
        game.moveObjects(game.clockDelta);
        game.moveVehicleModel();
        game.steeringWheelsAnimation(game.clockDelta);
        game.updateCannonDebugger();
        game.renderer.render(game.scene, game.camera);
    }

    load(){
        this.loadGLTFAsset(this.vehicle.url, (gltf) =>{
            this.createClock();
            this.createPhysicsWorld();
            this.createRoom();
            this.loadVehicleModel(gltf);
            this.createVehicleBody();
            this.addObjectsToRoom();
            this.createContactMaterials();
            this.dragControlObjects();
            this.createCanva();
            this.resizeCanvaOnWindowResize();
            this.createInterface();
            this.renderer.setAnimationLoop(this.animate);
        });
    }
}

const options = {
    objects: {
        count: 10,
        velocity: {
            min: 1,
            max: 5
        },
        segments: 3,
        radius: {
            min: 0.2,
            max: 0.5,
        },
    },
    room: {
        size: 15,
        segments: 10,
    },
    vehicle: {
        url: new URL('../3d/Hennesey Venom F5.glb', import.meta.url),
    }
}

const game = new Game(options, Interface.gui);
game.load();

