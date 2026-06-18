const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
        }
    });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

const spotlightSections = [...document.querySelectorAll("main section")];

function updateSpotlight() {
    const viewportCenter = window.innerHeight * 0.5;
    let activeSection = spotlightSections[0];
    let activeDistance = Number.POSITIVE_INFINITY;

    spotlightSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const sectionCenter = rect.top + rect.height * 0.5;
        const distance = Math.abs(sectionCenter - viewportCenter);
        const range = Math.max(window.innerHeight * 0.78, rect.height * 0.45);
        const focus = Math.max(0.22, 1 - distance / range);

        section.style.setProperty("--focus", focus.toFixed(3));

        if (distance < activeDistance) {
            activeDistance = distance;
            activeSection = section;
        }
    });

    spotlightSections.forEach((section) => {
        section.classList.toggle("in-spotlight", section === activeSection);
        if (section === activeSection) {
            section.style.setProperty("--focus", "1");
        }
    });
}

window.addEventListener("scroll", updateSpotlight, { passive: true });
window.addEventListener("resize", updateSpotlight);
updateSpotlight();

if (window.THREE) {
    document.body.classList.add("three-ready");
    const canvas = document.querySelector("#scene");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    const pointer = { x: 0, y: 0 };

    camera.position.set(0, 0, 8);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const group = new THREE.Group();
    const orbitGroup = new THREE.Group();
    const auroraGroup = new THREE.Group();
    scene.add(group);
    scene.add(orbitGroup);
    scene.add(auroraGroup);

    const geometry = new THREE.IcosahedronGeometry(1.85, 2);
    const material = new THREE.MeshStandardMaterial({
        color: 0x4ff0c7,
        roughness: 0.36,
        metalness: 0.42,
        wireframe: true,
        transparent: true,
        opacity: 0.32
    });
    const core = new THREE.Mesh(geometry, material);
    group.add(core);

    const innerCoreGeo = new THREE.OctahedronGeometry(0.84, 3);
    const innerCoreMat = new THREE.MeshStandardMaterial({
        color: 0x7aa7ff,
        roughness: 0.22,
        metalness: 0.58,
        emissive: 0x7aa7ff,
        emissiveIntensity: 0.18
    });
    const innerCore = new THREE.Mesh(innerCoreGeo, innerCoreMat);
    group.add(innerCore);

    const rings = [];
    const ringCount = 4;
    const ringGeometry = new THREE.TorusGeometry(1.35, 0.08, 16, 96);

    for (let i = 0; i < ringCount; i++) {
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: i % 2 === 0 ? 0x4ff0c7 : 0xf5d76e,
            roughness: 0.28 + i * 0.08,
            metalness: 0.42 - i * 0.06,
            emissive: i % 2 === 0 ? 0x4ff0c7 : 0xf5d76e,
            emissiveIntensity: 0.08
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = (i / ringCount) * Math.PI * 0.8;
        ring.rotation.y = (i / ringCount) * Math.PI * 0.6;
        group.add(ring);
        rings.push(ring);
    }

    function createAuroraTexture(color1, color2) {
        const textureCanvas = document.createElement("canvas");
        textureCanvas.width = 256;
        textureCanvas.height = 256;
        const context = textureCanvas.getContext("2d");

        const gradient = context.createLinearGradient(0, 0, textureCanvas.width, 0);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.25, color1);
        gradient.addColorStop(0.5, color2);
        gradient.addColorStop(0.75, color1);
        gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.fillStyle = gradient;
        context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

        const verticalFade = context.createLinearGradient(0, 0, 0, textureCanvas.height);
        verticalFade.addColorStop(0, "rgba(0, 0, 0, 0)");
        verticalFade.addColorStop(0.5, "rgba(255, 255, 255, 0.9)");
        verticalFade.addColorStop(1, "rgba(0, 0, 0, 0)");
        context.globalCompositeOperation = "destination-in";
        context.fillStyle = verticalFade;
        context.fillRect(0, 0, textureCanvas.width, textureCanvas.height);

        const texture = new THREE.CanvasTexture(textureCanvas);
        texture.needsUpdate = true;
        return texture;
    }

    const auroraBands = [];
    const auroraPalettes = [
        ["rgba(79, 240, 199, 0.72)", "rgba(122, 167, 255, 0.42)"],
        ["rgba(122, 167, 255, 0.58)", "rgba(79, 240, 199, 0.34)"],
        ["rgba(245, 215, 110, 0.3)", "rgba(79, 240, 199, 0.46)"]
    ];

    auroraPalettes.forEach((palette, index) => {
        const bandGeometry = new THREE.PlaneGeometry(8.4, 1.15, 96, 10);
        const band = new THREE.Mesh(
            bandGeometry,
            new THREE.MeshBasicMaterial({
                map: createAuroraTexture(palette[0], palette[1]),
                transparent: true,
                opacity: 0.5 - index * 0.08,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                side: THREE.DoubleSide
            })
        );
        band.position.set(1.8, 0.7 - index * 0.52, -1.2 - index * 0.32);
        band.rotation.set(-0.72 + index * 0.18, -0.22 + index * 0.15, -0.18 + index * 0.12);
        band.userData = { phase: index * 1.7, lift: 0.25 + index * 0.12 };
        auroraGroup.add(band);
        auroraBands.push(band);
    });

    const orbitMaterial = new THREE.MeshStandardMaterial({
        color: 0xf7fbff,
        roughness: 0.28,
        metalness: 0.35,
        emissive: 0x082b33,
        emissiveIntensity: 0.5
    });
    const orbiters = [];
    const orbiterGeometries = [
        new THREE.TetrahedronGeometry(0.18, 0),
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.BoxGeometry(0.24, 0.24, 0.24)
    ];

    for (let i = 0; i < 10; i++) {
        const orbiter = new THREE.Mesh(orbiterGeometries[i % orbiterGeometries.length], orbitMaterial);
        const angle = (i / 10) * Math.PI * 2;
        orbiter.userData = {
            angle,
            speed: 0.28 + i * 0.025,
            radius: 3.1 + (i % 3) * 0.45,
            height: (i % 2 === 0 ? 1 : -1) * (0.45 + (i % 4) * 0.12)
        };
        orbitGroup.add(orbiter);
        orbiters.push(orbiter);
    }

    const particles = new THREE.BufferGeometry();
    const particleCount = 420;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 18;
        positions[i + 1] = (Math.random() - 0.5) * 12;
        positions[i + 2] = (Math.random() - 0.5) * 10;
    }
    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleSystem = new THREE.Points(
        particles,
        new THREE.PointsMaterial({ color: 0x9fffe6, size: 0.02, transparent: true, opacity: 0.62 })
    );
    scene.add(particleSystem);

    const wave = new THREE.Mesh(
        new THREE.TorusKnotGeometry(1.3, 0.018, 180, 12, 2, 5),
        new THREE.MeshBasicMaterial({ color: 0x7aa7ff, transparent: true, opacity: 0.42 })
    );
    group.add(wave);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const keyLight = new THREE.PointLight(0x4ff0c7, 2.4, 18);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);
    const warmLight = new THREE.PointLight(0xf5d76e, 1.5, 16);
    warmLight.position.set(-4, -2, 5);
    scene.add(warmLight);

    const creatorCanvas = document.querySelector("#creatorScene");
    const creatorPanel = document.querySelector("#creatorPanel");
    const creatorRenderer = new THREE.WebGLRenderer({ canvas: creatorCanvas, antialias: true, alpha: true });
    const creatorScene = new THREE.Scene();
    const creatorCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const creatorRoot = new THREE.Group();
    const armPivot = new THREE.Group();
    const buildObject = new THREE.Group();
    const sparks = [];

    creatorPanel.classList.add("creator-ready");
    creatorCamera.position.set(0, 1.3, 6.2);
    creatorCamera.lookAt(0, 0.8, 0);
    creatorScene.add(creatorRoot);
    creatorScene.add(new THREE.AmbientLight(0xffffff, 0.72));

    const creatorKey = new THREE.PointLight(0x4ff0c7, 3, 12);
    creatorKey.position.set(2.8, 4.2, 3.2);
    creatorScene.add(creatorKey);
    const creatorWarm = new THREE.PointLight(0xf5d76e, 2.2, 10);
    creatorWarm.position.set(-2.4, 1.8, 2.8);
    creatorScene.add(creatorWarm);

    const skin = new THREE.MeshStandardMaterial({ color: 0xf3c1a3, roughness: 0.48 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x4ff0c7, roughness: 0.44, metalness: 0.08 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x251025, roughness: 0.62 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xf5d76e, emissive: 0x4a3b08, emissiveIntensity: 0.32 });
    const glow = new THREE.MeshStandardMaterial({ color: 0x7aa7ff, emissive: 0x7aa7ff, emissiveIntensity: 0.8, transparent: true, opacity: 0.78 });
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x0b3436, roughness: 0.5, metalness: 0.12 });

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 24), skin);
    head.position.set(-0.55, 1.64, 0);
    creatorRoot.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), dark);
    hair.position.set(-0.55, 1.78, 0);
    hair.rotation.x = -0.35;
    creatorRoot.add(hair);

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.78, 8, 24), shirt);
    body.position.set(-0.55, 0.85, 0);
    creatorRoot.add(body);

    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.82, 6, 16), skin);
    leftArm.position.set(-0.98, 0.86, 0.04);
    leftArm.rotation.z = -0.45;
    creatorRoot.add(leftArm);

    armPivot.position.set(-0.24, 1.15, 0.04);
    const rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.92, 6, 16), skin);
    rightArm.position.set(0.38, -0.18, 0);
    rightArm.rotation.z = Math.PI / 2.8;
    const tool = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 14), amber);
    tool.position.set(0.86, -0.42, 0);
    tool.rotation.z = Math.PI / 2;
    armPivot.add(rightArm, tool);
    creatorRoot.add(armPivot);

    const legOne = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.78, 6, 16), dark);
    legOne.position.set(-0.72, 0.0, 0);
    legOne.rotation.z = 0.18;
    const legTwo = legOne.clone();
    legTwo.position.x = -0.38;
    legTwo.rotation.z = -0.16;
    creatorRoot.add(legOne, legTwo);

    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.25), deskMat);
    desk.position.set(0.25, 0.12, 0);
    creatorRoot.add(desk);

    const projectCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.44, 1), glow);
    buildObject.add(projectCore);
    const projectRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.012, 12, 96), amber);
    projectRing.rotation.x = Math.PI / 2;
    buildObject.add(projectRing);
    buildObject.position.set(0.88, 0.88, 0);
    creatorRoot.add(buildObject);

    for (let i = 0; i < 24; i++) {
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 10), amber);
        spark.userData = {
            angle: Math.random() * Math.PI * 2,
            radius: 0.38 + Math.random() * 0.56,
            speed: 0.8 + Math.random() * 1.6,
            height: -0.24 + Math.random() * 0.56
        };
        buildObject.add(spark);
        sparks.push(spark);
    }

    function resizeScene() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        group.position.x = window.innerWidth > 820 ? 2.65 : 1.2;
        group.position.y = window.innerWidth > 820 ? -0.2 : -0.7;
        orbitGroup.position.copy(group.position);
        auroraGroup.position.x = window.innerWidth > 820 ? 1.8 : 0.6;
        auroraGroup.position.y = window.innerWidth > 820 ? 0.2 : -0.2;

        const creatorSize = creatorCanvas.clientWidth;
        creatorCamera.aspect = 1;
        creatorCamera.updateProjectionMatrix();
        creatorRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        creatorRenderer.setSize(creatorSize, creatorSize, false);
    }

    function animate() {
        requestAnimationFrame(animate);
        const time = performance.now() * 0.001;
        const scrollProgress = Math.min(window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1), 1);
        group.rotation.x = time * 0.22 + pointer.y * 0.25 + scrollProgress * 0.7;
        group.rotation.y = time * 0.34 + pointer.x * 0.35 + scrollProgress * 1.2;
        group.rotation.z = Math.sin(time * 0.5) * 0.15;
        group.scale.setScalar(0.82 + Math.sin(time * 0.7) * 0.025);
        innerCore.rotation.x = -time * 0.44;
        innerCore.rotation.y = time * 0.58;
        innerCore.scale.setScalar(1 + Math.sin(time * 1.8) * 0.045);
        wave.rotation.x = time * 0.52;
        wave.rotation.y = -time * 0.38;
        wave.scale.setScalar(1.2 + Math.sin(time * 1.4) * 0.1);
        rings.forEach((ring, index) => {
            ring.rotation.x += 0.0025 + index * 0.001;
            ring.rotation.y -= 0.003 + index * 0.0012;
            ring.scale.setScalar(1 + Math.sin(time * 1.35 + index) * 0.025);
        });
        orbiters.forEach((orbiter, index) => {
            const data = orbiter.userData;
            const angle = data.angle + time * data.speed;
            orbiter.position.set(
                Math.cos(angle) * data.radius,
                Math.sin(angle * 1.7) * data.height,
                Math.sin(angle) * data.radius
            );
            orbiter.rotation.x = time * (0.8 + index * 0.05);
            orbiter.rotation.y = time * (0.55 + index * 0.04);
        });
        orbitGroup.rotation.y = -time * 0.12 + pointer.x * 0.18;
        orbitGroup.rotation.x = pointer.y * 0.12;
        auroraGroup.rotation.y = pointer.x * 0.08 + scrollProgress * 0.28;
        auroraGroup.rotation.x = pointer.y * 0.04;
        auroraBands.forEach((band, bandIndex) => {
            const positions = band.geometry.attributes.position;
            const phase = band.userData.phase;

            for (let i = 0; i < positions.count; i++) {
                const x = positions.getX(i);
                const y = positions.getY(i);
                const ripple = Math.sin(x * 1.45 + time * (0.9 + bandIndex * 0.15) + phase) * 0.16;
                const fineRipple = Math.cos(x * 3.2 + time * 1.4 + phase) * 0.045;
                positions.setZ(i, ripple + fineRipple + Math.sin(y * 5 + time + phase) * 0.02);
            }

            positions.needsUpdate = true;
            band.position.y = 0.7 - bandIndex * 0.52 + Math.sin(time * 0.55 + phase) * band.userData.lift;
            band.rotation.z = -0.18 + bandIndex * 0.12 + Math.sin(time * 0.36 + phase) * 0.08;
            band.material.opacity = 0.36 + Math.sin(time * 0.8 + phase) * 0.08;
        });
        particleSystem.material.size = 0.016 + Math.sin(time * 2) * 0.004;
        particleSystem.rotation.y = time * 0.045;
        particleSystem.rotation.x = Math.sin(time * 0.16) * 0.08;
        renderer.render(scene, camera);

        creatorRoot.rotation.y = Math.sin(time * 0.45) * 0.15 + pointer.x * 0.08;
        head.rotation.y = Math.sin(time * 1.1) * 0.12;
        armPivot.rotation.z = Math.sin(time * 4.4) * 0.32 - 0.22;
        tool.material.emissiveIntensity = 0.35 + Math.sin(time * 8) * 0.2;
        buildObject.rotation.y = time * 0.72;
        buildObject.rotation.x = Math.sin(time * 0.9) * 0.18;
        buildObject.scale.setScalar(1 + Math.sin(time * 2.2) * 0.045);
        projectRing.rotation.z = time * 1.9;
        sparks.forEach((spark, index) => {
            const data = spark.userData;
            const angle = data.angle + time * data.speed;
            spark.position.set(
                Math.cos(angle) * data.radius,
                data.height + Math.sin(time * 2.4 + index) * 0.08,
                Math.sin(angle) * data.radius
            );
            spark.scale.setScalar(0.75 + Math.sin(time * 5 + index) * 0.28);
        });
        creatorRenderer.render(creatorScene, creatorCamera);
    }

    window.addEventListener("resize", resizeScene);
    window.addEventListener("pointermove", (event) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = -(event.clientY / window.innerHeight - 0.5) * 2;
    });

    resizeScene();
    animate();
}
