
var tempResource = require("./argDirectionPerm");
var PERM_ACCESS = tempResource.PERM_ACCESS;
var PERM_DIRECTION = tempResource.PERM_DIRECTION;

function ArgAccessPerms(access) {
    this.access = access;
    // Map from direction enumeration value to ArgDirectionPerm.
    this.directionPermMap = {};
    var name;
    for (name in PERM_DIRECTION) {
        var tempDirection = PERM_DIRECTION[name];
        this.directionPermMap[tempDirection] = null;
    }
}

ArgAccessPerms.prototype.toStrings = function() {
    var output = [];
    var direction;
    for (direction in this.directionPermMap) {
        var tempPerm = this.directionPermMap[direction];
        if (tempPerm !== null) {
            output.push(tempPerm.toString());
        }
    }
    return output;
}

ArgAccessPerms.prototype.addDirectionPerm = function(directionPerm) {
    var tempDirection = directionPerm.direction;
    var tempPerm = this.directionPermMap[tempDirection];
    if (tempPerm === null) {
        this.directionPermMap[tempDirection] = directionPerm;
    } else {
        tempPerm.merge(directionPerm);
    }
}

function ArgPerms() {
    // Map from access enumeration value to ArgAccessPerms.
    this.accessPermsMap = {};
    var name;
    for (name in PERM_ACCESS) {
        var tempAccess = PERM_ACCESS[name];
        this.accessPermsMap[tempAccess] = new ArgAccessPerms(tempAccess);
    }
}

ArgPerms.prototype.toStrings = function(modifier) {
    var output = [];
    var access;
    for (access in this.accessPermsMap) {
        var tempPerms = this.accessPermsMap[access];
        var tempTextList = tempPerms.toStrings();
        var index = 0;
        while (index < tempTextList.length) {
            var tempText = tempTextList[index];
            output.push(tempText);
            index += 1
        }
    }
    return output;
}

ArgPerms.prototype.addDirectionPerm = function(directionPerm) {
    var tempPerms = this.accessPermsMap[directionPerm.access];
    tempPerms.addDirectionPerm(directionPerm);
}

module.exports = {
    ArgPerms: ArgPerms
};



