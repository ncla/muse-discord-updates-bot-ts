import {db} from "../src/database";
import { defineConfig } from 'kysely-ctl'

export default defineConfig({
	kysely: db
})
