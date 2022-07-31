import "./style.css";

import { World } from "./engine/ECS";
import Shader from "./engine/Shader";

import __SIMPLE_VS from "./game/rect.v.shader?raw";
import __SIMPLE_FS from "./game/rect.f.shader?raw";
import { createRectangle, RectangleMover, RectangleRenderer } from "./game/Rectangles";

window.onload = main;

function main() {
    const gl = document.querySelector<HTMLCanvasElement>("#game")!.getContext("webgl2");
    if (gl == null) throw new Error("Unable to initialize WebGL.");

    // Resize canvas now.
    gl.canvas.width = gl.canvas.clientWidth;
    gl.canvas.height = gl.canvas.clientHeight;

    // Create shader and add the "a_position" attribute to it.
    const rectShader = new Shader(gl, __SIMPLE_VS, __SIMPLE_FS);
    const rectShaderPositionLocation = gl.getAttribLocation(rectShader.program, "a_position");

    // Create world.
    const world = new World(gl);
    world.addSystem(new RectangleMover());
    world.addSystem(new RectangleRenderer(gl, rectShader));

    // Create entities and components.
    for (let i = 0; i < 50; i++) {
        const entity = world.addEntity();
        createRectangle(gl, rectShaderPositionLocation).forEach((component) => {
            world.addComponent(entity, component);
        });
    }

    // Now render stuff!
    requestAnimationFrame(loop);

    let last = 0;
    function loop(time: number) {
        time = time * 0.001;
        const delta = time - last;
        last = time;

        // Tick the world.
        world.tick(delta);

        // Now loop again.
        requestAnimationFrame(loop);
    }
}
