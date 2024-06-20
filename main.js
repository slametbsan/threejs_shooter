// Inisialisasi Three.js
import * as THREE from "three";
import { GLTFLoader } from "./three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "./three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "./three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "./three/examples/jsm/postprocessing/UnrealBloomPass.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.background = new THREE.Color(0x123456);
camera.position.y = 50;
camera.position.z = 250;

// menambahkan cahaya
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const light = new THREE.DirectionalLight(0xffffff, 0.8);
light.position.set(0, 100, 100);
light.castShadow = true;
scene.add(light);

// menambahkan plane yang luas
const planeGeometry = new THREE.PlaneGeometry(200, 400, 10, 10);
const planeMaterial = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load('prototype_512x512_blue1.png'),
});

const plane = new THREE.Mesh(planeGeometry, planeMaterial);
plane.rotation.x = -Math.PI / 2;
plane.position.y = -10;
plane.position.z = -80;
plane.receiveShadow = true;
scene.add(plane);

// Variabel game
let spaceship, coinModel;
let bullets = [];
let enemies = [];
let coins = [];
let particles = [];
let lives = 3;
let score = 0;

const spaceshipSpeed = 5;
const bulletSpeed = 50;
const enemySpeed = 30;
const coinSpeed = 50;

// Update tampilan skor dan nyawa
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');

function updateHUD() {
    scoreElement.textContent = `Score: ${score}`;
    livesElement.textContent = `Lives: ${lives}`;
}

// Fungsi untuk memuat model 3D
function loadModel(path, onLoad) {
    const loader = new GLTFLoader();
    loader.load(path, function (gltf) {
        onLoad(gltf.scene);
    });
}

// Memuat model kapal ruang angkasa (formatnya bisa GLTF atau GLB)
loadModel('models/pesawat1.gltf', function (model) {
    spaceship = model;
    spaceship.scale.set(0.05, 0.05, 0.05);
    spaceship.position.set(0, 0, 100);

    spaceship.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    scene.add(spaceship);
});

// Memuat model koin (formatnya bisa GLTF atau GLB)
loadModel('models/Coin_A.gltf', function (model) {
    coinModel = model;
    coinModel.scale.set(5, 5, 5);

    coinModel.traverse(function (child) {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
});

// Fungsi untuk menangani penekanan tombol
function handleKeyPress(event) {
    if (!spaceship) return;
    switch (event.key) {
        case "ArrowLeft":
            spaceship.position.x -= spaceshipSpeed;
            break;
        case "ArrowRight":
            spaceship.position.x += spaceshipSpeed;
            break;
        case " ":
            shoot();
            break;
    }

    // membatasi agar player tidak keluar arena
    if (spaceship.position.x <= -80) {
        spaceship.position.x = -80;
    }

    if (spaceship.position.x >= 80) {
        spaceship.position.x = 80;
    }
}
document.addEventListener("keydown", handleKeyPress);

// Fungsi untuk membuat peluru
function shoot() {
    if (!spaceship) return;
    const bulletGeometry = new THREE.SphereGeometry(1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(spaceship.position.x, spaceship.position.y, spaceship.position.z);
    bullets.push(bullet);
    scene.add(bullet);
}

// Fungsi untuk menambahkan musuh (formatnya bisa GLTF atau GLB)
function addEnemy() {
    loadModel('models/pesawat2.gltf', function (enemy) {
        enemy.scale.set(0.02, 0.02, 0.02);
        enemy.position.set((Math.random() - 0.5) * 100, 0, -100);

        enemy.traverse(function (child) {
            if (child.isObject3D) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        enemies.push(enemy);
        scene.add(enemy);
    });
}

// Fungsi untuk menambahkan koin
function addCoin() {
    if (!coinModel) return;
    const coin = coinModel.clone();
    coin.position.set((Math.random() - 0.5) * 100, 0, -100);
    coins.push(coin);
    scene.add(coin);
}

// Fungsi untuk menangani tabrakan
function checkCollisions() {
    // Tabrakan antara peluru dan musuh
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (bullet.position.distanceTo(enemy.position) < 5) {
                scene.remove(bullet);
                bullets.splice(bIndex, 1);
                scene.remove(enemy);
                enemies.splice(eIndex, 1);
                score += 10;
                updateHUD();

                // Membuat efek ledakan
                const explosion = createExplosion(scene, enemy.position);
                particles.push(...explosion);
            }
        });
    });

    // Tabrakan antara kapal dan musuh
    enemies.forEach((enemy, eIndex) => {
        if (spaceship && spaceship.position.distanceTo(enemy.position) < 10) {
            console.log(spaceship.position.distanceTo(enemy.position));
            scene.remove(enemy);
            enemies.splice(eIndex, 1);
            lives -= 1;
            updateHUD();
            if (lives <= 0) {
                alert('Game Over!');
                resetGame();
            }
        }
    });

    // Tabrakan antara kapal dan koin
    coins.forEach((coin, cIndex) => {
        if (spaceship && spaceship.position.distanceTo(coin.position) < 10) {
            scene.remove(coin);
            coins.splice(cIndex, 1);
            score += 5;
            updateHUD();
        }
    });
}

// Fungsi untuk mereset permainan
function resetGame() {
    lives = 3;
    score = 0;
    bullets.forEach(bullet => scene.remove(bullet));
    enemies.forEach(enemy => scene.remove(enemy));
    coins.forEach(coin => scene.remove(coin));
    particles.forEach(particle => scene.remove(particle));
    bullets = [];
    enemies = [];
    coins = [];
    particles = [];
    updateHUD();
}

// Fungsi untuk memperbarui game
function update(deltaTime) {
    bullets.forEach((bullet, index) => {
        bullet.position.z -= bulletSpeed * deltaTime;
        if (bullet.position.z < -100) {
            scene.remove(bullet);
            bullets.splice(index, 1);
        }
    });

    enemies.forEach((enemy, index) => {
        enemy.position.z += enemySpeed * deltaTime;
        if (enemy.position.z > 100) {
            scene.remove(enemy);
            enemies.splice(index, 1);
        }
    });

    coins.forEach((coin, index) => {
        coin.position.z += coinSpeed * deltaTime;
        coin.rotation.y += 0.05;
        if (coin.position.z > 100) {
            scene.remove(coin);
            coins.splice(index, 1);
        }
    });

    checkCollisions();
    updateExplosions(particles, deltaTime);
}

// post-processing
// langkah 10: menambahkan post-processing
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.9);
composer.addPass(bloomPass);

// Game loop
let lastTime = 0;
function animate(time) {
    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    update(deltaTime);
    // renderer.render(scene, camera);
    composer.render();
    requestAnimationFrame(animate);
}
animate();

// Menambahkan musuh dan koin secara berkala
setInterval(addEnemy, 2000);
setInterval(addCoin, 5000);

// Menyesuaikan ukuran canvas dengan layar
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

function createExplosion(scene, position) {
    const particles = [];
    const particleCount = 10;

    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.TetrahedronGeometry(2, 0);
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0xFFF455,
            shininess: 0,
            specular: 0xFFC700,
            shading: THREE.FlatShading
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(position);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 25
        );

        particle.userData = {
            velocity: velocity,
            lifetime: 0.5,
            age: 0
        };

        scene.add(particle);
        particles.push(particle);
    }

    return particles;
}

function updateExplosions(particles, deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        const { velocity, lifetime, age } = particle.userData;

        particle.position.addScaledVector(velocity, deltaTime);
        particle.userData.age += deltaTime;

        if (particle.userData.age > lifetime) {
            particle.parent.remove(particle);
            particles.splice(i, 1);
        }
    }
}