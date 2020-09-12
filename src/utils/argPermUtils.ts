
import {ArgPermUtils as ArgPermUtilsInterface} from "models/utils";
import {ArgPerm, PERM_ATTRIBUTE, characterPairAccessMap, characterRecipientMap, characterAttributeMap} from "objects/argPerm";

export interface ArgPermUtils extends ArgPermUtilsInterface {}

export class ArgPermUtils {
    
    createArgPerm(name: string): ArgPerm {
        if (name.length < 3) {
            return null;
        }
        let tempCharacterPair = name.substring(0, 2);
        if (!(tempCharacterPair in characterPairAccessMap)) {
            return null;
        }
        const tempAccess = characterPairAccessMap[tempCharacterPair];
        let tempCharacter = name.charAt(2);
        if (!(tempCharacter in characterRecipientMap)) {
            return null;
        }
        const tempRecipient = characterRecipientMap[tempCharacter];
        // Map from attribute enumeration value to boolean.
        const tempHasAttributeMap = {};
        let attributeName;
        for (attributeName in PERM_ATTRIBUTE) {
            let tempAttribute = PERM_ATTRIBUTE[attributeName];
            tempHasAttributeMap[tempAttribute] = false;
        }
        for (let index = 3; index < name.length; index++) {
            let tempCharacter = name.charAt(index);
            if (tempCharacter in characterAttributeMap) {
                let tempAttribute = characterAttributeMap[tempCharacter];
                tempHasAttributeMap[tempAttribute] = true;
            } else {
                return null;
            }
        }
        return new ArgPerm(tempAccess, tempRecipient, tempHasAttributeMap);
    }
}

export const argPermUtils = new ArgPermUtils();


