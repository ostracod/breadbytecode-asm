
import {
    Identifier as IdentifierInterface,
    MacroIdentifier as MacroIdentifierInterface,
    IdentifierMap as IdentifierMapInterface,
    IndexDefinition, Expression
} from "models/objects";
import {AssemblyError} from "objects/assemblyError";
import {nameInstructionRefMap} from "objects/instruction";
import {builtInConstantSet} from "objects/constant";

const builtInIdentifierNameSet = {};
for (let name in nameInstructionRefMap) {
    builtInIdentifierNameSet[name] = true;
}
for (let name in builtInConstantSet) {
    builtInIdentifierNameSet[name] = true;
}

export interface Identifier extends IdentifierInterface {}

export class Identifier {
    
    constructor(name: string) {
        // TODO: Make sure that name contains valid characters.
        this.name = name;
    }
    
    getDisplayString(): string {
        return this.name;
    }
    
    getMapKey(): string {
        return this.name;
    }
    
    getIsBuiltIn(): boolean {
        return (this.name in builtInIdentifierNameSet);
    }
    
    equals(identifier: Identifier): boolean {
        return (this.getMapKey() === identifier.getMapKey());
    }
}

export interface MacroIdentifier extends MacroIdentifierInterface {}

export class MacroIdentifier extends Identifier {
    constructor(name: string, macroInvocationId: number) {
        super(name);
        this.macroInvocationId = macroInvocationId;
    }
    
    getDisplayString(): string {
        return "@{" + this.macroInvocationId + "}" + this.name;
    }
    
    getMapKey(): string {
        return this.name + "@" + this.macroInvocationId;
    }
    
    getIsBuiltIn(): boolean {
        return false;
    }
}

export interface IdentifierMap<T> extends IdentifierMapInterface<T> {}

export class IdentifierMap<T> {
    
    constructor() {
        this.map = {};
        // Ensures correct order for iteration.
        this.keyList = [];
    }
    
    get(identifier: Identifier): any {
        let tempKey = identifier.getMapKey();
        if (tempKey in this.map) {
            return this.map[tempKey];
        } else {
            return null;
        }
    }
    
    set(identifier: Identifier, value: any): void {
        let tempKey = identifier.getMapKey();
        if (tempKey in this.map) {
            throw new AssemblyError("Duplicate identifier.");
        }
        this.keyList.push(tempKey);
        this.map[tempKey] = value;
    }
    
    setIndexDefinition(indexDefinition: IndexDefinition): void {
        this.set(indexDefinition.identifier, indexDefinition);
    }
    
    iterate(handle: (value: any) => void): void {
        for (let key of this.keyList) {
            handle(this.map[key]);
        }
    }
    
    getValueList(): any[] {
        let output = [];
        this.iterate(value => {
            output.push(value);
        });
        return output;
    }
    
    getSize(): number {
        return this.keyList.length;
    }
}


