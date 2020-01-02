
import {
    Identifier as IdentifierInterface,
    MacroIdentifier as MacroIdentifierInterface,
    IdentifierMap as IdentifierMapInterface,
    VariableDefinition
} from "models/objects";

export interface Identifier extends IdentifierInterface {}

export class Identifier {
    constructor(name: string) {
        // TODO: Make sure that name contains valid characters.
        this.name = name;
    }
}

Identifier.prototype.getDisplayString = function(): string {
    return this.name;
}

Identifier.prototype.getMapKey = function(): string {
    return this.name;
}

export interface MacroIdentifier extends MacroIdentifierInterface {}

export class MacroIdentifier extends Identifier {
    constructor(name: string, macroInvocationId: number) {
        super(name)
        this.macroInvocationId = macroInvocationId;
    }
}

MacroIdentifier.prototype.getDisplayString = function(): string {
    return "@{" + this.macroInvocationId + "}" + this.name;
}

MacroIdentifier.prototype.getMapKey = function(): string {
    return this.name + " " + this.macroInvocationId;
}

export interface IdentifierMap<T> extends IdentifierMapInterface<T> {}

export class IdentifierMap<T> {
    constructor() {
        this.map = {};
    }
}

IdentifierMap.prototype.get = function(identifier: Identifier): any {
    var tempKey = identifier.getMapKey();
    if (tempKey in this.map) {
        return this.map[tempKey];
    } else {
        return null;
    }
}

IdentifierMap.prototype.set = function(identifier: Identifier, value: any): void {
    var tempKey = identifier.getMapKey();
    this.map[tempKey] = value;
}

IdentifierMap.prototype.setVariableDefinition = function(variableDefinition: VariableDefinition): void {
    this.set(variableDefinition.identifier, variableDefinition);
}

IdentifierMap.prototype.iterate = function(handle: (value: any) => void): void {
    var key;
    for (key in this.map) {
        handle(this.map[key]);
    }
}

IdentifierMap.prototype.getValueList = function(): any[] {
    let output = [];
    this.iterate(value => {
        output.push(value);
    });
    return output;
}


