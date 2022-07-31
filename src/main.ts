import "./style.css";

import { World } from "./engine/ECS";
import Engine from "./engine/Engine";
import setup from "./game/Rectangles";

window.onload = main;

function main() {
    const gl = document.querySelector<HTMLCanvasElement>("#game")!.getContext("webgl2");
    if (gl == null) throw new Error("Unable to initialize WebGL.");

    // Create engine and world.
    const engine = new Engine(gl);
    const world = new World(engine);

    // Set the game up.
    setup(engine, world);

    // Define our main loop.
    function loop(time: number) {
        engine.update(time);
        world.update();
        requestAnimationFrame(loop);
    }

    // And start!
    requestAnimationFrame(loop);
}
