import {AfterViewInit, Component, OnDestroy} from '@angular/core';
import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module'

@Component({
    selector: 'three-demo',
    templateUrl: './three-demo.component.html',
    styleUrls: ['./three-demo.component.sass']
})
export abstract class ThreeDemoComponent implements AfterViewInit, OnDestroy {
    perspectiveCamera: THREE.PerspectiveCamera;
    orthographicCamera: THREE.OrthographicCamera;
    useOrthographic = false;
    orthographicDiagonal: number = 1;
    scene: THREE.Scene;
    renderer: THREE.WebGLRenderer;

    stats: Stats;

    keysPressed = new Map<string, boolean>();
    private old: number;

    protected constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
        });
        this.renderer.shadowMap.enabled = true;
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', this.onWindowResize.bind(this));

        const aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera = new THREE.PerspectiveCamera(36, aspect, 0.25, 2000);
        this.perspectiveCamera.position.set(0, 0, 10);

        this.orthographicCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1);
        this.orthographicCamera.position.set(0, 0, 10);

        document.addEventListener('keydown', this.keydown.bind(this));
        document.addEventListener('keyup', this.keyup.bind(this));
        document.addEventListener('focusout', this.focusout.bind(this));
        document.addEventListener('visibilitychange', this.focusout.bind(this));

        this.stats = Stats();
        document.body.appendChild(this.stats.dom);
        this.old = Date.now();
    }

    ngOnDestroy(): void {
        document.body.removeChild(this.stats.dom);
        document.body.removeChild(this.renderer.domElement);
        this.renderer.dispose();
    }

    keydown(e: KeyboardEvent) {
        this.keysPressed.set(e.code, true);
    }

    keyup(e: KeyboardEvent) {
        this.keysPressed.set(e.code, false);
    }

    focusout() {
        this.keysPressed.clear();
    }

    printScreen() {
        const dataURL = this.renderer.domElement.toDataURL("image/png");
        window.open(dataURL);
    }

    abstract frame(dt: number): void;

    ngAfterViewInit(): void {
        document.body.appendChild(this.renderer.domElement);
        this.old = Date.now();
        this.animate();
    }

    animate() {
        this.stats.update();
        const now = Date.now();
        this.frame((now - this.old) / 1000);
        this.old = now;
        this.renderer.render(this.scene, this.camera);
        window.requestAnimationFrame(this.animate.bind(this));
    }

    get camera() {
        return this.useOrthographic ? this.orthographicCamera : this.perspectiveCamera;
    }

    updateOrthographicCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.orthographicCamera.left = -this.orthographicDiagonal * aspect;
        this.orthographicCamera.right = this.orthographicDiagonal * aspect;
        this.orthographicCamera.top = this.orthographicDiagonal;
        this.orthographicCamera.bottom = -this.orthographicDiagonal;
        this.orthographicCamera.updateProjectionMatrix();
    }

    onWindowResize() {
        this.perspectiveCamera.aspect = window.innerWidth / window.innerHeight;
        this.perspectiveCamera.updateProjectionMatrix();
        this.updateOrthographicCamera()
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
