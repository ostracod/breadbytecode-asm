
import {ArgPerm as ArgPermInterface} from "models/objects";
import {niceUtils} from "utils/niceUtils";
import {AssemblyError} from "objects/assemblyError";

var PERM_ACCESS = {
    directRead: 0,
    directWrite: 1,
    indirectRead: 2,
    indirectWrite: 3
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

var characterPairAccessMap = {
    dr: PERM_ACCESS.directRead,
    dw: PERM_ACCESS.directWrite,
    ir: PERM_ACCESS.indirectRead,
    iw: PERM_ACCESS.indirectWrite,
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

// Maps from enumeration value to character.
var accessCharacterPairMap = niceUtils.getReverseMap(characterPairAccessMap);
var recipientCharacterMap = niceUtils.getReverseMap(characterRecipientMap);
var attributeCharacterMap = niceUtils.getReverseMap(characterAttributeMap);

export interface ArgPerm extends ArgPermInterface {}

export class ArgPerm {
    constructor(name: string) {
        if (name.length < 3) {
            throw new AssemblyError("Invalid arg perm.");
        }
        var tempCharacterPair = name.substring(0, 2);
        if (!(tempCharacterPair in characterPairAccessMap)) {
            throw new AssemblyError("Invalid arg perm.");
        }
        this.access = characterPairAccessMap[tempCharacterPair];
        var tempCharacter = name.charAt(2);
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
        var index = 3;
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
    var output = accessCharacterPairMap[this.access] + recipientCharacterMap[this.recipient];
    var attribute;
    for (attribute in this.attributeMap) {
        if (this.attributeMap[attribute]) {
            output = output + attributeCharacterMap[attribute];
        }
    }
    return output;
}

ArgPerm.prototype.createBuffer = function(index: number): Buffer {
    let tempBitfield = (this.access << 6) | (this.recipient << 4);
    if (this.attributeMap[PERM_ATTRIBUTE.isRecursive]) {
        tempBitfield |= 0x04;
    }
    if (this.attributeMap[PERM_ATTRIBUTE.propagationCountIsInfinite]) {
        tempBitfield |= 0x02;
    }
    if (this.attributeMap[PERM_ATTRIBUTE.isTemporary]) {
        tempBitfield |= 0x01;
    }
    let output = Buffer.alloc(3);
    output.writeUInt16LE(index, 0);
    output.writeUInt8(tempBitfield, 2);
    return output;
}


