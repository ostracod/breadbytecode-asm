
import {
    Identifier as IdentifierInterface,
    MacroIdentifier as MacroIdentifierInterface,
    PublicFunctionIdentifier as PublicFunctionIdentifierInterface,
    IdentifierMap as IdentifierMapInterface,
    IndexDefinition, Expression
} from "models/objects";
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
}

Identifier.prototype.getDisplayString = function(): string {
    return this.name;
}

Identifier.prototype.getMapKey = function(): string {
    return this.name;
}

Identifier.prototype.getIsBuiltIn = function(): boolean {
    return (this.name in builtInIdentifierNameSet);
}

export interface MacroIdentifier extends MacroIdentifierInterface {}

export class MacroIdentifier extends Identifier {
    constructor(name: string, macroInvocationId: number) {
        super(name);
        this.macroInvocationId = macroInvocationId;
    }
}

MacroIdentifier.prototype.getDisplayString = function(): string {
    return "@{" + this.macroInvocationId + "}" + this.name;
}

MacroIdentifier.prototype.getMapKey = function(): string {
    return this.name + "@" + this.macroInvocationId;
}

MacroIdentifier.prototype.getIsBuiltIn = function(): boolean {
    return false;
}

export interface PublicFunctionIdentifier extends PublicFunctionIdentifierInterface {}

export class PublicFunctionIdentifier extends Identifier {
    constructor(name: string, interfaceIndexExpression: Expression) {
        super(name);
        this.interfaceIndexExpression = interfaceIndexExpression;
    }
}

PublicFunctionIdentifier.prototype.getDisplayString = function(): string {
    return ".{" + this.interfaceIndexExpression.getDisplayString() + "}" + this.name;
}

PublicFunctionIdentifier.prototype.getMapKey = function(): string {
    // TODO: Defer this expression evaluation to be as late as possible.
    return this.name + "." + this.interfaceIndexExpression.evaluateToNumber();
}

PublicFunctionIdentifier.prototype.getIsBuiltIn = function(): boolean {
    return false;
}

export interface IdentifierMap<T> extends IdentifierMapInterface<T> {}

export class IdentifierMap<T> {
    constructor() {
        this.map = {};
        // Ensures correct order for iteration.
        this.keyList = [];
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
    if (!(tempKey in this.map)) {
        this.keyList.push(tempKey);
    }
    this.map[tempKey] = value;
}

IdentifierMap.prototype.setIndexDefinition = function(indexDefinition: IndexDefinition): void {
    this.set(indexDefinition.identifier, indexDefinition);
}

IdentifierMap.prototype.iterate = function(handle: (value: any) => void): void {
    for (let key of this.keyList) {
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


