
import {ArgPerm as ArgPermInterface} from "models/objects";
import {AssemblyError} from "objects/assemblyError";

var PERM_ACCESS = {
    read: 0,
    write: 1,
    sentryType: 2
};

var PERM_RECIPIENT = {
    arbiter: 0,
    implementer: 1,
    caller: 2
};

var PERM_ATTRIBUTE = {
    isRecursive: 0,
    propagationCountIsInfinite: 1,
    isTemporary: 2
};

var characterAccessMap = {
    r: PERM_ACCESS.read,
    w: PERM_ACCESS.write,
    s: PERM_ACCESS.sentryType
}

var characterRecipientMap = {
    a: PERM_RECIPIENT.arbiter,
    i: PERM_RECIPIENT.implementer,
    c: PERM_RECIPIENT.caller
}

var characterAttributeMap = {
    r: PERM_ATTRIBUTE.isRecursive,
    p: PERM_ATTRIBUTE.propagationCountIsInfinite,
    t: PERM_ATTRIBUTE.isTemporary
}

// TODO: Consider moving this to NiceUtils.
function getReverseMap(map) {
    var output = {};
    var key;
    for (key in map) {
        var tempValue = map[key];
        output[tempValue] = key;
    }
    return output;
}

// Maps from enumeration value to character.
var accessCharacterMap = getReverseMap(characterAccessMap);
var recipientCharacterMap = getReverseMap(characterRecipientMap);
var attributeCharacterMap = getReverseMap(characterAttributeMap);

export interface ArgPerm extends ArgPermInterface {}

export class ArgPerm {
    constructor(name: string) {
        if (name.length < 2) {
            throw new AssemblyError("Invalid arg perm.");
        }
        var tempCharacter = name.charAt(0);
        if (!(tempCharacter in characterAccessMap)) {
            throw new AssemblyError("Invalid arg perm.");
        }
        this.access = characterAccessMap[tempCharacter];
        var tempCharacter = name.charAt(1);
        if (!(tempCharacter in characterRecipientMap)) {
            throw new AssemblyError("Invalid arg perm.");
        }
        this.recipient = characterRecipientMap[tempCharacter];
        // Map from attribute enumeration value to boolean.
        this.attributeMap = {};
        var attributeName;
        for (attributeName in PERM_ATTRIBUTE) {
            var tempAttribute = PERM_ATTRIBUTE[attributeName];
            this.attributeMap[tempAttribute] = false;
        }
        var index = 2;
        while (index < name.length) {
            var tempCharacter = name.charAt(index);
            if (tempCharacter in characterAttributeMap) {
                var tempAttribute = characterAttributeMap[tempCharacter];
                this.attributeMap[tempAttribute] = true;
            } else {
                throw new AssemblyError("Invalid arg perm.");
            }
            index += 1;
        }
    }
}

ArgPerm.prototype.getDisplayString = function(): string {
    var output = accessCharacterMap[this.access] + recipientCharacterMap[this.recipient];
    var attribute;
    for (attribute in this.attributeMap) {
        if (this.attributeMap[attribute]) {
            output = output + attributeCharacterMap[attribute];
        }
    }
    return output;
}


