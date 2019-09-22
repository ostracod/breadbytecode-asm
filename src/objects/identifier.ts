
import {Identifier as IdentifierInterface, IdentifierMap as IdentifierMapInterface} from "models/objects";

export interface Identifier extends IdentifierInterface {}

export class Identifier {
    constructor(name: string, macroInvocationId: number) {
        // TODO: Make sure that name contains valid characters.
        this.name = name;
        this.macroInvocationId = macroInvocationId;
    }
}

Identifier.prototype.getDisplayString = function(): string {
    if (this.macroInvocationId === null) {
        return this.name;
    }
    return "@{" + this.macroInvocationId + "}" + this.name;
}

Identifier.prototype.getMapKey = function(): string {
    if (this.macroInvocationId === null) {
        return this.name;
    }
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

IdentifierMap.prototype.iterate = function(handle: (value: any) => void): void {
    var key;
    for (key in this.map) {
        handle(this.map[key]);
    }
}


