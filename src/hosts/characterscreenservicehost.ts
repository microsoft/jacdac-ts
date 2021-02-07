import { CharacterScreenReg, CharacterScreenTextDirection, CharacterScreenVariant, SRV_CHARACTER_SCREEN } from "../jdom/constants";
import RegisterHost from "../jdom/registerhost";
import ServiceHost from "../jdom/servicehost";

export default class CharacterScreenServiceHost extends ServiceHost {
    readonly message: RegisterHost<[string]>;
    readonly rows: RegisterHost<[number]>;
    readonly columns: RegisterHost<[number]>;
    readonly variant: RegisterHost<[CharacterScreenVariant]>;
    readonly textDirection: RegisterHost<[CharacterScreenTextDirection]>;

    constructor(options?: {
        message?: string,
        rows?: number,
        columns?: number,
        variant?: CharacterScreenVariant,
        textDirection?: CharacterScreenTextDirection
    }) {
        super(SRV_CHARACTER_SCREEN);
        const { message, rows = 2, columns = 16, variant, textDirection } = options || {};

        this.message = this.addRegister<[string]>(CharacterScreenReg.Message, [message || ""]);
        this.rows = this.addRegister<[number]>(CharacterScreenReg.Rows, [rows]);
        this.columns = this.addRegister<[number]>(CharacterScreenReg.Columns, [columns]);
        this.variant = this.addRegister<[CharacterScreenVariant]>(CharacterScreenReg.Variant, [variant || CharacterScreenVariant.LCD]);
        this.message = this.addRegister<[string]>(CharacterScreenReg.Message, [""]);
        this.textDirection = this.addRegister<[CharacterScreenTextDirection]>(CharacterScreenReg.TextDirection, [textDirection || CharacterScreenTextDirection.LeftToRight])
    }
}