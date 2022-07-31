// Inspired by https://maxwellforbes.com/posts/typescript-ecs-implementation/

/**
 * An Entity is just an ID.
 * This is used to look up its associated Components.
 */
export type Entity = number;

/**
 * A Component is a bundle of state. Each instance of a Component is associated with a single Entity.
 * Components should have no API to fulfill.
 */
export abstract class Component { }

/**
 * This type is so functions like the ComponentContainer's `get()` will automatically tell TypeScript the type of the Component
 * returned. In other words, we can say `get(Translation)` and TypeScript will know to return an instance of `Translation`.
 */
export type ComponentClass<T extends Component> = new (...args: any[]) => T;

/**
 * This custom container is so that calling code can provide the Component instance when adding (e.g.,
 * `add(new Translation(...)`)), and provide the Component *class* otherwise (e.g., `get(Translation)`, `has(Translation)`,
 * `delete(Translation)`).
 *
 * We also use two different types to refer to the Component's class: * `Function` and `ComponentClass<T>`. We use `Function` in
 * most cases because it is simpler to write. We use `ComponentClass<T>` in the `get()` method, when we want TypeScript to know
 * the type of the instance that is returned. Just think of these both as referring to the same thing: the underlying class of the
 * Component.
 *
 * You might notice a footgun here: code that gets this object can
 * directly modify the Components inside (with add(...) and delete(...)).
 * This would screw up our ECS bookkeeping of mapping Systems to
 * Entities! We'll fix this later by only returning callers a view onto
 * the Components that can't change them.
 */
export class ComponentContainer {
    private map = new Map<Function, Component>();

    public add(component: Component): void {
        this.map.set(component.constructor, component);
    }

    public get<T extends Component>(componentClass: ComponentClass<T>): T {
        return this.map.get(componentClass) as T;
    }

    public has(componentClass: Function): boolean {
        return this.map.has(componentClass);
    }

    public hasAll(componentClasses: Iterable<Function>): boolean {
        for (const cls of componentClasses) {
            if (!this.map.has(cls)) return false;
        }
        return true;
    }

    public remove(componentClass: Function): boolean {
        return this.map.delete(componentClass);
    }
}

/**
 * A System cares about a set of Components. It will run on every Entity that corresponds to a set of Components.
 *
 * A System must specify two things:
 *
 * 1. The immutable set of Components it needs at compile time (its immutability is not enforced.) We use the type `Function`
 *    to refer to a Component's class; i.e. `Translation` (class) rather than `new Translation()` (instance).
 * 2. An `update()` method for what to do every frame (if anything).
 */
export abstract class System {
    /**
     * Set of Component classes, all of which are required before the system is run on an entity.
     */
    public readonly abstract componentsRequired: Set<Function>;

    /**
     * `update()` is called on the System every frame.
     */
    public abstract update(delta: number, entities: Set<Entity>): void;

    /**
     * The World instance is given to all Systems. Systems contain most of the game code, so they need to be able to create,
     * mutate, and destroy Entities and Components.
     */
    public world!: World;
}

/**
 * The World is the main ECS driver; it's the backbone of the engine that coordinates Entities, Components and Systems. You could
 * Have a single one for your game, or make a different one for every level, or have multiple for different purposes.
 */
export class World {
    // Main state
    private entities = new Map<Entity, ComponentContainer>();
    private systems = new Map<System, Set<Entity>>();

    // Bookkeeping for entities
    private nextEntityID = 0;
    private entitiesToDestroy = new Array<Entity>();

    public constructor(public readonly gl: WebGL2RenderingContext) { }

    // =============
    // API: ENTITIES
    // =============

    public addEntity(): Entity {
        const entity = this.nextEntityID++;
        this.entities.set(entity, new ComponentContainer());
        return entity;
    }

    public removeEntity(entity: Entity): void {
        this.entitiesToDestroy.push(entity);
    }

    // ===============
    // API: COMPONENTS
    // ===============

    public addComponent(entity: Entity, component: Component): void {
        this.entities.get(entity)?.add(component);
        this.checkEntity(entity);
    }

    public getComponents(entity: Entity): ComponentContainer | undefined {
        return this.entities.get(entity);
    }

    public removeComponent(entity: Entity, componentClass: Function): boolean {
        const removed = this.entities.get(entity)?.remove(componentClass) || false;
        this.checkEntity(entity);
        return removed;
    }

    // ============
    // API: SYSTEMS
    // ============

    public addSystem(system: System): void {
        if (system.componentsRequired.size == 0) {
            // Systems should not have an empty Components list, or they'll run on every Entity.
            console.warn(`System ${system} not added, components list is empty.`);
            return;
        }

        system.world = this;

        this.systems.set(system, new Set());
        for (const entity of this.entities.keys()) {
            this.checkEntitySystem(entity, system);
        }
    }

    public removeSystem(system: System): void {
        this.systems.delete(system);
    }

    public tick(delta: number): void {
        for (const [system, entities] of this.systems.entries()) {
            system.update(delta, entities);
        }

        while (this.entitiesToDestroy.length > 0) {
            this.destroyEntity(this.entitiesToDestroy.pop()!);
        }
    }

    // ================
    // INTERNAL METHODS
    // ================

    private destroyEntity(entity: Entity): void {
        this.entities.delete(entity);
        for (let entities of this.systems.values()) {
            entities.delete(entity);
        }
    }

    private checkEntity(entity: Entity): void {
        for (let system of this.systems.keys()) {
            this.checkEntitySystem(entity, system);
        }
    }

    private checkEntitySystem(entity: Entity, system: System): void {
        let have = this.entities.get(entity);
        let need = system.componentsRequired;

        if (have?.hasAll(need)) {
            this.systems.get(system)?.add(entity);
        } else {
            this.systems.get(system)?.delete(entity);
        }
    }
}
