import { CharacterScreenReg, CharacterScreenTextDirection, CharacterScreenVariant, SRV_CHARACTER_SCREEN } from "../jdom/constants";
import JDRegisterHost from "../jdom/registerhost";
import JDServiceHost from "../jdom/servicehost";

export default class CharacterScreenServiceHost extends JDServiceHost {
    readonly message: JDRegisterHost<[string]>;
    readonly rows: JDRegisterHost<[number]>;
    readonly columns: JDRegisterHost<[number]>;
    readonly variant: JDRegisterHost<[CharacterScreenVariant]>;
    readonly textDirection: JDRegisterHost<[CharacterScreenTextDirection]>;

    constructor(options?: {
        message?: string,
        rows?: number,
        columns?: number,
        variant?: CharacterScreenVariant,
        textDirection?: CharacterScreenTextDirection
    }) {
        super(SRV_CHARACTER_SCREEN);
        const { message, rows, columns, variant, textDirection } = options || {};

        this.message = this.addRegister<[string]>(CharacterScreenReg.Message, [message || ""]);
        this.rows = this.addRegister<[number]>(CharacterScreenReg.Rows, [rows || 2]);
        this.columns = this.addRegister<[number]>(CharacterScreenReg.Columns, [columns || 16]);
        this.variant = this.addRegister<[CharacterScreenVariant]>(CharacterScreenReg.Variant, [variant || CharacterScreenVariant.LCD]);
        this.message = this.addRegister<[string]>(CharacterScreenReg.Message, [""]);
        this.textDirection = this.addRegister<[CharacterScreenTextDirection]>(CharacterScreenReg.TextDirection, [textDirection || CharacterScreenTextDirection.LeftToRight])
    }
}