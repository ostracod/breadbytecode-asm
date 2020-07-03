
import {ArgPerm as ArgPermInterface} from "models/objects";
import {niceUtils} from "utils/niceUtils";
import {AssemblyError} from "objects/assemblyError";

const PERM_ACCESS = {
    directRead: 0,
    directWrite: 1,
    indirectRead: 2,
    indirectWrite: 3
};

const PERM_RECIPIENT = {
    arbiter: 0,
    implementer: 1,
    caller: 2
};

const PERM_ATTRIBUTE = {
    isRecursive: 4,
    propagationCountIsInfinite: 2,
    isTemporary: 1
};

const characterPairAccessMap = {
    dr: PERM_ACCESS.directRead,
    dw: PERM_ACCESS.directWrite,
    ir: PERM_ACCESS.indirectRead,
    iw: PERM_ACCESS.indirectWrite,
}

const characterRecipientMap = {
    a: PERM_RECIPIENT.arbiter,
    i: PERM_RECIPIENT.implementer,
    c: PERM_RECIPIENT.caller
}

const characterAttributeMap = {
    r: PERM_ATTRIBUTE.isRecursive,
    p: PERM_ATTRIBUTE.propagationCountIsInfinite,
    t: PERM_ATTRIBUTE.isTemporary
}

// Maps from enumeration value to character.
const accessCharacterPairMap = niceUtils.getReverseMap(characterPairAccessMap);
const recipientCharacterMap = niceUtils.getReverseMap(characterRecipientMap);
const attributeCharacterMap = niceUtils.getReverseMap(characterAttributeMap);

export interface ArgPerm extends ArgPermInterface {}

export class ArgPerm {
    
    constructor(name: string) {
        if (name.length < 3) {
            throw new AssemblyError("Invalid arg perm.");
        }
        let tempCharacterPair = name.substring(0, 2);
        if (!(tempCharacterPair in characterPairAccessMap)) {
            throw new AssemblyError("Invalid arg perm.");
        }
        this.access = characterPairAccessMap[tempCharacterPair];
        let tempCharacter = name.charAt(2);
        if (!(tempCharacter in characterRecipientMap)) {
            throw new AssemblyError("Invalid arg perm.");
        }
        this.recipient = characterRecipientMap[tempCharacter];
        // Map from attribute enumeration value to boolean.
        this.hasAttributeMap = {};
        let attributeName;
        for (attributeName in PERM_ATTRIBUTE) {
            let tempAttribute = PERM_ATTRIBUTE[attributeName];
            this.hasAttributeMap[tempAttribute] = false;
        }
        for (let index = 3; index < name.length; index++) {
            let tempCharacter = name.charAt(index);
            if (tempCharacter in characterAttributeMap) {
                let tempAttribute = characterAttributeMap[tempCharacter];
                this.hasAttributeMap[tempAttribute] = true;
            } else {
                throw new AssemblyError("Invalid arg perm.");
            }
        }
    }
    
    getDisplayString(): string {
        let output = accessCharacterPairMap[this.access] + recipientCharacterMap[this.recipient];
        for (let attribute in this.hasAttributeMap) {
            if (this.hasAttributeMap[attribute]) {
                output = output + attributeCharacterMap[attribute];
            }
        }
        return output;
    }
    
    createBuffer(index: number): Buffer {
        let tempBitfield = (this.access << 6) | (this.recipient << 4);
        for (let attribute in this.hasAttributeMap) {
            if (this.hasAttributeMap[attribute]) {
                tempBitfield |= parseInt(attribute);
            }
        }
        let output = Buffer.alloc(3);
        output.writeUInt16LE(index, 0);
        output.writeUInt8(tempBitfield, 2);
        return output;
    }
}


