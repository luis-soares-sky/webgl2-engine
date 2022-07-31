import Engine from "./Engine";

// Inspired by https://maxwellforbes.com/posts/typescript-ecs-implementation/

export type Entity = number;

export abstract class Component { }

export type ComponentClass<T extends Component> = new (...args: any[]) => T;
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

export abstract class System {
    public world!: World;
    public readonly abstract componentsRequired: Set<Function>;

    public abstract update(entities: Set<Entity>): void;
}

export class World {
    private entities = new Map<Entity, ComponentContainer>();
    private systems = new Map<System, Set<Entity>>();

    private nextEntityID = 0;
    private entitiesToDestroy = new Array<Entity>();

    public constructor(public readonly engine: Engine) { }

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

    public update(): void {
        for (const [system, entities] of this.systems.entries()) {
            system.update(entities);
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
