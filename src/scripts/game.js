import * as BABYLON from '@babylonjs/core/Legacy/legacy';
import * as GUI from '@babylonjs/gui/2D';
import HavokPhysics from "./physics/HavokPhysics_es";


export default function Game(color) {
    let playerColor = (color === "red") ? "#ff0000" : ((color === "blue") ? "#0000ff" : ((color === "green") ? "#00ff00" : "#000000"));
    let isGameStarted = false;
    let isGameOver = false;
    let score = 0;
    let isAddedIntoDatabase = false;
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);

    const createScene = async function () {
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color3(0.52, 0.80, 0.92);
        scene.shadowsEnabled = true;
        // scene.debugLayer.show({
        //     overlay: true,
        // });

        // camera setup
        const camera = new BABYLON.ArcRotateCamera('camera', 0, 0, 0, new BABYLON.Vector3(0, 0, 0), scene);
        camera.setPosition(new BABYLON.Vector3(25, 2.8, 0));
        // camera.attachControl(canvas, true);

        // light setup
        const light = new BABYLON.DirectionalLight("dir01", new BABYLON.Vector3(-1, -2, -1), scene);
        light.position = new BABYLON.Vector3(20, 40, 20);

        const hemiLight = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
        hemiLight.intensity = 0.7;

        const ambientLight = new BABYLON.HemisphericLight('ambientLight', new BABYLON.Vector3(0, -1, 0), scene);
        ambientLight.intensity = 0.3;

        //shadow setup
        const shadowGenerator = new BABYLON.ShadowGenerator(1024, light);
        shadowGenerator.useBlurExponentialShadowMap = true;
        shadowGenerator.useKernelBlur = true;
        shadowGenerator.blurKernel = 64;

        // HavokPhysics setup
        const havokInstance = await HavokPhysics();
        const hk = new BABYLON.HavokPlugin(true, havokInstance);
        scene.enablePhysics(new BABYLON.Vector3(0, -9.8, 0), hk);

        // Create the ground or track for the player to run on
        const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 60, height: 2, subdivisions: 2 }, scene);
        ground.position = new BABYLON.Vector3(0, 0, 0);
        ground.material = new BABYLON.StandardMaterial('groundMat', scene);
        ground.material.diffuseColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        ground.receiveShadows = true;

        ground.aggregate = new BABYLON.PhysicsAggregate(ground, BABYLON.PhysicsShapeType.BOX, {
            mass: 0
        }, scene);
        ground.physicsBody = ground.aggregate.body;

        // Function to create a single dashed line segment
        function createDashedLineSegment(positionX) {
            const dashedLine = BABYLON.MeshBuilder.CreateBox('dashedLine', { width: 0.5, depth: 0.01, height: 0.01 }, scene);
            dashedLine.position = new BABYLON.Vector3(positionX + 0.25, 0, 0); // Adjust the position as needed
            dashedLine.material = new BABYLON.StandardMaterial('dashedLineMat', scene);
            dashedLine.material.diffuseColor = new BABYLON.Color3(1, 1, 1); // Color of the dashed line
            return dashedLine;
        }

        // Create an array to store the dashed lines
        const dashedLines = [];
        const numDashedLines = 60; // Adjust the number of dashed lines as needed
        const gapBetweenLines = 1.0; // Adjust the gap between dashed lines as needed
        const initialXPosition = -30; // Adjust the initial X position as needed
        const speed = 0.04; // You can adjust this value as needed

        // Create and position the dashed lines
        for (let i = 0; i < numDashedLines; i++) {
            const dashedLine = createDashedLineSegment(initialXPosition + i * gapBetweenLines);
            dashedLines.push(dashedLine);
        }

        const player = BABYLON.MeshBuilder.CreateBox('player', { width: 0.4, depth: 0.4, height: 0.6 }, scene);
        player.position = new BABYLON.Vector3(23, 2, 0)
        player.material = new BABYLON.StandardMaterial('playerMat', scene);
        player.material.diffuseColor = BABYLON.Color3.FromHexString(playerColor); // Color of the player (blue in this example)
        player.isJumping = false;
        player.receiveShadows = true;
        shadowGenerator.addShadowCaster(player);

        player.aggregate = new BABYLON.PhysicsAggregate(player, BABYLON.PhysicsShapeType.BOX, {
            mass: 1
        }, scene);
        player.physicsBody = player.aggregate.body;

        camera.target = player;

        // Function to create a single hurdle
        function createHurdle(positionX, positionZ) {
            const hurdle = BABYLON.MeshBuilder.CreateBox('hurdle', { width: 0.2, depth: 0.6, height: 0.4 }, scene);
            hurdle.position = new BABYLON.Vector3(positionX, 0.2, positionZ); // Adjust the height and position as needed
            hurdle.material = new BABYLON.StandardMaterial('hurdleMat', scene);
            hurdle.material.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0); // Color of the hurdle (red in this example)
            hurdle.isMarked = false;
            hurdle.receiveShadows = true;
            shadowGenerator.addShadowCaster(hurdle);
            hurdles.push(hurdle);

            if (Math.random() > 0.75) {
                const hurdle2 = BABYLON.MeshBuilder.CreateBox('hurdle', { width: 0.2, depth: 0.6, height: 0.4 }, scene);
                hurdle2.position = new BABYLON.Vector3(positionX, 0.2, positionZ * -1); // Adjust the height and position as needed
                hurdle2.material = new BABYLON.StandardMaterial('hurdleMat', scene);
                hurdle2.material.diffuseColor = new BABYLON.Color3(0.6, 0.2, 0); // Color of the hurdle (red in this example)
                hurdle2.isMarked = false;
                hurdle2.receiveShadows = true;
                shadowGenerator.addShadowCaster(hurdle2);
                hurdles.push(hurdle2);
            }
        }

        // Create an array to store the hurdles
        const hurdles = [];
        const numHurdles = 12; // Adjust the number of hurdles as needed

        // Create and position the hurdles with random heights and initial positions
        for (let i = 0; i < numHurdles; i++) {
            const positionZ = Math.random() > 0.5 ? 0.5 : -0.5;
            createHurdle(initialXPosition + 0.1 + i * 5, positionZ);
        }

        //add text to the scene
        const advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        const text1 = new GUI.TextBlock();
        text1.text = "Press Enter to Start";
        text1.color = "white";
        text1.fontSize = 24;
        text1.fontFamily = "Arial";
        advancedTexture.addControl(text1);
        const scoreText = new GUI.TextBlock();
        scoreText.text = "";
        scoreText.color = "white";
        scoreText.fontSize = 24;
        scoreText.fontWeight = "bold";
        scoreText.fontFamily = "Arial";
        scoreText.top = "-270px";
        scoreText.left = "20px";
        scoreText.textHorizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
        advancedTexture.addControl(scoreText);

        // controls setup
        const inputMap = {};
        scene.actionManager = new BABYLON.ActionManager(scene);
        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyDownTrigger, function (evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));

        scene.actionManager.registerAction(new BABYLON.ExecuteCodeAction(BABYLON.ActionManager.OnKeyUpTrigger, function (evt) {
            inputMap[evt.sourceEvent.key] = evt.sourceEvent.type == "keydown";
        }));


        scene.onBeforeRenderObservable.add(() => {
            if (!isGameStarted && inputMap["Enter"]) {
                isGameStarted = true;
                text1.text = "";
                scoreText.text = "Score: " + score;
            }

            if (isGameStarted && !isGameOver) {
                // Move the dashed lines
                for (const dashedLine of dashedLines) {
                    dashedLine.position.x += speed;

                    // Reset the position of the dashed line when it goes offscreen
                    if (dashedLine.position.x > 30) {
                        dashedLine.position.x = initialXPosition - gapBetweenLines; // Reset position offscreen
                    }
                }

                // Move the hurdles
                for (const hurdle of hurdles) {
                    hurdle.position.x += speed;

                    if (hurdle.position.x > 25 && !hurdle.isMarked) {
                        score++;
                        scoreText.text = "Score: " + score;
                        hurdle.isMarked = true;
                    }

                    // Reset the position of the hurdle when it goes offscreen
                    if (hurdle.position.x > 30) {
                        hurdle.position.x = initialXPosition - 5; // Reset position offscreen
                        hurdle.position.z = Math.random() > 0.5 ? 0.5 : -0.5; // Randomly choose height (z-coordinate)
                        hurdle.isMarked = false;
                    }

                    // Check for collisions
                    if (player.intersectsMesh(hurdle, false)) {
                        isGameOver = true;
                        text1.text = "Game Over!";

                        if (!isAddedIntoDatabase) {
                            isAddedIntoDatabase = true;

                            // Add score to GameFuse database
                            let lastScore = GameFuseUser.CurrentUser.getAttributeValue("Score");
                            lastScore = Number(lastScore)
                            if (lastScore < score) {
                                GameFuseUser.CurrentUser.setAttribute("Score", `${score}`, function (message, hasError) {
                                    if (hasError) {
                                        console.log("Error setting attribute: " + message);
                                    }
                                    else {
                                        console.log("Attribute set successfully");
                                    }
                                });

                                if (score > 100) {
                                    GameFuseUser.CurrentUser.setAttribute("IsPassed100Points", "true", function (message, hasError) {
                                        if (hasError) {
                                            console.log("Error setting attribute: " + message);
                                        }
                                        else {
                                            console.log("Attribute set successfully");
                                        }
                                    });
                                }
                                if (score > 200) {
                                    GameFuseUser.CurrentUser.setAttribute("IsPassed200Points", "true", function (message, hasError) {
                                        if (hasError) {
                                            console.log("Error setting attribute: " + message);
                                        }
                                        else {
                                            console.log("Attribute set successfully");
                                        }
                                    });
                                }
                            }

                            GameFuseUser.CurrentUser.addLeaderboardEntry("GameLeaderboard", Number(score), [], function (message, hasError) {
                                if (hasError) {
                                    console.log("Error adding leaderboard entry: " + message);
                                }
                                else {
                                    console.log("Leaderboard entry added successfully");

                                    let menu = document.getElementById('menu');
                                    menu.style.display = 'flex';
                                    let mainMenu = document.getElementById('mainMenu');
                                    mainMenu.style.display = 'flex';

                                    // remove the game
                                    scene.dispose();

                                    let renderCanvas = document.getElementById('renderCanvas');
                                    renderCanvas.remove();
                                    // add new
                                    let newCanvas = document.createElement('canvas');
                                    newCanvas.id = 'renderCanvas';
                                    document.body.appendChild(newCanvas);
                                }
                            });
                        }
                    }
                }

                // space for jump
                if (inputMap[" "]) {
                    if (!player.isJumping) {
                        player.physicsBody.setLinearVelocity(new BABYLON.Vector3(0, 4.2, 0));
                        player.isJumping = true;
                    }
                }
                // a, arrow left for left
                if (inputMap["a"] || inputMap["ArrowLeft"]) {
                    if (!player.isJumping && player.position.z > -0.4) {
                        player.physicsBody.setLinearVelocity(new BABYLON.Vector3(0, 0, -1));
                    }
                }
                // d, arrow right for right
                if (inputMap["d"] || inputMap["ArrowRight"]) {
                    if (!player.isJumping && player.position.z < 0.4) {
                        player.physicsBody.setLinearVelocity(new BABYLON.Vector3(0, 0, 1));
                    }
                }


                // check if player is on the ground
                if (player.physicsBody.getLinearVelocity().y === 0) {
                    player.isJumping = false;
                }
            }
        });



        return scene;
    }

    createScene().then((scene) => {
        engine.runRenderLoop(function () {
            if (scene) {
                scene.render();
            }
        });
    });

    window.addEventListener('resize', function () {
        engine.resize();
    });
}