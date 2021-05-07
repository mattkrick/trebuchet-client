"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const getTrebuchet = async (thunks) => {
    for (let i = 0; i < thunks.length; i++) {
        const trebuchet = thunks[i]();
        if (await trebuchet.isSupported()) {
            return trebuchet;
        }
    }
    return null;
};
exports.default = getTrebuchet;
//# sourceMappingURL=getTrebuchet.js.map