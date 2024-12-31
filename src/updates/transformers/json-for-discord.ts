import {UpdateTransformer} from "./index";
import {Update} from "../../update";

export class JsonForDiscord implements UpdateTransformer {
    transform(update: Update): any {
        return {
            content: 'xd'
        }
    }
}