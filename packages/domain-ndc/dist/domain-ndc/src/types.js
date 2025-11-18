"use strict";
/**
 * Domain types for NDC business logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DosageFormType = void 0;
/**
 * Dosage form type categories
 */
var DosageFormType;
(function (DosageFormType) {
    /** Solid dosage forms (tablets, capsules) */
    DosageFormType["SOLID"] = "SOLID";
    /** Liquid dosage forms (suspensions, solutions, syrups) */
    DosageFormType["LIQUID"] = "LIQUID";
    /** Injectable dosage forms (injections, vials) */
    DosageFormType["INJECTABLE"] = "INJECTABLE";
    /** Special dosage forms (patches, inhalers) */
    DosageFormType["SPECIAL"] = "SPECIAL";
})(DosageFormType || (exports.DosageFormType = DosageFormType = {}));
