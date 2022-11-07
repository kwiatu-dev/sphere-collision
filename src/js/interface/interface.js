import * as dat from 'dat.gui';

export class Interface{
    constructor(game){
        this.game = game;
    }

    loadInterface(){
        const game = this.game;
        const guiSettings = game.gui;
        game.gui.object = new dat.GUI();
        const gui = game.gui.object;
        const primaryOptions = gui.addFolder('Options');
        
        primaryOptions.add(guiSettings, 'shadows').onChange((e) => {
            game.light.castShadow = e;
        });
    
        primaryOptions.add(guiSettings, 'directLightIntensity', 0, 1).onChange((e) => {
            game.light.intensity = e;
        });
    
        primaryOptions.add(guiSettings, 'hemisphereLightIntensity', 0, 1).onChange((e) => {
            game.hemisphereLight.intensity = e;
        });
    
        primaryOptions.add(guiSettings, 'orbitControl', 0, 1).onChange((e) => {
            game.orbit.enabled = e;
        });
    
        primaryOptions.add(guiSettings, 'dragControl', 0, 1).onChange((e) => {
            game.dragControl.enabled = e;
        });
    
        const objectControlls = gui.addFolder('Objects');

        guiSettings['Reset objects'] = () => {
            game.resetObjects();
        };
    
        objectControlls.add(guiSettings, 'Reset objects');
    
        objectControlls.add(game.objects, 'count').onChange((e) => {
            game.objects.count = e;
            game.resetObjects();
        });
    
        objectControlls.add(game.objects.radius, 'min').onChange((e) => {
            game.objects.radius.min = e;
            game.resetObjects();
        });
    
        objectControlls.add(game.objects.radius, 'max').onChange((e) => {
            game.objects.radius.max  = e;
            game.resetObjects();
        });
    
        objectControlls.add(guiSettings, 'objetcsWireframe').onChange((e) => {
            guiSettings.objetcsWireframe = e;
            game.resetObjects();
        });
    
        const roomControls = gui.addFolder('Room');
    
        roomControls.add(game.room, 'size').onChange((e) => {
            game.room.size = e;
            game.resetRoom();
        });
    
        roomControls.add(game.room, 'segments').onChange((e) => {
            game.room.segments = e;
            game.resetRoom();
        });
    
        roomControls.add(guiSettings, 'roomVisible').onChange((e) => {
            game.room.object.visible = e;
        });
        
        const helpers = gui.addFolder('Helpers');
    
        helpers.add(guiSettings, 'axesHelper').onChange((e) => {
            game.axesHelper.visible = e;
        });
    
        helpers.add(guiSettings, 'dLightHelper').onChange((e) => {
            game.dLightHelper.visible = e;
        });
    
        helpers.add(guiSettings, 'dLightShadowHelper').onChange((e) => {
            game.dLightShadowHelper.visible = e;
        });

        const physics = gui.addFolder('Physics');
    
        physics.add(guiSettings, 'gravity').onChange((e) => {
            guiSettings.gravity = e;
            game.updateGravity();
        });
    
        physics.add(game.objects.velocity, 'min').onChange((e) => {
            game.objects.velocity.min = e;
            game.resetObjects();
        });
    
        physics.add(game.objects.velocity, 'max').onChange((e) => {
            game.objects.velocity.max = e;
            game.resetObjects();
        });
    }
}