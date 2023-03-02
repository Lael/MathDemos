import {AfterViewInit, Component} from '@angular/core';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module'

@Component({
    selector: 'three-demo',
    templateUrl: './three-demo.component.html',
    styleUrls: ['./three-demo.component.sass']
})
export abstract class ThreeDemoComponent implements AfterViewInit {
    camera: THREE.PerspectiveCamera;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;

    stats: Stats;

    keysPressed = new Map<string, boolean>();

    protected constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', this.onWindowResize.bind(this));

        this.camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.25, 1000);
        this.camera.position.set(0, 0, 10);

        document.addEventListener('keydown', this.keydown.bind(this));
        document.addEventListener('keyup', this.keyup.bind(this));

        this.stats = Stats();
        document.body.appendChild(this.stats.dom)
    }

    private keydown(e: KeyboardEvent) {
        this.keysPressed.set(e.code, true);
    }

    private keyup(e: KeyboardEvent) {
        this.keysPressed.set(e.code, false);
    }

    abstract frame(): void;

    ngAfterViewInit(): void {
        document.body.appendChild(this.renderer.domElement);
        this.animate();
    }

    animate() {
        this.stats.update();
        this.frame();
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(this.animate.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
