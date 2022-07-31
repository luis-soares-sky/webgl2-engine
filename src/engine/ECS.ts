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

    public getAll(componentClasses: Iterable<Function>): Component[] | null {
        const result: Component[] = [];
        for (const cls of componentClasses) {
            const inst = this.map.get(cls);
            if (!inst) return null;
            result.push(inst);
        }
        return result;
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

export class EntityQuery<T extends Component[]> {
    public constructor(
        public readonly types: Set<Function>,
        public readonly entities: Map<number, T> = new Map()
    ) { }

    public get results(): IterableIterator<T> {
        return this.entities.values();
    }
}

// Hack to map [typeof ComponentA, typeof ComponentB, ...] into [ComponentA, ComponentB, ...].
// https://stackoverflow.com/questions/51672504/how-to-map-a-tuple-to-another-tuple-type-in-typescript-3-0
// https://github.com/Microsoft/TypeScript/issues/25947
// https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
type ExtractInstanceType<T> = T extends new (...args: any) => infer R ? R : never;
type EntityQueryMap<T> = { [K in keyof T]: ExtractInstanceType<T[K]> };
export function getQuery<T extends typeof Component[]>(...types: T) {
    return new EntityQuery<EntityQueryMap<T>>(new Set(types));
}

export abstract class System {
    public world!: World;
    public readonly abstract query: EntityQuery<Component[]>;

    public abstract update(): void;
}

export class World {
    private entities = new Map<Entity, ComponentContainer>();
    private systems = new Set<System>();

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
        if (system.query.types.size == 0) {
            // Systems should not have an empty Components list, or they'll run on every Entity.
            console.warn(`System ${system} not added, components list is empty.`);
            return;
        }

        system.world = this;

        this.systems.add(system);
        for (const entity of this.entities.keys()) {
            this.checkEntitySystem(entity, system);
        }
    }

    public removeSystem(system: System): void {
        system.query.types.clear();
        system.query.entities.clear();
        this.systems.delete(system);
    }

    public update(): void {
        for (const system of this.systems) {
            system.update();
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

        for (const system of this.systems) {
            system.query.entities.delete(entity);
        }
    }

    private checkEntity(entity: Entity): void {
        for (let system of this.systems.keys()) {
            this.checkEntitySystem(entity, system);
        }
    }

    private checkEntitySystem(entity: Entity, system: System): void {
        let components = this.entities.get(entity)?.getAll(system.query.types);
        if (components == null) {
            system.query.entities.delete(entity);
        } else {
            system.query.entities.set(entity, components);
        }
    }
}
